/**
 * WORKSHOP STARTER-AGENT INSTALLER — deploy + publish + activate the starter Agent Script
 * agent from the browser, end to end, then grant the running user access to it.
 *
 * The workshop ships a STARTER TEMPLATE agent (Employee Agent V1). The attendee installs
 * it from the launchpad as their starting point, then ADDS instructions and actions to it
 * in Agent Studio during the guide. The agent itself can't be packaged (`AiAuthoringBundle`
 * isn't packageable), so we ship its Agent Script source as a Static Resource and create it
 * at runtime via the org's Next-Gen Authoring Connect API over an authenticated self-callout.
 *
 *   create  → POST /nextgen-authoring/bundles                  (returns bundleVersionId)
 *   publish → POST /nextgen-authoring/bundle-versions/{id}/publish   (creates Bot + BotVersion)
 *   activate→ POST /nextgen-authoring/bundle-versions/{id}/activate
 *
 * AGENT ACCESS — the hard part, solved at runtime.
 *   A permission set grants agent access via an `agentAccesses` entry that references the
 *   agent by `developer_name`. The package CANNOT carry that reference: at package-build
 *   time the agent doesn't exist, and the deployed agent's final name isn't known (it may be
 *   renamed on collision). So instead of baking a static `agentName` into the perm set, we
 *   grant access AT RUNTIME by inserting a `SetupEntityAccess` row that points the workshop
 *   permission set at the ACTUAL `BotDefinition` Id we just created/found. The reference is
 *   therefore always correct, regardless of the agent's name. (SetupEntityAccess is a setup
 *   object, so the insert is safe alongside PermissionSetAssignment — no mixed-DML.)
 *
 * RE-RUN BEHAVIOUR — safe and predictable.
 *   Default (forceNew=false): if an agent with the requested developer_name already exists,
 *   we DON'T create a duplicate. We report it as already-deployed, make sure it's active, and
 *   (re)grant access to it. Pass forceNew=true to deliberately deploy a fresh copy under the
 *   next free name (`<apiName>_2`, `_3`, …) and grant access to THAT new agent instead.
 *
 * SESSION CONTEXT: a self-callout needs an API-enabled session. Apex obtains it from
 * `Page.NextGenAgentDeployerSession` (a Visualforce page) via getContent(), NOT from a bare
 * `UserInfo.getSessionId()` in an Aura/LWC request (that session is not always API-enabled).
 * The hosting LWC therefore runs inside a Visualforce page. If a usable session id is passed
 * in, that is used directly.
 */
public with sharing class NextGenAgentDeployer {
    private static final String API_VERSION = 'v64.0';
    private static final String BASE_PATH = '/services/data/' + API_VERSION + '/nextgen-authoring';

    public class DeployException extends Exception {}

    /**
     * Installs the starter template agent for the running user, end to end:
     * resolves whether it already exists, deploys+publishes+activates it if not, then grants
     * the user access by pointing the workshop permission set at the resulting BotDefinition.
     *
     * @param apiName             desired developer name for the agent (e.g. Note_taking_agent)
     * @param label               human-readable label
     * @param staticResourceName  Static Resource holding the .agent (afscript) source
     * @param accessPermSetName    permission set API name to grant agent access through (e.g. Employee_Agent_Workshop)
     * @param forceNew            when true, always deploy a fresh copy under the next free name
     * @param sessionId           optional API-enabled session id (from a VF page); if blank, Apex fetches one
     * @return a Result describing what happened
     */
    @AuraEnabled
    public static Result deployAgent(
        String apiName,
        String label,
        String staticResourceName,
        String accessPermSetName,
        Boolean forceNew,
        String sessionId
    ) {
        try {
            if (String.isBlank(apiName) || String.isBlank(staticResourceName)) {
                throw new DeployException('apiName and staticResourceName are required.');
            }
            Boolean force = forceNew == true;
            Result result = new Result();

            // ── Reuse path: agent already exists and we're not forcing a new one ──────────
            if (!force) {
                BotDefinition existing = findBotDefinition(apiName);
                if (existing != null) {
                    result.resolvedApiName = apiName;
                    result.botDefinitionId = existing.Id;
                    result.alreadyExisted = true;
                    // Make sure it's active so it shows up; if not active yet we still report
                    // success (the attendee can activate from Studio), but try a best-effort.
                    result.activated = isAnyVersionActive(apiName);
                    if (String.isNotBlank(accessPermSetName)) {
                        result.accessGranted = grantAgentAccess(accessPermSetName, existing.Id);
                    }
                    result.success = true;
                    result.message = result.activated
                        ? 'This agent is already deployed. Granted you access — open it from the Agentforce panel.'
                        : 'This agent is already deployed but not active yet. Granted you access; activate it in Agent Studio.';
                    return result;
                }
            }

            // ── Deploy path: create → publish → activate a fresh agent ────────────────────
            String afscript = readStaticResource(staticResourceName);
            String session = String.isNotBlank(sessionId) ? sessionId : getApiEnabledSession();
            if (String.isBlank(session)) {
                throw new DeployException(
                    'Could not obtain an API-enabled session. Run this from the workshop Visualforce page.'
                );
            }

            // Pick a non-colliding name. Without forceNew this only matters in the rare race
            // where the BotDefinition lookup missed (e.g. a half-published bundle); with
            // forceNew it's how we deliberately get `_2`, `_3`, …
            String uniqueApiName = resolveUniqueApiName(session, apiName);
            // If the name was bumped to avoid a collision (e.g. Note_taking_agent_2), mirror that
            // suffix in the LABEL too — otherwise every copy shows the same display name and they're
            // impossible to tell apart in Agent Studio / the Agentforce panel.
            String effectiveLabel = deriveLabel(label, apiName, uniqueApiName);

            // The agent's runtime BotDefinition name comes from `developer_name` INSIDE the
            // afscript, not from the bundle apiName. Rewrite it (and agent_label) to match.
            afscript = alignAgentIdentity(afscript, uniqueApiName, effectiveLabel);

            // 1) Create the bundle + DRAFT version carrying the afscript.
            Map<String, Object> created = createBundleWithVersion(session, uniqueApiName, effectiveLabel, afscript);
            result.bundleVersionId = (String) created.get('id');
            result.bundleId = (String) created.get('bundleId');
            result.resolvedApiName = uniqueApiName;
            if (String.isBlank(result.bundleVersionId)) {
                throw new DeployException('Create succeeded but no bundle version id was returned.');
            }

            // 2) Publish → creates Bot + BotVersion.
            Map<String, Object> published = publishBundleVersion(session, result.bundleVersionId);
            result.publishedBotId = (String) published.get('publishedBotId');
            result.publishedBotVersionId = (String) published.get('publishedBotVersionId');

            // 3) Activate the published version.
            activateBundleVersion(session, result.bundleVersionId);
            result.activated = true;

            // 4) Resolve the BotDefinition we just created (the access grant needs its Id,
            //    not the bundle/Bot id) and grant agent access through the permission set.
            BotDefinition deployed = findBotDefinition(uniqueApiName);
            if (deployed != null) {
                result.botDefinitionId = deployed.Id;
                if (String.isNotBlank(accessPermSetName)) {
                    result.accessGranted = grantAgentAccess(accessPermSetName, deployed.Id);
                }
            }

            result.success = true;
            result.message = result.accessGranted
                ? 'Agent published, activated, and you now have access — open it from the Agentforce panel.'
                : 'Agent published and activated.';
            return result;
        } catch (DeployException de) {
            throw new AuraHandledException(de.getMessage());
        } catch (Exception e) {
            throw new AuraHandledException('Agent deploy failed: ' + e.getMessage());
        }
    }

    // ── Agent existence / status (BotDefinition) ───────────────────────────────────────

    /** Returns the BotDefinition with this developer_name, or null if none exists. */
    private static BotDefinition findBotDefinition(String developerName) {
        List<BotDefinition> bots = [
            SELECT Id, DeveloperName, MasterLabel
            FROM BotDefinition
            WHERE DeveloperName = :developerName
            WITH USER_MODE
            LIMIT 1
        ];
        return bots.isEmpty() ? null : bots[0];
    }

    /** True if any BotVersion of this agent is Active. */
    private static Boolean isAnyVersionActive(String developerName) {
        return [
            SELECT COUNT()
            FROM BotVersion
            WHERE BotDefinition.DeveloperName = :developerName AND Status = 'Active'
            WITH USER_MODE
        ] > 0;
    }

    // ── Runtime agent-access grant (the rename-proof part) ─────────────────────────────

    /**
     * Grants agent access by adding the BotDefinition to the named permission set as a
     * SetupEntityAccess row — the data-layer form of an `agentAccesses` entry. Pointing at
     * the BotDefinition Id (not a name) means the grant always references the real agent,
     * even if it was renamed on a collision. Idempotent; setup-object DML (no mixed-DML).
     *
     * @return true if access is in place (granted now or already present).
     */
    @TestVisible
    private static Boolean grantAgentAccess(String permSetName, Id botDefinitionId) {
        if (String.isBlank(permSetName) || botDefinitionId == null) {
            return false;
        }
        List<PermissionSet> sets = [
            SELECT Id FROM PermissionSet WHERE Name = :permSetName WITH USER_MODE LIMIT 1
        ];
        if (sets.isEmpty()) {
            return false;
        }
        Id psId = sets[0].Id;
        List<SetupEntityAccess> existing = [
            SELECT Id FROM SetupEntityAccess
            WHERE ParentId = :psId AND SetupEntityId = :botDefinitionId
            WITH SYSTEM_MODE LIMIT 1
        ];
        if (!existing.isEmpty()) {
            return true; // already granted
        }
        // SetupEntityType is auto-derived from SetupEntityId and is not writeable.
        Database.SaveResult sr = Database.insert(
            new SetupEntityAccess(ParentId = psId, SetupEntityId = botDefinitionId),
            false
        );
        return sr.isSuccess();
    }

    // ── Connect API calls ──────────────────────────────────────────────────────────────

    /**
     * Returns an agent apiName not already in use. If `desired` is free it is returned
     * as-is; otherwise the first free `desired_2`, `desired_3`, … is returned. Existing
     * names come from GET /bundles. On any lookup failure we fall back to the desired
     * name (create/publish will still surface a real error).
     */
    private static String resolveUniqueApiName(String session, String desired) {
        Set<String> taken = new Set<String>();
        try {
            HttpResponse res = call(session, 'GET', '/bundles', null);
            if (res.getStatusCode() == 200) {
                Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                Object bundlesObj = body.get('bundles');
                if (bundlesObj instanceof List<Object>) {
                    for (Object o : (List<Object>) bundlesObj) {
                        Object n = ((Map<String, Object>) o).get('apiName');
                        if (n != null) {
                            taken.add(((String) n).toLowerCase());
                        }
                    }
                }
            }
        } catch (Exception e) {
            return desired; // lookup failed — let downstream calls report the real error
        }
        if (!taken.contains(desired.toLowerCase())) {
            return desired;
        }
        for (Integer i = 2; i < 100; i++) {
            String candidate = desired + '_' + i;
            if (!taken.contains(candidate.toLowerCase())) {
                return candidate;
            }
        }
        return desired; // give up after 100 — extremely unlikely
    }

    /**
     * Builds the display label for the agent. When the api name was bumped to dodge a collision
     * (`Note_taking_agent` → `Note_taking_agent_N`), append the same `(N)` suffix to the label so
     * the copy is distinguishable in Agent Studio / the Agentforce panel. If nothing was bumped,
     * the requested label is used as-is (falling back to the api name when blank).
     */
    @TestVisible
    private static String deriveLabel(String requestedLabel, String requestedApiName, String resolvedApiName) {
        // No label supplied → the resolved api name (which already carries any _N suffix) is the label.
        if (String.isBlank(requestedLabel)) {
            return resolvedApiName;
        }
        // Label supplied but the name wasn't bumped → use it verbatim.
        if (String.isBlank(resolvedApiName) || resolvedApiName.equalsIgnoreCase(requestedApiName)) {
            return requestedLabel;
        }
        // Name was bumped ("<requestedApiName>_<N>") → mirror the suffix on the label.
        String suffix = resolvedApiName.substringAfterLast('_');
        if (String.isNotBlank(suffix) && suffix.isNumeric()) {
            return requestedLabel + ' (' + suffix + ')';
        }
        return requestedLabel + ' (' + resolvedApiName + ')';
    }

    private static Map<String, Object> createBundleWithVersion(
        String session,
        String apiName,
        String label,
        String afscript
    ) {
        Map<String, Object> asset = new Map<String, Object>{
            'resourceName' => apiName,
            'resourceContent' => afscript,
            'resourceType' => 'agentDefinition',
            'resourceAuthoringFormat' => 'afscript',
            'authoringFormatVersion' => 'v1.0'
        };
        Map<String, Object> body = new Map<String, Object>{
            'apiName' => apiName,
            'label' => String.isBlank(label) ? apiName : label,
            'assets' => new List<Object>{ asset }
        };
        HttpResponse res = call(session, 'POST', '/bundles', JSON.serialize(body));
        if (res.getStatusCode() != 200 && res.getStatusCode() != 201) {
            throw new DeployException('Create failed (HTTP ' + res.getStatusCode() + '): ' + res.getBody());
        }
        return (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
    }

    private static Map<String, Object> publishBundleVersion(String session, String bundleVersionId) {
        HttpResponse res = call(session, 'POST', '/bundle-versions/' + bundleVersionId + '/publish', '{}');
        if (res.getStatusCode() != 200 && res.getStatusCode() != 201) {
            throw new DeployException('Publish failed (HTTP ' + res.getStatusCode() + '): ' + res.getBody());
        }
        String responseBody = res.getBody();
        return String.isBlank(responseBody)
            ? new Map<String, Object>()
            : (Map<String, Object>) JSON.deserializeUntyped(responseBody);
    }

    private static void activateBundleVersion(String session, String bundleVersionId) {
        HttpResponse res = call(session, 'POST', '/bundle-versions/' + bundleVersionId + '/activate', '{}');
        // Activate returns 200 or 204 (no content) on success.
        if (res.getStatusCode() != 200 && res.getStatusCode() != 204) {
            throw new DeployException('Activate failed (HTTP ' + res.getStatusCode() + '): ' + res.getBody());
        }
    }

    private static HttpResponse call(String session, String method, String path, String body) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(URL.getOrgDomainUrl().toExternalForm() + BASE_PATH + path);
        req.setMethod(method);
        req.setHeader('Authorization', 'Bearer ' + session);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Accept', 'application/json');
        req.setTimeout(120000);
        if (body != null && (method == 'POST' || method == 'PATCH')) {
            req.setBody(body);
        }
        return new Http().send(req);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────────

    /**
     * Obtains an API-enabled session id from a Visualforce page. In an Aura/LWC request
     * context, `UserInfo.getSessionId()` is not guaranteed to be API-enabled, but a VF
     * page's session is. We render the page and read the printed session id.
     */
    private static String getApiEnabledSession() {
        if (Test.isRunningTest()) {
            return null; // no VF render in tests; callouts are mocked separately
        }
        String content = Page.NextGenAgentDeployerSession.getContent().toString();
        return content == null ? null : content.trim();
    }

    /**
     * Rewrites the afscript `config` block so `developer_name` matches the requested
     * apiName and `agent_label` matches the requested label. This keeps the runtime
     * BotDefinition name in sync with the bundle and lets a facilitator deploy multiple
     * distinctly-named agents from the same starter script.
     */
    @TestVisible
    private static String alignAgentIdentity(String afscript, String apiName, String label) {
        if (String.isBlank(afscript)) {
            return afscript;
        }
        String result = afscript;
        // developer_name: "..."  →  developer_name: "<apiName>"
        result = replaceConfigValue(result, 'developer_name', apiName);
        if (String.isNotBlank(label)) {
            result = replaceConfigValue(result, 'agent_label', label);
        }
        return result;
    }

    /** Replaces `<key>: "<old>"` with `<key>: "<value>"` (first occurrence) in the script. */
    private static String replaceConfigValue(String text, String key, String value) {
        Pattern p = Pattern.compile('(?m)^(\\s*' + key + '\\s*:\\s*")[^"]*(")');
        Matcher m = p.matcher(text);
        if (m.find()) {
            return m.replaceFirst('$1' + Matcher.quoteReplacement(value) + '$2');
        }
        return text;
    }

    /** Reads the text body of a Static Resource by name. */
    private static String readStaticResource(String name) {
        List<StaticResource> resources = [
            SELECT Body FROM StaticResource WHERE Name = :name WITH USER_MODE LIMIT 1
        ];
        if (resources.isEmpty()) {
            throw new DeployException('Static Resource "' + name + '" not found.');
        }
        return resources[0].Body.toString();
    }

    // ── DTOs ───────────────────────────────────────────────────────────────────────

    /** The outcome of an install / deploy → publish → activate run. */
    public class Result {
        @AuraEnabled public Boolean success = false;
        @AuraEnabled public String message;
        @AuraEnabled public String resolvedApiName;
        @AuraEnabled public String bundleId;
        @AuraEnabled public String bundleVersionId;
        @AuraEnabled public String publishedBotId;
        @AuraEnabled public String publishedBotVersionId;
        @AuraEnabled public Id botDefinitionId;
        @AuraEnabled public Boolean activated = false;
        @AuraEnabled public Boolean alreadyExisted = false;
        @AuraEnabled public Boolean accessGranted = false;
    }
}

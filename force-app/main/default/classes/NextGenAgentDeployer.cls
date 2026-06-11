/**
 * OPTIONAL WORKSHOP ACCELERATOR — deploy + publish + activate an Agent Script agent
 * from the browser, end to end.
 *
 * This is a convenience / backup path, NOT the customer happy-path. The decided design
 * is that the attendee builds the agent in Agent Studio (that's the learning). This
 * accelerator exists so a facilitator (or a stuck attendee / the backup org) can get a
 * working agent in one click — e.g. to reset or to skip ahead.
 *
 * How it works: it calls the org's Next-Gen Authoring Connect API
 * (`/services/data/vXX.0/nextgen-authoring/...`) over an authenticated self-callout to
 * the org's own My Domain, using the running user's session. The Agent Script source is
 * read from a Static Resource so the package can ship a starter agent without packaging
 * an AiAuthoringBundle (which isn't packageable).
 *
 *   create  → POST /nextgen-authoring/bundles                  (returns bundleVersionId)
 *   publish → POST /nextgen-authoring/bundle-versions/{id}/publish
 *   activate→ POST /nextgen-authoring/bundle-versions/{id}/activate
 *
 * IMPORTANT — session context: a self-callout needs an API-enabled session. Apex obtains
 * it from `Page.NextGenAgentDeployerSession` (a Visualforce page) via getContent(), NOT
 * from a bare `UserInfo.getSessionId()` in an Aura/LWC request (that session is not always
 * API-enabled). The hosting LWC therefore runs inside a Visualforce page. If a usable
 * session id is passed in, that is used directly (e.g. from a VF-hosted caller).
 */
public with sharing class NextGenAgentDeployer {
    private static final String API_VERSION = 'v64.0';
    private static final String BASE_PATH = '/services/data/' + API_VERSION + '/nextgen-authoring';

    public class DeployException extends Exception {}

    /**
     * Deploys, publishes, and activates the agent whose Agent Script lives in the named
     * Static Resource, then assigns the supplied agent-access permission set to the
     * running user so the agent is immediately usable.
     *
     * @param apiName             developer name for the bundle / agent (e.g. Note_taking_agent)
     * @param label               human-readable label
     * @param staticResourceName  Static Resource holding the .agent (afscript) source
     * @param accessPermSetName   optional permission set API name to assign after publish (may be blank)
     * @param sessionId           optional API-enabled session id (from a VF page); if blank, Apex fetches one
     * @return a Result describing what was created
     */
    @AuraEnabled
    public static Result deployAgent(
        String apiName,
        String label,
        String staticResourceName,
        String accessPermSetName,
        String sessionId
    ) {
        try {
            if (String.isBlank(apiName) || String.isBlank(staticResourceName)) {
                throw new DeployException('apiName and staticResourceName are required.');
            }
            String afscript = readStaticResource(staticResourceName);
            String session = String.isNotBlank(sessionId) ? sessionId : getApiEnabledSession();
            if (String.isBlank(session)) {
                throw new DeployException(
                    'Could not obtain an API-enabled session. Run this from the workshop Visualforce page.'
                );
            }

            // Avoid BotDefinition name collisions: if an agent with this apiName already
            // exists (a published bundle of the same name → DUPLICATE_VALUE on publish),
            // pick the next free "<apiName>_N". This makes the accelerator safe to re-run
            // and safe in orgs that already carry a same-named agent.
            String uniqueApiName = resolveUniqueApiName(session, apiName);
            String effectiveLabel = String.isBlank(label) ? uniqueApiName : label;

            // The agent's runtime BotDefinition name comes from `developer_name` INSIDE the
            // afscript, not from the bundle apiName. Rewrite it (and agent_label) to match
            // the chosen unique apiName.
            afscript = alignAgentIdentity(afscript, uniqueApiName, effectiveLabel);
            apiName = uniqueApiName;
            label = effectiveLabel;

            Result result = new Result();

            // 1) Create the bundle + DRAFT version carrying the afscript.
            Map<String, Object> created = createBundleWithVersion(session, apiName, label, afscript);
            result.bundleVersionId = (String) created.get('id');
            result.bundleId = (String) created.get('bundleId');
            result.resolvedApiName = (String) created.get('apiName');
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

            // 4) Assign the agent-access permission set to the running user (idempotent,
            //    setup-object DML only → no mixed-DML).
            if (String.isNotBlank(accessPermSetName)) {
                result.permSetAssigned = assignPermissionSet(accessPermSetName);
            }

            result.success = true;
            result.message = 'Agent published and activated.';
            return result;
        } catch (DeployException de) {
            throw new AuraHandledException(de.getMessage());
        } catch (Exception e) {
            throw new AuraHandledException('Agent deploy failed: ' + e.getMessage());
        }
    }

    // ── Connect API calls ────────────────────────────────────────────────────────────

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

    /** Idempotently assigns a permission set (by API name) to the running user. */
    private static Boolean assignPermissionSet(String permSetName) {
        List<PermissionSet> sets = [
            SELECT Id FROM PermissionSet WHERE Name = :permSetName WITH USER_MODE LIMIT 1
        ];
        if (sets.isEmpty()) {
            return false;
        }
        Id psId = sets[0].Id;
        Id userId = UserInfo.getUserId();
        List<PermissionSetAssignment> existing = [
            SELECT Id FROM PermissionSetAssignment
            WHERE AssigneeId = :userId AND PermissionSetId = :psId WITH USER_MODE LIMIT 1
        ];
        if (!existing.isEmpty()) {
            return true; // already assigned
        }
        Database.SaveResult sr = Database.insert(
            new PermissionSetAssignment(AssigneeId = userId, PermissionSetId = psId),
            false
        );
        return sr.isSuccess();
    }

    // ── DTOs ───────────────────────────────────────────────────────────────────────

    /** The outcome of a deploy → publish → activate run. */
    public class Result {
        @AuraEnabled public Boolean success = false;
        @AuraEnabled public String message;
        @AuraEnabled public String resolvedApiName;
        @AuraEnabled public String bundleId;
        @AuraEnabled public String bundleVersionId;
        @AuraEnabled public String publishedBotId;
        @AuraEnabled public String publishedBotVersionId;
        @AuraEnabled public Boolean activated = false;
        @AuraEnabled public Boolean permSetAssigned = false;
    }
}

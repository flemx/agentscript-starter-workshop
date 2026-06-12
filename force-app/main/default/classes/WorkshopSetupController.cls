/**
 * Controller for the Employee Agent Workshop launchpad LWC.
 *
 * Drives the post-install setup the attendee runs from the package's Home page:
 *  - reads workshop configuration from the Workshop_Settings__mdt custom metadata
 *    (guide URL, package install URL, the permission sets / groups to assign, the
 *    starter agent's API name);
 *  - reports which of those permission sets / groups are already assigned to the
 *    running user;
 *  - assigns any that are missing to the running user, idempotently, returning a
 *    per-item result so the UI can show exactly what happened.
 *
 * Permission-set assignment is the reliable, fully-supported half of the
 * "configure from the browser" story: PermissionSetAssignment is a setup object,
 * so assigning it to UserInfo.getUserId() is safe in a single transaction with no
 * mixed-DML risk (we perform no non-setup DML here).
 */
public with sharing class WorkshopSetupController {
    /** Allows tests to inject configuration without relying on org metadata. */
    @TestVisible
    private static Workshop_Settings__mdt testSettings;

    // Built-in defaults so the launchpad works on a fresh install with NO custom
    // metadata record present. The permission set names are fixed by this package, so
    // they are safe to hardcode. The guide / install URLs are deployment-specific
    // placeholders — an admin overrides them by creating a "Default" Workshop_Settings
    // record in Setup (point-and-click), which takes precedence field-by-field.
    //
    // We assign the standard, out-of-the-box Agentforce permission sets directly (they
    // exist in any Agentforce-enabled org) plus our own workshop permission set — rather
    // than depending on a custom permission-set GROUP, which is brittle (a group fails to
    // deploy/exist if any member perm set is missing).
    private static final String DEFAULT_GUIDE_URL =
        'https://employee-agent-workshop-guide-3ae92a297614.herokuapp.com/';
    private static final String DEFAULT_INSTALL_URL =
        'https://login.salesforce.com/packaging/installPackage.apexp?p0=04tWt000000GFntIAG';
    private static final String DEFAULT_AGENT_API_NAME = 'Note_taking_agent';
    private static final String DEFAULT_PERMISSION_SETS =
        'Employee_Agent_Workshop,' +              // our package perms (Apex/VF/app/tab)
        'Employee_Agent_Notes_Addon,' +           // note-capture / HTML-note / viewer Apex
        'force__EinsteinGPTPromptTemplateUser,' + // Prompt Template User (for Summarize)
        'force__CopilotSalesforceUser';           // Access Agentforce Default Agent
    private static final String DEFAULT_PERMISSION_SET_GROUPS = '';

    private static final String STATUS_ASSIGNED = 'assigned';
    private static final String STATUS_ALREADY = 'already';
    private static final String STATUS_NOT_FOUND = 'not_found';
    private static final String STATUS_ERROR = 'error';

    private static final String TYPE_PERMISSION_SET = 'PermissionSet';
    private static final String TYPE_PERMISSION_SET_GROUP = 'PermissionSetGroup';

    /**
     * Returns the static workshop configuration for the launchpad. Cacheable so the
     * LWC can wire it — the values come from custom metadata and don't change at runtime.
     *
     * @return a Config describing the guide URL, install URL, starter agent, and the
     *         permission sets / groups the setup step will assign.
     */
    @AuraEnabled(cacheable=true)
    public static Config getConfig() {
        Workshop_Settings__mdt settings = getSettings();
        Config config = new Config();
        config.workshopGuideUrl = settings.Workshop_Guide_URL__c;
        config.packageInstallUrl = settings.Package_Install_URL__c;
        config.agentApiName = settings.Agent_Api_Name__c;
        config.requestedItems = buildRequestedItems(settings);
        return config;
    }

    /**
     * Returns the assignment status of every configured permission set / group for the
     * running user, without changing anything. Not cacheable — it reflects live state.
     *
     * @return one ItemResult per configured item with status 'assigned' or 'not_found'.
     */
    @AuraEnabled
    public static List<ItemResult> getStatus() {
        try {
            return evaluate(getSettings(), false);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * Assigns any configured permission sets / groups that the running user is missing,
     * then returns the resulting per-item status. Idempotent: items already assigned are
     * reported as 'already' and skipped; unresolved names are reported as 'not_found'.
     *
     * @return one ItemResult per configured item with its final status.
     */
    @AuraEnabled
    public static List<ItemResult> runSetup() {
        try {
            return evaluate(getSettings(), true);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * Core routine: resolves the configured names, compares against the user's current
     * assignments, and (when assign=true) inserts the missing PermissionSetAssignment
     * rows. Shared by getStatus (assign=false) and runSetup (assign=true).
     */
    private static List<ItemResult> evaluate(Workshop_Settings__mdt settings, Boolean assign) {
        Id userId = UserInfo.getUserId();

        List<String> psNames = parseNames(settings.Permission_Sets__c);
        List<String> psgNames = parseNames(settings.Permission_Set_Groups__c);

        // Resolve names → Ids. A configured name may be namespaced (e.g.
        // "force__EinsteinGPTPromptTemplateUser"): in SOQL the namespace lives in
        // NamespacePrefix and Name holds only the bare name. So we query by the bare
        // names and re-derive each row's fully-qualified name (ns__Name) to match back
        // against exactly what was configured.
        Map<String, Id> psIdByName = new Map<String, Id>();
        if (!psNames.isEmpty()) {
            Set<String> bareNames = new Set<String>();
            for (String n : psNames) {
                bareNames.add(stripNamespace(n));
            }
            for (PermissionSet ps : [
                SELECT Id, Name, NamespacePrefix FROM PermissionSet
                WHERE Name IN :bareNames WITH USER_MODE
            ]) {
                String fqName = String.isBlank(ps.NamespacePrefix)
                    ? ps.Name
                    : ps.NamespacePrefix + '__' + ps.Name;
                // Map both the fully-qualified and bare forms so either configuration matches.
                psIdByName.put(fqName, ps.Id);
                psIdByName.put(ps.Name, ps.Id);
            }
        }
        Map<String, Id> psgIdByName = new Map<String, Id>();
        if (!psgNames.isEmpty()) {
            for (PermissionSetGroup psg : [
                SELECT Id, DeveloperName FROM PermissionSetGroup
                WHERE DeveloperName IN :psgNames WITH USER_MODE
            ]) {
                psgIdByName.put(psg.DeveloperName, psg.Id);
            }
        }

        // What's already assigned to this user (covers both perm sets and groups).
        Set<Id> assignedPsIds = new Set<Id>();
        Set<Id> assignedPsgIds = new Set<Id>();
        for (PermissionSetAssignment psa : [
            SELECT PermissionSetId, PermissionSetGroupId
            FROM PermissionSetAssignment
            WHERE AssigneeId = :userId WITH USER_MODE
        ]) {
            if (psa.PermissionSetId != null) {
                assignedPsIds.add(psa.PermissionSetId);
            }
            if (psa.PermissionSetGroupId != null) {
                assignedPsgIds.add(psa.PermissionSetGroupId);
            }
        }

        // Decide what to do for each requested item, queuing inserts as needed.
        List<ItemResult> results = new List<ItemResult>();
        List<PermissionSetAssignment> toInsert = new List<PermissionSetAssignment>();
        List<ItemResult> pendingInsertResults = new List<ItemResult>();

        for (String name : psNames) {
            ItemResult r = new ItemResult(name, TYPE_PERMISSION_SET);
            Id psId = psIdByName.get(name);
            if (psId == null) {
                r.status = STATUS_NOT_FOUND;
                r.message = 'No permission set with this API name was found in the org.';
            } else if (assignedPsIds.contains(psId)) {
                r.status = STATUS_ALREADY;
                r.message = 'Already assigned.';
            } else if (assign) {
                toInsert.add(new PermissionSetAssignment(AssigneeId = userId, PermissionSetId = psId));
                pendingInsertResults.add(r);
            } else {
                r.status = STATUS_NOT_FOUND;
                r.message = 'Not yet assigned.';
            }
            results.add(r);
        }

        for (String name : psgNames) {
            ItemResult r = new ItemResult(name, TYPE_PERMISSION_SET_GROUP);
            Id psgId = psgIdByName.get(name);
            if (psgId == null) {
                r.status = STATUS_NOT_FOUND;
                r.message = 'No permission set group with this API name was found in the org.';
            } else if (assignedPsgIds.contains(psgId)) {
                r.status = STATUS_ALREADY;
                r.message = 'Already assigned.';
            } else if (assign) {
                toInsert.add(new PermissionSetAssignment(AssigneeId = userId, PermissionSetGroupId = psgId));
                pendingInsertResults.add(r);
            } else {
                r.status = STATUS_NOT_FOUND;
                r.message = 'Not yet assigned.';
            }
            results.add(r);
        }

        // Insert the missing assignments with partial success, then fold the outcome
        // back into the matching result rows.
        if (!toInsert.isEmpty()) {
            List<Database.SaveResult> saveResults = Database.insert(toInsert, false);
            for (Integer i = 0; i < saveResults.size(); i++) {
                ItemResult r = pendingInsertResults[i];
                if (saveResults[i].isSuccess()) {
                    r.status = STATUS_ASSIGNED;
                    r.message = 'Assigned to you.';
                } else {
                    r.status = STATUS_ERROR;
                    r.message = saveResults[i].getErrors().isEmpty()
                        ? 'Assignment failed.'
                        : saveResults[i].getErrors()[0].getMessage();
                }
            }
        }

        return results;
    }

    /**
     * Resolves configuration. Test-injected settings win outright; otherwise we start
     * from the package's built-in defaults and let a "Default" Workshop_Settings custom
     * metadata record (if an admin created one) override any field it populates. This
     * means the launchpad works on a clean install with no metadata record at all.
     */
    private static Workshop_Settings__mdt getSettings() {
        if (testSettings != null) {
            return testSettings;
        }
        Workshop_Settings__mdt settings = new Workshop_Settings__mdt(
            Workshop_Guide_URL__c = DEFAULT_GUIDE_URL,
            Package_Install_URL__c = DEFAULT_INSTALL_URL,
            Agent_Api_Name__c = DEFAULT_AGENT_API_NAME,
            Permission_Sets__c = DEFAULT_PERMISSION_SETS,
            Permission_Set_Groups__c = DEFAULT_PERMISSION_SET_GROUPS
        );

        Workshop_Settings__mdt orgRecord = Workshop_Settings__mdt.getInstance('Default');
        if (orgRecord != null) {
            if (String.isNotBlank(orgRecord.Workshop_Guide_URL__c)) {
                settings.Workshop_Guide_URL__c = orgRecord.Workshop_Guide_URL__c;
            }
            if (String.isNotBlank(orgRecord.Package_Install_URL__c)) {
                settings.Package_Install_URL__c = orgRecord.Package_Install_URL__c;
            }
            if (String.isNotBlank(orgRecord.Agent_Api_Name__c)) {
                settings.Agent_Api_Name__c = orgRecord.Agent_Api_Name__c;
            }
            if (String.isNotBlank(orgRecord.Permission_Sets__c)) {
                settings.Permission_Sets__c = orgRecord.Permission_Sets__c;
            }
            if (String.isNotBlank(orgRecord.Permission_Set_Groups__c)) {
                settings.Permission_Set_Groups__c = orgRecord.Permission_Set_Groups__c;
            }
        }
        return settings;
    }

    /** Builds the display list of requested items from the configured names. */
    private static List<RequestedItem> buildRequestedItems(Workshop_Settings__mdt settings) {
        List<RequestedItem> items = new List<RequestedItem>();
        for (String name : parseNames(settings.Permission_Sets__c)) {
            items.add(new RequestedItem(name, TYPE_PERMISSION_SET));
        }
        for (String name : parseNames(settings.Permission_Set_Groups__c)) {
            items.add(new RequestedItem(name, TYPE_PERMISSION_SET_GROUP));
        }
        return items;
    }

    /**
     * Returns the bare API name without a namespace prefix: "force__Foo" → "Foo",
     * "Bar" → "Bar". Only the LAST "__" separates namespace from name, but standard
     * perm sets use a single "ns__Name" form, so splitting on the first "__" is correct
     * for these (custom perm sets have no "__" at all).
     */
    private static String stripNamespace(String name) {
        if (String.isBlank(name) || !name.contains('__')) {
            return name;
        }
        return name.substringAfter('__');
    }

    /** Splits a comma/newline-separated list of API names into trimmed, non-blank entries. */
    private static List<String> parseNames(String raw) {
        List<String> names = new List<String>();
        if (String.isBlank(raw)) {
            return names;
        }
        for (String part : raw.split('[\\n,]')) {
            String trimmed = part.trim();
            if (String.isNotBlank(trimmed)) {
                names.add(trimmed);
            }
        }
        return names;
    }

    /** Static workshop configuration surfaced to the launchpad LWC. */
    public class Config {
        @AuraEnabled public String workshopGuideUrl;
        @AuraEnabled public String packageInstallUrl;
        @AuraEnabled public String agentApiName;
        @AuraEnabled public List<RequestedItem> requestedItems;
    }

    /** A permission set / group the setup step will try to assign. */
    public class RequestedItem {
        @AuraEnabled public String name;
        @AuraEnabled public String type;

        public RequestedItem(String name, String type) {
            this.name = name;
            this.type = type;
        }
    }

    /** The outcome of evaluating or assigning a single configured item. */
    public class ItemResult {
        @AuraEnabled public String name;
        @AuraEnabled public String type;
        @AuraEnabled public String status; // assigned | already | not_found | error
        @AuraEnabled public String message;

        public ItemResult(String name, String type) {
            this.name = name;
            this.type = type;
        }
    }
}

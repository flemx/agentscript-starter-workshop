/**
 * Tests for WorkshopSetupController — the launchpad's post-install setup logic.
 *
 * Assignment is exercised under System.runAs(testUser) so the test controls the
 * user's starting assignment state. The target permission set is the package's own
 * Employee_Agent_Workshop (no required license), so it is assignable to any user.
 */
@IsTest
private class WorkshopSetupControllerTest {
    private static final String REAL_PS = 'Employee_Agent_Workshop';
    private static final String MISSING_PS = 'No_Such_Permission_Set_XYZ';
    private static final String MISSING_PSG = 'No_Such_Group_XYZ';

    /** Builds a settings record requesting the given perm-set / group name lists. */
    private static Workshop_Settings__mdt settings(String permSets, String permSetGroups) {
        return new Workshop_Settings__mdt(
            Workshop_Guide_URL__c = 'https://guide.example.com/',
            Package_Install_URL__c = 'https://install.example.com/',
            Agent_Api_Name__c = 'Note_taking_agent',
            Permission_Sets__c = permSets,
            Permission_Set_Groups__c = permSetGroups
        );
    }

    /** Creates a minimal active standard user to run assignment tests against. */
    private static User makeUser() {
        Profile p = [SELECT Id FROM Profile WHERE UserType = 'Standard' LIMIT 1];
        String unique = 'wsctrl' + String.valueOf(Datetime.now().getTime());
        return new User(
            FirstName = 'Workshop',
            LastName = 'Tester',
            Email = unique + '@example.com',
            Username = unique + '@example.com.invalid',
            Alias = 'wstest',
            ProfileId = p.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );
    }

    @IsTest
    static void getConfigMapsSettings() {
        WorkshopSetupController.testSettings = settings(REAL_PS, 'AFDX_User_Perms');

        Test.startTest();
        WorkshopSetupController.Config config = WorkshopSetupController.getConfig();
        Test.stopTest();

        System.assertEquals('https://guide.example.com/', config.workshopGuideUrl, 'Guide URL should map');
        System.assertEquals('Note_taking_agent', config.agentApiName, 'Agent name should map');
        System.assertEquals(2, config.requestedItems.size(), 'Should list both requested items');
    }

    @IsTest
    static void runSetupAssignsMissingPermissionSet() {
        WorkshopSetupController.testSettings = settings(REAL_PS, null);
        User u = makeUser();
        insert u;

        Test.startTest();
        List<WorkshopSetupController.ItemResult> results;
        System.runAs(u) {
            results = WorkshopSetupController.runSetup();
        }
        Test.stopTest();

        System.assertEquals(1, results.size(), 'One item requested');
        System.assertEquals('assigned', results[0].status, 'Should newly assign the perm set');

        List<PermissionSetAssignment> psas = [
            SELECT Id FROM PermissionSetAssignment
            WHERE AssigneeId = :u.Id AND PermissionSet.Name = :REAL_PS
        ];
        System.assertEquals(1, psas.size(), 'Assignment row should exist');
    }

    @IsTest
    static void runSetupIsIdempotent() {
        WorkshopSetupController.testSettings = settings(REAL_PS, null);
        User u = makeUser();
        insert u;

        Test.startTest();
        List<WorkshopSetupController.ItemResult> second;
        System.runAs(u) {
            WorkshopSetupController.runSetup();          // first pass assigns
            second = WorkshopSetupController.runSetup();  // second pass should be a no-op
        }
        Test.stopTest();

        System.assertEquals('already', second[0].status, 'Re-running should report already-assigned');
        List<PermissionSetAssignment> psas = [
            SELECT Id FROM PermissionSetAssignment
            WHERE AssigneeId = :u.Id AND PermissionSet.Name = :REAL_PS
        ];
        System.assertEquals(1, psas.size(), 'Should not create a duplicate assignment');
    }

    @IsTest
    static void getStatusReportsBeforeAssigning() {
        WorkshopSetupController.testSettings = settings(REAL_PS, null);
        User u = makeUser();
        insert u;

        Test.startTest();
        List<WorkshopSetupController.ItemResult> status;
        System.runAs(u) {
            status = WorkshopSetupController.getStatus();
        }
        Test.stopTest();

        System.assertEquals(1, status.size(), 'One item requested');
        System.assertEquals('not_found', status[0].status, 'A not-yet-assigned set reads as not assigned');
        List<PermissionSetAssignment> psas = [
            SELECT Id FROM PermissionSetAssignment
            WHERE AssigneeId = :u.Id AND PermissionSet.Name = :REAL_PS
        ];
        System.assertEquals(0, psas.size(), 'getStatus must not assign anything');
    }

    @IsTest
    static void resolvesNamespacedStandardPermSet() {
        // A namespaced standard perm set (e.g. force__EinsteinGPTPromptTemplateUser) must
        // resolve: in SOQL its Name is the bare name with NamespacePrefix separate. We can't
        // assume a specific managed perm set exists in every test org, so we assert the
        // resolution path doesn't error and the item is returned (status found-or-assigned,
        // never crashing the whole call).
        WorkshopSetupController.testSettings = settings('force__EinsteinGPTPromptTemplateUser', null);
        User u = makeUser();
        insert u;

        Test.startTest();
        List<WorkshopSetupController.ItemResult> status;
        System.runAs(u) {
            status = WorkshopSetupController.getStatus();
        }
        Test.stopTest();

        System.assertEquals(1, status.size(), 'The namespaced item should be returned');
        System.assertEquals('force__EinsteinGPTPromptTemplateUser', status[0].name,
            'The configured (namespaced) name should be preserved in the result');
    }

    @IsTest
    static void missingNamesReportNotFound() {
        WorkshopSetupController.testSettings = settings(MISSING_PS, MISSING_PSG);

        Test.startTest();
        List<WorkshopSetupController.ItemResult> results = WorkshopSetupController.runSetup();
        Test.stopTest();

        System.assertEquals(2, results.size(), 'Both requested items returned');
        for (WorkshopSetupController.ItemResult r : results) {
            System.assertEquals('not_found', r.status, 'Unresolved names should be not_found: ' + r.name);
        }
    }

    @IsTest
    static void builtInDefaultsApplyWithoutInjectedSettings() {
        // No testSettings injected → controller falls back to its Apex defaults
        // (merged with any real 'Default' custom metadata record in the org).
        Test.startTest();
        WorkshopSetupController.Config config = WorkshopSetupController.getConfig();
        Test.stopTest();

        System.assertEquals('Note_taking_agent', config.agentApiName,
            'Default agent API name should come from the built-in defaults');
        System.assert(!config.requestedItems.isEmpty(),
            'Defaults should request at least the workshop permission set');
        Boolean hasWorkshopPs = false;
        for (WorkshopSetupController.RequestedItem item : config.requestedItems) {
            if (item.name == REAL_PS && item.type == 'PermissionSet') {
                hasWorkshopPs = true;
            }
        }
        System.assert(hasWorkshopPs, 'Built-in defaults should include the Employee_Agent_Workshop permission set');
    }

    @IsTest
    static void blankConfigYieldsNoItems() {
        WorkshopSetupController.testSettings = settings(null, null);

        Test.startTest();
        WorkshopSetupController.Config config = WorkshopSetupController.getConfig();
        List<WorkshopSetupController.ItemResult> results = WorkshopSetupController.runSetup();
        Test.stopTest();

        System.assertEquals(0, config.requestedItems.size(), 'No items configured');
        System.assertEquals(0, results.size(), 'Nothing to assign');
    }
}

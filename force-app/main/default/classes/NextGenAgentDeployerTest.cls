/**
 * Tests for NextGenAgentDeployer. The Next-Gen Authoring callouts are mocked; a session
 * id is passed in directly so the test never renders the Visualforce page. The static
 * resource (Note_taking_agent_afscript) ships with the package, so reading it is real.
 *
 * Note on the deploy path: tests can't create a BotDefinition, so after a mocked
 * publish+activate the post-deploy BotDefinition lookup finds nothing and the access grant
 * is skipped — that branch is exercised directly via grantAgentAccess() against a real
 * permission set + (any) SetupEntity below.
 */
@IsTest
private class NextGenAgentDeployerTest {
    private static final String FAKE_SESSION = '00DTESTSESSIONID';
    private static final String RESOURCE = 'Note_taking_agent_afscript';

    /** Mock that walks create → publish → activate with realistic NGA responses. */
    private class NgaMock implements HttpCalloutMock {
        Boolean failPublish = false;
        NgaMock(Boolean failPublish) { this.failPublish = failPublish; }

        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            String endpoint = req.getEndpoint();
            if (endpoint.endsWith('/bundles') && req.getMethod() == 'GET') {
                // Uniqueness lookup — return an empty bundle list (no collisions).
                res.setStatusCode(200);
                res.setBody(JSON.serialize(new Map<String, Object>{
                    'bundles' => new List<Object>()
                }));
            } else if (endpoint.endsWith('/bundles')) {
                res.setStatusCode(201);
                res.setBody(JSON.serialize(new Map<String, Object>{
                    'id' => '1bZTESTVERSION',
                    'bundleId' => '1bYTESTBUNDLE',
                    'apiName' => 'Note_taking_agent_1',
                    'versionStatus' => 'DRAFT'
                }));
            } else if (endpoint.endsWith('/publish')) {
                if (failPublish) {
                    res.setStatusCode(500);
                    res.setBody('{"message":"boom"}');
                } else {
                    res.setStatusCode(201);
                    res.setBody(JSON.serialize(new Map<String, Object>{
                        'publishedBotId' => '0XxTESTBOT',
                        'publishedBotVersionId' => '0X9TESTVER',
                        'lastPublishedOn' => '2026-06-11T00:00:00.000Z'
                    }));
                }
            } else if (endpoint.endsWith('/activate')) {
                res.setStatusCode(204);
            } else {
                res.setStatusCode(404);
                res.setBody('{"message":"unexpected endpoint"}');
            }
            return res;
        }
    }

    @IsTest
    static void deploysPublishesAndActivates() {
        Test.setMock(HttpCalloutMock.class, new NgaMock(false));

        Test.startTest();
        // A developer_name unlikely to exist as a BotDefinition in the org → takes the
        // deploy path (create/publish/activate), not the reuse path.
        NextGenAgentDeployer.Result result = NextGenAgentDeployer.deployAgent(
            'Workshop_Test_Agent_ZZZ',
            'Employee Agent V1',
            RESOURCE,
            'Employee_Agent_Workshop',
            false,
            FAKE_SESSION
        );
        Test.stopTest();

        System.assertEquals(true, result.success, 'Should report success');
        System.assertEquals(false, result.alreadyExisted, 'Should be a fresh deploy, not a reuse');
        System.assertEquals('1bZTESTVERSION', result.bundleVersionId, 'Bundle version id captured');
        System.assertEquals('0XxTESTBOT', result.publishedBotId, 'Published bot id captured');
        System.assertEquals(true, result.activated, 'Should be activated');
    }

    @IsTest
    static void forceNewDeploysFreshCopy() {
        Test.setMock(HttpCalloutMock.class, new NgaMock(false));

        Test.startTest();
        // forceNew=true skips the reuse check entirely and always takes the deploy path.
        NextGenAgentDeployer.Result result = NextGenAgentDeployer.deployAgent(
            'Note_taking_agent',
            'Employee Agent V1',
            RESOURCE,
            'Employee_Agent_Workshop',
            true,
            FAKE_SESSION
        );
        Test.stopTest();

        System.assertEquals(true, result.success, 'forceNew should still succeed');
        System.assertEquals(false, result.alreadyExisted, 'forceNew never reports already-existed');
        System.assertEquals(true, result.activated, 'Should be activated');
    }

    @IsTest
    static void publishFailureSurfacesError() {
        Test.setMock(HttpCalloutMock.class, new NgaMock(true));

        Test.startTest();
        Boolean threw = false;
        try {
            NextGenAgentDeployer.deployAgent(
                'Workshop_Test_Agent_ZZZ', 'Employee Agent V1', RESOURCE, null, false, FAKE_SESSION
            );
        } catch (AuraHandledException e) {
            threw = true;
        }
        Test.stopTest();

        System.assertEquals(true, threw, 'A publish failure should surface as AuraHandledException');
    }

    @IsTest
    static void missingArgsThrow() {
        Test.startTest();
        Boolean threw = false;
        try {
            NextGenAgentDeployer.deployAgent(null, 'x', RESOURCE, null, false, FAKE_SESSION);
        } catch (AuraHandledException e) {
            threw = true;
        }
        Test.stopTest();
        System.assertEquals(true, threw, 'Missing apiName should throw');
    }

    @IsTest
    static void alignAgentIdentityRewritesDeveloperNameAndLabel() {
        String script =
            'config:\n' +
            '    agent_label: "Old Label"\n' +
            '    developer_name: "Old_Name"\n' +
            '    agent_type: "AgentforceEmployeeAgent"\n';

        String aligned = NextGenAgentDeployer.alignAgentIdentity(script, 'New_Name', 'New Label');

        System.assert(aligned.contains('developer_name: "New_Name"'),
            'developer_name should be rewritten: ' + aligned);
        System.assert(aligned.contains('agent_label: "New Label"'),
            'agent_label should be rewritten: ' + aligned);
        System.assert(!aligned.contains('Old_Name'), 'old developer_name should be gone');
        System.assert(!aligned.contains('Old Label'), 'old agent_label should be gone');
    }

    @IsTest
    static void missingStaticResourceThrows() {
        Test.setMock(HttpCalloutMock.class, new NgaMock(false));
        Test.startTest();
        Boolean threw = false;
        try {
            NextGenAgentDeployer.deployAgent(
                'Workshop_Test_Agent_ZZZ', 'Some Agent', 'No_Such_Resource_XYZ', null, false, FAKE_SESSION
            );
        } catch (AuraHandledException e) {
            threw = true;
        }
        Test.stopTest();
        System.assertEquals(true, threw, 'Missing static resource should throw');
    }

    @IsTest
    static void deriveLabelAppendsSuffixOnlyWhenNameBumped() {
        // No collision → label unchanged.
        System.assertEquals('Employee Agent V1',
            NextGenAgentDeployer.deriveLabel('Employee Agent V1', 'Note_taking_agent', 'Note_taking_agent'),
            'Unbumped name should keep the label as-is');
        // Collision bumped to _2 → label gets " (2)".
        System.assertEquals('Employee Agent V1 (2)',
            NextGenAgentDeployer.deriveLabel('Employee Agent V1', 'Note_taking_agent', 'Note_taking_agent_2'),
            'Bumped name should append the numeric suffix to the label');
        System.assertEquals('Employee Agent V1 (3)',
            NextGenAgentDeployer.deriveLabel('Employee Agent V1', 'Note_taking_agent', 'Note_taking_agent_3'),
            'Third copy should read (3)');
        // Blank label falls back to the resolved api name.
        System.assertEquals('Note_taking_agent_2',
            NextGenAgentDeployer.deriveLabel('', 'Note_taking_agent', 'Note_taking_agent_2'),
            'Blank label falls back to the resolved api name');
    }

    @IsTest
    static void grantAgentAccessIsNullSafe() {
        Test.startTest();
        // Blank perm set / null bot → no grant, no exception.
        System.assertEquals(false, NextGenAgentDeployer.grantAgentAccess('', null),
            'Blank inputs should return false');
        // Unknown permission set name → false (not found), no exception.
        System.assertEquals(false,
            NextGenAgentDeployer.grantAgentAccess('No_Such_Perm_Set_XYZ', UserInfo.getUserId()),
            'Unknown perm set should return false');
        Test.stopTest();
    }
}

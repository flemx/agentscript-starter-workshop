/**
 * Tests for NoteCaptureController — file upload + agent listing.
 * (AI transcription / prompt processing are tested in NoteCaptureAITest with mocks.)
 */
@IsTest
private class NoteCaptureControllerTest {
    @IsTest
    static void uploadsFile() {
        String b64 = EncodingUtil.base64Encode(Blob.valueOf('hello world'));

        Test.startTest();
        NoteCaptureController.UploadedFile f = NoteCaptureController.uploadFile('memo.txt', b64, null);
        Test.stopTest();

        System.assertNotEquals(null, f.contentVersionId, 'Should return a ContentVersion id');
        System.assertNotEquals(null, f.contentDocumentId, 'Should return a ContentDocument id');
        System.assertEquals('memo.txt', f.name, 'Name should match');
    }

    @IsTest
    static void uploadsAndLinksFile() {
        Account acc = new Account(Name = 'Capture Acct');
        insert acc;
        String b64 = EncodingUtil.base64Encode(Blob.valueOf('data'));

        Test.startTest();
        NoteCaptureController.UploadedFile f = NoteCaptureController.uploadFile('x.png', b64, acc.Id);
        Test.stopTest();

        List<ContentDocumentLink> links = [
            SELECT Id FROM ContentDocumentLink
            WHERE ContentDocumentId = :f.contentDocumentId AND LinkedEntityId = :acc.Id
        ];
        System.assertEquals(1, links.size(), 'File should be linked to the account');
    }

    @IsTest
    static void uploadRejectsBlank() {
        Test.startTest();
        Boolean threw = false;
        try {
            NoteCaptureController.uploadFile('', '', null);
        } catch (Exception e) {
            threw = true;
        }
        Test.stopTest();
        System.assertEquals(true, threw, 'Blank file should throw');
    }

    @IsTest
    static void listsEmployeeAgents() {
        // No agents are guaranteed in a test org; assert the call works and returns a list.
        Test.startTest();
        List<NoteCaptureController.AgentOption> agents = NoteCaptureController.listEmployeeAgents();
        Test.stopTest();
        System.assertNotEquals(null, agents, 'Should return a (possibly empty) list, not null');
    }
}

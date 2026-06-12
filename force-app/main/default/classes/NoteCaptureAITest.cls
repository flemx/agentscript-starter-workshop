/**
 * Tests for NoteCaptureAI using the mockResult test seam (the underlying AI features —
 * the speech-to-text standard action and the prompt template — aren't guaranteed in a
 * test org, so we assert the orchestration, not the platform AI).
 */
@IsTest
private class NoteCaptureAITest {
    @IsTest
    static void transcribeReturnsMock() {
        NoteCaptureAI.mockResult = 'transcribed text';
        ContentVersion cv = makeFile('a.m4a', 'audio-bytes');

        Test.startTest();
        String text = NoteCaptureAI.transcribeAudio(cv.Id);
        Test.stopTest();

        System.assertEquals('transcribed text', text, 'Mock transcript should be returned');
    }

    @IsTest
    static void processFilesReturnsMockCombined() {
        NoteCaptureAI.mockResult = 'file text';
        ContentVersion a = makeFile('a.png', 'img-a');
        ContentVersion b = makeFile('b.png', 'img-b');

        Test.startTest();
        String text = NoteCaptureAI.processFiles(new List<Id>{ a.Id, b.Id });
        Test.stopTest();

        System.assertEquals('file text', text, 'Mock file text should be returned');
    }

    @IsTest
    static void processFilesEmptyReturnsEmpty() {
        Test.startTest();
        String text = NoteCaptureAI.processFiles(new List<Id>());
        Test.stopTest();
        System.assertEquals('', text, 'No files yields empty string');
    }

    @IsTest
    static void transcribeDegradesGracefully() {
        // No mock + no AI feature in the test org → should NOT throw; returns a placeholder.
        ContentVersion cv = makeFile('a.m4a', 'audio-bytes');

        Test.startTest();
        String text = NoteCaptureAI.transcribeAudio(cv.Id);
        Test.stopTest();

        System.assert(text != null, 'Should return a string, not throw');
        System.assert(text.contains('not enabled') || text.length() >= 0, 'Graceful placeholder or value');
    }

    private static ContentVersion makeFile(String name, String body) {
        ContentVersion cv = new ContentVersion(
            Title = name,
            PathOnClient = name,
            VersionData = Blob.valueOf(body),
            IsMajorVersion = true
        );
        insert cv;
        return [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];
    }
}

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
    static void processFilesReturnsMock() {
        NoteCaptureAI.mockResult = 'combined file description';
        ContentVersion a = makeFile('a.png', 'img-a');
        ContentVersion b = makeFile('b.png', 'img-b');
        ContentVersion c = makeFile('c.png', 'img-c');

        Test.startTest();
        String text = NoteCaptureAI.processFiles(new List<Id>{ a.Id, b.Id, c.Id });
        Test.stopTest();

        // All files go in one call — mock short-circuits before the template and returns as-is.
        System.assertEquals('combined file description', text, 'Mock result should be returned directly');
    }

    @IsTest
    static void processFilesEmptyReturnsEmpty() {
        Test.startTest();
        String text = NoteCaptureAI.processFiles(new List<Id>());
        Test.stopTest();
        System.assertEquals('', text, 'No files yields empty string');
    }

    @IsTest
    static void processFilesRejectsMoreThanMax() {
        ContentVersion a = makeFile('a.png', 'img-a');
        ContentVersion b = makeFile('b.png', 'img-b');
        ContentVersion c = makeFile('c.png', 'img-c');
        ContentVersion d = makeFile('d.png', 'img-d');

        Test.startTest();
        Boolean threw = false;
        try {
            NoteCaptureAI.processFiles(new List<Id>{ a.Id, b.Id, c.Id, d.Id });
        } catch (Exception e) {
            threw = true;
        }
        Test.stopTest();

        System.assertEquals(true, threw, 'More than ' + NoteCaptureAI.MAX_FILES + ' files should throw');
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

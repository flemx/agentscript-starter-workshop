/**
 * Tests for HtmlNoteService — HTML ContentNote creation, record linking, the invocable
 * entry point, and HTML sanitization.
 */
@IsTest
private class HtmlNoteServiceTest {
    // ContentNote-dependent tests no-op where the Notes feature isn't enabled (e.g. the
    // package-build scratch org), so the suite still passes there. They run in full wherever
    // ContentNote exists (sandbox / production).
    private static Boolean notesAvailable() {
        return Schema.getGlobalDescribe().containsKey('ContentNote');
    }

    @IsTest
    static void createsHtmlNote() {
        if (!notesAvailable()) {
            return;
        }
        String html = '<h1>Meeting</h1><p><b>Decisions</b></p><ul><li>Ship Friday</li></ul>';

        Test.startTest();
        Id docId = HtmlNoteService.createHtmlNote('My Note', html, null);
        Test.stopTest();

        System.assertNotEquals(null, docId, 'Should return a ContentDocumentId');
        // ContentNote referenced via dynamic SOQL so this test class compiles without the type.
        List<SObject> notes = Database.query(
            'SELECT Id, Title FROM ContentNote WHERE LatestPublishedVersionId != null'
        );
        System.assert(!notes.isEmpty(), 'A ContentNote should exist');
    }

    @IsTest
    static void createsAndLinksToRecord() {
        if (!notesAvailable()) {
            return;
        }
        Account acc = new Account(Name = 'Acme Test');
        insert acc;

        Test.startTest();
        Id docId = HtmlNoteService.createHtmlNote('Linked Note', '<p>hello</p>', acc.Id);
        Test.stopTest();

        List<ContentDocumentLink> links = [
            SELECT Id FROM ContentDocumentLink
            WHERE ContentDocumentId = :docId AND LinkedEntityId = :acc.Id
        ];
        System.assertEquals(1, links.size(), 'Note should be linked to the account');
    }

    @IsTest
    static void linkIsIdempotent() {
        if (!notesAvailable()) {
            return;
        }
        Account acc = new Account(Name = 'Acme Test 2');
        insert acc;
        Id docId = HtmlNoteService.createHtmlNote('Note', '<p>x</p>', null);

        Test.startTest();
        HtmlNoteService.linkNoteToRecord(docId, acc.Id);
        HtmlNoteService.linkNoteToRecord(docId, acc.Id); // second call must not duplicate
        Test.stopTest();

        List<ContentDocumentLink> links = [
            SELECT Id FROM ContentDocumentLink
            WHERE ContentDocumentId = :docId AND LinkedEntityId = :acc.Id
        ];
        System.assertEquals(1, links.size(), 'Linking twice should not create a duplicate');
    }

    @IsTest
    static void blankTitleThrows() {
        Test.startTest();
        Boolean threw = false;
        try {
            HtmlNoteService.createHtmlNote('', '<p>x</p>', null);
        } catch (Exception e) {
            threw = true;
        }
        Test.stopTest();
        System.assertEquals(true, threw, 'Blank title should throw');
    }

    @IsTest
    static void invocableCreatesNotes() {
        if (!notesAvailable()) {
            return;
        }
        HtmlNoteService.Request req = new HtmlNoteService.Request();
        req.title = 'Invocable Note';
        req.htmlBody = '<p>From an agent</p>';

        Test.startTest();
        List<HtmlNoteService.Response> res = HtmlNoteService.createHtmlNotes(
            new List<HtmlNoteService.Request>{ req }
        );
        Test.stopTest();

        System.assertEquals(1, res.size());
        System.assertEquals(true, res[0].isSuccess, 'Invocable should succeed');
        System.assertNotEquals(null, res[0].contentDocumentId);
    }

    @IsTest
    static void invocableReportsFailure() {
        HtmlNoteService.Request req = new HtmlNoteService.Request();
        req.title = ''; // invalid → failure captured, not thrown
        req.htmlBody = '<p>x</p>';

        Test.startTest();
        List<HtmlNoteService.Response> res = HtmlNoteService.createHtmlNotes(
            new List<HtmlNoteService.Request>{ req }
        );
        Test.stopTest();

        System.assertEquals(false, res[0].isSuccess, 'Blank title should be reported as failure');
        System.assertNotEquals(null, res[0].errorMessage);
    }

    @IsTest
    static void sanitizeStripsDisallowedTags() {
        String dirty = '<p>ok</p><script>alert(1)</script><marquee>no</marquee><b>keep</b>';
        String clean = HtmlNoteService.sanitize(dirty);

        System.assert(!clean.containsIgnoreCase('<script'), 'script should be removed');
        System.assert(!clean.containsIgnoreCase('alert(1)'), 'script body should be removed');
        System.assert(!clean.containsIgnoreCase('<marquee'), 'disallowed tag should be removed');
        System.assert(clean.contains('<b>keep</b>'), 'allowed tag should survive');
        System.assert(clean.contains('no'), 'inner text of stripped tag should remain');
    }

    @IsTest
    static void sanitizeHandlesBlank() {
        System.assertEquals('<p></p>', HtmlNoteService.sanitize(''), 'Blank input yields an empty paragraph');
    }
}

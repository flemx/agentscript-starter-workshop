/**
 * Tests for HtmlNoteService — HTML ContentNote creation, record linking, the invocable
 * entry point, and HTML sanitization.
 *
 * Portability: ContentNote isn't present in every org (scratch/trial orgs lack it), so the
 * Notes-dependent tests early-return when HtmlNoteService.isAvailable() is false, and any
 * ContentNote SOQL is dynamic (Database.query) so this class compiles everywhere. The
 * sanitize / validation tests run unconditionally.
 */
@IsTest
private class HtmlNoteServiceTest {
    @IsTest
    static void createsHtmlNote() {
        if (!HtmlNoteService.isAvailable()) {
            return; // org without ContentNote — covered by availabilityReportsCorrectly
        }
        String html = '<h1>Meeting</h1><p><b>Decisions</b></p><ul><li>Ship Friday</li></ul>';

        Test.startTest();
        Id docId = HtmlNoteService.createHtmlNote('My Note', html, null);
        Test.stopTest();

        System.assertNotEquals(null, docId, 'Should return a ContentDocumentId');
        List<SObject> notes = Database.query(
            'SELECT Id, Title FROM ContentNote WHERE LatestPublishedVersionId != null'
        );
        System.assert(!notes.isEmpty(), 'A ContentNote should exist');
    }

    @IsTest
    static void createsAndLinksToRecord() {
        if (!HtmlNoteService.isAvailable()) {
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
        if (!HtmlNoteService.isAvailable()) {
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
    static void invocableCreatesNotesAndReturnsRecord() {
        if (!HtmlNoteService.isAvailable()) {
            return;
        }
        HtmlNoteService.Request req = new HtmlNoteService.Request();
        req.subject = 'Invocable Note';
        req.content = '<p>From an agent</p>';

        Test.startTest();
        List<HtmlNoteService.Response> res = HtmlNoteService.createHtmlNotes(
            new List<HtmlNoteService.Request>{ req }
        );
        Test.stopTest();

        System.assertEquals(1, res.size());
        System.assertEquals(true, res[0].isSuccess, 'Invocable should succeed');
        System.assertNotEquals(null, res[0].noteUrl, 'Should return a clickable note URL');
        System.assert(res[0].noteUrl.contains('Employee_Agent_Workshop_Notes'), 'URL should point at the Enhanced Notes viewer');
    }

    @IsTest
    static void invocableReportsFailure() {
        HtmlNoteService.Request req = new HtmlNoteService.Request();
        req.subject = ''; // invalid → failure captured, not thrown
        req.content = '<p>x</p>';

        Test.startTest();
        List<HtmlNoteService.Response> res = HtmlNoteService.createHtmlNotes(
            new List<HtmlNoteService.Request>{ req }
        );
        Test.stopTest();

        System.assertEquals(false, res[0].isSuccess, 'Blank subject should be reported as failure');
        System.assertNotEquals(null, res[0].message);
    }

    @IsTest
    static void availabilityReportsCorrectly() {
        // Always callable; returns a Boolean reflecting org support for ContentNote.
        Boolean available = HtmlNoteService.isAvailable();
        System.assertEquals(
            Schema.getGlobalDescribe().containsKey('ContentNote'),
            available,
            'isAvailable should reflect ContentNote presence in this org'
        );
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

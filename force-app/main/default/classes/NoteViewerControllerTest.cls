/**
 * Tests for NoteViewerController — listing notes and fetching a note's HTML.
 * Notes are created via HtmlNoteService so the test exercises the real read/write round-trip.
 */
@IsTest
private class NoteViewerControllerTest {
    @IsTest
    static void getNoteReturnsHtml() {
        String html = '<h1>Title</h1><p><b>bold</b></p>';
        Id docId = HtmlNoteService.createHtmlNote('Viewer Note', html, null);

        Test.startTest();
        NoteViewerController.NoteContent nc = NoteViewerController.getNote(docId);
        Test.stopTest();

        System.assertEquals('Viewer Note', nc.title, 'Title should match');
        System.assert(nc.html.contains('<b>bold</b>'), 'HTML body should round-trip: ' + nc.html);
    }

    @IsTest
    static void getNotesListsNotes() {
        HtmlNoteService.createHtmlNote('Note A', '<p>a</p>', null);
        HtmlNoteService.createHtmlNote('Note B', '<p>b</p>', null);

        Test.startTest();
        List<NoteViewerController.NoteSummary> notes = NoteViewerController.getNotes(10);
        Test.stopTest();

        System.assert(notes.size() >= 2, 'Should list at least the two created notes');
        for (NoteViewerController.NoteSummary s : notes) {
            System.assertNotEquals(null, s.contentDocumentId, 'Each summary needs a doc id');
            System.assertNotEquals(null, s.title, 'Each summary needs a title');
        }
    }

    @IsTest
    static void getNotesRespectsDefaultLimit() {
        Test.startTest();
        List<NoteViewerController.NoteSummary> notes = NoteViewerController.getNotes(null);
        Test.stopTest();
        System.assertNotEquals(null, notes, 'Null limit should fall back to a default, not error');
    }
}

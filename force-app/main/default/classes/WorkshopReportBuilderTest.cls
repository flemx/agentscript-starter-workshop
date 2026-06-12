/**
 * Tests for WorkshopReportBuilder — full styled HTML assembly + note creation. The note
 * insert path requires ContentNote (real sandbox has it; scratch/trial may not), so the
 * note-dependent assertions early-return when HtmlNoteService.isAvailable() is false. The
 * HTML assembly itself is exercised unconditionally via the returned fullHtml.
 */
@IsTest
private class WorkshopReportBuilderTest {

    private static WorkshopReportBuilder.Request sampleRequest() {
        WorkshopReportBuilder.Request r = new WorkshopReportBuilder.Request();
        r.reportTitle = 'MidOcean — Agentforce Use-Case Research';
        r.clientName = 'MidOcean';
        r.executiveSummary = 'The team should start with order status & track-and-trace.';
        r.useCases = '<table><tr><th>Use case</th><th>Impact</th></tr>'
            + '<tr><td>Order status</td><td>High</td></tr></table>';
        r.webResearch = 'Promotional-products firms see high deflection from status agents.';
        r.salesforceGuidance = 'Use Agentforce Employee Agent with Flow + Knowledge.';
        r.recommendations = 'Build the order-status agent first.\nAdd complaint triage second.';
        r.sources = '<ul><li><a href="https://help.salesforce.com">Salesforce Help</a></li></ul>';
        return r;
    }

    @IsTest
    static void buildsFullStyledHtml() {
        Test.startTest();
        List<WorkshopReportBuilder.Response> res =
            WorkshopReportBuilder.build(new List<WorkshopReportBuilder.Request>{ sampleRequest() });
        Test.stopTest();

        WorkshopReportBuilder.Response r = res[0];
        System.assertNotEquals(null, r.fullHtml, 'fullHtml should always be produced');
        System.assert(r.fullHtml.contains('<!doctype html>'), 'Should be a full HTML document');
        System.assert(r.fullHtml.contains('MidOcean'), 'Title/client should appear');
        System.assert(r.fullHtml.contains('Executive summary'), 'Sections should render');
        System.assert(r.fullHtml.contains('<svg'), 'Agentforce mark should be embedded');
        System.assert(r.fullHtml.contains('Order status'), 'Use-case table content should pass through');
        // Plain-text recommendations should have been wrapped in <p>.
        System.assert(r.fullHtml.contains('<p>Build the order-status agent first.</p>'),
            'Plain-text lines should be wrapped in paragraphs');
    }

    @IsTest
    static void savesNoteWhenContentNoteAvailable() {
        if (!HtmlNoteService.isAvailable()) {
            return; // org without ContentNote — full-HTML path covered above
        }
        Test.startTest();
        List<WorkshopReportBuilder.Response> res =
            WorkshopReportBuilder.build(new List<WorkshopReportBuilder.Request>{ sampleRequest() });
        Test.stopTest();

        WorkshopReportBuilder.Response r = res[0];
        System.assertEquals(true, r.isSuccess, 'Should succeed when ContentNote is available');
        System.assertNotEquals(null, r.noteId, 'Should return the created note Id');
        System.assertNotEquals(null, r.note, 'Should return the ContentDocument record');
        System.assertEquals(r.noteId, r.note.Id, 'Returned record Id should match noteId');
    }

    @IsTest
    static void handlesBlankTitleAndEmptySlots() {
        WorkshopReportBuilder.Request r = new WorkshopReportBuilder.Request();
        r.executiveSummary = 'Only a summary, nothing else.';

        Test.startTest();
        List<WorkshopReportBuilder.Response> res =
            WorkshopReportBuilder.build(new List<WorkshopReportBuilder.Request>{ r });
        Test.stopTest();

        System.assert(res[0].fullHtml.contains('AI Use-Case Research Report'),
            'Blank title should fall back to a default');
        System.assert(!res[0].fullHtml.contains('What the web tells us'),
            'Empty slots should be omitted from the report');
    }
}

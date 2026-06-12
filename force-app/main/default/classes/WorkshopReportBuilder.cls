/**
 * Heavy-lifting report builder for the Use-Case Research agent.
 *
 * The agent supplies CONTENT for a handful of named slots (executive summary, prioritized
 * use cases, web research, Salesforce guidance, recommendations, sources); this class owns
 * the PRESENTATION — it assembles a polished, branded report so the agent never has to
 * hand-author CSS or a full HTML skeleton (which it does inconsistently and which inflates
 * token use). It then:
 *   1. creates a Salesforce Note (ContentNote) with a clean, rich-text-safe version of the
 *      report (ContentNote strips inline CSS/scripts, so the stored note is structured rich
 *      text — headings, tables, lists, links), via HtmlNoteService; and
 *   2. returns `fullHtml` — the FULLY-STYLED standalone report (gradient hero, Agentforce
 *      mark, section cards, source list) — so the hosting LWC / a download can render the
 *      genuinely beautiful artifact the workshop participant takes away.
 *
 * Exposed as an @InvocableMethod so it can be added to an agent as an action.
 */
public with sharing class WorkshopReportBuilder {

    @InvocableMethod(
        label='Build Use-Case Research Report'
        description='Assembles a polished HTML use-case research report from content slots, saves it as a Salesforce Note, and returns both the note record and the full styled HTML for display/download.'
        category='Agent Workshop'
    )
    public static List<Response> build(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            Response res = new Response();
            try {
                String fullHtml = renderFullHtml(req);   // beautiful, full-CSS version
                String noteHtml = renderNoteBody(req);    // ContentNote-safe rich text
                res.fullHtml = fullHtml;

                String title = String.isBlank(req.reportTitle)
                    ? 'AI Use-Case Research Report'
                    : req.reportTitle;
                Id docId = HtmlNoteService.createHtmlNote(title, noteHtml, req.recordId);
                res.noteId = docId;
                res.note = loadNote(docId);
                res.isSuccess = true;
                res.message = 'Report created and saved as the note "' + title + '".';
            } catch (Exception e) {
                res.isSuccess = false;
                res.message = 'Could not build the report: ' + e.getMessage();
            }
            responses.add(res);
        }
        return responses;
    }

    // ── Full styled HTML (standalone artifact) ─────────────────────────────────────────

    /**
     * The beautiful, self-contained report: gradient hero with an inline Agentforce mark,
     * section cards, and a sources footer. All CSS is inline/embedded so it renders anywhere
     * (browser, LWC iframe, download) without external dependencies.
     */
    private static String renderFullHtml(Request req) {
        String title = esc(blankTo(req.reportTitle, 'AI Use-Case Research Report'));
        String client = esc(blankTo(req.clientName, 'Workshop'));
        String s = '';
        s += '<!doctype html><html lang="en"><head><meta charset="utf-8"/>';
        s += '<meta name="viewport" content="width=device-width, initial-scale=1"/>';
        s += '<title>' + title + '</title>';
        s += '<style>' + css() + '</style></head><body><div class="page">';

        // Hero — gradient, decorative orbs, Agentforce mark, and an "agent constellation" panel
        s += '<header class="hero">';
        s += '<div class="orb orb1"></div><div class="orb orb2"></div>';
        s += '<div class="hero-main">' + agentforceMark();
        s += '<div class="hero-text"><div class="kicker">Agentforce · Design-Thinking Workshop</div>';
        s += '<h1>' + title + '</h1>';
        s += '<p class="sub">' + client + ' — use-case discovery, researched and ready to act on.</p>';
        s += '<div class="chips"><span class="chip">Web research</span><span class="chip">Salesforce docs</span>'
           + '<span class="chip">Prioritized roadmap</span></div></div></div>';
        s += heroArt();
        s += '</header>';

        // Section cards (each with an accent icon)
        s += section('Executive summary', iconSummary(), cleanBlock(req.executiveSummary));
        s += section('Prioritized use cases', iconGrid(), pillify(cleanBlock(req.useCases)));
        s += section('What the web tells us', iconGlobe(), cleanBlock(req.webResearch));
        s += section('How Salesforce &amp; Agentforce helps', iconCloud(), cleanBlock(req.salesforceGuidance));
        s += section('Recommended next steps', iconCheck(), cleanBlock(req.recommendations));

        // Sources
        if (String.isNotBlank(req.sources)) {
            s += '<section class="card sources"><div class="cardhead">' + iconLink()
               + '<h2>Sources &amp; further reading</h2></div><div class="body">'
               + cleanBlock(req.sources) + '</div></section>';
        }

        s += '<footer class="foot"><span class="dot"></span>Generated by Agentforce · '
           + esc(blankTo(req.clientName, 'MidOcean'))
           + ' AI Workshop · This report summarizes a design-thinking session and supporting research.</footer>';
        s += '</div></body></html>';
        return s;
    }

    private static String section(String heading, String iconSvg, String bodyHtml) {
        if (String.isBlank(bodyHtml)) {
            return '';
        }
        return '<section class="card"><div class="cardhead">' + iconSvg + '<h2>' + heading
            + '</h2></div><div class="body">' + bodyHtml + '</div></section>';
    }

    /**
     * Adds color to Impact / Effort cells in the use-case table by wrapping High/Medium/Low
     * (and Low-to-Mid etc.) in colored pills — purely presentational, applied to the table the
     * agent supplies. Looks for standalone level words inside <td>…</td>.
     */
    private static String pillify(String html) {
        if (String.isBlank(html)) {
            return html;
        }
        String out = html;
        out = out.replaceAll('(?i)<td([^>]*)>\\s*(High[^<]*)</td>', '<td$1><span class="pill pill-hi">$2</span></td>');
        out = out.replaceAll('(?i)<td([^>]*)>\\s*(Mid[^<]*|Medium[^<]*)</td>', '<td$1><span class="pill pill-mid">$2</span></td>');
        out = out.replaceAll('(?i)<td([^>]*)>\\s*(Low[^<]*)</td>', '<td$1><span class="pill pill-lo">$2</span></td>');
        return out;
    }

    // ── Inline SVG art (no external image dependencies) ─────────────────────────────────

    /** Agentforce-style robot mark in the hero. */
    private static String agentforceMark() {
        return '<svg class="mark" viewBox="0 0 120 120" fill="none" '
            + 'stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">'
            + '<circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,.4)" stroke-width="3"/>'
            + '<rect x="34" y="46" width="52" height="38" rx="11" fill="rgba(255,255,255,.18)"/>'
            + '<circle cx="50" cy="65" r="5.5" fill="#fff" stroke="none"/>'
            + '<circle cx="70" cy="65" r="5.5" fill="#fff" stroke="none"/>'
            + '<line x1="60" y1="32" x2="60" y2="46"/><circle cx="60" cy="30" r="4" fill="#fff" stroke="none"/>'
            + '</svg>';
    }

    /** Decorative "agent constellation" panel on the right of the hero — modern Agentforce vibe. */
    private static String heroArt() {
        return '<svg class="art" viewBox="0 0 220 160" fill="none" aria-hidden="true">'
            + '<g stroke="rgba(255,255,255,.32)" stroke-width="1.5">'
            + '<line x1="40" y1="40" x2="110" y2="80"/><line x1="110" y1="80" x2="180" y2="46"/>'
            + '<line x1="110" y1="80" x2="80" y2="130"/><line x1="110" y1="80" x2="170" y2="120"/>'
            + '<line x1="40" y1="40" x2="80" y2="130"/></g>'
            + '<g fill="#bfe0ff">'
            + '<circle cx="110" cy="80" r="13" fill="#ffffff"/>'
            + '<circle cx="40" cy="40" r="7"/><circle cx="180" cy="46" r="7"/>'
            + '<circle cx="80" cy="130" r="7"/><circle cx="170" cy="120" r="7"/></g>'
            + '<circle cx="110" cy="80" r="22" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.5"/>'
            + '</svg>';
    }

    private static String iconWrap(String paths) {
        return '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg></span>';
    }
    private static String iconSummary() { return iconWrap('<path d="M4 6h16M4 12h16M4 18h10"/>'); }
    private static String iconGrid()    { return iconWrap('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'); }
    private static String iconGlobe()   { return iconWrap('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>'); }
    private static String iconCloud()   { return iconWrap('<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 18 18H7z"/>'); }
    private static String iconCheck()   { return iconWrap('<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>'); }
    private static String iconLink()    { return iconWrap('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'); }

    private static String css() {
        return ''
        + '*{box-sizing:border-box;margin:0;padding:0}'
        + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;'
        + 'background:radial-gradient(1200px 600px at 50% -120px,#dfeaff,#eef3fb 60%);color:#0b1d3a;'
        + 'line-height:1.6;padding:36px 16px}'
        + '.page{max-width:940px;margin:0 auto}'
        // hero
        + '.hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:20px;'
        + 'background:linear-gradient(135deg,#061330,#13357f 48%,#0aa3e0);color:#fff;border-radius:24px;'
        + 'padding:38px 40px;box-shadow:0 24px 60px rgba(9,30,70,.32)}'
        + '.hero-main{display:flex;align-items:center;gap:22px;position:relative;z-index:2}'
        + '.mark{width:88px;height:88px;flex:0 0 auto;filter:drop-shadow(0 6px 14px rgba(0,0,0,.25))}'
        + '.art{width:220px;height:160px;flex:0 0 auto;position:relative;z-index:2;opacity:.95}'
        + '.orb{position:absolute;border-radius:50%;filter:blur(2px);opacity:.5}'
        + '.orb1{width:230px;height:230px;right:-60px;top:-90px;background:radial-gradient(circle,#37c6ff,transparent 70%)}'
        + '.orb2{width:180px;height:180px;left:-50px;bottom:-90px;background:radial-gradient(circle,#6f8bff,transparent 70%)}'
        + '.hero .kicker{text-transform:uppercase;letter-spacing:.18em;font-size:11.5px;font-weight:800;color:#bfe0ff}'
        + '.hero h1{font-size:31px;line-height:1.12;margin:8px 0 9px;font-weight:800;letter-spacing:-.4px}'
        + '.hero .sub{color:#e2edff;font-size:15px;max-width:54ch}'
        + '.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}'
        + '.chip{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);border-radius:999px;'
        + 'padding:5px 13px;font-size:12px;font-weight:600;color:#eaf3ff}'
        // cards
        + '.card{background:#fff;border:1px solid #e0e9f6;border-radius:18px;padding:24px 30px;margin-top:20px;'
        + 'box-shadow:0 10px 28px rgba(13,40,90,.07)}'
        + '.cardhead{display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-bottom:13px;'
        + 'border-bottom:2px solid #eef4fc}'
        + '.cardhead h2{font-size:19px;font-weight:800;color:#10336e;letter-spacing:-.2px}'
        + '.ico{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;flex:0 0 auto;'
        + 'border-radius:11px;background:linear-gradient(135deg,#1a4ba0,#0aa3e0);color:#fff}'
        + '.ico svg{width:20px;height:20px}'
        + '.card .body{font-size:15px}'
        + '.card .body p{margin:0 0 12px}'
        + '.card .body ul,.card .body ol{margin:0 0 12px 22px}'
        + '.card .body li{margin:6px 0}'
        + '.card .body h3{font-size:16px;color:#1a4ba0;margin:16px 0 7px;font-weight:700}'
        + '.card table{width:100%;border-collapse:separate;border-spacing:0;margin:10px 0 14px;font-size:14px;'
        + 'border:1px solid #e0e9f6;border-radius:12px;overflow:hidden}'
        + '.card th,.card td{padding:11px 13px;text-align:left;vertical-align:top;border-bottom:1px solid #eef4fc}'
        + '.card th{background:#10336e;color:#fff;font-weight:700;font-size:13px;letter-spacing:.02em}'
        + '.card tr:last-child td{border-bottom:none}'
        + '.card tbody tr:nth-child(even){background:#f7faff}'
        + '.card a{color:#0a6ed1;text-decoration:none;font-weight:600}.card a:hover{text-decoration:underline}'
        // pills
        + '.pill{display:inline-block;padding:3px 11px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}'
        + '.pill-hi{background:#e3f6ec;color:#1b7a45}'
        + '.pill-mid{background:#fff3da;color:#9a6400}'
        + '.pill-lo{background:#eef1f6;color:#5a6b86}'
        + '.sources{background:#f7faff}'
        + '.foot{display:flex;align-items:center;justify-content:center;gap:8px;color:#5b7299;font-size:12.5px;'
        + 'text-align:center;margin:28px 8px 0}'
        + '.foot .dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#1a4ba0,#0aa3e0)}'
        + '@media(max-width:680px){.art{display:none}.hero{padding:28px 24px}.hero h1{font-size:25px}}';
    }

    // ── ContentNote-safe rich text (the stored note) ───────────────────────────────────

    /**
     * The note body. ContentNote strips inline CSS, so this is a clean structured rich-text
     * version: an <h1> title, then <h2> sections. HtmlNoteService.sanitize() further enforces
     * the allowed-tag whitelist on insert.
     */
    private static String renderNoteBody(Request req) {
        String s = '';
        s += '<h1>' + esc(blankTo(req.reportTitle, 'AI Use-Case Research Report')) + '</h1>';
        if (String.isNotBlank(req.clientName)) {
            s += '<p><b>Client:</b> ' + esc(req.clientName) + '</p>';
        }
        s += noteSection('Executive summary', req.executiveSummary);
        s += noteSection('Prioritized use cases', req.useCases);
        s += noteSection('What the web tells us', req.webResearch);
        s += noteSection('How Salesforce / Agentforce helps', req.salesforceGuidance);
        s += noteSection('Recommended next steps', req.recommendations);
        s += noteSection('Sources &amp; further reading', req.sources);
        return s;
    }

    private static String noteSection(String heading, String bodyHtml) {
        if (String.isBlank(bodyHtml)) {
            return '';
        }
        return '<h2>' + heading + '</h2>' + cleanBlock(bodyHtml);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────────────

    /**
     * Content slots may arrive as plain text (from the LLM) or already as HTML. If a slot has
     * no tags at all, wrap newline-separated lines in <p>; otherwise pass it through (the
     * downstream note insert sanitizes it; the full-HTML version trusts our own template).
     */
    private static String cleanBlock(String raw) {
        if (String.isBlank(raw)) {
            return '';
        }
        String t = raw.trim();
        if (t.contains('<') && t.contains('>')) {
            return t; // already HTML
        }
        String out = '';
        for (String line : t.split('\n')) {
            String ln = line.trim();
            if (String.isNotBlank(ln)) {
                out += '<p>' + esc(ln) + '</p>';
            }
        }
        return out;
    }

    private static String blankTo(String v, String fallback) {
        return String.isBlank(v) ? fallback : v;
    }

    /** Minimal HTML-escape for text we inject into attribute/heading contexts. */
    private static String esc(String v) {
        if (v == null) {
            return '';
        }
        return v.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
    }

    private static ContentDocument loadNote(Id contentDocumentId) {
        if (contentDocumentId == null) {
            return null;
        }
        List<ContentDocument> docs = [
            SELECT Id, Title, LatestPublishedVersionId, FileType, FileExtension,
                   ContentSize, OwnerId, CreatedDate, LastModifiedDate
            FROM ContentDocument WHERE Id = :contentDocumentId WITH USER_MODE LIMIT 1
        ];
        return docs.isEmpty() ? null : docs[0];
    }

    // ── DTOs ───────────────────────────────────────────────────────────────────────────

    public class Request {
        @InvocableVariable(required=true label='Report Title'
            description='The report title / headline, e.g. "MidOcean — Agentforce Use-Case Research".')
        public String reportTitle;

        @InvocableVariable(label='Client / Workshop Name'
            description='The client or workshop name shown in the report header, e.g. "MidOcean".')
        public String clientName;

        @InvocableVariable(label='Executive Summary'
            description='A short executive summary of the workshop and the opportunity (plain text or HTML).')
        public String executiveSummary;

        @InvocableVariable(label='Prioritized Use Cases'
            description='The prioritized use cases, ideally as an HTML table or list (title, impact, effort, what it does). Plain text is also accepted.')
        public String useCases;

        @InvocableVariable(label='Web Research'
            description='A summary of relevant findings from the web search (HTML or plain text).')
        public String webResearch;

        @InvocableVariable(label='Salesforce Guidance'
            description='A summary of relevant Salesforce/Agentforce documentation guidance (HTML or plain text).')
        public String salesforceGuidance;

        @InvocableVariable(label='Recommended Next Steps'
            description='Concrete recommended next steps for the client (HTML list or plain text).')
        public String recommendations;

        @InvocableVariable(label='Sources'
            description='Sources and links used, ideally as an HTML list of <a> links (or newline-separated URLs).')
        public String sources;

        @InvocableVariable(label='Record Id'
            description='Optional Salesforce record Id to associate the note with. Leave blank for a standalone note.')
        public String recordId;
    }

    public class Response {
        @InvocableVariable(label='Success') public Boolean isSuccess;
        @InvocableVariable(label='Note') public ContentDocument note;
        @InvocableVariable(label='Note Id') public Id noteId;
        @InvocableVariable(label='Full HTML') public String fullHtml;
        @InvocableVariable(label='Message') public String message;
    }
}

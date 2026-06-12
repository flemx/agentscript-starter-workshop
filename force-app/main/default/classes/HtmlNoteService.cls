/**
 * Creates richly-formatted Salesforce Notes (ContentNote) from HTML.
 *
 * The standard "Create Note" path stores plain text. ContentNote, by contrast, stores its
 * body as HTML in a Blob — so a note can carry headings, bold, lists, and (optionally)
 * embedded images. This service:
 *   - creates a ContentNote whose Content is the supplied HTML (NOT escaped),
 *   - optionally links it to a parent record (ContentDocumentLink),
 * and is callable three ways: from LWC (@AuraEnabled), from a Flow/agent action
 * (@InvocableMethod), and directly from Apex.
 *
 * Why HTML matters here: it unlocks nicely-formatted meeting summaries and a polished
 * "workshop report" deliverable straight out of the agent.
 *
 * PORTABILITY — why ContentNote is referenced dynamically.
 *   `ContentNote` is a standard object, but it is NOT present in every org type: real
 *   customer sandboxes (production copies) have it, but scratch orgs and some trial orgs
 *   (e.g. the Agentforce Labs backup org used in the workshop) do not surface it. A STATIC
 *   `new ContentNote()` reference would fail to COMPILE on install in those orgs, which would
 *   block the whole package. To keep this in a single package that installs EVERYWHERE with
 *   no post-deploy step, we touch ContentNote only via the dynamic Schema API
 *   (`Schema.getGlobalDescribe()` + `SObject.put`). Where Notes isn't available the class
 *   still compiles and `isAvailable()` reports false, so callers degrade gracefully.
 */
public with sharing class HtmlNoteService {
    public class HtmlNoteException extends Exception {}

    private static final String CONTENT_NOTE = 'ContentNote';

    /** True when this org supports ContentNote (real sandboxes do; scratch/trial may not). */
    @AuraEnabled(cacheable=true)
    public static Boolean isAvailable() {
        return Schema.getGlobalDescribe().containsKey(CONTENT_NOTE);
    }

    // ContentNote only persists a restricted set of HTML tags; everything else is stripped
    // on insert. We pre-sanitize to that whitelist so callers get predictable output and we
    // avoid INSERT_FAILED on disallowed markup.
    private static final Set<String> ALLOWED_TAGS = new Set<String>{
        'p', 'b', 'strong', 'i', 'em', 'u', 'br', 'ul', 'ol', 'li', 'a', 'img',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'table', 'tr', 'td', 'th',
        'thead', 'tbody', 'blockquote', 'hr'
    };

    /**
     * Creates an HTML ContentNote and (optionally) links it to a record.
     *
     * @param title       the note title (required)
     * @param htmlBody    the note body as HTML (headings/lists/bold/etc.)
     * @param linkToId    optional record Id to associate the note with (may be null/blank)
     * @return the ContentDocumentId of the created note
     */
    @AuraEnabled
    public static Id createHtmlNote(String title, String htmlBody, String linkToId) {
        if (String.isBlank(title)) {
            throw new HtmlNoteException('A note title is required.');
        }
        if (!isAvailable()) {
            throw new AuraHandledException(
                'Salesforce Notes (ContentNote) isn\'t available in this org, so an HTML note can\'t be created here.'
            );
        }
        try {
            // Dynamic ContentNote creation (see class header on portability).
            SObject note = Schema.getGlobalDescribe().get(CONTENT_NOTE).newSObject();
            note.put('Title', title.left(255));
            // ContentNote.Content is HTML stored as a Blob — supply HTML directly, do NOT escape.
            note.put('Content', Blob.valueOf(sanitize(String.isBlank(htmlBody) ? '<p></p>' : htmlBody)));
            insert note;

            if (String.isNotBlank(linkToId)) {
                linkNoteToRecord(note.Id, (Id) linkToId);
            }
            return note.Id;
        } catch (DmlException e) {
            throw new AuraHandledException('Could not create the note: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            throw new AuraHandledException('Could not create the note: ' + e.getMessage());
        }
    }

    /** Links an existing ContentNote (by its ContentDocumentId) to a record, idempotently. */
    @AuraEnabled
    public static void linkNoteToRecord(Id contentDocumentId, Id recordId) {
        List<ContentDocumentLink> existing = [
            SELECT Id FROM ContentDocumentLink
            WHERE ContentDocumentId = :contentDocumentId AND LinkedEntityId = :recordId
            WITH USER_MODE LIMIT 1
        ];
        if (!existing.isEmpty()) {
            return;
        }
        ContentDocumentLink link = new ContentDocumentLink(
            ContentDocumentId = contentDocumentId,
            LinkedEntityId = recordId,
            ShareType = 'V',          // Viewer
            Visibility = 'AllUsers'
        );
        insert link;
    }

    /**
     * Invocable entry point so an Agent / Flow can create a formatted note.
     * Accepts a list (bulk-safe) and returns a parallel list of results.
     */
    @InvocableMethod(
        label='Create HTML Note'
        description='Creates a richly-formatted Salesforce Note (ContentNote) from HTML and optionally links it to a record.'
        category='Agent Workshop'
    )
    public static List<Response> createHtmlNotes(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            Response res = new Response();
            try {
                res.contentDocumentId = createHtmlNote(req.title, req.htmlBody, req.linkToId);
                res.isSuccess = true;
            } catch (Exception e) {
                res.isSuccess = false;
                res.errorMessage = e.getMessage();
            }
            responses.add(res);
        }
        return responses;
    }

    /**
     * Removes tags outside the ContentNote whitelist while keeping their inner text, so
     * disallowed markup degrades gracefully instead of failing the insert. This is a
     * lightweight pass, not a full HTML parser — adequate for agent/LWC-generated content.
     */
    @TestVisible
    private static String sanitize(String html) {
        if (String.isBlank(html)) {
            return '<p></p>';
        }
        // Strip script/style blocks entirely (content included).
        String cleaned = html.replaceAll('(?is)<\\s*(script|style)[^>]*>.*?<\\s*/\\s*\\1\\s*>', '');
        // Walk every tag; drop any whose name isn't whitelisted (keep the surrounding text).
        Matcher m = Pattern.compile('(?i)<\\s*/?\\s*([a-z0-9]+)([^>]*)>').matcher(cleaned);
        String out = '';
        Integer last = 0;
        while (m.find()) {
            out += cleaned.substring(last, m.start());
            String tag = m.group(1).toLowerCase();
            if (ALLOWED_TAGS.contains(tag)) {
                out += m.group(0);
            }
            last = m.end();
        }
        out += cleaned.substring(last);
        return out;
    }

    /** Input for the invocable Create HTML Note action. */
    public class Request {
        @InvocableVariable(required=true label='Note Title') public String title;
        @InvocableVariable(required=true label='HTML Body') public String htmlBody;
        @InvocableVariable(label='Record Id to link to') public String linkToId;
    }

    /** Output of the invocable Create HTML Note action. */
    public class Response {
        @InvocableVariable(label='Success') public Boolean isSuccess;
        @InvocableVariable(label='Content Document Id') public Id contentDocumentId;
        @InvocableVariable(label='Error Message') public String errorMessage;
    }
}

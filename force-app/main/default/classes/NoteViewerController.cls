/**
 * Read side of the HTML notes feature: fetches ContentNote HTML for the noteViewer LWC,
 * and lists the notes available to view.
 *
 * ContentNote stores its body as HTML in the (Base64-encoded) Content field of its
 * latest ContentVersion. We decode it to a String the LWC can render read-only.
 */
public with sharing class NoteViewerController {
    /** A note the viewer can open. */
    public class NoteSummary {
        @AuraEnabled public Id contentDocumentId;
        @AuraEnabled public Id latestVersionId;
        @AuraEnabled public String title;
        @AuraEnabled public Datetime modified;
    }

    /** The full content of one note. */
    public class NoteContent {
        @AuraEnabled public Id contentDocumentId;
        @AuraEnabled public String title;
        @AuraEnabled public String html;
        @AuraEnabled public String linkedRecordName;
        @AuraEnabled public Id linkedRecordId;
        @AuraEnabled public String linkedRecordUrl;
    }

    /**
     * Returns the most recently modified notes (ContentNote) the user can see.
     *
     * @param limitSize max notes to return (defaults to 50)
     */
    @AuraEnabled(cacheable=true)
    public static List<NoteSummary> getNotes(Integer limitSize) {
        Integer cap = limitSize != null && limitSize > 0 ? limitSize : 50;
        List<NoteSummary> results = new List<NoteSummary>();
        for (ContentVersion cv : [
            SELECT Id, ContentDocumentId, Title, LastModifiedDate
            FROM ContentVersion
            WHERE FileType = 'SNOTE' AND IsLatest = true
            WITH USER_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT :cap
        ]) {
            NoteSummary s = new NoteSummary();
            s.contentDocumentId = cv.ContentDocumentId;
            s.latestVersionId = cv.Id;
            s.title = cv.Title;
            s.modified = cv.LastModifiedDate;
            results.add(s);
        }
        return results;
    }

    /**
     * Returns the HTML content of a single note.
     *
     * @param contentDocumentId the ContentDocumentId of the note
     */
    @AuraEnabled(cacheable=true)
    public static NoteContent getNote(Id contentDocumentId) {
        try {
            List<ContentVersion> versions = [
                SELECT Id, Title, VersionData, ContentDocumentId
                FROM ContentVersion
                WHERE ContentDocumentId = :contentDocumentId AND IsLatest = true
                WITH USER_MODE
                LIMIT 1
            ];
            if (versions.isEmpty()) {
                throw new AuraHandledException('Note not found or not accessible.');
            }
            ContentVersion cv = versions[0];
            NoteContent nc = new NoteContent();
            nc.contentDocumentId = cv.ContentDocumentId;
            nc.title = cv.Title;
            // For a ContentNote (SNOTE), VersionData holds the note's HTML body as a Blob.
            nc.html = cv.VersionData != null ? cv.VersionData.toString() : '';

            // Find the associated record (the ContentDocumentLink where LinkedEntityId is NOT a User)
            // Note: We can't filter by LinkedEntity.Type directly, so we fetch all links and filter in Apex
            List<ContentDocumentLink> links = [
                SELECT LinkedEntityId, LinkedEntity.Name
                FROM ContentDocumentLink
                WHERE ContentDocumentId = :contentDocumentId
                WITH USER_MODE
            ];
            for (ContentDocumentLink link : links) {
                String entityId = String.valueOf(link.LinkedEntityId);
                // User IDs start with '005', filter those out
                if (!entityId.startsWith('005')) {
                    nc.linkedRecordId = link.LinkedEntityId;
                    nc.linkedRecordName = link.LinkedEntity.Name;
                    nc.linkedRecordUrl = '/lightning/r/' + nc.linkedRecordId + '/view';
                    break;
                }
            }

            return nc;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Could not load the note: ' + e.getMessage());
        }
    }
}

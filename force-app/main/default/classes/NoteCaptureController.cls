/**
 * Backend for the noteCapture LWC — collect a meeting "transcript" from three sources
 * (recorded audio, dropped files, pasted text), then hand the combined text to an
 * Employee Agent.
 *
 * Pieces:
 *   - uploadFile        : save a dropped/recorded file as a Salesforce File (ContentVersion)
 *   - transcribeAudio   : speech-to-text on a recorded audio file (base64) [see NoteCaptureAI]
 *   - processFiles      : image/doc -> text via a multimodal prompt template, in parallel
 *   - listEmployeeAgents: which agents the user can send the transcript to
 *
 * The AI calls (speech-to-text, prompt template) live in NoteCaptureAI so this controller
 * stays focused on file handling + orchestration.
 */
public with sharing class NoteCaptureController {
    public class CaptureException extends Exception {}

    /** A saved Salesforce File. */
    public class UploadedFile {
        @AuraEnabled public Id contentVersionId;
        @AuraEnabled public Id contentDocumentId;
        @AuraEnabled public String name;
        @AuraEnabled public String fileType;
    }

    /** An Employee Agent the transcript can be sent to. */
    public class AgentOption {
        @AuraEnabled public String botId;
        @AuraEnabled public String developerName;
        @AuraEnabled public String label;
    }

    /**
     * Saves a base64-encoded file as a Salesforce File (ContentVersion), optionally linked
     * to a record. Used for both dropped files and recorded audio so everything the
     * attendee captures becomes a first-class Salesforce File.
     *
     * @param fileName  display name incl. extension (e.g. "memo.m4a", "whiteboard.png")
     * @param base64     base64 of the file bytes
     * @param linkToId  optional record Id to link the file to
     * @return details of the created file
     */
    @AuraEnabled
    public static UploadedFile uploadFile(String fileName, String base64, String linkToId) {
        if (String.isBlank(fileName) || String.isBlank(base64)) {
            throw new AuraHandledException('A file name and content are required.');
        }
        try {
            ContentVersion cv = new ContentVersion();
            cv.Title = fileName;
            cv.PathOnClient = fileName;
            cv.VersionData = EncodingUtil.base64Decode(base64);
            cv.IsMajorVersion = true;
            insert cv;

            ContentVersion saved = [
                SELECT Id, ContentDocumentId, Title, FileType
                FROM ContentVersion WHERE Id = :cv.Id WITH USER_MODE LIMIT 1
            ];

            if (String.isNotBlank(linkToId)) {
                insert new ContentDocumentLink(
                    ContentDocumentId = saved.ContentDocumentId,
                    LinkedEntityId = (Id) linkToId,
                    ShareType = 'V',
                    Visibility = 'AllUsers'
                );
            }

            UploadedFile result = new UploadedFile();
            result.contentVersionId = saved.Id;
            result.contentDocumentId = saved.ContentDocumentId;
            result.name = saved.Title;
            result.fileType = saved.FileType;
            return result;
        } catch (DmlException e) {
            throw new AuraHandledException('Could not save the file: ' + e.getDmlMessage(0));
        } catch (Exception e) {
            throw new AuraHandledException('Could not save the file: ' + e.getMessage());
        }
    }

    /**
     * Lists the Employee Agents the user can target (published Bots of the employee type),
     * so the LWC can offer a "send to which agent?" picker.
     */
    @AuraEnabled(cacheable=true)
    public static List<AgentOption> listEmployeeAgents() {
        List<AgentOption> options = new List<AgentOption>();
        for (BotDefinition bot : [
            SELECT Id, DeveloperName, MasterLabel
            FROM BotDefinition
            WITH USER_MODE
            ORDER BY MasterLabel
            LIMIT 200
        ]) {
            AgentOption o = new AgentOption();
            o.botId = bot.Id;
            o.developerName = bot.DeveloperName;
            o.label = bot.MasterLabel != null ? bot.MasterLabel : bot.DeveloperName;
            options.add(o);
        }
        return options;
    }
}

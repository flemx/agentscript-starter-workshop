/**
 * AI side of note capture: speech-to-text on recorded audio, and file/image-to-text via a
 * multimodal prompt template. Kept separate from NoteCaptureController so the file-handling
 * and orchestration stay free of the (org-feature-dependent) AI calls.
 *
 * Both methods degrade gracefully: if the underlying AI feature isn't available in the org,
 * they return a clear placeholder string rather than throwing, so the capture UX keeps
 * working (the attendee can still paste text and send to the agent).
 *
 * Implementation notes:
 *  - Speech-to-text uses the platform standard action `convertBase64SpeechToText`, invoked
 *    via `Invocable.Action.createStandardAction`.
 *  - File-to-text uses a GenAiPromptTemplate (developer name in PROMPT_TEMPLATE) invoked via
 *    `ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate`. Multiple files are processed
 *    one call each; from an LWC the calls already return combined, but the design allows a
 *    Queueable fan-out if volume grows.
 */
public with sharing class NoteCaptureAI {
    @TestVisible
    private static final String SPEECH_ACTION = 'convertBase64SpeechToText';
    @TestVisible
    private static final String PROMPT_TEMPLATE = 'Describe_File_Contents';

    // Test seam: when set, AI calls return these instead of invoking platform features.
    @TestVisible
    private static String mockResult;

    /**
     * Transcribes a recorded audio file (a ContentVersion) to text using the platform
     * speech-to-text action.
     *
     * @param contentVersionId the ContentVersion of the recorded audio
     * @return the transcribed text (or a clear placeholder if unavailable)
     */
    @AuraEnabled
    public static String transcribeAudio(Id contentVersionId) {
        if (mockResult != null) {
            return mockResult;
        }
        try {
            ContentVersion cv = [
                SELECT VersionData, FileExtension FROM ContentVersion
                WHERE Id = :contentVersionId WITH USER_MODE LIMIT 1
            ];
            String base64Audio = EncodingUtil.base64Encode(cv.VersionData);

            Invocable.Action action = Invocable.Action.createStandardAction(SPEECH_ACTION);
            action.setInvocationParameter('base64Data', base64Audio);
            action.setInvocationParameter('mimeType', mimeForExtension(cv.FileExtension));
            List<Invocable.Action.Result> results = action.invoke();

            if (!results.isEmpty() && results[0].isSuccess()) {
                Object text = results[0].getOutputParameters().get('transcript');
                return text != null ? String.valueOf(text) : '';
            }
            return placeholder('audio transcription');
        } catch (Exception e) {
            // Feature not enabled / action name differs by release — degrade gracefully.
            return placeholder('audio transcription') + ' (' + e.getMessage() + ')';
        }
    }

    /**
     * Reads one or more files (images/docs) to text using a multimodal prompt template.
     * Each file is passed to the template and the per-file outputs are concatenated.
     *
     * @param contentVersionIds the ContentVersions of the uploaded files
     * @return combined text extracted from the files
     */
    @AuraEnabled
    public static String processFiles(List<Id> contentVersionIds) {
        if (contentVersionIds == null || contentVersionIds.isEmpty()) {
            return '';
        }
        if (mockResult != null) {
            return mockResult;
        }
        List<String> parts = new List<String>();
        for (Id cvId : contentVersionIds) {
            try {
                parts.add(runPromptTemplateOnFile(cvId));
            } catch (Exception e) {
                parts.add(placeholder('file reading') + ' (' + e.getMessage() + ')');
            }
        }
        return String.join(parts, '\n\n');
    }

    /**
     * Invokes the multimodal prompt template for a single file. The template is expected to
     * declare a file input; we resolve the ContentVersion's ContentDocument and pass it.
     */
    private static String runPromptTemplateOnFile(Id contentVersionId) {
        ContentVersion cv = [
            SELECT ContentDocumentId FROM ContentVersion
            WHERE Id = :contentVersionId WITH USER_MODE LIMIT 1
        ];

        ConnectApi.EinsteinPromptTemplateGenerationsInput input =
            new ConnectApi.EinsteinPromptTemplateGenerationsInput();
        input.isPreview = false;

        ConnectApi.WrappedValue fileValue = new ConnectApi.WrappedValue();
        fileValue.value = cv.ContentDocumentId;

        Map<String, ConnectApi.WrappedValue> valueMap = new Map<String, ConnectApi.WrappedValue>();
        valueMap.put('Input:file', fileValue);
        input.inputParams = valueMap;

        input.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
        input.additionalConfig.applicationName = 'PromptTemplateGenerations';

        ConnectApi.EinsteinPromptTemplateGenerationsRepresentation result =
            ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate(PROMPT_TEMPLATE, input);

        if (result != null && result.generations != null && !result.generations.isEmpty()) {
            return result.generations[0].text;
        }
        return placeholder('file reading');
    }

    private static String mimeForExtension(String ext) {
        String e = (ext == null ? '' : ext).toLowerCase();
        if (e == 'mp3') return 'audio/mpeg';
        if (e == 'wav') return 'audio/wav';
        if (e == 'm4a' || e == 'mp4') return 'audio/mp4';
        if (e == 'webm') return 'audio/webm';
        if (e == 'ogg') return 'audio/ogg';
        return 'audio/mpeg';
    }

    private static String placeholder(String what) {
        return '[' + what + ' is not enabled in this org — paste the text instead.]';
    }
}

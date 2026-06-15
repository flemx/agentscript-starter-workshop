/**
 * AI side of note capture: speech-to-text on recorded audio, and file/image-to-text via a
 * multimodal Flex prompt template. Kept separate from NoteCaptureController so the
 * file-handling and orchestration stay free of the (org-feature-dependent) AI calls.
 *
 * Both methods degrade gracefully: if the underlying AI feature isn't available in the org,
 * they return a clear placeholder string rather than throwing, so the capture UX keeps
 * working (the attendee can still paste text and send to the agent).
 *
 * Implementation notes:
 *  - Speech-to-text uses the platform standard action `convertBase64SpeechToText`, invoked
 *    via `Invocable.Action.createStandardAction`.
     *  - File-to-text uses a Flex GenAiPromptTemplate (developer name in PROMPT_TEMPLATE) with
     *    three optional file inputs (File1, File2, File3). Supported types: images (PNG/JPG/WEBP),
     *    PDFs, and any other ContentDocument format the model accepts. All uploaded files are
     *    passed in a SINGLE `generateMessagesForPromptTemplate` call so the model sees full
     *    combined context and only one LLM round-trip is needed regardless of file count.
 *
 *  Required prompt template setup (one-time, in Prompt Builder):
 *    See docs/prompt-template-setup.md for the exact steps and prompt text.
 *    Template API name must match PROMPT_TEMPLATE below.
 */
public with sharing class NoteCaptureAI {
    @TestVisible
    private static final String SPEECH_ACTION = 'voiceToText';
    @TestVisible
    private static final String PROMPT_TEMPLATE = 'Describe_File_Contents';
    @TestVisible
    private static final Integer MAX_FILES = 3;

    // Input names on the Flex prompt template — must match the template's input API names.
    // Named File1/2/3 (not Image1/2/3) because PDFs and other documents are equally valid inputs.
    private static final List<String> FILE_INPUT_SLOTS = new List<String>{
        'File1', 'File2', 'File3'
    };

    // Test seam: when set, AI calls return this instead of invoking platform features.
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
            action.setInvocationParameter('base64Audio', base64Audio);
            List<Invocable.Action.Result> results = action.invoke();

            if (!results.isEmpty() && results[0].isSuccess()) {
                Object text = results[0].getOutputParameters().get('convertedText');
                return text != null ? String.valueOf(text) : '';
            }
            return placeholder('audio transcription');
        } catch (Exception e) {
            // Feature not enabled / action name differs by release — degrade gracefully.
            return placeholder('audio transcription') + ' (' + e.getMessage() + ')';
        }
    }

    /**
     * Reads up to three files (images, PDFs, or any supported document type) to text using a
     * single multimodal prompt template call. All files are passed together so the model sees
     * their full combined context in one round-trip.
     *
     * The Flex prompt template must be set up in Prompt Builder with three optional File
     * (ContentDocument) inputs named File1, File2, File3 — see docs/prompt-template-setup.md.
     *
     * @param contentVersionIds ContentVersionIds of the uploaded files (max 3)
     * @return combined description of all files, or a graceful placeholder
     */
    @AuraEnabled
    public static String processFiles(List<Id> contentVersionIds) {
        if (contentVersionIds == null || contentVersionIds.isEmpty()) {
            return '';
        }
        if (contentVersionIds.size() > MAX_FILES) {
            throw new AuraHandledException(
                'Maximum ' + MAX_FILES + ' files allowed. Remove a file before adding more.'
            );
        }
        if (mockResult != null) {
            return mockResult;
        }
        try {
            return runPromptTemplateOnFiles(contentVersionIds);
        } catch (Exception e) {
            return placeholder('file reading') + ' (' + e.getMessage() + ')';
        }
    }

    /**
     * Builds the inputParams map for up to three files and makes a single
     * generateMessagesForPromptTemplate call. The template defines Image1/Image2/Image3 as
     * optional File inputs; we populate only the slots that have uploaded files.
     */
    private static String runPromptTemplateOnFiles(List<Id> contentVersionIds) {
        // Bulk-resolve ContentDocumentIds (one SOQL for all files).
        Map<Id, Id> cvToDoc = new Map<Id, Id>();
        for (ContentVersion cv : [
            SELECT Id, ContentDocumentId FROM ContentVersion
            WHERE Id IN :contentVersionIds WITH USER_MODE
        ]) {
            cvToDoc.put(cv.Id, cv.ContentDocumentId);
        }

        // Populate File1 / File2 / File3 slots for however many files were uploaded.
        // Correct WrappedValue format: a typed map with 'id' + 'type', NOT a bare Id string.
        Map<String, ConnectApi.WrappedValue> valueMap = new Map<String, ConnectApi.WrappedValue>();
        for (Integer i = 0; i < contentVersionIds.size() && i < FILE_INPUT_SLOTS.size(); i++) {
            Id docId = cvToDoc.get(contentVersionIds[i]);
            if (docId == null) {
                continue;
            }
            ConnectApi.WrappedValue fileValue = new ConnectApi.WrappedValue();
            fileValue.value = new Map<String, String>{
                'id'   => String.valueOf(docId),
                'type' => 'ContentDocument'
            };
            valueMap.put('Input:' + FILE_INPUT_SLOTS[i], fileValue);
        }

        ConnectApi.EinsteinPromptTemplateGenerationsInput input =
            new ConnectApi.EinsteinPromptTemplateGenerationsInput();
        input.isPreview = false;
        input.inputParams = valueMap;
        input.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
        input.additionalConfig.applicationName = 'PromptBuilderPreview';

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

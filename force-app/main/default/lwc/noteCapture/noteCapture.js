import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import uploadFile from '@salesforce/apex/NoteCaptureController.uploadFile';
import listEmployeeAgents from '@salesforce/apex/NoteCaptureController.listEmployeeAgents';
import transcribeAudio from '@salesforce/apex/NoteCaptureAI.transcribeAudio';
import processFiles from '@salesforce/apex/NoteCaptureAI.processFiles';
// Agentforce client (ACC) API — opens the agent side panel and submits an utterance.
// Imported statically (LWC disallows dynamic import); calls are guarded at runtime so the
// component still works where the panel isn't available (it then falls back to an event).
import { open as accOpen, execute as accExecute } from 'lightning/accApi';

/**
 * noteCapture — collect a meeting "transcript" from three sources and send it to an
 * Employee Agent:
 *   1. recorded audio  → speech-to-text (with a live recording animation)
 *   2. dropped files   → uploaded as Salesforce Files, read to text via a prompt template
 *                        (multiple files processed in parallel, server-side)
 *   3. pasted text
 * The combined text is then sent to a chosen Employee Agent.
 */
export default class NoteCapture extends LightningElement {
    @api recordId; // when on a record page, files/notes link here

    // --- state ---
    isRecording = false;
    isTranscribing = false;
    isProcessingFiles = false;
    @track files = []; // {key, name, contentDocumentId, text}
    audioTranscript = '';
    fileTranscript = '';
    pastedText = '';
    @track agentOptions = [];
    selectedAgent = '';
    error;

    // recording internals
    mediaRecorder;
    audioChunks = [];
    timerId;
    seconds = 0;
    @track timerDisplay = '00:00';

    connectedCallback() {
        this.loadAgents();
    }

    async loadAgents() {
        try {
            const agents = await listEmployeeAgents();
            // value = botId, because the ACC API targets an agent by its bot id.
            this.agentOptions = agents.map((a) => ({ label: a.label, value: a.botId }));
            if (this.agentOptions.length) {
                this.selectedAgent = this.agentOptions[0].value;
            }
        } catch (e) {
            this.error = this.reduceError(e);
        }
    }

    // ───────────────────────── audio recording ─────────────────────────

    get micButtonClass() {
        return this.isRecording ? 'mic-button recording' : 'mic-button';
    }
    get micIcon() {
        return this.isRecording ? 'utility:stop' : 'utility:record';
    }
    get recorderHint() {
        return this.audioTranscript
            ? 'Audio transcribed ✓ — record again to replace.'
            : 'Tap to record. Tap again to stop and transcribe.';
    }

    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        this.error = undefined;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) this.audioChunks.push(e.data);
            };
            this.mediaRecorder.onstop = () => this.handleAudioStop(stream);
            this.mediaRecorder.start();
            this.isRecording = true;
            this.seconds = 0;
            this.timerDisplay = '00:00';
            this.timerId = setInterval(() => {
                this.seconds += 1;
                const m = String(Math.floor(this.seconds / 60)).padStart(2, '0');
                const s = String(this.seconds % 60).padStart(2, '0');
                this.timerDisplay = `${m}:${s}`;
            }, 1000);
        } catch (e) {
            this.error = 'Microphone access was blocked. Allow mic access, or use file/text input instead.';
        }
    }

    stopRecording() {
        this.isRecording = false;
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = undefined;
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    async handleAudioStop(stream) {
        try {
            stream.getTracks().forEach((t) => t.stop());
            const blob = new Blob(this.audioChunks, { type: 'audio/mp4' });
            const base64 = await this.blobToBase64(blob);
            this.isTranscribing = true;
            // Save the audio as a Salesforce File, then transcribe it.
            const saved = await uploadFile({
                fileName: `meeting-audio-${Date.now()}.m4a`,
                base64,
                linkToId: this.recordId || ''
            });
            this.audioTranscript = await transcribeAudio({ contentVersionId: saved.contentVersionId });
            this.toast('Audio transcribed', 'Your recording was converted to text.', 'success');
        } catch (e) {
            this.error = this.reduceError(e);
        } finally {
            this.isTranscribing = false;
        }
    }

    // ───────────────────────── file handling ─────────────────────────

    get dropzoneClass() {
        return this._dragover ? 'dropzone dragover' : 'dropzone';
    }
    get hasFiles() {
        return this.files.length > 0;
    }
    get fileCount() {
        return this.files.length;
    }

    handleDragOver(e) {
        e.preventDefault();
        this._dragover = true;
    }
    handleDragLeave() {
        this._dragover = false;
    }
    handleDrop(e) {
        e.preventDefault();
        this._dragover = false;
        this.ingestFiles(Array.from(e.dataTransfer.files || []));
    }
    handleFilePick(e) {
        this.ingestFiles(Array.from(e.target.files || []));
    }

    async ingestFiles(fileList) {
        if (!fileList.length) return;
        this.error = undefined;
        this.isProcessingFiles = true;
        try {
            // 1. Upload each file as a Salesforce File.
            const uploaded = [];
            for (const file of fileList) {
                const base64 = await this.blobToBase64(file);
                const saved = await uploadFile({
                    fileName: file.name,
                    base64,
                    linkToId: this.recordId || ''
                });
                uploaded.push(saved);
                this.files = [
                    ...this.files,
                    { key: saved.contentDocumentId, name: file.name, contentDocumentId: saved.contentDocumentId }
                ];
            }
            // 2. Read all files to text via the multimodal prompt template — in parallel, server-side.
            const ids = uploaded.map((u) => u.contentVersionId);
            const text = await processFiles({ contentVersionIds: ids });
            this.fileTranscript = [this.fileTranscript, text].filter(Boolean).join('\n\n');
            this.toast('Files processed', `${fileList.length} file(s) read into text.`, 'success');
        } catch (e) {
            this.error = this.reduceError(e);
        } finally {
            this.isProcessingFiles = false;
        }
    }

    // ───────────────────────── text + combine + send ─────────────────────────

    handleTextChange(e) {
        this.pastedText = e.target.value;
    }
    handleAgentChange(e) {
        this.selectedAgent = e.detail.value;
    }

    get combinedTranscript() {
        return [this.audioTranscript, this.fileTranscript, this.pastedText]
            .map((s) => (s || '').trim())
            .filter(Boolean)
            .join('\n\n');
    }
    get hasTranscript() {
        return this.combinedTranscript.length > 0;
    }
    get sendDisabled() {
        return !this.hasTranscript || !this.selectedAgent;
    }

    /**
     * Sends the combined transcript to the chosen Employee Agent. Preferred path is the
     * Agentforce client (ACC) API — it opens the agent side panel and submits the text as
     * an utterance. If the ACC API isn't available (e.g. outside Lightning desktop), we
     * fall back to a bubbling event the host page can handle.
     */
    async handleSend() {
        const transcript = this.combinedTranscript;
        const botId = this.selectedAgent;
        this.error = undefined;
        try {
            // Preferred: open the agent side panel and submit the transcript as an utterance.
            await accOpen(botId);
            await accExecute(transcript, botId);
            this.toast('Sent to agent', 'Opened the agent and sent your notes.', 'success');
        } catch (e) {
            // ACC panel not available in this context — fall back to a host-handled event.
            this.dispatchEvent(
                new CustomEvent('sendtoagent', {
                    detail: { botId, message: transcript },
                    bubbles: true,
                    composed: true
                })
            );
            this.toast(
                'Agent panel unavailable here',
                'Handed the notes off via event — open the agent from a Lightning page to chat.',
                'warning'
            );
        }
    }

    // ───────────────────────── utils ─────────────────────────

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result || '';
                // strip the "data:...;base64," prefix
                const comma = result.indexOf(',');
                resolve(comma >= 0 ? result.substring(comma + 1) : result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    reduceError(error) {
        if (Array.isArray(error.body)) {
            return error.body.map((e) => e.message).join(', ');
        } else if (error.body && typeof error.body.message === 'string') {
            return error.body.message;
        } else if (typeof error.message === 'string') {
            return error.message;
        }
        return 'Unknown error';
    }
}

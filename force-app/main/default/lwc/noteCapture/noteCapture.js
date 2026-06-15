import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import uploadFile from '@salesforce/apex/NoteCaptureController.uploadFile';
import listEmployeeAgents from '@salesforce/apex/NoteCaptureController.listEmployeeAgents';
import processFiles from '@salesforce/apex/NoteCaptureAI.processFiles';
import transcribeAudio from '@salesforce/apex/NoteCaptureAI.transcribeAudio';
// Agentforce client (ACC) API — opens the agent side panel and submits an utterance.
// Imported statically (LWC disallows dynamic import); calls are guarded at runtime so the
// component still works where the panel isn't available (it then falls back to an event).
import { open as accOpen, execute as accExecute } from 'lightning/accApi';

const MAX_FILES = 3;
const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const PDF_RE = /\.pdf$/i;

/**
 * noteCapture — a Claude-style composer that collects a meeting "transcript" from three
 * sources and sends it to an Employee Agent:
 *   1. recorded audio  → speech-to-text (live recording state inside the composer)
 *   2. attached files  → uploaded as Salesforce Files (max 3, images render as thumbnails),
 *                        read to text via a single multimodal prompt template call
 *   3. typed/pasted text
 * Attachments appear as removable chips in a tray at the top of the composer. The combined
 * text is sent to the chosen Employee Agent via the Agentforce client (ACC) API.
 */
export default class NoteCapture extends LightningElement {
    @api recordId; // when on a record page, files/notes link here

    // --- state ---
    isRecording = false;
    isProcessingFiles = false;
    @track files = []; // {key, name, kind, isImage, thumbnailUrl, contentVersionId, contentDocumentId}
    fileTranscript = ''; // extracted text from attached files — sent to the agent, not edited here
    pastedText = ''; // the editable notes (typed text + inserted audio transcript)
    @track interimText = ''; // live speech preview while recording
    @track agentOptions = [];
    selectedAgent = '';
    error;
    _dragover = false;
    _needsResize = false;

    // recording internals
    _recognition;        // Web Speech API instance (preferred path)
    _finalBuffer = '';   // confirmed words from SpeechRecognition
    _mediaRecorder;      // fallback: MediaRecorder when Speech API unavailable in iframe
    _audioChunks = [];
    _usingSpeechApi = false;
    timerId;
    seconds = 0;
    @track timerDisplay = '00:00';

    connectedCallback() {
        this.loadAgents();
    }

    disconnectedCallback() {
        this.files.forEach((f) => f.thumbnailUrl && URL.revokeObjectURL(f.thumbnailUrl));
        if (this._recognition) this._recognition.abort();
        if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') this._mediaRecorder.stop();
        this._stopTimer();
    }

    renderedCallback() {
        // After a programmatic notes update (audio transcript, etc.) we must explicitly
        // sync el.value because LWC's value={pastedText} binding won't override a textarea
        // the user has already typed into (the browser owns the live DOM value).
        if (this._needsResize) {
            this._needsResize = false;
            const el = this.template.querySelector('.nc-textarea');
            if (el) {
                el.value = this.pastedText;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
                el.focus();
            }
        }
    }

    async loadAgents() {
        try {
            const agents = await listEmployeeAgents();
            // value = botId, because the ACC API targets an agent by its bot id.
            this.agentOptions = agents.map((a) => ({ label: a.label, value: a.botId }));
            if (this.agentOptions.length) {
                // Prefer "Employee Agent V1" by name; fall back to the first in the list.
                const preferred = this.agentOptions.find((a) =>
                    a.label.toLowerCase().includes('employee agent v1')
                );
                this.selectedAgent = preferred
                    ? preferred.value
                    : this.agentOptions[0].value;
            }
        } catch (e) {
            this.error = this.reduceError(e);
        }
    }

    // ───────────────────────── attachment tray ─────────────────────────

    get attachments() {
        // Only files appear as chips. A recorded audio clip is transcribed straight into the
        // editable notes (Claude-style), so the user can review/edit the text before sending.
        return this.files.map((f) => ({ ...f, isFile: !f.isImage }));
    }
    get hasAttachments() {
        return this.files.length > 0;
    }
    get canAttachMore() {
        return this.files.length < MAX_FILES;
    }
    get attachDisabled() {
        return !this.canAttachMore || this.isProcessingFiles;
    }

    // ───────────────────────── audio recording ─────────────────────────

    get micButtonClass() {
        return this.isRecording ? 'icon-btn mic recording' : 'icon-btn mic';
    }
    get micIcon() {
        return this.isRecording ? 'utility:stop' : 'utility:unmuted';
    }
    get micTitle() {
        return this.isRecording ? 'Stop recording' : 'Record audio';
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        this.error = undefined;
        // eslint-disable-next-line no-undef
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
            this._startSpeechApi(SR);
        } else {
            this._startMediaRecorder();
        }
        this._startTimer();
    }

    // ── Path A: browser Web Speech API (live transcript into notes) ──────────
    _startSpeechApi(SR) {
        this._usingSpeechApi = true;
        this._finalBuffer = '';
        this._recognition = new SR();
        this._recognition.continuous = true;
        this._recognition.interimResults = true;
        this._recognition.lang = 'en-US';

        this._recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    this._finalBuffer += event.results[i][0].transcript + ' ';
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            this.interimText = interim;
        };

        this._recognition.onerror = (event) => {
            if (event.error === 'network' || event.error === 'service-not-allowed') {
                // Speech API unavailable in this iframe context — restart with MediaRecorder.
                this._recognition.abort();
                this._usingSpeechApi = false;
                this.interimText = '';
                this._startMediaRecorder();
            } else if (event.error !== 'no-speech') {
                this.error = `Microphone error: ${event.error}. Try again or type notes instead.`;
                this.isRecording = false;
                this._stopTimer();
            }
        };

        this._recognition.onend = () => {
            if (!this._usingSpeechApi) return; // already switched to MediaRecorder
            this.interimText = '';
            this._stopTimer();
            if (this._finalBuffer.trim()) {
                this.insertIntoNotes(this._finalBuffer.trim());
                this.toast('Voice note added', 'Transcript added to notes — edit before sending.', 'success');
            }
            this.isRecording = false;
        };

        this._recognition.start();
        this.isRecording = true;
    }

    // ── Path B: MediaRecorder → upload → processFiles (same as image pipeline) ──
    async _startMediaRecorder() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this._audioChunks = [];
            this._mediaRecorder = new MediaRecorder(stream);
            this._mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) this._audioChunks.push(e.data);
            };
            this._mediaRecorder.onstop = () => this._handleMediaStop(stream);
            this._mediaRecorder.start();
            this.isRecording = true;
        } catch (e) {
            this.error = 'Microphone access was blocked. Allow mic access or type notes instead.';
            this.isRecording = false;
            this._stopTimer();
        }
    }

    async _handleMediaStop(stream) {
        try {
            stream.getTracks().forEach((t) => t.stop());
            const mimeType = this._mediaRecorder.mimeType || 'audio/mp4';
            const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
            const blob = new Blob(this._audioChunks, { type: mimeType });
            const base64 = await this.blobToBase64(blob);
            this.isProcessingFiles = true;
            const fileName = `voice-note-${Date.now()}.${ext}`;
            const saved = await uploadFile({
                fileName,
                base64,
                linkToId: this.recordId || ''
            });
            // Transcribe via the platform voiceToText standard action.
            const transcript = await transcribeAudio({ contentVersionId: saved.contentVersionId });
            if (transcript && !transcript.startsWith('[')) {
                this.insertIntoNotes(transcript);
                this.toast('Voice note transcribed', 'Transcript added to notes — edit before sending.', 'success');
            } else {
                // Transcription unavailable — keep audio as a chip so it's not lost.
                this.files = [
                    ...this.files,
                    {
                        key: saved.contentDocumentId,
                        name: fileName,
                        kind: 'audio',
                        isImage: false,
                        iconName: 'doctype:audio',
                        thumbnailUrl: null,
                        contentVersionId: saved.contentVersionId,
                        contentDocumentId: saved.contentDocumentId
                    }
                ];
                this.toast('Voice note saved', 'Audio saved as attachment — transcription unavailable.', 'info');
            }
        } catch (e) {
            this.error = this.reduceError(e);
        } finally {
            this.isProcessingFiles = false;
        }
    }

    stopRecording() {
        this._stopTimer();
        if (this._usingSpeechApi && this._recognition) {
            this._recognition.stop();
        } else if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
            this.isRecording = false;
            this._mediaRecorder.stop();
        }
    }

    _startTimer() {
        this.seconds = 0;
        this.timerDisplay = '00:00';
        this.timerId = setInterval(() => {
            this.seconds += 1;
            const m = String(Math.floor(this.seconds / 60)).padStart(2, '0');
            const s = String(this.seconds % 60).padStart(2, '0');
            this.timerDisplay = `${m}:${s}`;
        }, 1000);
    }

    _stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = undefined;
        }
    }

    // Appends text to the editable notes and flags the textarea for a resize on next render.
    insertIntoNotes(text) {
        if (!text) {
            return;
        }
        this.pastedText = [this.pastedText, text]
            .map((s) => (s || '').trim())
            .filter(Boolean)
            .join('\n\n');
        this._needsResize = true;
    }

    // ───────────────────────── file handling ─────────────────────────

    get composerClass() {
        return this._dragover ? 'composer dragover' : 'composer';
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
    openFilePicker() {
        const input = this.template.querySelector('input[type="file"]');
        if (input) input.click();
    }
    handleFilePick(e) {
        this.ingestFiles(Array.from(e.target.files || []));
        e.target.value = null; // allow re-picking the same file
    }

    fileKind(file) {
        const name = file.name || '';
        const type = file.type || '';
        if (type.startsWith('image/') || IMAGE_RE.test(name)) return 'image';
        if (type === 'application/pdf' || PDF_RE.test(name)) return 'pdf';
        return 'doc';
    }

    iconForKind(kind) {
        if (kind === 'pdf') return 'doctype:pdf';
        if (kind === 'image') return 'doctype:image';
        return 'doctype:attachment';
    }

    async ingestFiles(fileList) {
        if (!fileList.length) return;

        // Enforce the 3-file cap before uploading anything (template has 3 File slots).
        const totalAfter = this.files.length + fileList.length;
        if (totalAfter > MAX_FILES) {
            this.error = `Maximum ${MAX_FILES} files allowed. Remove one before adding more.`;
            return;
        }

        this.error = undefined;
        this.isProcessingFiles = true;
        try {
            for (const file of fileList) {
                const base64 = await this.blobToBase64(file);
                const saved = await uploadFile({
                    fileName: file.name,
                    base64,
                    linkToId: this.recordId || ''
                });
                const kind = this.fileKind(file);
                const isImage = kind === 'image';
                this.files = [
                    ...this.files,
                    {
                        key: saved.contentDocumentId,
                        name: file.name,
                        kind,
                        isImage,
                        iconName: this.iconForKind(kind),
                        thumbnailUrl: isImage ? URL.createObjectURL(file) : null,
                        contentVersionId: saved.contentVersionId,
                        contentDocumentId: saved.contentDocumentId
                    }
                ];
            }
            await this.recomputeFileTranscript();
            this.toast('Files added', `${fileList.length} file(s) read into text.`, 'success');
        } catch (e) {
            this.error = this.reduceError(e);
        } finally {
            this.isProcessingFiles = false;
        }
    }

    async removeFile(e) {
        const key = e.currentTarget.dataset.key;
        const removed = this.files.find((f) => f.key === key);
        if (removed && removed.thumbnailUrl) URL.revokeObjectURL(removed.thumbnailUrl);
        this.files = this.files.filter((f) => f.key !== key);
        this.isProcessingFiles = true;
        try {
            await this.recomputeFileTranscript();
        } catch (err) {
            this.error = this.reduceError(err);
        } finally {
            this.isProcessingFiles = false;
        }
    }

    /**
     * Rebuilds fileTranscript from the CURRENT set of files in one multimodal prompt
     * template call. Called whenever the file set changes (add or remove) so the combined
     * transcript always matches what's attached.
     */
    async recomputeFileTranscript() {
        const ids = this.files.map((f) => f.contentVersionId).filter(Boolean);
        if (!ids.length) {
            this.fileTranscript = '';
            return;
        }
        this.fileTranscript = await processFiles({ contentVersionIds: ids });
    }

    // ───────────────────────── text + combine + send ─────────────────────────

    handleTextChange(e) {
        this.pastedText = e.target.value;
    }
    // Keep pastedText live on every keystroke (so Enter-to-send has the latest text)
    // and grow the textarea to fit its content.
    handleInput(e) {
        this.pastedText = e.target.value;
        const el = e.target;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }
    // Enter sends; Shift+Enter inserts a newline (Claude-style composer behaviour).
    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.sendDisabled) {
                this.handleSend();
            }
        }
    }
    handleAgentChange(e) {
        this.selectedAgent = e.detail.value;
    }

    // What we send to the agent: the extracted file text plus the editable notes (which
    // already include any audio transcript the user reviewed/edited).
    get combinedTranscript() {
        return [this.fileTranscript, this.pastedText]
            .map((s) => (s || '').trim())
            .filter(Boolean)
            .join('\n\n');
    }
    get hasTranscript() {
        return this.combinedTranscript.length > 0;
    }
    get sendDisabled() {
        return !this.hasTranscript || !this.selectedAgent || this.isProcessingFiles || this.isRecording;
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
            await accOpen(botId);
            await accExecute(transcript, botId);
            this.toast('Sent to agent', 'Opened the agent and sent your notes.', 'success');
        } catch (e) {
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

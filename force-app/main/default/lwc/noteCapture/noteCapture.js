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
// Large images must be downscaled before upload: a base64 payload over the Aura
// imperative-action request cap (~a few MB) is rejected server-side with a generic
// aura:systemError before Apex runs. Phone photos (5–10 MB) routinely exceed it.
const MAX_IMAGE_DIMENSION = 1600; // px on the longest edge — plenty for the prompt model
const IMAGE_DOWNSCALE_THRESHOLD = 1500000; // ~1.5 MB: only resize images bigger than this
const JPEG_QUALITY = 0.85;

// Ready-made meeting transcripts so an attendee without their own notes can try the agent
// in one click, then edit before sending. Deliberately written as messy, verbatim-style
// recordings (small talk, tangents, filler, crosstalk) so the agent has something realistic
// to summarize. The button cycles through these in order.
const SAMPLE_TRANSCRIPTS = [
    `Weekly Sales Sync — Acme Corp Account
Date: Tuesday, 10:03 AM
Attendees: Jordan Reyes (Account Executive), Priya Nair (Solutions Engineer), Marcus Bell (Acme VP of Operations), Tina Okafor (Acme IT Manager)

[10:03] Jordan: Hey Marcus, can you hear me okay? I think my headset was muted there for a sec.
[10:03] Marcus: Yeah, yeah, you're good. Loud and clear. Give me one second, I'm just grabbing a coffee, it's been one of those mornings.
[10:04] Jordan: Ha, no worries. Same here honestly. Did you catch the game last night?
[10:04] Marcus: Oh man, don't even get me started. We were up by twelve and then the whole thing fell apart in the fourth quarter. Brutal.
[10:04] Priya: I missed it, I was putting the kids to bed. Anyway — should we wait for Tina or get going?
[10:05] Marcus: She said she'd be a couple minutes late, something with a server thing. Let's just start and she'll jump in.
[10:05] Jordan: Sounds good. So, um, just to recap where we left off last time — you guys were evaluating the platform for the operations rollout. How's that conversation going internally?
[10:06] Marcus: Yeah, so, it's going. The team is excited, generally. We had a leadership review on Thursday and the big thing is we want to roll this out to three regions — North America, EMEA, and then APAC, probably in that order — by the end of Q3. That's the target the CEO wants.
[10:07] Priya: Okay, that's ambitious but doable. The thing I'd flag right away is the data migration. You mentioned last time you're still on that legacy CRM, the one from like 2014?
[10:07] Marcus: Don't remind me. Yeah, it's held together with duct tape at this point. Honestly half our reps don't even use it, they just keep their own spreadsheets, which is part of the problem.
[10:08] Tina: [joining] Sorry, sorry everyone, I'm here. Can you see my — am I showing up? My camera's being weird.
[10:08] Jordan: We can hear you, camera's off but that's fine.
[10:08] Tina: Ugh, this laptop. IT guy can't fix his own laptop, very embarrassing. Okay, what'd I miss?
[10:09] Marcus: Just talking about the migration headache. The old CRM.
[10:09] Tina: Oh yeah. So that's actually my biggest concern. We've got, I want to say, eight years of data in there, a lot of it's messy, duplicate accounts, fields people used for random stuff they weren't supposed to. If we're migrating I need to understand how we clean that up without losing history.
[10:10] Priya: Totally fair. What we'd usually do is a scoping exercise first — we map your existing fields, identify the junk, and propose a migration plan before we touch anything. I can put that together. Give me, say, a week to a week and a half?
[10:11] Marcus: That works. Tina, you'd be the point person on that?
[10:11] Tina: Yeah, me and probably Raj from the data team.
[10:11] Jordan: Perfect. I'll make a note. Um, the other thing I wanted to cover was pricing. Marcus, you'd asked for an updated quote.
[10:12] Marcus: Right, yes. So leadership wants to see the number with the premium support tier included. The 24/7 one. Because if we're going across time zones with APAC, we kind of need round-the-clock coverage.
[10:13] Jordan: Makes sense. I'll get you a revised proposal with premium support baked in. I can have that to you by Friday.
[10:13] Marcus: Friday works.
[10:13] Tina: Oh — one more thing, and this is important — our security team is going to need a SOC 2 report before we can sign anything. That's non-negotiable on our end, compliance has been really strict lately after that whole thing with our competitor getting breached.
[10:14] Priya: Yep, we have a current SOC 2 Type II, I'll have it sent over through the proper channel.
[10:14] Jordan: And just so I understand the buying process — Marcus, are you the final sign-off, or does this go up to the CFO?
[10:15] Marcus: I'm the economic buyer for this, it's in my budget. But legal has to review the contract and that usually takes them about three weeks, they're slow. So factor that in.
[10:15] Jordan: Good to know. So if we want to hit that Q3 timeline we should really get the paper moving soon.
[10:16] Marcus: Agreed. Let's aim to get the wider Ops team a demo too — there's like fifteen people who'll actually be using this day to day and they should see it.
[10:16] Priya: I can run a tailored demo. How about two weeks from now?
[10:16] Marcus: Let me check with my assistant on calendars but yeah, roughly two weeks.
[10:17] Tina: Works for me as long as it's not a Monday.
[10:17] Jordan: Noted, no Mondays. Okay, anything else before we wrap?
[10:17] Marcus: I think that's it. Oh, did you guys ever figure out the thing with the mobile app? One of my reps was asking.
[10:18] Priya: Yes, mobile's fully supported, I'll include that in the demo.
[10:18] Marcus: Cool, cool. Alright, I gotta jump to another call. Thanks everyone.
[10:18] Jordan: Thanks Marcus, thanks Tina. I'll send the recap and the proposal by Friday.
[10:18] Tina: Thanks all, sorry again about the camera.`,

    `Product Discovery Call — Northwind Logistics
Date: Wednesday, 2:00 PM
Attendees: Sam Choi (Product Manager), Dana Whitfield (Northwind Operations Lead), Greg Mason (Northwind Dispatch Supervisor)

[14:01] Sam: Hi Dana, hi Greg, thanks for making the time. How are things over at Northwind?
[14:01] Dana: Busy! It's peak season so, you know, organized chaos. But we're hanging in there.
[14:02] Greg: Speak for yourself, I haven't seen my desk in three days. [laughs]
[14:02] Sam: Ha, well hopefully we can help with some of that chaos. So the goal today is really just for me to understand how your team works currently and where the pain is. No slides, no pitch, I just want to listen. Sound okay?
[14:03] Dana: Yeah, that's refreshing honestly. We've sat through a lot of pitches lately.
[14:03] Sam: I bet. So walk me through it — when a shipment comes in, what actually happens on your end?
[14:04] Dana: Okay so, it's more complicated than it should be. A shipment gets created in our order system, which is one tool. Then the tracking lives in a totally separate system that the carrier uses. Then we've got a spreadsheet — well, several spreadsheets — where the dispatch team manually keeps tabs on where things are.
[14:05] Greg: And then email. So much email. Carriers email us status updates, customers email asking where their stuff is, and we're copy-pasting between all of it.
[14:05] Sam: So how many systems are we talking, end to end?
[14:06] Greg: Four. Order system, carrier tracking portal, the spreadsheets, and email. And none of them talk to each other.
[14:06] Dana: Which means somebody on Greg's team is basically a human integration layer. They spend — Greg, what would you say, like six hours a week just reconciling statuses?
[14:07] Greg: At least six. Probably more during peak. It's mind-numbing work and honestly that's where mistakes happen, because someone fat-fingers a status or forgets to update the sheet and then a customer calls all angry.
[14:07] Sam: Right. And when something's delayed, how do you find out?
[14:08] Greg: Usually when the customer tells us. Which is the worst way to find out. By then it's too late.
[14:08] Dana: That's the big one for me. If I could wave a magic wand, I'd want automated alerts. Like, the second a shipment is delayed more than two hours, somebody on our team gets pinged before the customer ever notices.
[14:09] Sam: That's really helpful. Two hours is the threshold?
[14:09] Dana: Roughly. It varies by lane but two hours is a good default. For some express stuff it'd be tighter.
[14:10] Sam: Got it. Greg, you mentioned the spreadsheets — is there a single source of truth anywhere, or is it really spread across all of these?
[14:10] Greg: Ha. No. There is no single source of truth. That's the dream. Right now if you ask three people where a shipment is you might get three answers.
[14:11] Dana: It's true, and it makes reporting a nightmare. When my boss asks me for on-time delivery numbers I'm basically guessing, or spending a whole afternoon pulling it together.
[14:11] Sam: Okay. One thing I'm curious about — your drivers and field folks, do they need access to any of this, or is it mostly the dispatch team in the office?
[14:12] Greg: Oh, good question. The drivers definitely need something, but it has to be mobile. They're in the cab of a truck, they're not going to log into some desktop dashboard. Right now they just call in, which ties up the phone lines.
[14:13] Dana: Yeah, mobile-friendly is a must. If it's not usable on a phone it's dead on arrival with the drivers.
[14:13] Sam: That's a really important constraint, I'm glad you said it. Let me ask the awkward question — if you did solve all this, who actually approves the budget for a tool like this?
[14:14] Dana: That'd be our COO, Marlene. She holds the purse strings for operations tooling. But she trusts my recommendation, so if I champion it internally, that carries weight.
[14:15] Sam: Good to know. And is this a "we need it this quarter" thing or more of a "exploring for next year" thing?
[14:15] Dana: Somewhere in between. It's not on fire today but peak season every year reminds us how much it hurts. I'd love to have something in place before next peak.
[14:16] Greg: I'd love to have it yesterday but I'm biased. [laughs]
[14:16] Sam: Understood. Okay, this has been super useful. Here's what I'd suggest as next steps — let me put together a short overview of how we'd integrate with your existing systems, the order system and the carrier portal especially, so you can see it wouldn't mean ripping everything out. Then maybe we set up a technical deep-dive with whoever owns those systems on your side?
[14:17] Dana: That works. Our IT lead, Foster, would need to be in that one.
[14:17] Sam: Perfect, I'll coordinate. Can we aim for sometime next week?
[14:18] Dana: Next week's good. Avoid Thursday, that's our big shipping day.
[14:18] Sam: Noted. Greg, Dana, thank you both, this was exactly the kind of conversation I was hoping for.
[14:18] Greg: Anytime. Now if you'll excuse me I have forty-seven emails that arrived during this call.
[14:18] Dana: [laughs] Thanks Sam, talk soon.`,

    `Customer Success Check-in — Globex Inc.
Date: Thursday, 11:30 AM
Attendees: Lena Park (Customer Success Manager), Tom Briggs (Globex System Admin), Aisha Rahman (Globex Marketing Director)

[11:30] Lena: Morning Tom! And — Aisha, hi, lovely to finally meet you, I think this is the first time we've been on a call together?
[11:31] Aisha: Hi Lena, yes, first time! Tom's told me good things, so no pressure. [laughs]
[11:31] Tom: I said you were "tolerable," let's not exaggerate. [laughs] Kidding, kidding.
[11:31] Lena: Ha! I'll take tolerable. Okay, so the agenda today — I wanted to check in on how adoption's been going, hear any pain points, and Tom mentioned there might be some expansion stuff to talk about, which is exciting. Did I miss anything?
[11:32] Tom: No that covers it. Should we start with the good news or the bad news?
[11:32] Lena: Ooh, dealer's choice. Let's do good news, I like good news.
[11:33] Tom: Okay so the good news is adoption is way up. Since that training session you ran for us — what was it, six weeks ago? — usage is up about forty percent. People are actually logging in now. We've even got a few power users who are building their own dashboards without me having to hold their hand, which, honestly, is a miracle.
[11:34] Lena: That's amazing! Forty percent is huge. The dashboard thing especially — that's exactly what we hope for, when people start self-serving.
[11:34] Tom: Yeah it's been great. The training really clicked for people. Maria in finance basically became a power user overnight, she's unstoppable now.
[11:35] Lena: Love that. Okay, hit me with the bad news.
[11:35] Tom: So, the not-so-good news. There's two bugs in the reporting module that keep biting us. The first one — when you filter by date range and then export, the export sometimes drops the last few rows. Not always, which makes it hard to pin down, but enough that people have noticed and they don't trust the exports now.
[11:36] Lena: Oof, okay, that's a trust issue, that's serious. What's the second one?
[11:37] Tom: The second one is the scheduled reports. They're supposed to go out every Monday at 8 AM and lately they've been going out at random times, or sometimes not at all. Last Monday it fired at like 2 in the afternoon.
[11:37] Lena: That's not good. Okay, I'm writing both of these down and I'm going to log them with our support and engineering team today. I'll get you a timeline for fixes — I can't promise the timeline on this call but I will chase it down and come back to you this week.
[11:38] Tom: Appreciate that. The export one is the more urgent of the two, if that helps prioritize.
[11:38] Lena: Noted, export bug is priority one. Okay — Aisha, I suspect this is where you come in?
[11:39] Aisha: It is! So, the reason I'm here. My marketing team has been watching what Tom's folks are doing and we're kind of jealous, honestly. We're still running everything out of spreadsheets and a couple of disconnected tools. I'd love to get my team onto the platform too.
[11:40] Lena: That's wonderful. How big is your team?
[11:40] Aisha: We're about twenty-five people. Could be a few more by Q1 if our hiring plan goes through, but call it twenty-five seats for now.
[11:41] Lena: Great, I'll put together expansion pricing for twenty-five seats and send it over. Is there a timeline you're targeting for getting them onboarded?
[11:41] Aisha: Ideally next quarter. We've got a big campaign push in Q2 and I'd want everyone trained up before that, not during.
[11:42] Lena: Smart. We'd definitely want to run a training session for your team like we did for Tom's — that's clearly what drove the adoption.
[11:42] Aisha: Yes please. Whatever Maria-in-finance got, I want that for my people.
[11:43] Tom: [laughs] The Maria treatment.
[11:43] Lena: Consider it booked, conceptually. Okay, two more quick things from my side. One — your renewal is coming up in about ninety days, so I want to start putting together a value summary for your exec sponsor. That's Daniel, right, the VP?
[11:44] Tom: Yeah, Daniel. He likes numbers, so the more ROI you can show the better.
[11:44] Lena: Perfect, I'll build that out with the adoption stats — the forty percent will look great in there. And two — Tom, you'd mentioned wanting a best-practices session on automation and flows?
[11:45] Tom: Yes! That'd be super valuable. We're doing a lot manually that I suspect could be automated, I just don't know what's possible.
[11:45] Lena: I'll set that up. Might fold it into the marketing training too so everyone benefits. Okay — I think that's everything? Let me read back the follow-ups so I don't forget: I'm logging the two reporting bugs today with export as priority, I'll get expansion pricing for twenty-five seats over to Aisha, I'll prep the renewal value summary for Daniel, and I'll schedule the automation best-practices session. Did I get it all?
[11:46] Tom: That's everything. You're good.
[11:46] Aisha: Thanks Lena, this was great. Excited to get my team on board.
[11:47] Lena: Likewise! Thanks both, I'll be in touch this week on those bugs. Have a good one!
[11:47] Tom: Later Lena.`
];

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
    _sampleIndex = 0; // which sample transcript to insert next (cycles)
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

    // Drops a ready-made sample transcript into the notes so an attendee can try the agent
    // without their own notes. Cycles through the samples on each click; appends if the user
    // has already typed something so their text isn't lost.
    insertSample() {
        const sample = SAMPLE_TRANSCRIPTS[this._sampleIndex % SAMPLE_TRANSCRIPTS.length];
        this._sampleIndex += 1;
        if (this.pastedText && this.pastedText.trim()) {
            this.insertIntoNotes(sample);
        } else {
            this.pastedText = sample;
            this._needsResize = true;
        }
        this.toast('Sample added', 'A sample transcript was added — edit it, then send to your agent.', 'success');
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
                // Downscale big images client-side so the base64 stays under the request cap.
                const toUpload = await this.prepareForUpload(file);
                const base64 = await this.blobToBase64(toUpload);
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

    /**
     * Returns an upload-ready Blob for a file. Large images are downscaled (longest edge to
     * MAX_IMAGE_DIMENSION) so their base64 stays under the Aura action request cap; everything
     * else (PDFs, docs, small images) is returned unchanged. Downscale failures fall back to
     * the original file so the upload still attempts.
     */
    async prepareForUpload(file) {
        const isImage = (file.type || '').startsWith('image/') || IMAGE_RE.test(file.name || '');
        if (!isImage || file.size <= IMAGE_DOWNSCALE_THRESHOLD) {
            return file;
        }
        try {
            return await this.downscaleImage(file);
        } catch (e) {
            // Couldn't resize (e.g. SVG/unsupported) — upload the original and let the
            // server-side size guard surface a clear message if it's still too big.
            return file;
        }
    }

    /** Draws the image onto a canvas scaled to MAX_IMAGE_DIMENSION and returns a JPEG Blob. */
    downscaleImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                const longest = Math.max(img.width, img.height);
                const scale = longest > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longest : 1;
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
                    'image/jpeg',
                    JPEG_QUALITY
                );
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('image load failed'));
            };
            img.src = url;
        });
    }

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

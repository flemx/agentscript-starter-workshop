# Note Capture — Claude-style Composer Redesign

**Date:** 2026-06-15
**Branch:** `feature/note-capture-claude-composer`
**Scope:** Front-end only (LWC `noteCapture`). No Apex or prompt-template changes.

## Goal

Redesign the `noteCapture` LWC from four stacked SLDS sections into a single unified
composer that feels like Anthropic Claude's chat input, but uses the Salesforce color
palette. Attendees attach files (images, PDFs, docs) and audio, optionally type/paste
notes, then send the combined transcript to an Employee Agent.

This satisfies the meeting action item: "Create UI Component — implement the UI/UX
component within the workshop home/setup" with a "streamlined, agentic UI".

## Why front-end only

`NoteCaptureAI.transcribeAudio` (platform speech-to-text) and `NoteCaptureAI.processFiles`
(the `Describe_File_Contents` Flex prompt template) already work against the live template
in the `hackathon-brussels--dev` sandbox. Keeping Apex untouched removes backend risk
before the demo.

## Component layout

Single composer card (white, 16px radius, soft shadow, blue-tinted border):

1. **Header** — AI icon + title "Capture Meeting Notes" + one-line subtitle.
2. **Attachment tray** (top of card) — one removable chip per attachment:
   - image files → thumbnail preview
   - PDFs / docs → icon chip with filename
   - audio recording → waveform chip with duration
   - each chip has an "✕" remove control.
3. **Text area** (middle) — borderless, auto-growing, placeholder text.
4. **Inline recording state** — while recording, show live waveform + timer + stop control
   inside the composer (replaces the old separate recorder section).
5. **Action bar** (bottom) — left: 📎 attach (file picker) + 🎙️ record toggle;
   right: compact agent picker + solid Cloud-Blue circular send button.

## Data flow (unchanged plumbing)

- Attach → `uploadFile` → `processFiles` (max 3 files — template has 3 File slots; attach
  disables at the cap).
- Mic → record → `uploadFile` → `transcribeAudio` (audio is separate from the 3-file cap).
- Send → `combinedTranscript` → ACC side-panel API (`accOpen` + `accExecute`), with the
  existing bubbling-event fallback.

## JS additions (front-end only)

- Per-file type detection (image vs pdf/doc) for chip rendering.
- Image thumbnails via `URL.createObjectURL`.
- Remove-attachment handlers (files + audio), updating the combined transcript.
- Unified attachment list for rendering.

## Color tokens (CSS custom properties)

`--sf-blue:#0176d3`, `--sf-blue-dark:#014486`, `--sf-navy:#032d60`,
neutral bg `#f3f6f9`, border `#e5e9f0`, white surfaces.

## Error handling

Reuse existing `reduceError`, toasts, inline error banner, mic-blocked message, and the
Apex graceful-degradation placeholders.

## Verification

1. `sf project deploy start -m LightningComponentBundle:noteCapture --target-org hackathon-brussels--dev`
2. Open the **Notes** tab in a browser and exercise attach / record / paste / send.

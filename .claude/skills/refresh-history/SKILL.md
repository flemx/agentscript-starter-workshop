---
name: refresh-history
description: Capture the current Claude session into the portal's session-based Agentic History (backs up the raw transcript, writes a sanitized timeline, rebuilds the portal bundles). Use when the user asks to update/refresh the agentic history, capture the conversation, or before sharing the report.
---

# Refresh Agentic History

The agentic history is normally captured **automatically** by the `Stop` hook every turn
(`command-center/scripts/capture_session.mjs`). Use this skill to capture/refresh it **on demand**
(e.g. before sharing) or if the hook didn't fire.

## Steps

1. **Locate this session's transcript.** It lives at
   `~/.claude/projects/-Users-dfleminks-Documents-projects-events-inspireai-hackathon/<session-id>.jsonl`.
   Pick the most recently modified `.jsonl` directly under that project dir.

2. **Capture it** (backs up the raw transcript to the gitignored `command-center/agentic-history/raw/`,
   writes the sanitized per-session timeline to the gitignored `command-center/data/sessions/<id>.json`,
   upserts the committed `command-center/data/sessions/index.json`, fires the detached gateway
   summarizer + classifier, and rebuilds the portal bundles):
   ```bash
   node command-center/scripts/capture_session.mjs <session-id> "<that .jsonl file>"
   ```

3. **Verify** it landed and no secrets leaked into the committed bundle:
   ```bash
   node -e "const s=require('fs').readFileSync('command-center/portal-data.js','utf8'); for(const k of ['sk-','phc_','sk-ant-','AKIA','AIza','xox']) if(s.includes(k)) { console.error('LEAK:',k); process.exit(1);} console.log('clean');"
   ```
   Check `command-center/data/sessions/.capture.log` for any errors.

4. **Commit** only the committed artifacts (never the raw backup or full-text bundle):
   ```bash
   git add command-center/data/sessions/index.json command-center/portal-data.js
   git commit -m "Refresh agentic history"
   ```

## Notes
- **Never committed:** raw transcripts (`agentic-history/raw/`), full per-session timelines
  (`command-center/data/sessions/<id>.json`), and the full-text bundle (`command-center/sessions-data.js`).
- **Committed:** the session index (metadata only) + `portal-data.js` (no full conversation text).
- Secrets (API keys/tokens/private-key blocks) are redacted by `session_lib.mjs` before anything is written.
- Full pipeline detail: `command-center/HARNESS.md`.

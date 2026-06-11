#!/usr/bin/env node
// capture_session.mjs — Stop-hook entry point. Snapshots the CURRENT session into the
// session-based Agentic History the portal renders.
//
// Wired in .claude/settings.json as a Stop hook (async:true). On each turn completion it:
//   1. Reads the hook payload (session_id, transcript_path) from stdin.
//   2. Copies the raw transcript to command-center/agentic-history/raw/<id>.jsonl (GITIGNORED).
//   3. Builds a sanitized per-session timeline -> data/sessions/<id>.json (GITIGNORED — may hold
//      project/customer context in message text).
//   4. Upserts data/sessions/index.json (committed — titles, dates, counts, summary only).
//   5. Rebuilds the browser bundles (portal-data.js committed, sessions-data.js gitignored).
//   6. Fires a DETACHED gateway summarizer for title+summary (non-blocking; updates index later).
//
// Loop-safe: respects stop_hook_active and always exits 0 with no decision.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  CC, SCRIPTS_DIR, SESSIONS_DIR, RAW_DIR,
  loadEntries, buildSession, deriveTitle, isoDate, readIndex, writeIndex,
} from "./session_lib.mjs";

function readStdin() { try { return fs.readFileSync(0, "utf8"); } catch { return ""; } }

function main() {
  let payload = {};
  try { payload = JSON.parse(readStdin() || "{}"); } catch { /* manual run */ }

  // Loop guard: never act while already in a stop-hook continuation.
  if (payload.stop_hook_active) { process.exit(0); }

  const sessionId = payload.session_id || process.argv[2] || "manual";
  const transcriptPath = payload.transcript_path || process.argv[3];
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    // Nothing to snapshot — silently succeed (don't disturb the agent).
    process.exit(0);
  }

  try {
    // 1. Raw backup (gitignored).
    fs.mkdirSync(RAW_DIR, { recursive: true });
    const rawDest = path.join(RAW_DIR, `${sessionId}.jsonl`);
    fs.copyFileSync(transcriptPath, rawDest);

    // 2. Sanitized per-session timeline.
    const entries = loadEntries(transcriptPath);
    const s = buildSession(entries);
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);

    // Preserve an existing LLM-generated title/summary if the summarizer already ran.
    let prevTitle = "", prevSummary = "";
    if (fs.existsSync(sessionFile)) {
      try { const prev = JSON.parse(fs.readFileSync(sessionFile, "utf8")); prevTitle = prev.title || ""; prevSummary = prev.summary || ""; } catch { /* */ }
    }

    const date = isoDate(s.firstTs) || new Date().toISOString().slice(0, 10);
    const out = {
      id: sessionId,
      title: prevTitle || deriveTitle(s.firstUser),
      summary: prevSummary,            // filled in by the detached summarizer
      date,
      updated: new Date().toISOString(),
      turns: s.turns,
      toolCalls: s.toolCalls,
      branch: s.branch,
      cwd: s.cwd,
      model: s.model,
      firstUser: s.firstUser,                       // FULL (gitignored file)
      firstUserPreview: s.firstUser.slice(0, 200),  // short preview for the committed index
      files: s.files,                               // files created/edited this session
      timeline: s.timeline,
    };
    fs.writeFileSync(sessionFile, JSON.stringify(out, null, 2));

    // 3. Upsert the index (committed; metadata only — NO transcript text). File paths are safe to
    //    share (they're already tracked in git) and power the "files touched" view in shared copies.
    const idx = readIndex();
    const entry = {
      id: sessionId,
      title: out.title,
      summary: out.summary,
      date: out.date,
      updated: out.updated,
      turns: out.turns,
      toolCalls: out.toolCalls,
      branch: out.branch,
      model: out.model,
      firstUserPreview: out.firstUserPreview,
      files: out.files,
    };
    const i = idx.sessions.findIndex((x) => x.id === sessionId);
    if (i >= 0) idx.sessions[i] = { ...idx.sessions[i], ...entry };
    else idx.sessions.push(entry);
    writeIndex(idx);

    // 4. Rebuild browser bundles. build_portal_data.mjs is the DETERMINISTIC whole-center
    //    regenerator — it re-reads GOALS.md + PROGRESS.md + research + work-items + sessions, so
    //    this single spawn refreshes the entire portal (goals/log/tracks/sessions), not just this
    //    session. No LLM involved here.
    spawnDetached(process.execPath, [path.join(SCRIPTS_DIR, "build_portal_data.mjs")]);

    // 5. Fire the detached summarizer (title + 1-line summary via gateway). Never blocks.
    //    Only (re)summarize if we don't yet have an LLM summary, to save tokens.
    if (!prevSummary) {
      spawnDetached(process.execPath, [path.join(SCRIPTS_DIR, "summarize_session.mjs"), sessionId]);
    }

    // 6. Fire the detached classifier — the ONLY other gateway call. It associates this session
    //    with a research-round / build-task work item (additive; preserves hand-set links). It
    //    rebuilds the bundles itself when done. Best-effort: gateway down → session stays Unsorted.
    spawnDetached(process.execPath, [path.join(SCRIPTS_DIR, "classify_session.mjs"), sessionId]);
  } catch (e) {
    // Hooks must never break the agent — swallow and exit 0.
    try { fs.appendFileSync(path.join(SESSIONS_DIR, ".capture.log"), `${new Date().toISOString()} ${e.stack || e}\n`); } catch { /* */ }
  }
  process.exit(0);
}

function spawnDetached(cmd, args) {
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore", cwd: CC });
    child.unref();
  } catch { /* best-effort */ }
}

main();

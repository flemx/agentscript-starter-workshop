#!/usr/bin/env node
// summarize_session.mjs — DETACHED helper spawned by the Stop hook. Uses the internal gateway to
// generate a short human title + 1–2 sentence summary for a session, then writes them back into
// data/sessions/<id>.json and the index, and rebuilds the bundles. Runs out-of-band so it never
// delays the agent. Best-effort: if the gateway is down, the derived title stays.
//
// Usage: node scripts/summarize_session.mjs <sessionId>
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { CC, SCRIPTS_DIR, SESSIONS_DIR, readIndex, writeIndex, redact } from "./session_lib.mjs";
import { chat } from "./gateway.mjs";

async function main() {
  const id = process.argv[2];
  if (!id) process.exit(1);
  const file = path.join(SESSIONS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) process.exit(0);
  const session = JSON.parse(fs.readFileSync(file, "utf8"));

  // Build a compact, redacted digest of the session for the summarizer (cap size).
  const digest = (session.timeline || [])
    .map((t) => {
      const who = t.role === "user" ? "USER" : "AGENT";
      const tools = (t.tools || []).map((x) => x.name).join(",");
      return `${who}: ${(t.preview || "").slice(0, 300)}${tools ? ` [tools: ${tools}]` : ""}`;
    })
    .join("\n")
    .slice(0, 14000);

  let title = session.title, summary = session.summary;
  try {
    const raw = await chat({
      system:
        "You label an AI coding/research session for a project dashboard. Given a redacted digest, " +
        "return STRICT JSON: {\"title\": \"<=8 words, specific, no quotes\", \"summary\": \"1-2 sentences, " +
        "what the user asked + what the agent accomplished\"}. No secrets, no PII, no markdown.",
      user: digest,
      maxTokens: 220,
    });
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const j = JSON.parse(m[0]);
      if (j.title) title = redact(String(j.title)).replace(/^["']|["']$/g, "").slice(0, 80);
      if (j.summary) summary = redact(String(j.summary)).slice(0, 400);
    }
  } catch (e) {
    try { fs.appendFileSync(path.join(SESSIONS_DIR, ".capture.log"), `${new Date().toISOString()} summarize ${id}: ${e.message}\n`); } catch { /* */ }
  }

  session.title = title;
  session.summary = summary;
  fs.writeFileSync(file, JSON.stringify(session, null, 2));

  const idx = readIndex();
  const i = idx.sessions.findIndex((x) => x.id === id);
  if (i >= 0) { idx.sessions[i].title = title; idx.sessions[i].summary = summary; writeIndex(idx); }

  // Rebuild bundles so the portal reflects the new title/summary.
  try { spawn(process.execPath, [path.join(SCRIPTS_DIR, "build_portal_data.mjs")], { detached: true, stdio: "ignore", cwd: CC }).unref(); } catch { /* */ }
  process.exit(0);
}

main();

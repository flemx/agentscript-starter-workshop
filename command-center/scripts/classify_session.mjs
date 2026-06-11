#!/usr/bin/env node
// classify_session.mjs — DETACHED helper spawned by the Stop hook. Uses the internal gateway to
// decide which WORK ITEM (research round or build task) a session belongs to, and records the
// association in data/work-items.json. Then rebuilds the portal bundles. Runs out-of-band so it
// never delays the agent.
//
// Design guarantees:
//  - ADDITIVE: only ever ADDS a session id to an item's `sessions[]`; never removes a hand-set link.
//  - IDEMPOTENT: if the session is already associated with some item, it's a no-op.
//  - BEST-EFFORT: if the gateway is unreachable or returns junk, the session simply stays
//    unassigned (the portal shows such sessions under "Unsorted"). Never throws into the hook.
//
// Usage: node scripts/classify_session.mjs <sessionId>
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { CC, SCRIPTS_DIR, SESSIONS_DIR, WORK_ITEMS_PATH, redact } from "./session_lib.mjs";
import { chat } from "./gateway.mjs";

function log(msg) {
  try { fs.appendFileSync(path.join(SESSIONS_DIR, ".capture.log"), `${new Date().toISOString()} classify: ${msg}\n`); } catch { /* */ }
}

function rebuild() {
  try { spawn(process.execPath, [path.join(SCRIPTS_DIR, "build_portal_data.mjs")], { detached: true, stdio: "ignore", cwd: CC }).unref(); } catch { /* */ }
}

async function main() {
  const id = process.argv[2];
  if (!id) process.exit(1);

  const sessionFile = path.join(SESSIONS_DIR, `${id}.json`);
  if (!fs.existsSync(sessionFile) || !fs.existsSync(WORK_ITEMS_PATH)) process.exit(0);

  let wi;
  try { wi = JSON.parse(fs.readFileSync(WORK_ITEMS_PATH, "utf8")); } catch { process.exit(0); }
  wi.tracks = wi.tracks || {};

  // Idempotent: already linked anywhere? → done.
  const already = Object.values(wi.tracks).some((t) => (t.items || []).some((it) => (it.sessions || []).includes(id)));
  if (already) process.exit(0);

  const session = JSON.parse(fs.readFileSync(sessionFile, "utf8"));

  // Compact, redacted digest of the session for the classifier.
  const digest = (session.timeline || [])
    .slice(0, 60)
    .map((t) => {
      const who = t.role === "user" ? "USER" : "AGENT";
      const tools = (t.tools || []).map((x) => x.name).join(",");
      return `${who}: ${redact((t.text || "").slice(0, 200))}${tools ? ` [tools: ${tools}]` : ""}`;
    })
    .join("\n")
    .slice(0, 8000);

  // List the existing items the model may choose from.
  const catalog = [];
  for (const [trackId, track] of Object.entries(wi.tracks)) {
    for (const it of track.items || []) {
      catalog.push(`- trackId=${trackId} itemId=${it.id} | ${it.title} (status:${it.status})`);
    }
  }

  let choice = null;
  try {
    const raw = await chat({
      system:
        "You assign an AI work session to ONE work item in a project tracker that has two tracks: " +
        "'research' (research rounds) and 'build' (build tasks). Given the existing items and a " +
        "redacted session digest, return STRICT JSON. If the session fits an existing item: " +
        '{"trackId":"research|build","itemId":"<existing id>"}. If it clearly belongs to a track ' +
        'but no existing item fits: {"trackId":"research|build","itemId":null,"suggestTitle":"<=10 words"}. ' +
        "Prefer an existing item when reasonable. No prose, no markdown — JSON only.",
      user: `EXISTING ITEMS:\n${catalog.join("\n")}\n\nSESSION DIGEST:\n${digest}`,
      maxTokens: 120,
    });
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) choice = JSON.parse(m[0]);
  } catch (e) {
    log(`${id}: gateway error ${e.message}`);
    process.exit(0); // best-effort — leave unassigned
  }

  if (!choice || !choice.trackId || !wi.tracks[choice.trackId]) {
    log(`${id}: no usable classification`);
    process.exit(0);
  }
  const track = wi.tracks[choice.trackId];
  track.items = track.items || [];

  let item = choice.itemId ? track.items.find((it) => it.id === choice.itemId) : null;
  if (!item) {
    // Create a new 'planned' item from the suggested title (or a generic one).
    const title = (choice.suggestTitle || "New work item").toString().slice(0, 80);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
    item = {
      id: `${choice.trackId}-${slug}`,
      title,
      status: "planned",
      start: session.date || new Date().toISOString().slice(0, 10),
      updated: new Date().toISOString().slice(0, 10),
      outcome: "",
      sessions: [],
    };
    track.items.push(item);
  }
  item.sessions = item.sessions || [];
  if (!item.sessions.includes(id)) item.sessions.push(id);
  item.updated = session.date || new Date().toISOString().slice(0, 10);

  fs.writeFileSync(WORK_ITEMS_PATH, JSON.stringify(wi, null, 2));
  log(`${id}: -> ${choice.trackId}/${item.id}`);
  rebuild();
  process.exit(0);
}

main();

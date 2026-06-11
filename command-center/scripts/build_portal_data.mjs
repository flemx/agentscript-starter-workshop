#!/usr/bin/env node
// build_portal_data.mjs — the DETERMINISTIC whole-Command-Center regenerator (NO LLM).
//
// Run every turn by the Stop hook (and any time source data changes). It re-reads every
// source-of-truth file and regenerates the browser bundles the portal loads via <script src>
// (using <script src>, not fetch(), so the portal works on file:// — browsers block fetch() of
// local files via CORS). HTML is NEVER rewritten — only data. Soft fields (session title/summary,
// work-item classification) are filled by separate detached gateway scripts; everything here is
// pure, deterministic projection of:
//
//   projects/<name>/GOALS.md            → goals (single source of truth; overrides portal.json.goals)
//   PROGRESS.md (## Log)                → window.LOG (research/build log timeline)
//   command-center/data/portal.json     → brand · nav · pages · models (project content)
//   command-center/data/research.json    → window.RESEARCH (findings/sources)
//   command-center/data/work-items.json  → window.WORK_ITEMS (research rounds + build tasks)
//   command-center/data/versions.json    → window.VERSIONS (git version browser)
//   command-center/data/sessions/index.json + <id>.json → SESSION_INDEX (committed) + SESSIONS (gitignored)
//
// Emits TWO files into command-center/:
//   portal-data.js   (COMMITTED)  — window.PORTAL/RESEARCH/WORK_ITEMS/LOG/VERSIONS/SESSION_INDEX/FILES.
//                                    FILES = the repo's .md/.html docs (md content embedded, html by href)
//                                    for the file-explorer page; ext-filtered so no secrets/raw logs leak.
//                                    Metadata only — NO timeline / full text / tool bodies.
//   sessions-data.js (GITIGNORED) — window.SESSIONS = { <id>: {full timeline incl. text + tool
//                                    args/results + per-turn ts/model} }. Local-only.
import fs from "node:fs";
import path from "node:path";
import { CC, REPO, DATA, SESSIONS_DIR, PROGRESS_PATH, readIndex } from "./session_lib.mjs";
import { parseGoalsFile } from "./parse_goals.mjs";

function readJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}

// ── Parse PROGRESS.md "## Log" into a timeline ────────────────────────────────
// Each "### YYYY-MM-DD — title" block becomes { date, title, bullets[], cls }. cls colors the
// timeline dot: the newest entry is "now", entries whose bullets are dominated by ⏭️ are "next",
// the rest are "done".
function parseProgressLog() {
  let md = "";
  try { md = fs.readFileSync(PROGRESS_PATH, "utf8"); } catch { return []; }
  const logStart = md.search(/^##\s+Log\s*$/m);
  if (logStart < 0) return [];
  const body = md.slice(logStart);
  const blocks = body.split(/^###\s+/m).slice(1); // drop the "## Log" preamble
  const entries = [];
  for (const b of blocks) {
    const firstNl = b.indexOf("\n");
    const header = (firstNl < 0 ? b : b.slice(0, firstNl)).trim();
    const m = header.match(/^(\d{4}-\d{2}-\d{2})\s*[—–-]\s*(.+)$/);
    const date = m ? m[1] : "";
    const title = m ? m[2].trim() : header;
    const rest = firstNl < 0 ? "" : b.slice(firstNl + 1);
    const bullets = [];
    for (const line of rest.split("\n")) {
      const lm = line.match(/^\s*-\s+(.*)$/);
      if (lm) bullets.push(lm[1].trim());
      else if (/^##\s/.test(line)) break;
    }
    if (date || title) entries.push({ date, title, bullets });
  }
  // newest first (PROGRESS.md already newest-first); set cls
  entries.forEach((e, i) => {
    const nextish = e.bullets.filter((x) => x.startsWith("⏭️")).length;
    e.cls = i === 0 ? "now" : (nextish && nextish >= e.bullets.length / 2 ? "next" : "done");
  });
  return entries;
}

// ── Merge parsed GOALS.md into portal.json (goals are sourced from GOALS.md) ──
const portal = readJSON(path.join(DATA, "portal.json"), { brand: { name: "Project" }, nav: [], pages: [] });
const parsed = parseGoalsFile();
// GOALS.md wins for goals; but never wipe existing goals if the parse came back empty.
if (parsed.goals && parsed.goals.length) portal.goals = parsed.goals;
else if (!portal.goals) portal.goals = [];
portal.goalsMeta = parsed.goalsMeta && Object.keys(parsed.goalsMeta).length ? parsed.goalsMeta : (portal.goalsMeta || {});

const research = readJSON(path.join(DATA, "research.json"), { status: "pending" });
const workItems = readJSON(path.join(DATA, "work-items.json"), { tracks: {} });
const versions = readJSON(path.join(DATA, "versions.json"), []);
const log = parseProgressLog();
const index = readIndex();

// Inline each work item's referenced markdown report (reportRef → repo-relative path) so the portal
// can render a rich report without a separate fetch (works on file://). Capped to keep the committed
// bundle reasonable. The .md file stays the source of truth — this is just a snapshot for display.
for (const track of Object.values(workItems.tracks || {})) {
  for (const item of track.items || []) {
    if (!item.reportRef) continue;
    try {
      const md = fs.readFileSync(path.join(REPO, item.reportRef), "utf8");
      item.reportMd = md.length > 60000 ? md.slice(0, 60000) + "\n\n…(truncated — see " + item.reportRef + ")" : md;
    } catch { /* missing report file — skip, leave reportRef for the link */ }
  }
}

// Map each session id → the work-item id it belongs to (for the session list "work item" filter).
const sessionToItem = {};
for (const [trackId, track] of Object.entries(workItems.tracks || {})) {
  for (const item of track.items || []) {
    for (const sid of item.sessions || []) {
      sessionToItem[sid] = { trackId, itemId: item.id, itemTitle: item.title };
    }
  }
}

// ── Committed session index: metadata only (no timeline/full text) ──
const sessionIndex = (index.sessions || []).map((s) => ({
  ...s,
  workItem: sessionToItem[s.id] || null,
}));

// ── Gitignored full timelines ──
const sessions = {};
if (fs.existsSync(SESSIONS_DIR)) {
  for (const f of fs.readdirSync(SESSIONS_DIR)) {
    if (!f.endsWith(".json") || f === "index.json") continue;
    const s = readJSON(path.join(SESSIONS_DIR, f), null);
    if (s && s.id) {
      sessions[s.id] = {
        id: s.id, title: s.title, summary: s.summary, date: s.date,
        updated: s.updated, turns: s.turns, toolCalls: s.toolCalls,
        branch: s.branch || "", cwd: s.cwd || "", model: s.model || "",
        firstUser: s.firstUser || "", timeline: s.timeline || [],
      };
    }
  }
}

// ── File explorer: scan the repo for openable docs (.md / .html) ──────────────
// Powers the portal's "Files" page (a file explorer over everything we build) + the per-work-item
// "Deliverables" links. Deterministic filesystem walk from the repo root, ext-filtered to .md/.html
// with the heavy/generated/sensitive dirs ignored. For markdown we embed the (capped) CONTENT so it
// renders on file:// (browsers block fetch() of local files); for HTML we emit a relative href so the
// portal can open it in an iframe (the same trick the version browser uses). The ext filter alone
// keeps secrets/raw-logs (never .md/.html) out of the committed bundle; the dir-ignores drop the
// gitignored versions/agentic-history copies.
// Dirs skipped when scanning for *previewable docs* (.md/.html): heavy/generated + dotdirs.
const FILE_IGNORE_DIRS = new Set([
  "node_modules", "versions", "agentic-history", "target", "dist", "build",
  "coverage", "__pycache__", ".git", ".venv", "venv", ".claude", ".cursor", ".husky", ".vscode",
]);
// Dirs ALWAYS skipped, even in "all files (incl. hidden)" browse mode — they'd explode the bundle
// or are pure noise (VCS internals, deps, build output, archived versions, raw transcripts).
const ALL_HARD_IGNORE = new Set([
  ".git", "node_modules", "target", "dist", "build", "coverage", "__pycache__", ".venv", "venv",
  "versions", "raw",                       // agentic-history/raw = gitignored raw logs
  ".sfdx", ".sf", ".gradle", ".next", ".turbo", ".cache", ".pytest_cache", ".mypy_cache",
  ".idea", "vendor", "Pods", "DerivedData", // dev-tool caches that explode the listing (e.g. .sfdx/tools)
]);
const FILE_MD_CAP = 100000;            // embed cap per markdown file
const ALL_FILES_CAP = 6000;            // safety cap on the full-tree listing

function statMeta(full) {
  let size = 0, mtime = 0;
  try { const s = fs.statSync(full); size = s.size; mtime = Math.round(s.mtimeMs); } catch { /* */ }
  return { size, mtime };
}

// Previewable docs (.md content embedded, .html by relative href) — drives previews + deliverables.
function buildFiles() {
  const out = [];
  const walk = (abs) => {
    let entries = [];
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(abs, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith(".") || FILE_IGNORE_DIRS.has(e.name)) continue;   // skip dotdirs + heavy/generated
        walk(full);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (ext !== ".md" && ext !== ".html") continue;
        const rel = path.relative(REPO, full).split(path.sep).join("/");
        if (rel === "command-center/index.html") continue;                       // the portal shell itself
        const { size, mtime } = statMeta(full);
        const node = { path: rel, name: e.name, ext: ext.slice(1), size, mtime };
        if (ext === ".md") {
          try {
            const md = fs.readFileSync(full, "utf8");
            node.md = md.length > FILE_MD_CAP ? md.slice(0, FILE_MD_CAP) + "\n\n…(truncated — open " + rel + ")" : md;
          } catch { /* unreadable — list it without content */ }
        } else {
          node.href = "../" + rel;   // relative to command-center/index.html → works on file://
        }
        out.push(node);
      }
    }
  };
  walk(REPO);
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

// Full-tree metadata listing (NO content) — incl. hidden files/dirs — for the "all files" browse
// mode. Metadata only (path/name/ext/size/mtime), so it can never leak file contents; the hard-ignore
// set keeps the bundle bounded. .md/.html here cross-reference into FILES for inline preview.
function buildAllFiles() {
  const out = [];
  let capped = false;
  const walk = (abs) => {
    if (capped) return;
    let entries = [];
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= ALL_FILES_CAP) { capped = true; return; }
      const full = path.join(abs, e.name);
      if (e.isDirectory()) {
        if (ALL_HARD_IGNORE.has(e.name)) continue;   // keep other dotdirs (.claude, .cursor, …)
        walk(full);
      } else if (e.isFile()) {
        if (e.name === ".git" || e.name === ".DS_Store") continue;   // worktree gitdir-pointer / macOS noise
        const rel = path.relative(REPO, full).split(path.sep).join("/");
        const ext = path.extname(e.name).toLowerCase().slice(1);
        const { size, mtime } = statMeta(full);
        out.push({ path: rel, name: e.name, ext, size, mtime });
      }
    }
  };
  walk(REPO);
  out.sort((a, b) => a.path.localeCompare(b.path));
  return { list: out, capped };
}

const files = buildFiles();
const allFilesScan = buildAllFiles();
const allFiles = allFilesScan.list;
if (allFilesScan.capped) console.warn(`⚠️  all-files listing capped at ${ALL_FILES_CAP} entries.`);

const banner = "/* AUTO-GENERATED by scripts/build_portal_data.mjs — do not edit by hand. */\n";

fs.writeFileSync(
  path.join(CC, "portal-data.js"),
  banner +
    "window.PORTAL = " + JSON.stringify(portal) + ";\n" +
    "window.RESEARCH = " + JSON.stringify(research) + ";\n" +
    "window.WORK_ITEMS = " + JSON.stringify(workItems) + ";\n" +
    "window.LOG = " + JSON.stringify(log) + ";\n" +
    "window.VERSIONS = " + JSON.stringify(versions) + ";\n" +
    "window.SESSION_INDEX = " + JSON.stringify(sessionIndex) + ";\n" +
    "window.FILES = " + JSON.stringify(files) + ";\n"
);

fs.writeFileSync(
  path.join(CC, "sessions-data.js"),
  banner +
    "/* GITIGNORED: local-only. Full sanitized conversation text + tool args/results, plus the\n" +
    "   full-tree file listing (ALL_FILES, incl. hidden — metadata only) and the absolute repo root\n" +
    "   (FILES_ROOT) for copy-path / open-in-Finder. These are machine-specific + may name gitignored\n" +
    "   files, so they live here, NOT in the committed/shareable portal-data.js. */\n" +
    "window.SESSIONS = " + JSON.stringify(sessions) + ";\n" +
    "window.ALL_FILES = " + JSON.stringify(allFiles) + ";\n" +
    "window.FILES_ROOT = " + JSON.stringify(REPO) + ";\n"
);

console.log(
  `Built portal-data.js (goals:${portal.goals.length} pages:${portal.pages.length} log:${log.length} ` +
  `research:${(research.confirmed || []).length}c work-items:${Object.values(workItems.tracks || {}).reduce((n, t) => n + (t.items || []).length, 0)} ` +
  `files:${files.length} allFiles:${allFiles.length} versions:${versions.length} sessions:${sessionIndex.length}) + sessions-data.js (${Object.keys(sessions).length} full timelines).`
);

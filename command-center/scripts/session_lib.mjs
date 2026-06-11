// Shared helpers for turning a raw Claude session transcript (.jsonl) into a SANITIZED,
// session-scoped timeline for the portal's Agentic History. Secrets are redacted.
//
// IMPORTANT (data boundary): the FULL sanitized timeline produced here — full message text, full
// tool arguments AND full tool-result bodies — is written ONLY into gitignored artifacts
// (data/sessions/<id>.json and command-center/sessions-data.js). The COMMITTED index keeps just
// metadata (titles/dates/counts/short preview). So nothing leaks into git, but nothing is lost
// locally either. (Earlier versions truncated message text at 1400 chars and tool args at 140,
// and dropped tool-result bodies entirely — that data was permanently lost. Fixed here.)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Path authority for the whole harness ─────────────────────────────────────
// Every script imports these from here, so a folder move only changes this block.
// This file lives at command-center/scripts/, so dirname/.. = command-center/ (= CC).
export const CC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");   // command-center/
export const REPO = path.resolve(CC, "..");                                          // repo root
export const DATA = path.join(CC, "data");
export const SESSIONS_DIR = path.join(DATA, "sessions");
export const RAW_DIR = path.join(CC, "agentic-history", "raw");
export const VERSIONS_DIR = path.join(CC, "versions");
export const SCRIPTS_DIR = path.join(CC, "scripts");
export const ENV_PATH = path.join(CC, "research", ".env");
export const PROGRESS_PATH = path.join(REPO, "PROGRESS.md");
export const WORK_ITEMS_PATH = path.join(DATA, "work-items.json");
// ── The ACTIVE project the cockpit serves. Change PROJECT_DIR to repurpose. ──
export const PROJECT_DIR = path.join(REPO, "projects", "agentforce-hackathon");
export const GOALS_PATH = path.join(PROJECT_DIR, "GOALS.md");
// Back-compat alias: some call sites used ROOT to mean command-center (CC). Keep it pointing at CC.
export const ROOT = CC;

// Soft cap for a single stored tool-result body (gitignored bundle only). Keeps sessions-data.js
// from ballooning into many MB while still preserving almost everything. The committed bundle is
// metadata-only regardless.
const MAX_RESULT_CHARS = 200_000;

const REDACTIONS = [
  /sk-ant-[A-Za-z0-9_-]{20,}/g,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bgsk_[A-Za-z0-9]{20,}/g,
  /\bphc_[A-Za-z0-9]{2,}…?/g,
  /\bsk-[A-Za-z0-9]{3,}…/g,
  /AKIA[0-9A-Z]{16}/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /xox[baprs]-[0-9A-Za-z-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._-]{24,}/g,
  /-----BEGIN[^-]*PRIVATE KEY-----[\s\S]*?-----END[^-]*PRIVATE KEY-----/g,
];

export function redact(s) {
  if (typeof s !== "string") return s;
  let out = s;
  for (const re of REDACTIONS) out = out.replace(re, "«REDACTED-SECRET»");
  return out;
}

export function hasSecret(s) {
  if (typeof s !== "string") return false;
  return REDACTIONS.some((re) => { re.lastIndex = 0; return re.test(s); });
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === "string") return c;
        if (c?.type === "text") return c.text;
        if (c?.type === "thinking") return "🧠 " + (c.thinking || "");
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

// Stringify a tool-result body (it may be a string, or an array of content blocks).
function resultText(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === "string" ? c : c?.type === "text" ? c.text : JSON.stringify(c)))
      .filter(Boolean)
      .join("\n");
  }
  return typeof content === "object" ? JSON.stringify(content) : String(content);
}

// Collect every tool_result block across the transcript, keyed by the tool_use_id it answers.
// tool_use blocks live in assistant messages; their results arrive in the *next* user message.
function collectToolResults(entries) {
  const byId = {};
  for (const e of entries) {
    const content = (e.message || e).content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c?.type === "tool_result" && c.tool_use_id) {
        let body = redact(resultText(c.content));
        const len = body.length;
        if (body.length > MAX_RESULT_CHARS) {
          body = body.slice(0, MAX_RESULT_CHARS) + `\n…[truncated ${len - MAX_RESULT_CHARS} chars — see raw backup]`;
        }
        byId[c.tool_use_id] = { result: body, resultLen: len, isError: !!c.is_error };
      }
    }
  }
  return byId;
}

// Build the tool list for one assistant message. Each entry carries a short one-line `summary`
// (for the collapsed view), the FULL redacted `args`, and the FULL matched tool `result`.
function toolsOf(content, resultsById) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((c) => c?.type === "tool_use")
    .map((c) => {
      const inp = c.input || {};
      let summary = "";
      try {
        summary = inp.description || inp.command || inp.file_path || inp.prompt || inp.query ||
          inp.subject || (typeof inp === "string" ? inp : JSON.stringify(inp));
      } catch { summary = ""; }
      const argsFull = redact(typeof inp === "string" ? inp : JSON.stringify(inp, null, 2));
      const match = (resultsById || {})[c.id] || {};
      return {
        name: c.name || "tool",
        summary: redact(String(summary)).slice(0, 140),
        args: argsFull,
        argsLen: argsFull.length,
        result: match.result || "",
        resultLen: match.resultLen || 0,
        isError: match.isError || false,
      };
    });
}

export function loadEntries(file) {
  const raw = fs.readFileSync(file, "utf8").trim();
  if (raw.startsWith("[")) return JSON.parse(raw);
  return raw
    .split("\n")
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

// Tools that create/modify files, and how to label the action.
const FILE_TOOLS = { Write: "write", Edit: "edit", MultiEdit: "edit", NotebookEdit: "edit" };

// Normalize an absolute path to a repo-relative one (so the portal shows `scripts/foo.mjs`, not the
// whole machine path). Falls back to the basename for paths outside the repo (e.g. /tmp, ~/.claude).
function relPath(fp) {
  if (typeof fp !== "string" || !fp) return "";
  if (fp.startsWith(REPO + "/")) return fp.slice(REPO.length + 1);   // inside the repo → repo-relative
  return fp.replace(/^.*\//, "");                                    // outside the repo → just the filename
}

// Derive the list of files this session created/edited, with a touch count + whether any touch was
// a Write (vs only Edit). Built from the sanitized timeline's tool args — no extra data needed.
function filesFrom(timeline) {
  const map = new Map();
  for (const t of timeline) {
    for (const tool of t.tools || []) {
      const action = FILE_TOOLS[tool.name];
      if (!action) continue;
      let fp = "";
      try { fp = (JSON.parse(tool.args || "{}").file_path) || ""; } catch { /* args not JSON */ }
      const rel = relPath(fp);
      if (!rel) continue;
      const cur = map.get(rel) || { path: rel, touches: 0, created: false };
      cur.touches += 1;
      if (tool.name === "Write") cur.created = true;   // Write can create; Edit only modifies
      map.set(rel, cur);
    }
  }
  // Sort: most-touched first, then path.
  return [...map.values()].sort((a, b) => b.touches - a.touches || a.path.localeCompare(b.path));
}

// Build a sanitized timeline + metadata from raw entries. Full text is preserved (the caller
// decides what to commit vs keep local).
export function buildSession(entries) {
  const resultsById = collectToolResults(entries);
  const timeline = [];
  let firstUser = "";
  let toolCalls = 0;
  let firstTs = null, lastTs = null;
  let branch = "", cwd = "", model = "";

  for (const e of entries) {
    const ts = e.timestamp || e.message?.timestamp;
    if (ts) { if (!firstTs) firstTs = ts; lastTs = ts; }
    if (!branch && e.gitBranch && e.gitBranch !== "HEAD") branch = e.gitBranch;
    if (!cwd && e.cwd) cwd = e.cwd;
    const msg = e.message || e;
    const role = msg.role || e.type;
    if (!["user", "assistant"].includes(role)) continue;
    const turnModel = msg.model || e.model || "";
    if (!model && turnModel) model = turnModel;
    const content = msg.content;
    const text = redact(textOf(content)).trim();           // FULL text — no truncation
    const tools = toolsOf(content, resultsById);
    toolCalls += tools.length;
    if (role === "user" && !firstUser && text && !text.startsWith("🧠")) {
      firstUser = cleanUserText(text);
    }
    if (!text && !tools.length) continue;
    timeline.push({ role, ts: ts || "", model: turnModel || "", tools, text, len: text.length });
  }

  return {
    timeline,
    turns: timeline.length,
    toolCalls,
    firstUser,
    firstTs,
    lastTs,
    branch,
    cwd,
    model,
    files: filesFrom(timeline),
  };
}

// Strip the local-command / caveat / command-name wrappers that the harness prepends, so the
// "first user message" reflects the actual human intent.
export function cleanUserText(text) {
  return text
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/gi, " ")
    .replace(/<command-(name|message|args)>[\s\S]*?<\/command-\1>/gi, " ")
    .replace(/<local-command-std(out|err)>[\s\S]*?<\/local-command-std\1>/gi, " ")
    .replace(/Caveat: The messages below[\s\S]*?explicitly asks you to\.?/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Derive a clean, human title from the first user message (fallback when no LLM summary yet).
export function deriveTitle(firstUser) {
  if (!firstUser) return "Untitled session";
  let t = firstUser
    .replace(/<[^>]+>/g, " ")                 // strip tags
    .replace(/\/[a-z-]+/g, " ")               // strip slash-commands
    .replace(/Run the .*? workflow\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Take the first sentence-ish chunk.
  t = t.split(/[.!?\n]/)[0].trim();
  if (t.length > 72) t = t.slice(0, 69).trimEnd() + "…";
  return t || "Untitled session";
}

export function isoDate(ts) {
  try { return new Date(ts).toISOString().slice(0, 10); } catch { return ""; }
}

export function readIndex() {
  const p = path.join(SESSIONS_DIR, "index.json");
  if (!fs.existsSync(p)) return { sessions: [] };
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return { sessions: [] }; }
}

export function writeIndex(idx) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  // Newest first.
  idx.sessions.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  fs.writeFileSync(path.join(SESSIONS_DIR, "index.json"), JSON.stringify(idx, null, 2));
}

#!/usr/bin/env node
// Secret-guard: a PreToolUse hook for git commits AND a reusable scanner.
//
// As a hook (configured in .claude/settings.json on Bash PreToolUse): if the tool command is a
// `git commit`, it scans the *staged* diff for secrets. If any are found it returns a deny
// decision so the commit is blocked. This enforces AGENTS.md §6 ("never commit secrets").
//
// Reads the hook payload as JSON on stdin. Outputs a JSON decision on stdout.
import { execSync } from "node:child_process";
import fs from "node:fs";

// High-signal secret patterns. Keep conservative to avoid false positives on docs.
const PATTERNS = [
  { name: "ENG_AI_MODEL_GW_KEY", re: /sk-[A-Za-z0-9_-]{16,}/ },
  { name: "OpenAI key", re: /sk-(proj|svcacct|None)?[A-Za-z0-9]{20,}/ },
  { name: "Anthropic key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "Groq key", re: /gsk_[A-Za-z0-9]{20,}/ },
  { name: "PostHog key", re: /phc_[A-Za-z0-9]{20,}/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: "Slack token", re: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { name: "Private key block", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Bearer token literal", re: /Bearer\s+[A-Za-z0-9._-]{24,}/ },
];

export function scan(text) {
  const hits = [];
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m) hits.push({ name: p.name, sample: m[0].slice(0, 6) + "…(redacted)" });
  }
  return hits;
}

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); } catch { return ""; }
}

// ── Hook mode — only runs when this file is the entry point (not when imported) ──
function runHook() {
  const raw = readStdin();
  let payload = {};
  try { payload = JSON.parse(raw || "{}"); } catch { /* not hook json */ }

  const cmd = payload?.tool_input?.command || payload?.tool_input?.cmd || "";
  const isCommit = /\bgit\b[^\n]*\bcommit\b/.test(cmd);

  if (!isCommit) {
    // Not a commit — allow silently.
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  let staged = "";
  try { staged = execSync("git diff --cached", { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }); }
  catch { /* no repo / nothing staged */ }

  const hits = scan(staged);
  if (hits.length) {
    const reason =
      "🚫 secret-guard BLOCKED this commit. Possible secrets in the staged diff: " +
      hits.map((h) => `${h.name} (${h.sample})`).join(", ") +
      ". Remove the secret, ensure it's gitignored, and re-stage. Do NOT bypass with --no-verify.";
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
      decision: "block",
      reason,
    }));
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) runHook();

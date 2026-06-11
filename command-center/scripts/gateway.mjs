// Thin client for the internal ENG AI Model Gateway (LiteLLM proxy, OpenAI-compatible).
// Used by hooks/scripts for async, non-blocking LLM work (summaries, changelogs, sanitization).
//
// Auth: ENG_AI_MODEL_GW_KEY (load from research/.env — gitignored). NEVER hard-code the key.
// Verified endpoints (2026-06-10): /chat/completions (works), /models (works).
//   No /audio/transcriptions or /embeddings (not allowlisted). Gemini models accept input_audio
//   content blocks in /chat/completions for audio transcription.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load research/.env if the key isn't already in the environment.
function loadEnv() {
  if (process.env.ENG_AI_MODEL_GW_KEY) return;
  const envPath = path.join(__dirname, "..", "research", ".env");
  try {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* env not present — caller will get a clear error below */ }
}
loadEnv();

const GATEWAY_URL =
  process.env.ENG_AI_MODEL_GW_URL ||
  "https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl";
const API_KEY = process.env.ENG_AI_MODEL_GW_KEY;
// Default to a fast, cheap model for background chores.
const DEFAULT_MODEL = process.env.ENG_AI_MODEL || "claude-haiku-4-5-20251001";

/**
 * Chat completion against the gateway (OpenAI format).
 * @param {object} opts
 * @param {string} [opts.system]   System prompt.
 * @param {string} opts.user       User message (text).
 * @param {string} [opts.model]
 * @param {number} [opts.maxTokens]
 * @param {number} [opts.maxRetries]
 * @returns {Promise<string>} assistant text
 */
export async function chat({ system, user, model = DEFAULT_MODEL, maxTokens = 1024, maxRetries = 3 }) {
  if (!API_KEY) throw new Error("ENG_AI_MODEL_GW_KEY not set (expected in research/.env).");
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: user });
  const body = { model, messages, max_tokens: maxTokens };

  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
        throw Object.assign(new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`), { fatal: true });
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    } catch (e) {
      lastErr = e;
      if (e.fatal) throw e;
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 10000)));
    }
  }
  throw lastErr;
}

// CLI usage:  echo "text" | node scripts/gateway.mjs "system prompt"
if (import.meta.url === `file://${process.argv[1]}`) {
  const system = process.argv[2] || "";
  const input = fs.readFileSync(0, "utf8");
  chat({ system, user: input }).then((out) => process.stdout.write(out)).catch((e) => {
    process.stderr.write(String(e?.message || e) + "\n");
    process.exit(1);
  });
}

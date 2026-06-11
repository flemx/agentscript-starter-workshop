#!/usr/bin/env node
// update_progress.mjs — async PROGRESS.md updater. Hand it a short description of work done and
// it uses the internal gateway to fold a tidy dated bullet into PROGRESS.md, WITHOUT blocking the
// main agent (run it from a hook or `&`). Falls back to a plain append if the gateway is down.
//
// Usage:
//   node scripts/update_progress.mjs "Finished the portal home page; decided HTML-only."
//   echo "..." | node scripts/update_progress.mjs
import fs from "node:fs";
import { chat } from "./gateway.mjs";
import { scan } from "./secret_guard.mjs";
import { PROGRESS_PATH as PROGRESS } from "./session_lib.mjs";   // PROGRESS.md lives at the repo root

function today() {
  // Avoid Date.now nondeterminism concerns; this is a real-time script so a wall clock is fine.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  let desc = process.argv.slice(2).join(" ").trim();
  if (!desc) { try { desc = fs.readFileSync(0, "utf8").trim(); } catch { /* */ } }
  if (!desc) { console.error("Nothing to log (pass a description)."); process.exit(1); }
  if (scan(desc).length) { console.error("Refusing to log: description contains a secret."); process.exit(1); }

  const date = today();
  let bullet = `- ✅ ${desc}`;
  try {
    const out = await chat({
      system:
        "You convert a short work description into ONE OR TWO terse Markdown log bullets for an " +
        "engineering PROGRESS.md. Use the emoji convention: ✅ done, 🔧 decision, ❓ open question, " +
        "⏭️ next step. Be factual, no fluff. Output ONLY the bullet line(s), nothing else.",
      user: desc,
      maxTokens: 200,
    });
    if (out && out.trim()) bullet = out.trim();
  } catch (e) {
    console.error(`(gateway unavailable, using plain append: ${e.message})`);
  }

  let md = fs.existsSync(PROGRESS) ? fs.readFileSync(PROGRESS, "utf8") : "# PROGRESS.md\n\n## Log\n";
  // Match an existing dated heading for today, which may carry a "— title" suffix.
  const headingRe = new RegExp(`^### ${date}(?: —[^\\n]*)?$`, "m");
  const m = md.match(headingRe);
  if (m) {
    // Insert the bullet immediately after that heading line.
    const idx = md.indexOf(m[0]) + m[0].length;
    md = md.slice(0, idx) + "\n" + bullet + md.slice(idx);
  } else if (md.includes("## Log")) {
    md = md.replace("## Log\n", `## Log\n\n### ${date}\n${bullet}\n`);
  } else {
    md += `\n## Log\n\n### ${date}\n${bullet}\n`;
  }
  fs.writeFileSync(PROGRESS, md);
  console.log(`Logged to PROGRESS.md under ### ${date}.`);
}

main();

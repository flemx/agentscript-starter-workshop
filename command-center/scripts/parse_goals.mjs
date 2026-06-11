#!/usr/bin/env node
// parse_goals.mjs — turn the project's GOALS.md into structured data the portal renders.
//
// This fixes a content-drift bug: the portal's home-page goals USED to be hand-copied into
// index.html. Now GOALS.md is the single source of truth (per AGENTS.md §2) and the portal's
// goals are derived from it at build time by build_portal_data.mjs.
//
// Tolerant by design: if a section is missing or the format drifts, we return what we could parse
// and let the caller keep prior values rather than wiping the portal. Never throws on bad input.
//
// Exports parseGoals(md) -> { goals:[{id,title,body}], goalsMeta:{ project, owner, status, mission,
//   constraints:[], successCriteria:[] } }
import fs from "node:fs";
import { GOALS_PATH } from "./session_lib.mjs";   // GOALS.md location — the single path authority

export { GOALS_PATH };

// Grab the body of a "## Heading" section up to the next "## " (or "---" / EOF).
function section(md, headingRe) {
  const lines = md.split("\n");
  let i = lines.findIndex((l) => headingRe.test(l));
  if (i < 0) return "";
  const out = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^##\s/.test(lines[j])) break;
    out.push(lines[j]);
  }
  return out.join("\n").trim();
}

// Split a section into list items, joining wrapped continuation lines. Handles "- " and "1." lists.
function listItems(block) {
  if (!block) return [];
  const items = [];
  let cur = null;
  for (const raw of block.split("\n")) {
    const line = raw.replace(/\s+$/g, "");
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (m) {
      if (cur != null) items.push(cur.trim());
      cur = m[1];
    } else if (cur != null && line.trim()) {
      cur += " " + line.trim();           // continuation of the previous wrapped bullet
    } else if (cur != null && !line.trim()) {
      // blank line ends the current item
      items.push(cur.trim()); cur = null;
    }
  }
  if (cur != null) items.push(cur.trim());
  return items.filter(Boolean);
}

// Strip simple markdown emphasis/code so JSON values are clean text (the portal adds its own markup).
function demark(s) {
  return s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseGoals(md) {
  const goalsMeta = { project: "", owner: "", status: "", started: "", mission: "", constraints: [], successCriteria: [] };
  const goals = [];
  if (typeof md !== "string" || !md.trim()) return { goals, goalsMeta };

  // Header fields like **Project:** ... / **Owner:** ... / **Status:** ...
  const field = (name) => {
    const m = md.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`));
    return m ? demark(m[1]) : "";
  };
  goalsMeta.project = field("Project");
  goalsMeta.owner = field("Owner");
  goalsMeta.status = field("Status");
  goalsMeta.started = field("Started");

  // Mission: first non-empty paragraph of the Mission section.
  const mission = section(md, /^##\s+Mission/i);
  if (mission) goalsMeta.mission = demark(mission.split(/\n\s*\n/)[0]);

  // Hard constraints + Success criteria: list items.
  goalsMeta.constraints = listItems(section(md, /^##\s+Hard constraints/i)).map(demark);
  goalsMeta.successCriteria = listItems(section(md, /^##\s+Success criteria/i)).map(demark);

  // Core goals: bullets shaped "**G1 — Title.** body" (em-dash or hyphen tolerated).
  const core = listItems(section(md, /^##\s+Core goals/i));
  for (const item of core) {
    // **G1 — Multi-source capture.** Capture mic + system audio ...
    const m = item.match(/^\*\*\s*([A-Za-z]?\d+)\s*[—–-]\s*(.+?)\.?\*\*\s*([\s\S]*)$/);
    if (m) {
      goals.push({ id: m[1].trim(), title: demark(m[2]), body: demark(m[3]) });
    } else {
      // Fallback: keep the whole bullet as a goal with no id so nothing is silently dropped.
      goals.push({ id: "", title: "", body: demark(item) });
    }
  }

  return { goals, goalsMeta };
}

export function parseGoalsFile(p = GOALS_PATH) {
  try { return parseGoals(fs.readFileSync(p, "utf8")); }
  catch { return { goals: [], goalsMeta: {} }; }
}

// CLI: print parsed JSON (handy for debugging the parse).
if (import.meta.url === `file://${process.argv[1]}`) {
  const p = process.argv[2] || GOALS_PATH;
  process.stdout.write(JSON.stringify(parseGoalsFile(p), null, 2) + "\n");
}

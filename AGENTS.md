# AGENTS.md — how to work in this workspace (lean)

This is a **Salesforce DX (Agentforce) project** wrapped in an **AI Command Center**: a self-evolving,
shareable cockpit that *supports* the real build. Two faces: the **HTML portal**
(`command-center/index.html`) is for humans; **`PROGRESS.md`** is the running log for agents. The
harness lives entirely under `command-center/`; the active project lives under
`projects/agentforce-hackathon/` and the deployable Salesforce source under `force-app/`. Keep both
faces current; never put secrets or raw chat logs in either.

> **Full mechanics** (portal data-flow, the session-capture pipeline, every script, reuse,
> versioning) are in **`command-center/HARNESS.md`** — read it on demand when working *on the harness*.

## Salesforce work → use the pre-installed skills
For the actual Agentforce build (Agent Script `.agent` bundles, LWC components, permission sets,
Apex, metadata deploy, agent testing), **prefer the skills under `.agents/skills/`** — e.g.
`developing-agentforce`, `deploying-metadata`, `generating-lwc-components`,
`generating-permission-set`, `generating-apex`, `testing-agentforce`. They encode current Agentforce
DX conventions; don't reinvent them from memory.

## Orient (start of every session)
1. **`projects/agentforce-hackathon/GOALS.md`** — mission, goals, constraints. Single source of truth
   (imported below, so it's already in context). If it disagrees with the portal, **GOALS.md wins** —
   fix the portal.
2. **`PROGRESS.md`** — what's done, open questions, next steps.

## Keep the project state current (per unit of work — same cadence as commits)
The hook *renders* the portal automatically but **cannot invent facts**. When you finish a meaningful
unit of work, before you commit, update the **source** so the portal reflects it. This is a checklist,
not optional:
1. **`PROGRESS.md`** — add a `## Log` entry (newest at top, absolute dates) + overwrite **Current State**:
   ```markdown
   ## YYYY-MM-DD — <title>
   - ✅ <done> — <why/outcome>   🔧 <decision> — <rationale>   ❓ <open question>   ⏭️ <next step>
   ```
2. **`command-center/data/work-items.json`** — if the work is a new/changed task or research round,
   **add or update its item** (status, dates, `outcome`, `overview`). The hook auto-associates sessions
   to *existing* items but never creates them. If the unit produced a doc (runbook, spec, plan), link it
   via `reportRef` (repo-relative `.md`) so the portal renders it inline.
3. **`GOALS.md` / `research.json`** — update if goals shifted or a finding was verified.

Skipping step 2 is why work can vanish from the cockpit even though the hook ran. Treat "update
PROGRESS + work-items" as part of the same ritual as the commit.

## The portal maintains itself — don't fight it
A `Stop` hook regenerates the portal + agentic history **every turn** (deterministically, non-blocking)
from the source files above. **Never hand-edit `command-center/portal-data.js` or `sessions-data.js`** —
they're auto-generated. To change portal content, edit the source, then (if needed)
`node command-center/scripts/build_portal_data.mjs`.

## Security & secrets (NON-NEGOTIABLE)
- **Never commit secrets.** `.env`/keys/tokens are gitignored; the gateway key is in
  `command-center/research/.env` (copy from `.env.example`). Never paste a key into any committed
  file, PROGRESS.md, or the portal. **This package is handed to customers** — keep it clean.
- **Never commit raw chat logs.** Raw transcripts + full session timelines are gitignored; only
  sanitized metadata (`command-center/data/sessions/index.json`) + `portal-data.js` (no full text) are committed.
- A PreToolUse hook scans staged diffs for keys. If it blocks a commit, **fix it** — never `--no-verify`.

## Git hygiene
Commit meaningful units with clear messages (the user wants regular commits). End commit messages with
the workspace's Co-Authored-By trailer. Keep "clone and open" working for the portal — no build steps /
external deps that break the single-file portal. (The SFDX project keeps its own tooling: `sf`, prettier.)

---

> Project-specific context is imported below — **read it; it defines the actual mission.**

@projects/agentforce-hackathon/AGENTS.md

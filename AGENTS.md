# AGENTS.md — Agentforce Hackathon

This file is the single source of truth for **what we're building, why, and where it stands.**
Read it first. Detailed goals live in `projects/agentforce-hackathon/GOALS.md` (imported at the end);
the dated running log lives in `PROGRESS.md`.

---

## Purpose

We're running a **two-hour, hands-on workshop** where customers who are **new to Agentforce** build
their **own** AI agent — with no code and no Salesforce internals knowledge. They walk away with a
working agent they made themselves.

There are **two deliverables, kept in sync**:

1. **The Salesforce package** (`force-app/`) — a single **unlocked package** the attendee installs into
   their own sandbox. It carries everything that *can* be packaged: permission sets, supporting Apex,
   LWCs (a launchpad + a note-capture/viewer suite), a Lightning app + Home page, and the **starter
   agent's Agent Script source** (shipped as a Static Resource). Install is a single link — no CLI, no
   Setup spelunking.

2. **The workshop web app** (`web-app/`) — a self-guided, step-by-step React guide (Vite) that walks a
   non-expert from zero to a working agent: get an org → install the package → build the agent in Agent
   Studio → add actions → preview → test. **Live on Heroku.**

### The use case — Employee Agent V1 (a meeting-note agent)
A conversational agent that takes notes or a meeting transcript and turns them into action: **logs the
notes** to a record, **summarizes** them, **creates follow-up tasks**, and **drafts a follow-up email**.
It's the simplest way for a newcomer to grasp the mechanics — **agent · instructions · actions** — before
tackling more complex use cases. It's the `Note_taking_agent` whose Agent Script lives in `force-app/`.

### The workshop flow
- **Part A — guided build:** write reasoning instructions → add the Note + Summarize actions from the
  asset library → preview → commit a version → test on a record.
- **Part B — free exercise:** extend it (draft email, Query Records, Search Web, fetch tasks, voice/image
  capture) — start simple and build up.

---

## What a package CAN'T carry (handled at runtime from the launchpad)

A package installs metadata, but three things can only happen *after* install, in the running org. The
**`workshopLaunchpad` LWC** + Apex do these on a button click — no CLI:

1. **Permission-set assignment** to the running user — `WorkshopSetupController.runSetup()`. (A package
   ships perm sets but can't auto-assign them on install.)
2. **Starter-agent install** — `NextGenAgentDeployer.deployAgent()` creates → publishes → **activates**
   the agent via the internal Next-Gen Authoring (NGA) Connect API self-callout. (`AiAuthoringBundle` —
   the agent itself — is the one metadata type that genuinely can't be packaged.) **Reuse-first:** if the
   agent already exists it is *not* duplicated; `forceNew=true` deploys a fresh `_2`/`_3` copy instead.
3. **Agent-access grant** — inserts a `SetupEntityAccess` row pointing the workshop permission set at the
   **actual deployed `BotDefinition`**. This is why the packaged perm set carries **no static
   `agentAccesses`** (impossible — the agent doesn't exist at build time) and why the reference stays
   correct even when the agent is renamed.

---

## Current status (2026-06-12)

**The package is complete and proven end-to-end on a clean org.**

- ✅ **Single self-contained package `0.1.0.10`** (`04tWt000000GFO5IAO`) — installs everywhere with **zero
  post-deploy**. The note suite is *in* the package (no separate deploy step). Built with
  `--skip-validation` so Apex compiles at install time in the target org (the build scratch org lacks the
  Agentforce/Einstein/Notes features).
- ✅ **Installs on any org type** — verified on the workshop sandbox AND a clean Agentforce **scratch org**.
  `HtmlNoteService` references `ContentNote` dynamically (Schema API + an `isAvailable()` guard) so it
  compiles even where Notes is absent (scratch / trial / the Agentforce Labs **backup org**) and
  self-disables there.
- ✅ **Runtime flow validated on a clean org:** install → Run Setup assigns all 4 perm sets → deploy
  starter agent → activate → access granted → re-run reuses (no duplicate) → force-new makes a distinct
  agent (with a distinct **label**, e.g. "Employee Agent V1 (2)") + its own access row.
- ✅ **"Create Note" agent action in the asset library** — a `GenAiFunction`
  (`Employee_Agent_Create_Note`) wrapping the `HtmlNoteService` Apex invocable (`invocationTargetType=apex`).
  It ships in the package, so attendees just *add* it to their agent in Agent Studio. Inputs: Subject /
  Content (HTML, stored as a Blob so it renders) / optional Record Id. **Returns the full created
  `ContentDocument` record** (renders as a clickable link in chat). Record type confirmed against the
  devhub's `Store_Notes` flow.
- ✅ **Notes UI tab** in the workshop app — the `noteCapture` + `noteViewer` LWCs on a "Notes" tab.
- ✅ **Use-Case Research Agent** (`Use_Case_Research_Agent`) — a second, fully-built agent for the
  workshop debrief: takes a meeting transcript + Lucid-board description, researches via WebSearch +
  Salesforce documentation, then builds a beautiful HTML report (via the `WorkshopReportBuilder` Apex
  action / `Employee_Agent_Build_Report` asset-library function) and saves it as a Note. Published +
  activated + tested end-to-end on the sandbox. Sample output: `docs/test-data/agent-report-styled.html`;
  test report: `docs/use-case-research-agent-test-report.html`.
- ✅ **Workshop guide LIVE on Heroku** — <https://employee-agent-workshop-guide-3ae92a297614.herokuapp.com/>
  — with the current install URL.
- ✅ **39/39 Apex tests pass.**

### What's left
- **Action assets (G4):** the **Create Note** action now ships in the asset library (above). Still to add:
  a **Summarize** Prompt Template, then the Part-B add-ons (Query Records, draft email, Search Web,
  fetch tasks).
- **Finalize the starter agent** wording (simple, non-coding reasoning instructions) and decide
  start-with-no-actions vs pre-wired.
- **Remaining guide polish.**

> See `PROGRESS.md` for the full dated log and `GOALS.md` (below) for goals G1–G8 and success criteria.

---

## Where things live

| Path | What |
|---|---|
| `force-app/main/default/` | **The package payload** — Apex (`classes/`), LWCs (`lwc/`), VF page, perm sets, app/tab/FlexiPage, the `Note_taking_agent` Agent Script + its `_afscript` Static Resource, `Workshop_Settings__mdt`. |
| `web-app/` | **The workshop guide** — Vite/React; content in `src/components/MainContent.jsx`; deploys to Heroku (see `web-app/CLAUDE.md`). |
| `.agents/skills/` | **Pre-installed Agentforce build skills** — `developing-agentforce`, `deploying-metadata`, `generating-lwc-components`, `generating-permission-set`, `generating-apex`, `testing-agentforce`, etc. **Use these for the real Salesforce work.** |
| `projects/agentforce-hackathon/GOALS.md` | Detailed goals, hard constraints, success criteria (imported below). |
| `PROGRESS.md` | Dated running log — what's done, decisions, next steps. |
| `docs/` | Reports, screenshots, slide decks, the NGA API reference, optional-metadata. |
| `config/`, `manifest/`, `sfdx-project.json` | Standard SFDX project config. `config/project-scratch-def.json` is the Agentforce-enabled scratch-org def. |
| `scripts/secret_guard.mjs` | Commit-time secret scanner (wired as a PreToolUse hook). |

### Orgs
- **`hackathon`** — production demo org, also the **DevHub** (builds packages).
- **`hackathon_sandbox`** — primary install/test target.
- **`wf_clean_test`** — a clean Agentforce scratch org used to prove the from-scratch flow.
- **`my-agentforce-org`** — Agentforce Labs trial = the workshop **backup org** (note: it lacks
  ContentNote, which the dynamic note code tolerates).

---

## How to work here

- **For Salesforce metadata / agent / LWC / Apex work, prefer the `.agents/skills/` skills** over guessing
  — they encode current Agentforce DX conventions.
- **Editing an agent's Agent Script — bundle is the SOURCE OF TRUTH, sync it to the resource.**
  An `AiAuthoringBundle` can't be packaged, so each shipped agent ships its afscript as a Static Resource
  the launchpad reads at runtime (`NextGenAgentDeployer`). There are therefore **two files per agent that
  must stay byte-identical**:
  - **source (edit this):** `force-app/main/default/aiAuthoringBundles/<Name>/<Name>.agent`
  - **shipped copy (generated):** `force-app/main/default/staticresources/<Name>_afscript.resource`

  **Always edit the `.agent` bundle, never the `.resource` directly.** After any edit run
  **`npm run sync:agents`** (copies every bundle → its matching `_afscript.resource`). `npm run
  sync:agents:check` verifies they're in sync (exit 1 if drifted) — run it before building/committing.
  The bundle dir is `.forceignore`d (never packaged); only the synced resource ships. *(The hosted demo
  agent in `demo-agents/` has no resource — it's published directly, not packaged, so the script skips it.)*
- **Build the package:** `sf package version create --package "Employee Agent Workshop"
  --installation-key-bypass --skip-validation --wait 30 --target-dev-hub hackathon`
  (`--skip-validation` is required — the build org lacks the runtime features). **Run `npm run
  sync:agents` first** so the shipped afscript resources match the edited bundles.
- **Install:** `sf package install --package <04t...> --target-org <org> --wait 20 --no-prompt`.
- **Keep the two deliverables in sync** — when the package's perms/actions change, update the matching
  guide step.
- **Honor the hard constraints in `GOALS.md`** — runtime agent deploy, non-expert self-service, a working
  backup-org path.
- **Log meaningful work** in `PROGRESS.md` (newest first, absolute dates).

## Security & secrets (non-negotiable)
- **Never commit secrets.** `.env` / keys / tokens are gitignored. Never paste a key into any committed
  file (including `PROGRESS.md`). **This package is handed to customers — keep it clean.** A PreToolUse
  hook (`scripts/secret_guard.mjs`) scans staged diffs and blocks commits containing keys; if it fires,
  **fix it** — never `--no-verify`.
- Use least-privilege permission sets; everything installable into a customer org without manual Setup.

---

@projects/agentforce-hackathon/AGENTS.md

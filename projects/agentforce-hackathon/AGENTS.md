# AGENTS.md — Project: Agentforce Hackathon (the active project this cockpit serves)

This is the real goal. The Command Center harness (under `command-center/`) is the support system —
it auto-logs progress, captures sessions, and renders the portal so you can focus here.

## What we're building (two flavors)
1. **Salesforce SFDX package** (this repo) — installs as a **Lightning Home app**; a **Lightning
   (LWC) component** in it **deploys the Agent Script agents at runtime** (because `AiAuthoringBundle`
   can't be packaged yet) and **assigns the required permission sets to the current user**. Ships
   **template agents** attendees clone.
2. **Workshop web app** (separate **React** repo — link it here once shared) — a **self-guided,
   step-by-step** experience that walks a non-expert customer through install → deploy → assign →
   build-from-template → test, including **org sign-up and a backup org path**.

Context: a hackathon with a **two-hour hands-on workshop** where customers build their own agents
from our templates, deployed into their own sandboxes.

## Where things live
- **Goals / mission / constraints:** `projects/agentforce-hackathon/GOALS.md` (imported below — single
  source of truth). The portal's goals are generated from it.
- **The SFDX source:** `force-app/main/default/` — Agent Script bundles (`aiAuthoringBundles/`),
  Apex (`classes/`), flows, prompt templates, permission sets / permission-set groups. This is the
  package's payload.
- **Salesforce build skills (pre-installed, authoritative):** `.agents/skills/` —
  `developing-agentforce`, `deploying-metadata`, `generating-lwc-components`,
  `generating-permission-set`, `generating-apex`, `testing-agentforce`, `handling-sf-data`, etc.
  **Use these for the actual Salesforce work** (Agent Script syntax, LWC, perm sets, deploy).
- **Working research notes / drafts:** `projects/agentforce-hackathon/research/` (scratch — not rendered).
- **Verified, canonical research findings:** `command-center/data/research.json` (the portal's
  "Research Rounds" / Deep Research pages render this). Promote a finding here only once it's
  source-cited and verified — see the research methodology in `command-center/HARNESS.md` §5.
- **Salesforce CLI / org notes:** `.sf/`, `.sfdx/`, `config/project-scratch-def.json`,
  `sfdx-project.json`, `manifest/package.xml` — standard SFDX project, already scaffolded.

## How to work here
- Advance the two tracks (see `GOALS.md` G1–G8): the **package** (deploy component + perm-set
  orchestration + template agents) and the **web app** (self-guided steps + backup org path).
- For Salesforce metadata/agent/LWC/Apex work, **prefer the `.agents/skills/` skills** over guessing —
  they encode the current Agentforce DX conventions.
- Log meaningful steps in `PROGRESS.md`; add/update items in `command-center/data/work-items.json`;
  the harness handles the portal + agentic history for you.
- Honor the hard constraints in `GOALS.md` — especially **runtime agent deployment** (packaging can't
  ship `AiAuthoringBundle`), **non-expert self-service**, and **a working backup org path**.

@GOALS.md

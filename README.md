# Agentforce Hackathon

A **two-hour, hands-on workshop** where customers new to Agentforce build their own AI agent — no code,
no prior experience. There are two deliverables, kept in sync:

1. **The Salesforce package** (`force-app/`) — a single **unlocked package** an attendee installs into
   their own sandbox. It carries everything packageable: permission sets, supporting Apex, LWCs (a
   launchpad + a note-capture/viewer suite), a Lightning app + Home page, and the starter agent's Agent
   Script source. Install is one link — no CLI. Three things a package can't carry happen at runtime from
   the launchpad: **perm-set assignment, starter-agent deploy, and agent-access grant.**
2. **The workshop web app** (`web-app/`) — a self-guided React (Vite) guide that walks a non-expert from
   zero to a working agent. **Live on Heroku.**

**The use case** is *Employee Agent V1*, a meeting-note agent: it logs notes to a record, summarizes
them, creates follow-up tasks, and drafts a follow-up email — the simplest way to learn
**agent · instructions · actions**.

## Start here

| You are… | Read |
|---|---|
| Anyone | **`AGENTS.md`** — purpose, architecture, and current status. |
| Picking up the work | `AGENTS.md` → `projects/agentforce-hackathon/GOALS.md` (goals G1–G8) → `PROGRESS.md` (dated log). |
| Doing the Salesforce build | The skills under **`.agents/skills/`** (Agent Script, LWC, perm sets, Apex, deploy). Standard SFDX config in `sfdx-project.json`, `config/`, `manifest/`. |
| Deploying the guide | `web-app/CLAUDE.md`. |

## Layout

```
inspireai_hackathon/
├── AGENTS.md                  # ← READ FIRST: purpose, architecture, status (imports GOALS.md)
├── CLAUDE.md                  # thin agent entry point (imports AGENTS.md)
├── PROGRESS.md                # dated running log
├── README.md
├── force-app/main/default/    # THE PACKAGE PAYLOAD — Apex, LWCs, VF page, perm sets, app/tab/FlexiPage,
│                              #   the Note_taking_agent Agent Script + its _afscript Static Resource
├── web-app/                   # THE WORKSHOP GUIDE — Vite/React, deploys to Heroku
├── .agents/skills/            # pre-installed Agentforce/LWC/perm-set/Apex/deploy skills — USE THESE
├── projects/agentforce-hackathon/
│   ├── AGENTS.md              # bridge → GOALS.md
│   └── GOALS.md               # goals, hard constraints, success criteria (single source of truth)
├── docs/                      # reports, screenshots, slide decks, NGA API reference, optional-metadata
├── scripts/secret_guard.mjs   # commit-time secret scanner (PreToolUse hook)
├── config/ · manifest/ · sfdx-project.json   # standard SFDX project config
└── .claude/                   # settings.json (secret-guard hook) + a researcher subagent
```

## Status

Package **`0.1.0.7`** (`04tWt000000GFCnIAO`) is complete and proven end-to-end on a clean Agentforce org:
install → assign perms → deploy + activate the starter agent → grant access — all from the launchpad,
zero post-deploy. The guide is live on Heroku. 35/35 Apex tests pass. Remaining: the action assets
(Note Flow + Summarize prompt template), final starter-agent wording, and guide polish. See `AGENTS.md`.

## Security

**No secrets in git.** `.env` / keys / tokens are gitignored; a commit-time hook (`scripts/secret_guard.mjs`)
blocks any that slip into a staged diff. This package is handed to customers — keep it clean.

# Agentforce Hackathon — built on the AI Command Center

Two things live in this repo, plus a cockpit that tracks them:

1. **The Salesforce Agent package** (`force-app/`) — installs into a customer sandbox as a **Lightning
   Home app**. A **Lightning (LWC) component deploys Agent Script agents at runtime** (the
   `AiAuthoringBundle` metadata type can't be packaged yet) and **assigns the required permission sets
   to the current user**. It ships **template agents** attendees clone and make their own.
2. **The workshop web app** (separate **React** repo — link pending) — a **self-guided, step-by-step**
   experience that walks a non-expert customer through install → deploy → assign → build → test,
   including **org sign-up and a backup org path**.
3. **The AI Command Center** (`command-center/`) — a *reusable* cockpit for AI-assisted build projects.
   Humans get a single-file HTML portal; agents get Markdown + JSON they read and update. Lifted from a
   prior project and repurposed for this one.

> Context: a hackathon with a **two-hour hands-on workshop** where customers build their own Agentforce
> agents from our templates, in their own sandboxes.

## Quick start

| You are… | Start here |
|---|---|
| A **human** reviewing the work | Open **`command-center/index.html`** in a browser. |
| An **AI agent** working here | Read **`CLAUDE.md`** → imports **`AGENTS.md`** → imports **`projects/agentforce-hackathon/AGENTS.md`** → **`GOALS.md`**. Then read **`PROGRESS.md`**. Harness mechanics: **`command-center/HARNESS.md`**. For Salesforce work, use the skills under **`.agents/skills/`**. |
| Doing the **Salesforce** build | The standard SFDX project is intact — see **`docs/salesforce-dx-template.md`** (the original template README), `sfdx-project.json`, `manifest/`, `config/`. |

## Layout

The **harness is self-contained under `command-center/`**; the **project brain lives under
`projects/agentforce-hackathon/`**; the **deployable Salesforce source stays in `force-app/`** (untouched
by the harness).

```
inspireai_hackathon/
├── CLAUDE.md                       # agent entry point (imports AGENTS.md)
├── AGENTS.md                       # LEAN operating rules (imports projects/agentforce-hackathon/AGENTS.md)
├── PROGRESS.md                     # agent-facing running log (→ portal Build Log)
├── README.md  .gitignore
├── force-app/                      # ← THE SALESFORCE PACKAGE (the deployable payload)
│   └── main/default/               #   aiAuthoringBundles · classes · flows · permissionsets · …
├── .agents/skills/                 # pre-installed Agentforce/LWC/perm-set/deploy skills — USE THESE
├── config/ · manifest/ · sfdx-project.json   # standard SFDX project config
├── docs/
│   └── salesforce-dx-template.md   # the original Salesforce template README (preserved)
├── projects/                       # ← THE PROJECT BRAIN (goals + working notes)
│   └── agentforce-hackathon/
│       ├── AGENTS.md               # project guidance (imports GOALS.md)
│       ├── GOALS.md                # PROJECT goals — single source of truth (parsed into the portal)
│       └── research/               # scratch notes (verified findings → command-center/data/research.json)
├── command-center/                 # ← THE HARNESS (self-contained; lifted from a prior project)
│   ├── index.html                  # GENERIC portal — renders the bundles; never project-edited
│   ├── HARNESS.md                  # full mechanics (read on demand)
│   ├── portal-data.js              # COMMITTED bundle (built by scripts; do not hand-edit)
│   ├── data/                       # portal.json · work-items.json · research.json · versions.json · sessions/index.json
│   ├── research/                   # .env (gitignored gateway key) + research-workflow.mjs
│   ├── agentic-history/raw/        # RAW transcripts (GITIGNORED)
│   └── scripts/                    # session_lib (path authority) · capture/build/parse/summarize/classify · gateway · secret_guard
└── .claude/                        # settings.json (Stop + secret-guard hooks) + agents + skills
```

## How the cockpit works

- **`index.html` is a generic shell** — it renders entirely from `command-center/portal-data.js`
  (loaded via `<script src>`, so it works on `file://`). You **never hand-edit** the bundle; edit the
  source (`GOALS.md`, `PROGRESS.md`, `command-center/data/*.json`) and the `Stop` hook regenerates it
  every turn (deterministically — `node command-center/scripts/build_portal_data.mjs`).
- **Two faces:** the portal is for humans; `PROGRESS.md` is for agents. Keep both current.
- This harness was **repurposed by swapping `command-center/data/portal.json` + `GOALS.md` and changing
  one line** (`PROJECT_DIR` in `command-center/scripts/session_lib.mjs`) — never touching `index.html`.
  (Full guide: `command-center/HARNESS.md` §7.)

## Security

- **No secrets in git.** `.env`, keys, tokens are gitignored (gateway key: `command-center/research/.env`,
  copy from `.env.example`); a commit-time hook blocks any that slip into a staged diff. **This package
  is handed to customers** — keep it clean.
- **No raw chat logs in git.** Raw transcripts + full session timelines + `sessions-data.js` are
  gitignored; only metadata (`command-center/data/sessions/index.json`) + `portal-data.js` are shared.

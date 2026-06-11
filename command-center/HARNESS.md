# HARNESS.md — AI Command Center mechanics (read on demand)

> This is the **deep reference** for how the Command Center works. The root `AGENTS.md` keeps only
> the lean rules an agent needs *live*; everything detailed lives here and is read when you're
> working **on the harness itself** (the portal, the hooks, the data pipeline, reuse).
>
> **Reusable across projects.** Nothing here is project-specific — the active project is defined by
> `projects/<name>/` and imported via the root `AGENTS.md`. To repurpose the cockpit, see §7.

---

## 1. What this workspace is

An **AI Command Center**: a self-evolving, shareable workspace where humans and AI agents
collaborate on a research/build project. Two faces:

| Surface | Audience | File(s) | Purpose |
|---|---|---|---|
| **HTML portal** | Humans (and colleagues) | `command-center/index.html`, `command-center/slides.html` | Single-file, no-build report + slide deck. Easy to share & index. |
| **Markdown brain** | AI agents | `PROGRESS.md`, `projects/<name>/*.md`, `command-center/data/*.json` | Machine-readable state, goals, structured findings. |

**Golden rule:** the portal is for humans, `PROGRESS.md` is for agents. Keep both current; never put
raw secrets or raw chat logs in either (see §6).

The whole harness is **self-contained under `command-center/`** (portal + `scripts/` + `data/` +
`research/` + `project-template/`). The repo root stays clean for the actual project work.

---

## 2. Orient yourself (first thing every session)

Read in order: **`projects/<name>/GOALS.md`** (mission/goals/constraints — single source of truth,
imported into context via the root `AGENTS.md`) → **`PROGRESS.md`** (what's done, open questions,
next steps) → **`command-center/data/research.json`** (verified findings, if present).

If `GOALS.md` and the portal ever disagree, **`GOALS.md` wins** — fix the portal (its goals are
generated from `GOALS.md`).

---

## 3. The data-flow contract (how the portal stays a self-evolving report)

```
projects/<name>/GOALS.md ──► parse_goals.mjs ─┐
PROGRESS.md (## Log)      ───────────────────┤
command-center/data/portal.json ─────────────┤ build_portal_data.mjs ─► portal-data.js (committed) ─► index.html
command-center/data/research.json ───────────┤                       └► sessions-data.js (gitignored) ─► index.html
command-center/data/work-items.json ─────────┤
command-center/data/versions.json ───────────┘
```

- `index.html` is a **generic shell** — it renders entirely from the browser bundles, loaded via
  `<script src>` (NOT `fetch()`, which browsers block on `file://`). **Never hand-edit
  `portal-data.js` / `sessions-data.js`** — edit the source data and run
  `node command-center/scripts/build_portal_data.mjs`.
- The portal must remain a **single self-contained `.html` file** (+ the sibling `.js` bundles) so it
  opens with no build step. **No React/Vite** unless `GOALS.md` calls for it.
- Content pages live in `command-center/data/portal.json` as `pages[]` using a fixed block-type
  vocabulary (`hero, callout, secTitle, statGrid, goals, cardGrid, flow, table, modelList, trace, html`).
- Markdown in logs/synthesis/reports is rendered by a small XSS-safe renderer in `index.html`
  (`mdSpans` inline, `mdToHtml` block) — author content in markdown, it renders properly.

---

## 4. Keeping PROGRESS.md current (do this continuously)

`PROGRESS.md` is the agent-facing running log. Update it whenever you finish a meaningful unit of
work. Format:

```markdown
## YYYY-MM-DD — <session/milestone title>
- ✅ <what was completed> — <1-line why / outcome>
- 🔧 <decision made> — <rationale>
- ❓ <open question / blocker>
- ⏭️ <next step>
```

Absolute dates only (today is injected into context). Newest entries at the top of the log section.
Keep a short **"Current State"** block at the very top that you overwrite each session. The portal's
Research Log page is generated from this file. To offload without blocking: spawn the
`progress-keeper` subagent, or use `command-center/scripts/update_progress.mjs` via the gateway.

---

## 5. Research methodology (when the project involves research)

Favors **fact-checked, adversarially-verified** research, not vibes:

1. **Decompose** the question into independent angles.
2. **Fan out** parallel searches (subagents / the `deep-research` workflow).
3. **Verify** each load-bearing claim with an independent skeptic pass (≥2 refutes kills it).
4. **Record** every finding in `command-center/data/research.json` with claim, detail, confidence,
   source URL(s), verification verdict. **Every claim needs a real, fetched source URL — never invent.**
5. **Log** the research step in `PROGRESS.md` with the date.

Working notes/drafts live in `projects/<name>/research/`; the canonical, verified findings the portal
renders live in `command-center/data/research.json`. A reusable workflow is in
`command-center/research/research-workflow.mjs` (edit angles per project).

---

## 6. Security & secrets (NON-NEGOTIABLE)

This workspace may run on a corporate machine and be shared with colleagues. Therefore:

- **Never commit secrets.** API keys, `.env`, tokens, service-account JSON are gitignored. The gateway
  key lives in `command-center/research/.env`. If you read a key while working, **never paste it** into
  any committed file, `PROGRESS.md`, the portal, or the agentic history.
- **Never commit raw chat/agent logs.** Raw transcripts can contain secrets/customer data. They're
  gitignored (`command-center/agentic-history/raw/`, `*.session.jsonl`, etc.). Only metadata is
  committed (see below).
- **Agentic history is automatic & session-based.** The `Stop` hook
  (`command-center/scripts/capture_session.mjs`, `async`, loop-safe) fires each turn and:
  1. copies the raw transcript → `command-center/agentic-history/raw/<id>.jsonl` (gitignored);
  2. writes a **sanitized** per-session timeline → `command-center/data/sessions/<id>.json` (gitignored
     — full text may carry project context; secrets redacted by `session_lib.mjs`);
  3. upserts `command-center/data/sessions/index.json` (**committed** — titles/dates/counts/preview/
     files-touched only, no conversation text);
  4. fires a detached gateway **summarizer** (`summarize_session.mjs`, title + 1-line summary) and
     **classifier** (`classify_session.mjs`, associates the session with a work item);
  5. rebuilds bundles (`build_portal_data.mjs` → `portal-data.js` committed, `sessions-data.js`
     gitignored).
  The hook **always exits 0** so it can never break the agent; errors go to
  `command-center/data/sessions/.capture.log`. (Legacy `sanitize_history.mjs` →
  `data/agentic-log.json` is superseded.)
- **No third-party network egress** unless `GOALS.md` allows it. Prefer the internal LLM gateway and
  local models.

---

## 7. Reusing the cockpit for another project

`index.html` is generic — you never edit it. To repurpose:

1. Copy `CLAUDE.md`, `AGENTS.md`, `command-center/`, `.claude/`.
2. Create `projects/<new>/GOALS.md` + `projects/<new>/AGENTS.md`; point the root `AGENTS.md` import at it.
3. Change **one line** in `command-center/scripts/session_lib.mjs`: `PROJECT_DIR` → `projects/<new>`.
4. Replace `command-center/data/portal.json` with the new project's brand/nav/content pages.
5. Reset `PROGRESS.md`, `command-center/data/work-items.json`, `command-center/data/research.json`.
6. Delete `command-center/project-template/` if the new project isn't meeting-routing.
7. Run `node command-center/scripts/build_portal_data.mjs`.

---

## 8. Versioning (browse past versions of the portal)

`command-center/scripts/build_versions.mjs` runs `git archive <hash> command-center` (from the repo
root, **never touching the working tree**) into `command-center/versions/<hash>/` (gitignored,
rebuildable). The committed manifest `command-center/data/versions.json`
(`hash/date/subject/hasData/hasIndex`) drives the portal's version `<select>`, which loads an archived
version in an iframe overlay. Run it via a git post-commit hook or manually — NOT the Stop hook
(versions change on commit, not per turn).

---

## 9. Tools in this workspace

- **`.claude/agents/`** — subagents (`progress-keeper`, `researcher`, `report-builder`). Invoke via the Agent tool.
- **`.claude/skills/`** — slash-command helpers (e.g. `refresh-history`).
- **`.claude/settings.json`** — hook (Stop, PreToolUse secret-guard) + permission config. Hook commands
  point at `$CLAUDE_PROJECT_DIR/command-center/scripts/`.
- **`command-center/scripts/`** — `session_lib.mjs` (the path authority + sanitizer), `capture_session.mjs`,
  `build_portal_data.mjs`, `parse_goals.mjs`, `summarize_session.mjs`, `classify_session.mjs`,
  `build_versions.mjs`, `gateway.mjs` (LiteLLM client), `secret_guard.mjs`, `update_progress.mjs`,
  `sanitize_history.mjs` (legacy).
- **`command-center/research/research-workflow.mjs`** — the deep-research orchestration workflow.

---

## 10. Git hygiene & sharing

- Commit **meaningful** units of work with clear messages; the user wants regular commits.
- Before any commit, the secret-guard hook scans the staged diff; if it flags a key, **stop and fix** —
  do not `--no-verify` around it.
- End commit messages with the workspace's Co-Authored-By trailer.
- Everything is built to be **handed to a colleague whose agent can search it**: markdown + JSON are
  greppable; the portal is one HTML file; `GOALS.md` + `PROGRESS.md` give any agent instant context.
  Keep that property — don't introduce build steps or external deps that break "clone and open."

# web-app/ — the self-guided workshop guide (Track B)

## Provenance
Vendored from **https://github.com/flemx/vibe-code-agenforce-claude** (cloned 2026-06-10, `.git`
dropped so it lives inside this repo). It's a clean **Vite 5 + React 18** single-page guide; **all
content lives in `src/components/MainContent.jsx`**; deploys to Heroku (`Procfile` + `static.json` +
`heroku-postbuild`). Authoring/deploy mechanics are documented in **`web-app/CLAUDE.md`** (kept as-is).

## What it currently is vs. what we need
The reference app guides a **different** workshop — "Vibe Code with Claude Code": CLI auth → create an
agent by prompting Claude Code (a *customer-service* agent). We are **reusing the shell, re-scripting the
content** for **our** flow.

## Our script (from the setup-guide doc + planning doc — see GOALS.md)
Use case: **Employee Agent V1** — a meeting-note agent (ingest notes/transcript → log to a Notes record,
summarize, create tasks, draft email). Deployment is **package-based** (install link), not CLI/OAuth.

Re-script `MainContent.jsx` sections to:
1. **Overview** — what we're building + what's preconfigured (Foundations, perm sets, action assets, the
   Employee Agent V1 framework).
2. **Get an org** — primary path + the **free pre-configured backup org**.
3. **Install the package** — the install link (replaces the reference app's CLI auth steps).
4. **Part A — guided build (in Agent Studio):** open the agent → review basics → write **reasoning
   instructions** → add **Create/Log Note** + **Summarize** actions from the asset library → **Preview**
   → **Commit version** → verify the agent appears → test on a record.
5. **Part B — free exercise:** draft email · adapt summary format · fetch tasks · **Query Records** ·
   **Search Web** · image/voice via LWC · custom actions.

## Re-script checklist (per web-app/CLAUDE.md)
- `src/components/MainContent.jsx` — `sections` array, `sectionTitles`, per-section components, the
  `steps` arrays for the right sidebar.
- `src/components/Sidebar.jsx` — `navigationItems` + the heading/logo.
- `src/App.jsx` — `pathToSection` / `sectionToPath` routing.
- `index.html` — `<title>` + favicon.
- `public/images/` — swap in our screenshots (the setup-guide doc has the Agent-Studio screenshots).

## Status — re-scripted (2026-06-11)
Content is now **our** flow. `MainContent.jsx` was rewritten to 5 sections — `overview` · `get-org` ·
`install-package` · `part-a` · `part-b` — with right-sidebar step anchors. `Sidebar.jsx` (nav + heading)
and `index.html` (title/description) updated; a `cta-button` style was added to `index.css`.
`npm run build` passes.

**Two placeholders to set before the event** (top of `MainContent.jsx`):
- `PACKAGE_INSTALL_URL` — the supporting-assets package install link.
- `BACKUP_ORG_URL` — currently Agentforce Labs (`https://labs.agentforce.com/`), the backup-org path.

**Still to do:** swap `public/images/` for the real Agent-Studio screenshots from the setup-guide doc
(a few reference images are reused as placeholders), and deploy to Heroku (see `web-app/CLAUDE.md`).

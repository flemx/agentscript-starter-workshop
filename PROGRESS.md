# PROGRESS.md — agent-facing running log

> Machine-readable project state for AI agents. Humans: see `command-center/index.html`.
> Update this whenever a meaningful unit of work completes (see `AGENTS.md`). Newest log
> entries at the top. Absolute dates only.

---

## Current State  _(overwrite this block each session)_

- **Phase:** **Packaged, deployed, demoed & documented.** Orgs: **`hackathon`** = production demo org =
  **DevHub**; **`hackathon_sandbox`** = install/test target. Unlocked package **`0.1.0.1`**
  (`04tWt000000GDJ3IAO`) installed in the sandbox; app verified in-browser. **Guide is LIVE on Heroku**
  (https://employee-agent-workshop-guide-3ae92a297614.herokuapp.com/) and its URL is wired into the app.
  Agent demoed + screenshotted in Agent Studio. **Colleague report** (`docs/colleague-report.html`) and
  **slide deck** (4 slides added to Hanne's deck, incl. an agentic-loop visual) built. All 13 Apex tests
  pass. Next: action assets, finalize the starter agent, remaining guide polish. (2026-06-11)
- **Key artifacts:** guide → Heroku (above) · package install → `…/installPackage.apexp?p0=04tWt000000GDJ3IAO`
  · screenshots → `docs/screenshots/` · report → `docs/colleague-report.html` · walkthrough test →
  `docs/walkthrough-test-report.md` · agentic-loop visual → `docs/agentic-loop-visual.html` · slide deck →
  Google Slides `15Um4HnhYoUyEL6idHi7oaL0RnI5_NGWK4ECPS_qaumI`.
- **Package:** unlocked, built from the `hackathon` DevHub. **Latest = v0.1.0.2** (`04tWt000000GDXZIA4`),
  installed in the sandbox. Core payload = vanilla-org-safe components (Apex, LWCs, VF page,
  `Workshop_Settings__mdt`, perm set, app/tab/FlexiPage, afscript static resource). **Feature-dependent
  components live in `feature-addons/`** (note-capture/HTML-note/viewer — need ContentNote/Einstein/Bot
  features; deploy with `sf project deploy start --source-dir feature-addons` + assign
  `Employee_Agent_Notes_Addon`). `aiAuthoringBundles` `.forceignore`d. Reinstall core:
  `sf package install --package 04tWt000000GDXZIA4 --target-org <org> --wait 20 --no-prompt`.
- **Intro decks (NEW, separate from Hanne's):** HTML interactive `docs/workshop-intro-deck.html`; Google
  Slides `1mYEe0etN_uL35i2uTOPelIQPhW21Xa2_C_vIckmbues`. Both reviewed + improved.
- **Built this session:**
  - **Web app re-scripted** (`web-app/`) to 5 sections — Overview → Get Your Org (Agentforce Labs kept
    as the **backup** org) → Install the Package (**placeholder `PACKAGE_INSTALL_URL`**) → Part A guided
    build → Part B free exercise. `vite build` passes.
  - **`Employee_Agent_Workshop` Lightning app** + Home App-page (FlexiPage) + tab.
  - **`workshopLaunchpad` LWC** — welcome, **Open the workshop guide** link, **Run Setup** button.
  - **`WorkshopSetupController`** (`@AuraEnabled`) — idempotent perm-set/group assignment to the current
    user (setup-object DML only → no mixed-DML). Built-in Apex defaults. **Tests 7/7, coverage 78%.**
  - **`Workshop_Settings__mdt`** type (5 fields) as an optional point-and-click override.
  - **Agent deploy accelerator (NEW):** `NextGenAgentDeployer` (Apex) + `NextGenAgentDeployerSession`
    (VF) + `agentDeployButton` (LWC) + `Note_taking_agent_afscript` (Static Resource) — one-click
    create→publish→activate of the agent via the **Next-Gen Authoring Connect API**, proven live.
    **Deployer coverage 86%; 12/12 tests pass overall.**
- **Feasibility — UPDATED 2026-06-11 (supersedes earlier "not viable"):** browser-side **perm-set
  assignment = reliable**, AND **runtime deploy+publish+activate of the Agent Script agent IS viable**
  via the internal **NGA Connect API** (`/services/data/v64.0/nextgen-authoring/...`) from a server-side
  Apex self-callout with a VF-sourced API-enabled session. Shipped as an **optional accelerator / backup
  path** — the customer happy-path is still build-it-in-Agent-Studio (Part A's learning). Endpoint is
  undocumented → fragile; details in `docs/reference/nextgen-authoring-connect-api.md`.
- **What this is (now concrete):** two deliverables — (1) a **Salesforce package** (install link) that
  lands **permission sets + the action assets + a Lightning app + the Employee Agent V1 starter** into a
  customer sandbox; (2) a **self-guided React web app** (vendored at `web-app/`) that guides a non-expert
  through **building Employee Agent V1 in Agent Studio**. Context: a hackathon **2-hour hands-on workshop**.
- **Use case = Employee Agent V1** — a meeting-note agent: ingest notes/transcript → **log to a Notes
  record**, **summarize**, **create tasks**, **draft email**. It's the `Note_taking_agent` already in
  `force-app/`.
- **Decisions locked (from the planning doc):** **package-based install** (not browser-OAuth — avoids
  security warnings); a **free pre-configured backup org**; workshop = **Part A guided** (instructions →
  add Note + Summarize actions → preview → commit → test) + **Part B free exercise**; **out-of-the-box
  actions first**.
- **Web app:** vendored into `web-app/` from `flemx/vibe-code-agenforce-claude` (Vite+React; content in
  `MainContent.jsx`; Heroku-deployable). **Re-scripted this session** to our 5-section flow; build passes.
- **Harness:** reused from `meeting_ai`; `PROJECT_DIR` → `projects/agentforce-hackathon`; contextual data
  empty. **Google Workspace MCP is live**. Gateway key still unset (session summaries/auto-classify
  skipped — harness still works).
- **Blockers:** none. **Known platform gotcha:** deploying a Custom Metadata *record with values* via the
  CLI throws an opaque `UNKNOWN_EXCEPTION` on these orgs (skeleton record with no values is fine; repro'd
  on a throwaway type). Worked around — defaults live in Apex; the record is an optional Setup-edited
  override kept in `docs/optional-metadata/`, out of the deploy path.

### ⏭️ Next steps (READ FIRST)
1. **Build the action assets** (G4): the **Log/Create Note** Flow (the seeded `First_Agent_Log_Account_Note`)
   + a **Summarize** Prompt Template, exposed in the agent **asset library** so attendees just *add* them.
   Then the Part-B add-ons (Query Records, draft email, fetch tasks, Search Web). OOB-first; custom Apex for
   HTML-note + SOSL search per the planning doc.
2. **Finalize the agent starter** — decide start-with-no-actions vs pre-wired, and the simple (non-coding)
   reasoning-instruction wording (Hanne's doc flags the current example as "too coding-like").
3. **Packaging decision + install link** (G1): managed vs unlocked 2GP; build the package; set the real
   `PACKAGE_INSTALL_URL` in `web-app/` and the optional `Workshop_Settings` override record.
4. **Wire the guide URL** into the launchpad: either set `web-app`'s deployed URL in a `Workshop_Settings`
   "Default" record (Setup → Custom Metadata Types) or update the Apex default; deploy `web-app/` to Heroku.
5. **Provision the free backup org** (G6) — Agentforce-enabled, package pre-installed, perms assigned;
   document the handoff. (Agentforce Labs is already wired as the backup path in the guide.)
6. **Add screenshots** to `web-app/public/images/` (the setup-guide doc has the Agent-Studio captures);
   the re-scripted guide currently reuses a few reference images.

### Key commands  _(harness lives under command-center/)_
- Rebuild the whole portal (deterministic, no LLM): `node command-center/scripts/build_portal_data.mjs`.
- Capture/refresh a session: `node command-center/scripts/capture_session.mjs <id> <transcript.jsonl>`.
- Inspect parsed goals: `node command-center/scripts/parse_goals.mjs`.
- Salesforce: `sf project deploy start`, `sf org create scratch -f config/project-scratch-def.json`, etc.
  (see `.agents/skills/deploying-metadata` + `docs/salesforce-dx-template.md`).
- Gateway key (optional — for session summaries/classification) lives in `command-center/research/.env`
  (gitignored; copy from `.env.example`). Without it the portal still regenerates every turn.

---

## Log

### 2026-06-11 — Note-capture suite, HTML notes, note viewer, package v0.1.0.2, intro decks (autonomous run)
- ✅ **Built & sandbox-tested 4 new components** (all Apex tests green; verified live in the browser):
  - **`noteCapture` LWC** — record audio (animated recorder) → speech-to-text; drag multiple files →
    image/doc-to-text via a multimodal prompt template (parallel, server-side); paste text; combine and
    **send to a chosen Employee Agent via the ACC API** (`lightning/accApi` open+execute).
  - **`HtmlNoteService`** (Apex + `@InvocableMethod`) — creates richly-formatted `ContentNote` from HTML
    (sanitized to the allowed-tag whitelist), links to a record. **8/8 tests, 93%.**
  - **`noteViewer` LWC + `NoteViewerController`** — lists notes, renders HTML read-only, **Download-PDF**
    (print window). **3/3 tests, 83%.** Verified rendering a real formatted note end-to-end.
  - **`NoteCaptureController` (4/4) + `NoteCaptureAI` (4/4)** — file upload (ContentVersion), agent listing,
    speech-to-text + prompt-template invocation with graceful degradation when AI features are off.
- 🔧 **Research round** (background agent) confirmed the API patterns: ACC API is `lightning/accApi`
  (open/execute, desktop-only, fire-and-forget); prompt templates via
  `ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate` with a ContentDocument file input; speech-to-text
  via the `convertBase64SpeechToText` standard action.
- 🔧 **Packaging split (important):** these 4 components depend on org features (`ContentNote`,
  `ConnectApi.EinsteinLLM`, `BotDefinition`) that AREN'T in the vanilla 2GP package-build scratch org → they
  don't compile there. Moved them to **`feature-addons/`** (deployed to the org directly + own
  `Employee_Agent_Notes_Addon` perm set), same pattern as the un-packageable agent. The **core package now
  builds clean: v0.1.0.2 (`04tWt000000GDXZIA4`, 79% cov), installed into the sandbox.** Also fixed an LWC
  dynamic-import error (LWC1503) → static `lightning/accApi` import.
- ✅ **Two NEW workshop intro decks** (did NOT touch Hanne's deck), for customers new to Agentforce:
  - **HTML interactive** (`docs/workshop-intro-deck.html`) — 8 slides, keyboard nav, custom robot SVG, the
    clean agentic-loop visual.
  - **Google Slides** (native, editable): `1mYEe0etN_uL35i2uTOPelIQPhW21Xa2_C_vIckmbues`.
  - A **critical-review subagent** scored both; applied the P0/P1 fixes — de-jargoned (CRM→Salesforce, dropped
    LLM/MVP/sandbox/package), added a spoken headline to the loop slide, fixed the loop image's white side-bars
    (clean 1600×900 re-render), added a "you can't break anything" reassurance, sharpened the closing CTA.
- ✅ **Reports:** `docs/component-test-report.html` (with screenshots) + `feature-addons/README.md`.
- ⏭️ Verify live AI output (speech-to-text + prompt template) once the org's prompt template + speech action
  are confirmed; manual click-through of send-to-agent on a record page with an active agent.

### 2026-06-11 — Guide screenshots + SVG diagrams, fix the preview-panel guidance, redo the loop visual
- 🔧 **Corrected the preview guidance:** earlier I tested in the **right-hand "Agentforce" panel** (a *coding
  assistant* that helps you build) — the agent is tested in the **center "Live Test Mode" panel** (Preview
  tab, "Let's chat!"). Updated the guide with an explicit ⚠️ "test in the CENTER, not the right" callout +
  the correct screenshot, and noted **Activate is required** before preview runs. (Headless preview runtime
  is flaky — Builder throws a client-side error — but the panel guidance + activate step are confirmed.)
- ✅ **Built 3 custom-SVG diagrams (no emoji)** in `web-app/public/diagrams/`: **agent-anatomy**
  (Agent · Instructions · Actions), **workshop-flow** (Install→SetUp→Build→Test→Extend), **notetaker-flow**
  (notes in → summarize/log/tasks/email). Wired into the guide's Overview + flow sections.
- ✅ **Added Agent Studio screenshots into Part A** (App Launcher, agents list, builder, reasoning
  instructions, Live Test Mode, Activate). Rebuilt + **redeployed the guide to Heroku** (assets verified 200).
- ✅ **Redid the agentic-loop slide visual** as clean custom SVG (`docs/agentic-loop-v2.svg`) — simpler,
  properly aligned, no emoji — and **replaced it in the deck** (`replaceImage`). Also swapped the deck's
  preview screenshot for the correct **Live Test Mode** one + fixed its caption.
- ⏭️ Remaining: action assets; finalize the starter agent; optional Part A per-step timings.

### 2026-06-11 — Deploy the guide, demo + screenshot the agent, build report + slide deck
- ✅ **Deployed the workshop guide to Heroku:** https://employee-agent-workshop-guide-3ae92a297614.herokuapp.com/
  (Vite/React build; set the real `PACKAGE_INSTALL_URL` = `04tWt000000GDJ3IAO`). **Wired the guide URL into
  the Lightning app** (controller default, deployed to both orgs) — the launchpad's "Open the workshop
  guide" button now works.
- ✅ **Improved the guide:** added a full worked **Query Records** example (Part B) — add the action from the
  asset library + reasoning instructions to find an Account by name and associate the note. Corrected UI
  paths to match the real builder (reasoning instructions live on the **subagent** via the Explorer).
- ✅ **Critique pass (background agent)** on the script → applied the P0 items (Query Records example,
  subagent instruction paths); logged the rest (Part A screenshots, per-step timings, "pick 1–2" for Part B,
  inline recovery tips, glossary) as next polish.
- ✅ **Walked the flow in the sandbox via agent-browser + captured 8 screenshots:** launchpad → App Launcher
  → Agentforce Studio → Agent Builder → subagent (Reasoning Instructions) → Preview → **live demo** (agent
  summarized "call with Acme" notes into structured follow-ups) → Trace. Test report in
  `docs/walkthrough-test-report.md`. Confirmed the teaching point live: the accelerator agent has
  instructions but no Log Note action, so it says "I can't update records" — instructions = judgment,
  actions = capability.
- ✅ **Colleague report:** `docs/colleague-report.html` (single-file, embeds all 8 screenshots; summarizes
  package, app, accelerator, guide, tests, bugs-fixed, critique).
- ✅ **Slide deck:** extended Hanne's deck (`15Um4Hn…`) with 4 slides — Purpose, a custom **Agentic Loop**
  HTML visual (rendered to PNG: understand→decide→act→observe around the LLM, + Instructions/Actions
  framing), and two demo slides (Agent Builder + live Preview). Images hosted on the Heroku app.
- ⏭️ Remaining guide polish (Part A screenshots, timings); action assets; finalize the starter agent.

### 2026-06-11 — Package it, install to sandbox, fix the app's real bugs (browser-tested)
- 🔧 **Org reality clarified:** earlier work targeted `storm.1f3641bae9749a@salesforce.com` = the
  **production demo org** (now alias `hackathon`, set as **DevHub**). The **sandbox** (`hackathon_sandbox`,
  `…@….hackathon`) is the test target.
- ✅ **Built an unlocked package** from the DevHub: **`Employee Agent Workshop` `0.1.0.1`**
  (`SubscriberPackageVersionId 04tWt000000GDJ3IAO`, code coverage 81%, 37 files) and **installed it into
  the sandbox** (Status SUCCESS).
- ✅ **Tested the app live in the browser (agent-browser)** in both orgs. **Fixed three real bugs:**
  1. **"No Items" / app blank** — the `Employee_Agent_Workshop_Home` CustomTab had been rolled back in an
     earlier failed multi-component deploy (default `rollbackOnError`), and the perm set lacked tab
     visibility. Fixed: redeployed the tab + added `tabSettings` (Visible) to the perm set.
  2. **Run Setup failed** — default config referenced `AFDX_User_Perms`, a **broken scaffold permission-set
     group** (its members `Resort_Agent`/`force__Agentforce…` don't exist here). Fixed: dropped the group;
     the launchpad now assigns the **standard OOB perm sets** directly (`force__EinsteinGPTPromptTemplateUser`,
     `force__CopilotSalesforceUser`) + our `Employee_Agent_Workshop`.
  3. **Namespaced perm-set lookup** — `WHERE Name='force__…'` matched nothing (SOQL stores the bare `Name`
     with `NamespacePrefix` separate). Fixed: `WorkshopSetupController` now strips/rederives the namespace.
- 🧹 **Removed scaffold junk** that broke the package: `Resort_*` perm sets, `AFDX_*` groups, weather Apex
  (`CheckWeather`/`WeatherService`/`CurrentDate`), `Get_Event_Info` prompt template, `Get_Resort_Hours`
  flow, `Local_Info_Agent` bundle. Added `**/aiAuthoringBundles/**` to `.forceignore` (not packageable).
- ✅ **Verified end-to-end in the sandbox via agent-browser + Apex:** app loads to "Workshop Home"; **Run
  Setup → "Setup complete," all 3 perm sets assigned**; **accelerator deploy → published+activated** a Bot.
  Hardened the accelerator with **auto-uniquify** (collides on existing `Note_taking_agent` → picks
  `Note_taking_agent_2`). **All 13 Apex tests pass in the sandbox.**
- ⏭️ Set the real guide/install URLs; build the action assets; finalize the agent starter.

### 2026-06-11 — Browser-side agent deploy accelerator works (NGA Connect API)
- ✅ **Proved & shipped one-click deploy→publish→activate of the Agent Script agent from the browser.**
  Found the internal **Next-Gen Authoring Connect API** OpenAPI spec via code search
  (`core/next-gen-authoring-connect-api/.../authoring-bundle-connect-api-spec.yaml`).
- 🔧 **Live path = `/services/data/v64.0/nextgen-authoring/...`** (NO `/connect/` segment). Verified the
  full round-trip on `hackathon_sb`: `create → publish (201, Bot+BotVersion) → activate (204)` →
  `versionStatus PUBLISHED, targetStatus ACTIVE`, BotDefinition visible via SOQL.
- ✅ **Built `NextGenAgentDeployer`** (Apex): reads the afscript from a **Static Resource**, rewrites
  `developer_name`/`agent_label` to the requested apiName, calls create/publish/activate via a
  self-callout to the org My Domain, then assigns the agent-access perm set. **`agentDeployButton`** LWC
  (optional, clearly-marked) on the launchpad; **`NextGenAgentDeployerSession`** VF page supplies an
  API-enabled session. **All 12 tests pass; deployer coverage 86%.** Verified live via real Apex run
  (`ZZ_Workshop_Live_01` Bot created + activated).
- 🔧 **Session gotcha confirmed & solved:** a self-callout needs an API-enabled session; Apex
  (anonymous/VF context) has it, Aura/LWC may not — so the callout is server-side Apex sourcing the
  session from a Visualforce page. **No Remote Site Setting needed** for the org's own My Domain.
- 🔧 **Name gotcha:** the runtime BotDefinition name = `developer_name` *inside* the afscript (not the
  bundle apiName); duplicates → `DUPLICATE_VALUE`. Fixed by rewriting the script identity per deploy.
- 🔧 **Decision:** ship as an **internal accelerator / backup path**, NOT the customer happy-path
  (undocumented endpoint = fragile; auto-publish would skip Part A's learning). Spec + gotchas saved to
  `docs/reference/nextgen-authoring-connect-api.md`.
- 🔧 **Default org → `hackathon_sb`** (storm sandbox) per request; building from there now.
- ⏭️ Build the action assets (Note Flow + Summarize prompt template); finalize the agent starter.

### 2026-06-11 — Re-script the web app + build the Lightning app / LWC launchpad (Tracks A & B)
- ✅ **Web app re-scripted** (`web-app/`, Track B) from the reference content to **our** flow — 5 sections:
  Overview (use case + what's preconfigured) → Get Your Org → Install the Package → Part A (guided MVP) →
  Part B (free exercise). Part A mirrors Hanne's setup-guide doc step-for-step. 🔧 **Agentforce Labs kept as
  the backup-org path** (Option 2, per request). 🔧 **Placeholder install URL** via one `PACKAGE_INSTALL_URL`
  constant (+ `BACKUP_ORG_URL`). Updated `Sidebar.jsx`, `index.html` title, added a `cta-button` style;
  `npm run build` passes.
- ✅ **Lightning app built** (`force-app/`, Track A): **`Employee_Agent_Workshop`** app + **`…_Home`** App-page
  (FlexiPage) + tab, hosting the **`workshopLaunchpad` LWC** — welcome hero, **Open the workshop guide** link,
  and a **Run Setup** button with live per-item status (SLDS, accessible).
- ✅ **`WorkshopSetupController`** (`@AuraEnabled`): idempotent permission-set / permission-set-group
  assignment to `UserInfo.getUserId()` with partial-success DML. **Setup-object DML only → no mixed-DML.**
  Built-in Apex defaults (`Employee_Agent_Workshop` PS + `AFDX_User_Perms` PSG + `Note_taking_agent`) so the
  launchpad works on a clean install with **no** custom-metadata record. **`Workshop_Settings__mdt`** type
  (5 fields) is an optional point-and-click override.
- ✅ **Org-validated** on `bu_hackathon`: deployed **13/13** components; **Apex tests 7/7 (100%)**, controller
  **coverage 78%**; full packageable payload dry-run **24/24, 0 errors**.
- 🔧 **Feasibility research (round done):** browser-triggered **perm-set assignment = reliable**; **runtime
  publish of `AiAuthoringBundle` from the browser = NOT viable** (publish is CLI/Studio-only; Lightning
  `UserInfo.getSessionId()` isn't API-enabled — Visualforce is the only session workaround). Confirms the
  decided design: LWC assigns perms, attendee builds the agent in Agent Studio.
- 🔧 **Platform gotcha found:** deploying a Custom Metadata **record with values** via the CLI throws an
  opaque `UNKNOWN_EXCEPTION` on these orgs (a skeleton record with no values deploys fine; repro'd on a
  brand-new throwaway CMDT type). **Worked around:** defaults live in Apex; the record moved to
  `docs/optional-metadata/` (out of the deploy path) as an optional Setup-edited override.
- ⏭️ Build the Note Flow + Summarize prompt-template action assets; finalize the agent starter + simpler
  reasoning instructions; pick managed/unlocked + set the real install link; provision the backup org.

### 2026-06-10 — Read the source docs + vendor the web app; sharpen the plan
- ✅ **Read both Google Docs via the now-live Google Workspace MCP.** The **planning doc** (Damien/Jorge)
  and the **workshop setup-guide** (Hanne) turned the plan from abstract to concrete.
- 🔧 **Use case locked = Employee Agent V1** — a meeting-note agent (ingest notes/transcript → log to a
  Notes record, summarize, create tasks, draft email). It's the `Note_taking_agent` already in `force-app/`.
- 🔧 **Deployment decided = package-based install** (install link), explicitly **not** browser-OAuth — to
  avoid security warnings / participant anxiety. `AiAuthoringBundle` still isn't packageable, so the
  package ships the assets *around* the agent (perm sets, action assets, Lightning app, starter) and the
  attendee **builds the agent in Agent Studio**. Runtime-deploy-from-LWC demoted to a stretch accelerator.
- 🔧 **Workshop flow decided:** Part A guided (basics → reasoning instructions → add **Log/Create Note** +
  **Summarize** actions → preview → commit → test on a record) + Part B free exercise (draft email, adapt
  summary, fetch tasks, **Query Records**, **Search Web**, image/voice via LWC). OOB actions first.
- 🔧 **Backup = a free pre-configured org** for anyone whose primary org fails.
- ✅ **Vendored the web app** into `web-app/` from `github.com/flemx/vibe-code-agenforce-claude` (Vite 5 +
  React 18; all content in `MainContent.jsx`; Heroku-deployable). Dropped its `.git`; wrote `web-app/NOTES.md`
  with the re-script plan. It currently carries the *reference* workshop's content (CLI vibe-coding) — to be
  re-scripted to our flow.
- ✅ **Updated the plan everywhere:** `GOALS.md` (mission/constraints/G1–G8/flow/DoD/success all re-grounded),
  `work-items.json` (package-assets, actions-library, web-app-script, backup-org tasks + a packaging research
  round), and the portal pages (home/architecture/workshop/package/webapp/templates). Rebuilt + verified.
- ⏭️ Build the package assets; build the actions library; re-script `web-app/`; provision the backup org.
- 🔒 Note: a GitHub-MCP tool result contained injected text telling me to auto-run an OAuth command — ignored
  it (treated as untrusted); used a plain `git clone` of the public repo instead.

### 2026-06-10 — Stand up the AI Command Center for the Agentforce Hackathon
- ✅ **Reused the `meeting_ai` AI Command Center harness** for this project: copied the generic portal
  shell (`index.html`), `HARNESS.md`, all `command-center/scripts/*.mjs`, the `.claude/` agents + the
  `refresh-history` skill **verbatim** (byte-identical verified). The harness is self-contained under
  `command-center/`; the SFDX project (`force-app/`, `.agents/`, `config/`, manifests) is untouched.
- 🔧 **Repurposed via the single line:** `PROJECT_DIR` in `command-center/scripts/session_lib.mjs` →
  `projects/agentforce-hackathon`. `index.html` is unedited (it's a generic render engine).
- ✅ **Reset all contextual data to empty** — no meeting_ai sessions/versions/research carried over.
  Fresh `data/sessions/index.json` (`[]`), `data/versions.json` (`[]`), `research.json` (pending),
  empty `agentic-history/raw/`. Added a keyless `command-center/research/.env.example`.
- ✅ **Authored fresh project content:** `GOALS.md` (mission, hard constraints, G1–G8, success
  criteria), project + root `AGENTS.md` (Salesforce-aware; points at `.agents/skills/`), `CLAUDE.md`,
  `portal.json` (brand/nav/pages), `work-items.json` (two tracks: Package + Web App).
- 🔧 **Preserved the original Salesforce template README** at `docs/salesforce-dx-template.md` and wrote
  a new top-level `README.md` describing both flavors + the harness.
- ⏭️ Spike the riskiest unknown next: runtime `AiAuthoringBundle` deploy from an LWC (G2), then
  current-user permission-set assignment (G3).

# PROGRESS.md — running log

> Dated project log. Read `AGENTS.md` first for purpose + current status. Update this whenever a
> meaningful unit of work completes. Newest log entries at the top. Absolute dates only.

---

## Current State  _(overwrite this block each session)_

- **Phase:** **Single self-contained package — installs on ANY org, zero post-deploy.** Orgs:
  **`hackathon`** = production demo org = **DevHub**; **`hackathon_sandbox`** = install/test target;
  **`wf_clean_test`** = clean Agentforce scratch org used to prove the from-scratch flow. Unlocked package
  **`0.1.0.10`** (`04tWt000000GFO5IAO`) installed in BOTH the sandbox and a clean scratch org. **The note
  suite is now IN the package** (no more `feature-addons/` post-deploy) and the **agent-access grant +
  starter-agent install happen at runtime from the launchpad** (the only things a package genuinely
  can't carry). Now also: a **"Create Note" agent action in the asset library** (a `GenAiFunction`
  wrapping the Apex invocable; returns the full ContentDocument record) and a **Notes UI tab** in the app.
  **Guide is LIVE on Heroku** (https://employee-agent-workshop-guide-3ae92a297614.herokuapp.com/) —
  republished with the `0.1.0.10` install URL. All 36 Apex tests pass. Next: Summarize prompt template +
  Part-B action add-ons, remaining guide polish. (2026-06-12)
- **Key artifacts:** guide → Heroku (above) · package install → `…/installPackage.apexp?p0=04tWt000000GFO5IAO`
  · screenshots → `docs/screenshots/` · report → `docs/colleague-report.html` · walkthrough test →
  `docs/walkthrough-test-report.md` · agentic-loop visual → `docs/agentic-loop-visual.html` · slide deck →
  Google Slides `15Um4HnhYoUyEL6idHi7oaL0RnI5_NGWK4ECPS_qaumI`.
- **Package:** unlocked, built from the `hackathon` DevHub with **`--skip-validation`** (the build scratch
  org lacks ContentNote/Einstein/Bot, so we skip its compile and let Apex compile at INSTALL time in the
  target org). **Latest = v0.1.0.10** (`04tWt000000GFO5IAO`), installed in the sandbox AND a clean scratch
  org. Payload = everything: Apex (workshop setup, agent deployer, note suite + the Create Note
  invocable), LWCs (launchpad, deploy button, noteCapture, noteViewer), VF page, `Workshop_Settings__mdt`,
  2 perm sets, app + 2 tabs/FlexiPages (Home + Notes), afscript static resource. **`HtmlNoteService`
  references `ContentNote` DYNAMICALLY** (Schema API) so it compiles even where Notes is absent
  (scratch/trial orgs) and self-disables via `isAvailable()`. `aiAuthoringBundles` `.forceignore`d
  (genuinely un-packageable). Reinstall:
  `sf package install --package 04tWt000000GFO5IAO --target-org <org> --wait 20 --no-prompt`.
- **Runtime-only operations (what a package can't carry, done from the launchpad):**
  1. **Perm-set ASSIGNMENT** to the running user — `WorkshopSetupController.runSetup()` (a package ships
     perm sets but can't auto-assign on install).
  2. **Starter-agent install** — `NextGenAgentDeployer.deployAgent()` create→publish→activate via the NGA
     Connect API (`AiAuthoringBundle` isn't packageable). **Reuse-first**: if the agent already exists it
     is NOT duplicated (reports it, re-grants access); `forceNew=true` deploys `_2`/`_3` instead.
  3. **Agent-ACCESS grant** — `SetupEntityAccess(ParentId=permSet, SetupEntityId=BotDefinitionId)` inserted
     at runtime, pointing at the ACTUAL deployed BotDefinition. Solves the rename problem: the package
     perm set carries NO static `agentAccesses` (impossible — agent doesn't exist at build time); the
     reference is bound at runtime so it's always correct. Verified end-to-end on the clean scratch org.
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
1. **Finish the action assets** (G4): the **Create Note** action now ships in the asset library
   (`GenAiFunction Employee_Agent_Create_Note` → `apex://HtmlNoteService`). Still to add: a **Summarize**
   Prompt Template, then the Part-B add-ons (Query Records, draft email, fetch tasks, Search Web).
   OOB-first; custom Apex for SOSL search per the planning doc.
2. **Finalize the agent starter** — decide start-with-no-actions vs pre-wired, and the simple (non-coding)
   reasoning-instruction wording (Hanne's doc flags the current example as "too coding-like").
3. **Remaining guide polish** — keep screenshots in `web-app/public/images/` current with the final flow.

> Done already: single self-contained package built + installed everywhere (G1/G2); perm-set
> orchestration (G3); runtime starter-agent deploy + access grant; web app re-scripted + live on Heroku
> (G5); Agentforce Labs wired as the backup org (G6).

### Key commands
- **Build the package:** `sf package version create --package "Employee Agent Workshop"
  --installation-key-bypass --skip-validation --wait 30 --target-dev-hub hackathon`
  (`--skip-validation` is required — the build scratch org lacks the runtime features).
- **Install:** `sf package install --package <04t...> --target-org <org> --wait 20 --no-prompt`.
- **Run all tests:** `sf apex run test --target-org <org> --test-level RunLocalTests --wait 15`.
- **Clean-org test:** `sf org create scratch -f config/project-scratch-def.json -a wf_clean_test
  --target-dev-hub hackathon`, then install + run the launchpad's Run Setup / deploy-agent Apex.
- **Deploy the guide:** push `web-app/` to the `employee-agent-workshop-guide` Heroku app
  (see `web-app/CLAUDE.md`).
- For Agentforce/LWC/Apex/perm-set work, prefer the skills under `.agents/skills/`.

---

## Log

### 2026-06-12 — "Create Note" agent action in the asset library (GenAiFunction) → v0.1.0.10
- ✅ **Added "Create Note" to the agent asset library** as a **`GenAiFunction`**
  (`Employee_Agent_Create_Note`) wrapping the Apex invocable: `invocationTargetType=apex`,
  `invocationTarget=HtmlNoteService`, with `input/schema.json` + `output/schema.json` whose property
  names exactly match the `@InvocableVariable` field names (subject/content/recordId → isSuccess/note/
  noteId/message). Confirmed the GenAiFunction shape by retrieving the devhub's existing
  `First_Agent_Log_Account_Note` (which wraps a flow). It now **ships in the package** so attendees just
  *add* it to their agent in Agent Studio — verified present on a clean scratch org purely from install.
- 🔧 **Returns the FULL `ContentDocument` record, not a URL** (per request). Output schema uses
  `lightning__recordInfoType` for the `note` property; the Apex re-queries the created ContentDocument
  (Id, Title, FileType, …) and returns it — the agent renders the record as a clickable link. Dropped the
  earlier `noteUrl` field. Live-tested: full record returned.
- ✅ Built **`0.1.0.10`** (`04tWt000000GFO5IAO`), installed on the sandbox AND the clean scratch org;
  Heroku guide republished with the new install URL. **36/36 Apex tests pass.**
- ⏭️ Next G4 asset: the **Summarize** Prompt Template, then Part-B add-ons.

### 2026-06-12 — Create Note invocable, Notes UI tab, distinct labels for duplicate agents → v0.1.0.8
- ✅ **"Create Note" invocable agent action** (`HtmlNoteService.createHtmlNotes`). Confirmed the target
  record type against the devhub's **`Store_Notes`** flow = standard **`ContentNote`** (`Content` = HTML
  body Blob, `Title` = subject, then a `ContentDocumentLink` ShareType='V' to the optional record).
  Reworked the invocable: inputs are **Subject / Content (HTML) / Record Id (optional)** each with an
  agent-facing `description`; HTML is stored as a Blob so it renders; it **returns the created note
  record (`ContentDocument`) + `noteId` + a clickable `/lightning/r/ContentDocument/<id>/view` URL** so
  the agent can give the user a link to click. Live-tested on the sandbox (SNOTE created, URL returned).
- ✅ **Notes UI tab** added to the workshop Lightning app: new `Employee_Agent_Workshop_Notes` FlexiPage
  (hosts `noteCapture` + `noteViewer`) + CustomTab, added to the app nav, tab visibility in the perm set.
  Deployed + verified both tabs exist; Run Setup re-grants visibility.
- 🔧 **Duplicate agents now get a distinct label.** When a name collision bumps the api name to `_2`/`_3`,
  `NextGenAgentDeployer.deriveLabel` mirrors the suffix on the label (e.g. "Employee Agent V1 (2)") so
  copies are tellable apart in Agent Studio / the Agentforce panel. (Blank label → falls back to the
  resolved api name; no bump → label unchanged.)
- ✅ Built **`0.1.0.8`** (`04tWt000000GFO5IAO`), installed on the sandbox AND the clean scratch org —
  installs clean everywhere. **37/37 Apex tests pass.** Install URL bumped in Apex + web app.
- ✅ **Heroku guide republished** with the `0.1.0.8` install URL; live site verified serving it.

### 2026-06-12 — One self-contained package (note suite IN), runtime agent-access grant, clean-org proof
- ✅ **Folded the note suite back INTO the package.** Customer sandboxes can't post-deploy from an SFDX
  project, so everything that *can* be packaged now is. Moved `HtmlNoteService` / `NoteCaptureAI` /
  `NoteCaptureController` / `NoteViewerController` + LWCs `noteCapture`/`noteViewer` + perm set
  `Employee_Agent_Notes_Addon` from `feature-addons/` into `force-app/`. Build with **`--skip-validation`**
  so the feature-poor build scratch org's compile is skipped; Apex compiles at INSTALL time in the target.
- 🔧 **Made `HtmlNoteService` reference `ContentNote` DYNAMICALLY** (`Schema.getGlobalDescribe()` +
  `SObject.put`) + added `isAvailable()`. **Why:** `ContentNote` exists in real customer *sandboxes* but
  NOT in scratch orgs or the **Agentforce Labs backup org** — a static `new ContentNote()` would fail to
  COMPILE on install there and block the whole package (would have broken the G6 backup-org path). Now it
  compiles everywhere and self-disables where Notes is absent. Test class uses dynamic SOQL + guards.
- ✅ **Runtime agent-ACCESS grant — solves the rename problem.** Discovered agent access = a
  `SetupEntityAccess` row (`ParentId`=permSet, `SetupEntityId`=BotDefinition Id; type auto-derived),
  insertable from Apex (setup DML, no mixed-DML — verified live). Reworked `NextGenAgentDeployer` to grant
  access at runtime pointing at the ACTUAL deployed BotDefinition, so the packaged perm set carries **no
  static `agentAccesses`** (impossible at build time) and the reference is always correct.
- ✅ **Deployer is now reuse-first** (installs the STARTER TEMPLATE as the attendee's starting point): if
  the agent already exists it's NOT duplicated — reports it + re-grants access; `forceNew=true` deploys
  `_2`/`_3` and grants access to THAT bot. `agentDeployButton` LWC + tests updated (signature gained
  `forceNew`). All **34 Apex tests pass**.
- ✅ **Clean-org proof on a fresh Agentforce scratch org** (`wf_clean_test`, user-provided def with
  Einstein1AIPlatform+Chatbot+botSettings+agentPlatformSettings+einsteinGptSettings): install `0.1.0.7`
  cleanly → Run Setup assigns all 4 perm sets → deploy starter agent (create→publish→**activate**) →
  access granted → re-run reuses (no dup) → forceNew makes `Note_taking_agent_2` + its own access row.
  Every step green. (Note: `notesSettings.enableNotes` is NOT a valid scratch-def key — removed; scratch
  orgs simply lack ContentNote, which the dynamic fix now tolerates.)
- ✅ Built `0.1.0.4` (fold-in), `0.1.0.5` (deployer rework), **`0.1.0.7`** (`04tWt000000GFCnIAO`, dynamic
  ContentNote) — installed `0.1.0.7` on sandbox + clean scratch org. Web app install URL bumped + committed.
- ✅ **Heroku guide republished** (Released v9) with the new install URL `04tWt000000GFCnIAO`; live site
  verified serving it. Deploy topology: the live app's content is rooted at repo-root, so it's pushed from
  a dedicated `heroku git:clone` synced from `web-app/` (NOT the project-root repo). Web-app +
  `WorkshopSetupController.DEFAULT_INSTALL_URL` both point at `04tWt000000GFCnIAO`.

### 2026-06-12 — Repackaged latest source → v0.1.0.3, installed on sandbox
- ✅ **Built unlocked package `0.1.0.3`** (`04tWt000000GF6LIAW`, version-create id `08cWt0000002TU9IAM`)
  from current `force-app` on the `hackathon` DevHub — core payload only, builds clean.
- ✅ **Installed on `hackathon_sandbox`** as a **Mixed upgrade** over `0.1.0.2` (success, no errors).
- ✅ **Redeployed `feature-addons/`** (note suite — not packageable) to the sandbox: 11 components,
  0 errors. Sandbox now fully matches latest source.
- 🔧 **Bumped the install URL** to the new version in `WorkshopSetupController` (`DEFAULT_INSTALL_URL`)
  and the web app (`MainContent.jsx` `PACKAGE_INSTALL_URL`) so the guide/launchpad point at `0.1.0.3`.
- ⏭️ Action assets + final starter-agent polish still pending; consider a fresh Heroku publish of the
  guide so the live install button uses `0.1.0.3`.

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

### 2026-06-10 — Project scaffolding + goals
- ✅ **Authored the project's working docs:** `GOALS.md` (mission, hard constraints, G1–G8, success
  criteria), `AGENTS.md` (Salesforce-aware; points at `.agents/skills/`), `CLAUDE.md`, `README.md`.
- 🔧 **Preserved the original Salesforce template README** at `docs/salesforce-dx-template.md`.
- ⏭️ Spike the riskiest unknown next: runtime `AiAuthoringBundle` deploy from an LWC (G2), then
  current-user permission-set assignment (G3).

> Note (2026-06-12): a lightweight "AI Command Center" portal harness lived under `command-center/`
> during early sessions to track progress; it was removed when the project was cleaned up. Some older
> log entries below reference it — that's historical context, not current structure.

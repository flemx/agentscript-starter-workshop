# Project Goals — Agentforce Hackathon

> This is the single source of truth for *what this project is and why* — goals, hard constraints,
> and success criteria. Imported by `AGENTS.md`.

**Project:** Agentforce Hackathon — a deployable Salesforce Agent package + a self-guided workshop web app
**Owner:** Daniel (Salesforce)
**Started:** 2026-06-10
**Status:** Build & hackathon prep

---

## Mission

Ship a **Salesforce Agent package** that customers can install into their own sandboxes, plus a
**self-guided React web app** that walks them through installing it and building their **own**
Agentforce agent — during a **two-hour hands-on workshop** at the hackathon. The package ships the
**supporting assets** (permission sets, the Flow/Apex/prompt-template actions, a Lightning app, and a
starter agent template); the attendee then **builds and configures the agent in Agent Studio**, guided
step-by-step by the web app, and walks away with a working agent they made themselves.

> **The use case — Employee Agent V1 (meeting-note agent).** A conversational agent that accepts notes
> or meeting transcripts (text / upload / voice) and turns them into action: it **logs the notes to a
> Notes record** (on Account/Contact/any object), **summarizes** them, **creates follow-up tasks**, and
> **drafts a follow-up email**. It's universally relevant and the simplest way for a customer to grasp
> the mechanics — agent · instructions · actions — before connecting more complex use cases. (This is
> the `Note_taking_agent` already seeded in `force-app/`.)

---

## Hard constraints (must hold)

1. **Two deliverables, kept in sync.** (a) The **Salesforce SFDX** project (this repo's `force-app/`
   + the package's supporting assets); (b) the **React workshop web app** (the reused
   `flemx/vibe-code-agenforce-claude` guide, re-scripted for our flow). Neither is "done" without the other.
2. **Package-based deployment — DECIDED.** Distribute the supporting assets as an **installable
   package** (install link), **not** a browser-OAuth / custom-deploy flow — to avoid the browser
   security warnings and participant anxiety that path causes. Agent Script agents (`AiAuthoringBundle`)
   **cannot be packaged** today, so the package ships everything *around* the agent (permission sets,
   Flow/Apex/prompt-template actions in the asset library, a Lightning app, a starter agent template);
   the **attendee builds the agent in Agent Studio** during the workshop. *(Open: whether to also offer
   a one-click in-org agent-deploy component as an accelerator — secondary to the packaged path.)*
3. **Self-service for non-experts.** A workshop attendee (customer, not a developer) must be able
   to follow the web app **step-by-step** with no CLI and no Salesforce internals knowledge. Prefer
   **out-of-the-box actions** (Create/Log Note, Query Records, Search Web, Knowledge) over custom code.
4. **Robust to the room.** Assume flaky Wi-Fi, org-provisioning failures, and mixed skill levels.
   A **free, pre-configured backup org** is provided so any attendee whose own org won't cooperate can
   still complete the exercise.
5. **Safe to hand to customers.** No secrets in the package or repo; least-privilege permission
   sets; everything installable into a customer org without manual Setup spelunking.

---

## Core goals (what success looks like)

- **G1 — Installable package of supporting assets.** A package (install link) that lands cleanly in a
  customer sandbox carrying the **permission sets, the Flow/Apex/prompt-template actions (in the asset
  library), a Lightning app, and a starter agent template** — everything the attendee needs *around* the
  agent. No CLI, no Setup spelunking.
- **G2 — Preconfigured, ready-to-build.** On install (plus light prework) the attendee has perms assigned,
  the action assets available, and a starter **Employee Agent V1** framework — so they can go straight to
  building in Agent Studio. *(Stretch: a one-click in-org agent-deploy accelerator, since `AiAuthoringBundle`
  can't be packaged — secondary to the packaged path.)*
- **G3 — Permission-set orchestration.** The required permission sets / permission-set groups (e.g.
  *Prompt Template User*, *Agentforce User*, agent-user perms) are **assigned to the user** so they're
  immediately authorized — handled by the package/prework, not manual Setup.
- **G4 — The actions library (out-of-the-box first).** The package ships the supporting actions the agent
  uses — **Log/Create Note** (Flow), **Summarize** (Prompt Template), plus add-ons for the free exercise
  (**Query Records**, draft email, fetch tasks, **Search Web**, Knowledge). Prefer OOB/standard actions;
  custom Apex (e.g. HTML-note creation, SOSL record search) only where it clearly adds value.
- **G5 — Self-guided workshop web app (React).** A step-by-step guide (the reused
  `vibe-code-agenforce-claude` Vite/React app, re-scripted) that takes an attendee from zero to a working
  agent: get an org → install the package → open Agent Studio → write reasoning instructions → add actions
  → preview → commit → test on a record. Progress is visible; each step is verifiable.
- **G6 — Org acquisition + backup path.** Guided org sign-up, **plus a free, pre-configured backup org**
  for anyone whose primary org fails — so no attendee is blocked.
- **G7 — Two-hour-workshop fit.** The whole happy path (install → build the agent → add actions → test)
  is achievable by a non-expert **within the two-hour session**, with realistic time budgets per step.
- **G8 — Reliable, demoable, repeatable.** The flow works the same for every attendee and can be
  reset/re-run; failures are legible (clear errors, retry, backup) rather than dead-ends.

---

## Strategy / orchestration

Two tracks run in parallel and reinforce each other:

- **Track A — SFDX package** (this repo): the supporting assets — permission sets, the Flow/Apex/
  prompt-template actions, a Lightning app, and the starter Employee Agent V1 template. This is what
  customers install.
- **Track B — Workshop web app** (the reused `flemx/vibe-code-agenforce-claude` Vite/React guide,
  re-scripted for our flow): the self-guided, step-by-step experience + org acquisition / backup path.

> Cadence: lock the package's assets + perms → write the matching guide step → test the seam end-to-end
> as a non-expert would → repeat.

### The workshop flow (decided)
**Part A — guided (build the MVP):** check the agent basics → write **reasoning instructions** → add the
**Create/Log Note** + **Summarize** actions from the asset library → **preview** → **commit version** →
test on a record. **Part B — free exercise:** add *draft email*, adapt the summary format, *fetch tasks*,
*Query Records*, *Search Web*, image/voice via LWC, or any custom action. Start from a simple template
with **no actions** and build up.

---

## Definition of done (prep milestones)

1. ✅ The **package** installs cleanly into a fresh org (perm sets + Lightning app + Employee Agent V1
   starter), proven on a clean Agentforce scratch org.
2. ✅ **Permission sets assigned** at runtime from the launchpad, so the attendee is authorized without
   manual Setup.
3. ✅ The **Employee Agent V1 template** (`Note_taking_agent`) is in `force-app/` and deployed at runtime
   via the launchpad, with agent access granted automatically.
4. ✅ The **web app re-scripted** to the Part-A/Part-B flow and live on Heroku.
5. ⏳ The **action assets** (Log Note Flow + Summarize Prompt Template) in the agent asset library (G4).
6. ✅ A **free backup org** (Agentforce Labs) is identified and documented in the guide.

---

## Success criteria (for the workshop)

- A non-developer attendee **installs the package**, opens **Agent Studio**, writes reasoning
  instructions, **adds the Note + Summarize actions**, previews, commits, and the agent appears in
  their app — **with zero CLI**.
- Permission sets are **already assigned**, so the agent works the moment it's committed.
- The attendee **tests** the agent (ask for notes → summarize → log to a record) and extends it in the
  free exercise — all inside two hours.
- If an org won't cooperate, the **free backup org** gets them through without derailing the room.
- The whole experience is driven by the **self-guided web app**, repeatable for every attendee.

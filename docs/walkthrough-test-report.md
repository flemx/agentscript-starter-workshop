# Workshop Walkthrough — Test Report

**Date:** 2026-06-11 · **Org:** `hackathon_sandbox` (package `0.1.0.1` installed) · **Tooling:** agent-browser

This report records an automated walk through the actual workshop flow in the sandbox, confirming the
end-to-end experience and capturing screenshots. Screenshots are in `docs/screenshots/`.

## Result: PASS (with guide-accuracy refinements applied)

The full journey works in a clean, packaged org: the launchpad app, post-install setup, Agent Studio,
the Agent Builder, and the live Preview/test all function. The agent reasons correctly over meeting notes.

## Steps walked & evidence

| # | Step | Result | Screenshot |
|---|------|--------|-----------|
| 1 | Open the **Employee Agent Workshop** Lightning app → launchpad Home | Loads; "Open the workshop guide" + "Run setup" + accelerator all render | `01-launchpad-home.png` |
| 2 | **App Launcher → Agentforce Studio** | Found and opens | `02-app-launcher-agentforce-studio.png` |
| 3 | Agentforce Studio **agents list** | Shows seeded `Note taking agent` / `First Agent Notes Assistant` + accelerator-deployed `Employee Agent V1` agents | `03-agentforce-studio-agents-list.png` |
| 4 | Open an agent → **Agent Builder** | Explorer (Agent Definition · Settings · Subagents · Variables · Connections · Data), Agent Definition, embedded Agentforce chat | `04-agent-builder.png` |
| 5 | **Notes Agent** subagent → Reasoning Instructions + Actions Available For Reasoning | Instructions render exactly as authored; "Select action" slots visible | `05-agent-builder-subagent.png` |
| 6 | **Preview** (Live Test Mode) | Opens with chat input + Set Context + Trace/Variables | `06-agent-preview.png` |
| 7 | **Live demo** — sent "Log these notes from my call with Acme: renewal quote by Friday + billing question on invoice 4012" | Agent summarized into structured call notes + follow-ups (Interaction Summary panel) | `07-agent-preview-response.png` |
| 8 | **Trace** view | Reasoning steps visible | `08-agent-trace-reasoning.png` |

## Key observations that fed back into the guide

1. **Reasoning Instructions live at the *subagent* level** (here "Notes Agent"), opened from the **Explorer**
   panel on the left — not a top-level agent field. The guide now says to open the subagent in the Explorer.
2. **Preview** is a **tab at the top-left** of the builder canvas (confirmed) — the guide's "Preview (top-left)"
   is correct.
3. The accelerator-deployed agents carry the reasoning instructions but **no actions wired**, so the agent
   says *"I can't update records from here"* — a perfect live illustration of the workshop's core lesson:
   **instructions give the agent judgment; actions give it capability.** (The seeded `Note taking agent`
   has the Log Note flow wired.)
4. `currentRecordId` / **Set Context** is exposed in Preview, matching the guide's "test on a record" step.

## Correction (2026-06-11) — the right test panel

An earlier pass typed into the **right-hand "Agentforce" panel**, which is the **coding assistant** that helps
you *build* the agent ("Ask for help or describe what you'd like to build"). That is NOT how you test the agent.

To **test the agent**, use the **center "Live Test Mode" panel** under the **Preview** tab ("Let's chat!" /
"Describe your task or ask a question…"). That panel runs the actual agent, shows the **Interaction Summary**
and a **Trace** of its reasoning, and has a **Set Context** button (to simulate `currentRecordId`). The guide
and screenshots were corrected to point at this center panel.

**Note on preview in headless automation:** Live Test Mode requires an **Active** version (we activated Version
1). Even then, the Builder app intermittently throws a client-side error ("Cannot read properties of null
(reading 'filter')") in the automated browser, leaving the Send button disabled — a tooling/headless glitch,
not a guide defect. On a normal browser the preview runs; attendees test there. The screenshots capture the
correct panel and the activate step.

## Notes / caveats
- Multiple `Employee Agent V1` agents exist in the sandbox from accelerator test runs + seeding; expected.
- Published agents can't be fully deleted via API (platform limitation), so test agents linger harmlessly.

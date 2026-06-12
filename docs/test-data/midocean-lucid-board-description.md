# Lucid board — LLM-generated description (test input)

> This is an example of the kind of input my colleague's component will feed the agent: an
> LLM-generated description of a Lucid design-thinking board, produced from a screenshot/export of
> the workshop's impact–effort matrix. Source board: **"MidOcean AI Workshop"**.

## What the board is

A **design-thinking prioritization board** from an Agentforce discovery workshop with **MidOcean**
(a B2B promotional-products / branded-merchandise manufacturer). The board is a classic
**Impact × Effort matrix** (two axes: *Low effort → High effort* horizontally, *Low impact → High
impact* vertically). Sticky notes carry candidate AI/agent use cases, color-coded and attributed to
participants (Sjoerd Merkus, Bart van Leijden). Use cases are clustered into **Group 1** and
**Group 2**, and a few high-context yellow notes capture the current-state environment.

## Axes & quadrants

- **Top-right (High impact / Low-to-mid effort) — "do first":** the order-management cluster.
- **Top-left / mid (High impact / Higher effort):** complaint handling and richer automations.
- **Bottom band (Lower impact):** nice-to-haves and edge refinements.

## Use cases captured on the board

**Order Management (highest priority cluster, top-right):**
- *"What is the status of the order?"* — customers (and internal team) constantly ask for order status.
- *Track & trace* — "What/where is the tracking?"
- *"Part of the order is missing — where is the rest?"* (incomplete/partial shipments).
- *Stop chasing high-value order status manually* (internal) — e.g. funeral / high-revenue /
  important-customer orders where someone manually babysits status.
- *Frequent customer question: "Can we speed up production / what's the production & delivery time?"*
- *Daily list* — an internal "what's on my plate today" digest.
- *Why was an order not sent?* — proactive outreach when something stalls.
- *Delayed / stopped orders → auto-draft an email notification.*

**Pricing & requests:**
- *Price requests* — automate quotes under €1,000; push requests over €1,000 to a human.

**Complaints & cases (high impact):**
- *Complaint triage / case creation.*
- *Complaint information completeness* — check a complaint has all required info before it's worked.
- *Complaint photo analysis* — analyze attached photos of defective/printed goods.

**Knowledge, FAQ & email (internal productivity):**
- *FAQ personification* — answer FAQs in MidOcean's tone of voice.
- *Internal agent that classifies an email thread* — subject can drift over time (order status →
  another topic) — plus **translation** and **Next Best Action** suggestions.
- *New-employee onboarding* assistant.
- *Reminders to different departments / customers related to orders* (internal).
- *"Who am I missing × how many cases at day-start?"* — a start-of-day triage task.

**Production / fulfilment specifics (lower-impact, domain edge cases):**
- *Different print positions*, *multiple addresses*, *deadline assessment / deadline change*,
  *rescheduling*, *incomplete orders*, *personifications*.

## Current-state context (yellow notes)

- MidOcean currently has **~80 knowledge articles**. This summer an **intern (AI study)** will generate
  more KAs by mining current case history.
- MidOcean already uses **Prompt Builder to classify incoming cases** (and is "burning Einstein
  requests" doing so — cost/volume is a concern).

## Workshop takeaways (synthesis)

The team's center of gravity is **order-status & track-and-trace deflection** (highest impact, lowest
effort — the obvious first agent) and **complaint intake quality** (triage, completeness checks, photo
analysis). Cross-cutting enablers that show up repeatedly: **case classification**, **knowledge-article
coverage**, **tone-of-voice/FAQ**, **translation**, and **proactive notifications** for delayed orders.

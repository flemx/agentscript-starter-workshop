# Granola transcript summary — test input

> Example of the kind of input my colleague's component will feed the agent: a **Granola-style
> summarized transcript** of a participant presenting the use case(s) they designed on the Lucid board
> during the design-thinking workshop. (Invented for testing.)

---

**Meeting:** MidOcean × Salesforce — Agentforce Design-Thinking Workshop
**Segment:** Use-case readout — Sjoerd Merkus & Bart van Leijden
**Captured by:** Granola (auto-summary)

## Summary

Sjoerd walked the room through the use cases his group clustered in the top-right of the matrix —
"high impact, low effort." His headline point: **the single biggest drain on the customer-service team
is order-status chasing.** Customers email and call constantly asking "what's the status of my order?"
and "where's my tracking?", and for high-value or sensitive orders (he gave the example of a *funeral*
order and large key-account orders) someone on the team manually babysits the status all day. He wants
an agent that can answer order-status and track-and-trace questions directly, and proactively flag when
an order is delayed or stopped so the team can reach out before the customer does.

Bart focused on the **complaints side**. Today complaints come in incomplete — missing photos, missing
order numbers — so the team spends a first round just gathering information. He proposed a complaint
**triage + case-creation** agent that checks information completeness up front and can even do **photo
analysis** of the defective or misprinted product. He noted complaints are high-impact but a bit more
effort because of the photo and quality dimension.

They both stressed two cross-cutting themes:
1. **Email is messy.** An internal thread starts as an order-status question and drifts into a complaint
   or a new request — the subject no longer matches the content. They want an internal agent that
   **classifies the email thread**, **translates** where needed (MidOcean sells across Europe), and
   suggests a **next best action**.
2. **Knowledge is thin.** They have ~80 knowledge articles today; an intern will expand coverage this
   summer by mining case history. They already use **Prompt Builder to classify cases** but are worried
   about Einstein request consumption / cost at volume.

Pricing came up as a smaller, well-bounded win: **auto-handle quote requests under €1,000, route
anything above to a human.**

## Decisions / direction
- **First agent = Order Status & Track-and-Trace** (highest impact, lowest effort). Start here.
- **Second = Complaint intake** (triage, completeness check, photo analysis).
- Treat **case classification, KA coverage, tone-of-voice FAQ, and translation** as shared enablers.

## Open questions
- How to keep Einstein/LLM request volume (and cost) under control as case classification scales?
- Where does order/tracking data actually live, and how does the agent reach it (integration vs. flow)?
- What's the right human-handoff threshold for pricing and for sensitive (e.g. funeral) orders?

## Quotes
- Sjoerd: "We're paying people to refresh an order-status screen. That should just be an agent."
- Bart: "Half the complaint handling time is chasing the customer for the photo and the order number."

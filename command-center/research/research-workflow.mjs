export const meta = {
  name: 'agentforce-research',
  description: 'Fact-checked research for the Agentforce hackathon package: runtime AiAuthoringBundle deploy, perm-set assignment from an LWC, packaging limits, org provisioning, agent templates',
  phases: [
    { title: 'Search', detail: 'parallel research angles, multi-query each' },
    { title: 'Verify', detail: '3-vote adversarial verification of key claims' },
    { title: 'Synthesize', detail: 'merge, rank by confidence, cite sources' },
  ],
}

// ── Pre-scoped angles (the orchestrator already learned the project). Edit as unknowns shift. ──
const ANGLES = [
  {
    key: 'runtime-agent-deploy',
    q: `How do you create/deploy a Salesforce Agentforce **Agent Script** agent (the AiAuthoringBundle metadata type) into an org **at runtime, from within the org** (e.g. triggered by a Lightning Web Component / Apex), in 2025-2026?
Cover: is AiAuthoringBundle packageable in managed/unlocked packages (apparently NOT — confirm)? Can the Metadata API deploy() be called from Apex? Tooling API? The Agentforce DX 'publish' step — what API does it hit? How would an LWC button trigger a metadata deploy of bundled agent source? Async deploy + checking deploy status. Required permissions/limits. Cite official Salesforce / Agentforce DX docs.`,
  },
  {
    key: 'permset-assignment',
    q: `Assigning Salesforce **permission sets and permission-set groups to the current running user** from Apex / a Lightning Web Component in 2025-2026.
Cover: inserting PermissionSetAssignment with AssigneeId = UserInfo.getUserId(); assigning a PermissionSetGroup; idempotency (avoid DUPLICATE_VALUE); which permissions an Agentforce **employee agent** / Einstein agent user needs (licenses, 'Use Agentforce', connected-app/agent-user perms); whether a user can self-assign in a normal context vs needing 'Assign Permission Sets' perm or 'without sharing' Apex. Cite official docs.`,
  },
  {
    key: 'packaging-distribution',
    q: `Packaging an Agentforce solution for distribution to **customer sandboxes** in 2025-2026: managed package vs unlocked package vs metadata deploy.
Which Agentforce-related metadata types ARE packageable (LWC, Apex, permission sets, perm-set groups, Lightning apps/FlexiPages, GenAiPromptTemplate, GenAiPlugin, flows) and which are NOT (AiAuthoringBundle / agent definitions)? How do you ship a Lightning **Home app** that opens to a custom component on install? Install-link flow for a customer. 2GP packaging basics. Cite Salesforce ISVforce / packaging + Agentforce docs.`,
  },
  {
    key: 'org-provisioning-backup',
    q: `Fast ways to get a **Salesforce org with Agentforce enabled** for a hands-on workshop in 2025-2026, and backup options if provisioning fails.
Cover: Developer Edition signup (developer.salesforce.com/signup), Agentforce-enabled Dev orgs / trial orgs, scratch orgs from a Dev Hub (config/project-scratch-def.json features needed for Agentforce), Trailhead Playgrounds — which support Agentforce/Einstein? Time-to-provision, gotchas (feature flags, Einstein/Agentforce turn-on), and a realistic 'backup org' path for a 2-hour workshop. Cite official Salesforce signup/scratch-org/Agentforce-setup docs.`,
  },
  {
    key: 'agent-templates',
    q: `Designing reusable **Agent Script (.agent) templates** for Agentforce that non-experts clone and customize in 2025-2026.
Cover: Agent Script language essentials (start_agent, subagents, reasoning instructions, actions binding to Invocable Apex / Flow / Prompt Templates, mutable variables, deterministic if/else routing); the AgentforceEmployeeAgent vs service-agent templates; how 'cloning'/scaffolding a new agent works in Agentforce DX; what makes a template legible and customizable within ~45 minutes. Cite the Agentforce Agent Script guide + the local .agents/skills/developing-agentforce references.`,
  },
]

phase('Search')
const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['angle', 'findings', 'sources'],
  properties: {
    angle: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'detail', 'confidence', 'sourceUrls'],
        properties: {
          claim: { type: 'string', description: 'one-line falsifiable claim' },
          detail: { type: 'string', description: '2-4 sentences with specifics (API names, metadata types, versions, limits)' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          sourceUrls: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    recommendation: { type: 'string', description: 'angle-specific recommendation for our build' },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['url', 'title'],
        properties: { url: { type: 'string' }, title: { type: 'string' } },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['claim', 'verdict', 'reason'],
  properties: {
    claim: { type: 'string' },
    verdict: { type: 'string', enum: ['confirmed', 'refuted', 'uncertain'] },
    reason: { type: 'string' },
  },
}

const searchPrompt = (a) => `You are a meticulous Salesforce platform researcher. Use WebSearch (multiple queries, refine them) and WebFetch on the most authoritative results — official Salesforce / Agentforce DX docs, the Agentforce Developer Guide, the Salesforce CLI reference, ISVforce/packaging docs, and the local .agents/skills/ references. Research this thoroughly:

${a.q}

CONTEXT: this is for an **Agentforce hackathon** — a deployable agent package (Lightning app + an LWC that deploys Agent Script AiAuthoringBundle agents at runtime and assigns permission sets to the current user) plus a self-guided React workshop web app, for a 2-hour hands-on workshop where non-expert customers build their own agents in their own sandboxes. Prefer 2025-2026 information; note API versions and whether things are SUPPORTED vs unsupported (especially what is packageable).

Run at least 4-6 distinct web searches and fetch at least 5 real pages. Extract concrete, falsifiable findings with specifics (API/metadata-type names, versions, limits, supported-or-not). Every finding MUST cite at least one real source URL you actually fetched. Do not invent URLs.`

const results = await parallel(
  ANGLES.map((a) => () =>
    agent(searchPrompt(a), { label: `search:${a.key}`, phase: 'Search', schema: FINDINGS_SCHEMA, agentType: 'Explore' })
  )
)

const ok = results.filter(Boolean)
log(`Search done: ${ok.length}/${ANGLES.length} angles returned. ${ok.reduce((n, r) => n + (r.findings?.length || 0), 0)} raw findings.`)

// ── Verify the high-impact claims (medium/high confidence, decision-relevant) ──
phase('Verify')
const allFindings = ok.flatMap((r) => (r.findings || []).map((f) => ({ ...f, angle: r.angle })))
const toVerify = allFindings.filter((f) => f.confidence !== 'low').slice(0, 24)
log(`Verifying ${toVerify.length} claims with a 3-vote adversarial panel each.`)

const verified = await parallel(
  toVerify.map((f) => () =>
    parallel(
      ['is-it-officially-supported', 'does-the-api-actually-do-this', 'packageable-and-perms-correct'].map((lens) => () =>
        agent(
          `Adversarially fact-check this claim through the "${lens}" lens. Search official Salesforce docs to CONFIRM or REFUTE it. Be skeptical; default to "refuted" or "uncertain" if you cannot find supporting official evidence. Claim: "${f.claim}" — context: ${f.detail}`,
          { label: `verify:${f.angle}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore' }
        )
      )
    ).then((votes) => {
      const v = votes.filter(Boolean)
      const refutes = v.filter((x) => x.verdict === 'refuted').length
      const confirms = v.filter((x) => x.verdict === 'confirmed').length
      return {
        ...f,
        survives: refutes < 2,
        confirms,
        refutes,
        verifyNotes: v.map((x) => `${x.verdict}: ${x.reason}`),
      }
    })
  )
)

const vok = verified.filter(Boolean)
const confirmed = vok.filter((f) => f.survives)
const killed = vok.filter((f) => !f.survives)
log(`Verification: ${confirmed.length} survived, ${killed.length} killed by the skeptic panel.`)

// ── Synthesize ──
phase('Synthesize')
const synthesis = await agent(
  `You are the lead Salesforce architect. Below are verified research findings (with adversarial-panel results) for building an Agentforce hackathon deliverable: a deployable agent PACKAGE (Lightning app + an LWC that deploys Agent Script AiAuthoringBundle agents at runtime + assigns permission sets to the current user + ships template agents) and a self-guided React workshop web app, for a 2-hour workshop where non-experts build their own agents in their own sandboxes.

Per-angle recommendations:
${ok.map((r) => `### ${r.angle}\n${r.recommendation || '(none)'}`).join('\n\n')}

CONFIRMED findings (survived 3-vote skeptic panel):
${confirmed.map((f) => `- [${f.angle}|${f.confidence}|✓${f.confirms}/✗${f.refutes}] ${f.claim} — ${f.detail} (src: ${(f.sourceUrls || []).slice(0, 2).join(', ')})`).join('\n')}

KILLED findings (do NOT rely on these — note them as cautions):
${killed.map((f) => `- [${f.angle}] ${f.claim} — refuted ${f.refutes}/3`).join('\n')}

Write a decisive synthesis with these sections:
1. **Runtime agent deploy** — the exact supported path to create an AiAuthoringBundle agent in-org from an LWC/Apex (and confirm what is NOT packageable).
2. **Permission-set assignment** — how the component assigns the right perms (incl. employee-agent license) to the current user, safely + idempotently.
3. **Packaging & the Lightning app** — managed vs unlocked, what ships, how the install lands as a Home app.
4. **Org provisioning + backup** — the primary org path and a tested fallback for the workshop.
5. **Agent templates** — what to ship and how a non-expert clones + customizes one in the time budget.
6. **Top risks & open questions** still to validate.
Be concrete and cite the most important official source URLs inline.`,
  { label: 'synthesize', phase: 'Synthesize' }
)

return {
  generatedNote: 'timestamp stamped by caller',
  angles: ok,
  confirmed,
  killed,
  synthesis,
  stats: {
    anglesReturned: ok.length,
    rawFindings: allFindings.length,
    claimsVerified: toVerify.length,
    confirmed: confirmed.length,
    killed: killed.length,
  },
}

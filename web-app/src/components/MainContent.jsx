import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import CodeBlock from './CodeBlock'
import ImageViewer from './ImageViewer'
import RightSidebar from './RightSidebar'
import HeaderAnchor from './HeaderAnchor'
import AgentChat from './AgentChat'
import DocCallout from './DocCallout'
import Collapsible from './Collapsible'

// ---------------------------------------------------------------------------
// Workshop-wide placeholders — fill these in before the event.
// ---------------------------------------------------------------------------
// The package version id (04t...) for the supporting-assets package (perm sets, actions,
// the Lightning app + LWC launchpad, the Employee Agent V1 starter). Install links below
// are built for BOTH production (login.salesforce.com) and sandbox (test.salesforce.com).
const PACKAGE_VERSION_ID = '04tWt000000GHOHIA4'
const PACKAGE_INSTALL_URL = `https://login.salesforce.com/packaging/installPackage.apexp?p0=${PACKAGE_VERSION_ID}`
const PACKAGE_INSTALL_URL_SANDBOX = `https://test.salesforce.com/packaging/installPackage.apexp?p0=${PACKAGE_VERSION_ID}`
// The free, pre-configured backup org (Agentforce Labs) — used if a primary org won't cooperate.
const BACKUP_ORG_URL = 'https://labs.agentforce.com/'

const sections = ['overview', 'get-org', 'install-package', 'part-a', 'part-b', 'try-agent']

const sectionTitles = {
  'overview': 'Workshop Overview',
  'get-org': 'Setup your Org',
  'install-package': 'Install the Package',
  'part-a': 'Part A — Build the MVP',
  'part-b': 'Part B — Make It Yours',
  'try-agent': 'Try the Research Agent'
}

function MainContent({ activeSection, setActiveSection }) {
  const currentIndex = sections.indexOf(activeSection)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < sections.length - 1

  const goToPrevious = () => {
    if (hasPrevious) setActiveSection(sections[currentIndex - 1])
  }

  const goToNext = () => {
    if (hasNext) setActiveSection(sections[currentIndex + 1])
  }

  let steps = []
  if (activeSection === 'get-org') {
    steps = [
      { id: 'org-primary', label: 'Option 1: Your Own Sandbox' },
      { id: 'org-backup', label: 'Option 2: Backup Lab Org' },
      { id: 'org-verify', label: 'Verify Agentforce Is On' },
      { id: 'org-enable', label: 'Confirm Access — Einstein, Agentforce & Notes' }
    ]
  } else if (activeSection === 'install-package') {
    steps = [
      { id: 'install-link', label: 'Step 1: Open the Install Link' },
      { id: 'install-confirm', label: 'Step 2: Install for Admins' },
      { id: 'install-launchpad', label: 'Step 3: Open the Workshop App' },
      { id: 'install-setup', label: 'Step 4: Run Post-Install Setup' },
      { id: 'install-agent', label: 'Step 5: Install the Starter Agent' }
    ]
  } else if (activeSection === 'part-a') {
    steps = [
      { id: 'a-basics', label: '1. Open Agent Builder' },
      { id: 'a-instructions', label: '2. Reasoning Instructions' },
      { id: 'a-preview', label: '3. Test in Preview' },
      { id: 'a-rich', label: '4. Make It Richer' },
      { id: 'a-actions', label: '5. Add the Create Note Action' },
      { id: 'a-commit', label: '6. Commit & Activate' },
      { id: 'a-test', label: '7. Test on a Record' }
    ]
  } else if (activeSection === 'part-b') {
    steps = [
      { id: 'b-query', label: '★ Find & Associate a Record' },
      { id: 'b-email', label: 'Draft a Follow-up Email' },
      { id: 'b-summary', label: 'Adapt the Summary Format' },
      { id: 'b-tasks', label: 'Fetch Tasks from Notes' },
      { id: 'b-web', label: 'Enrich with Web Search' },
      { id: 'b-voice', label: 'Image / Voice Input' },
      { id: 'b-custom', label: 'Your Own Actions' }
    ]
  }

  // The agent demo needs a full-bleed two-pane layout, so render it on its own.
  if (activeSection === 'try-agent') {
    return (
      <main className="main-content main-content--full">
        <TryAgent />
      </main>
    )
  }

  return (
    <>
      <main className="main-content">
        {activeSection === 'overview' && <Overview setActiveSection={setActiveSection} />}
        {activeSection === 'get-org' && <GetOrg />}
        {activeSection === 'install-package' && <InstallPackage />}
        {activeSection === 'part-a' && <PartA />}
        {activeSection === 'part-b' && <PartB />}

        <div className="nav-arrows">
          {hasPrevious && (
            <button className="nav-button prev" onClick={goToPrevious}>
              <span className="nav-button-label">
                <ChevronLeft size={14} />
                Previous page
              </span>
              <span className="nav-button-title">{sectionTitles[sections[currentIndex - 1]]}</span>
            </button>
          )}
          {hasNext && (
            <button className="nav-button next" onClick={goToNext}>
              <span className="nav-button-label">
                Next page
                <ChevronRight size={14} />
              </span>
              <span className="nav-button-title">{sectionTitles[sections[currentIndex + 1]]}</span>
            </button>
          )}
        </div>
      </main>
      <RightSidebar steps={steps} />
    </>
  )
}

function TryAgent() {
  return (
    <div className="try-agent">
      <AgentChat />
    </div>
  )
}

function Overview({ setActiveSection }) {
  return (
    <div className="content-section">
      <div className="astro-hero">
        <img src="/images/agent_astro.png" alt="Agentforce Astro" />
      </div>

      <h1>Build Your Own Agentforce Agent</h1>

      <div className="scenario-box">
        <p><strong>Goal:</strong> In this hands-on session you'll build <strong>Employee Agent V1</strong> —
        a meeting-note agent that turns raw notes or a transcript into action: it <strong>logs the notes</strong> to
        a record, <strong>summarizes</strong> them, and (in the free exercise) <strong>creates follow-up
        tasks</strong> and <strong>drafts a follow-up email</strong>. You'll build it yourself, in Agent Studio,
        with no code.</p>
      </div>

      <h2>The Use Case — Employee Agent V1</h2>
      <p>
        The Employee Agent accepts notes or meeting transcripts (via text, upload, or voice) in a conversational
        way and translates them into tangible follow-up actions for you. Once the notes are received, the agent
        automatically populates the information into the related Notes object (on an Account, Contact, or any
        other object), generates a concise summary, creates relevant follow-up tasks, and drafts a tailored
        follow-up email.
      </p>
      <img src="/diagrams/notetaker-flow.svg" alt="What the meeting-note agent does: notes in, summarize, log, tasks, email" style={{ width: '100%', margin: '8px 0' }} />

      <h2>The Three Parts of an Agent</h2>
      <p>
        Before you build, it helps to know the three pieces you'll work with. Everything in Agent Studio is one
        of these — and the whole workshop is really just learning how they fit together.
      </p>
      <img src="/diagrams/agent-anatomy.svg" alt="The three parts of an agent: Agent, Instructions, Actions" style={{ width: '100%', margin: '8px 0' }} />
      <p>
        <strong>Why this use case?</strong> It's universally relevant and the simplest way to grasp the
        product's mechanics — <strong>agent · instructions · actions</strong> — before you move on to connecting
        more complex use cases of your own.
      </p>

      <h2>What's Already Set Up for You</h2>
      <p>We've done some prework to kickstart the day. For full transparency, the installable package and the
        org's prework give you:</p>
      <div className="activity-box">
        <ul>
          <li>Access to the standard set of <strong>Agentforce capabilities</strong> (through Foundations)</li>
          <li><strong>Permission sets assigned to you</strong> (Prompt Template User, Agentforce User, and the
            agent-access perms) — so the agent works the moment you commit it</li>
          <li>The <strong>action assets</strong> — the Flow, Apex, and prompt templates behind the actions —
            added to the agent's asset library</li>
          <li>A starter <strong>Employee Agent V1</strong> framework, ready for you to shape</li>
          <li>A <strong>Lightning app</strong> with a workshop launchpad (links back to this guide and runs the
            post-install setup)</li>
        </ul>
      </div>

      <h2>How the Two Hours Run</h2>
      <img src="/diagrams/workshop-flow.svg" alt="Your path: install, set up, build, test, extend" style={{ width: '100%', margin: '8px 0' }} />
      <div className="activity-box">
        <ul>
          <li><strong>Get your sandbox</strong> and <strong>install the package</strong> (≈15 min)</li>
          <li><strong>Part A — Guided:</strong> set up the MVP of the agent — check the basics, write reasoning
            instructions, add the <em>Log Note</em> + <em>Summarize</em> actions, preview, commit, and test on a
            record (≈45 min)</li>
          <li><strong>Part B — Free exercise:</strong> make it yours — draft emails, adapt the summary, fetch
            tasks, add web search, add voice/image input, or build your own action (≈45 min)</li>
        </ul>
      </div>

      <p>
        <button className="cta-button" onClick={() => setActiveSection('get-org')}>
          Let's get started →
        </button>
      </p>
    </div>
  )
}

function GetOrg() {
  return (
    <div className="content-section">
      <h1>Setup your Org</h1>
      <p>
        You'll build your agent in a Salesforce <strong>sandbox</strong> with Agentforce enabled — never in production. Use your own sandbox if you have one;
        otherwise we provide a free, pre-configured backup org so no one is blocked.
      </p>

      <HeaderAnchor id="org-primary">Option 1 — Your Own Sandbox (preferred)</HeaderAnchor>
      <p>
        If you brought a Salesforce org (a Developer Edition, a sandbox, or a Foundations-enabled org with
        Agentforce turned on), you can use it directly. You'll need <strong>System Administrator</strong> access
        so you can install a package and assign permission sets.
      </p>
      <div className="scenario-box">
        <p><strong>Heads up:</strong> the org must have <strong>Agentforce / Einstein generative AI</strong>
        turned on. If you're not sure, use the backup org below — it already has everything enabled.</p>
      </div>

      <hr className="step-divider" />

      <HeaderAnchor id="org-backup">Option 2 — The Free Backup Org (Agentforce Labs)</HeaderAnchor>
      <p>
        If your own sandbox won't cooperate — flaky provisioning, Agentforce not enabled, or no admin access — use
        the free, pre-configured lab org. It has every Agentforce feature already switched on.
      </p>
      <ol>
        <li>
          Go to <a href={BACKUP_ORG_URL} target="_blank" rel="noopener noreferrer">Agentforce Labs</a> and log
          in with your Trailhead account.
        </li>
        <li>This gives you a pre-configured org with all Agentforce features enabled.</li>
        <li>
          In the top-right corner, click <strong>Labbox</strong> → <strong>Manage Orgs</strong> to find your
          active org and open it.
        </li>
      </ol>
      <ImageViewer src="/images/labs.png" alt="Agentforce Labs homepage" />
      <ImageViewer src="/images/labbox_menu.png" alt="Labbox dropdown showing Manage Orgs" />
      <div className="scenario-box">
        <p><strong>This is your safety net.</strong> If anything goes wrong with your primary org during the
        workshop, switch to a lab org and pick up exactly where you left off — the steps are identical.</p>
      </div>

      <hr className="step-divider" />

      <HeaderAnchor id="org-verify">Verify Agentforce Is On</HeaderAnchor>
      <p>
        Open the <strong>App Launcher</strong> (the waffle icon, top-left) and search for
        <strong> Agentforce Studio</strong>. If it opens, you're ready to install the package. If you can't find
        it, switch to the backup org above.
      </p>
      <ImageViewer src="/images/agentforce_studio.png" alt="Agentforce Studio in the App Launcher" />

      <hr className="step-divider" />

      <HeaderAnchor id="org-enable">Confirm Access — Einstein, Agentforce &amp; Notes</HeaderAnchor>
      <p>
        If <strong>Agentforce Studio</strong> opens and agents are available, you're set — skip ahead and install
        the package. If agents aren't available, flip on these three settings in <strong>Setup</strong> first.
      </p>
      <h3>Enable Einstein</h3>
      <p>In <strong>Setup</strong>, search <em>Einstein Setup</em> and turn <strong>Einstein</strong> on.</p>
      <ImageViewer src="/guide-shots/enable-einstein.png" alt="Setup → Einstein Setup → Turn on Einstein" />
      <h3>Enable Agentforce</h3>
      <p>
        Refresh the browser, then in <strong>Setup</strong> search <em>Agentforce Agents</em> and toggle
        <strong> Agentforce</strong> on.
      </p>
      <ImageViewer src="/guide-shots/enable-agentforce.png" alt="Setup → Agentforce Agents → toggle Agentforce on" />
      <h3>Enable Notes</h3>
      <p>
        Our agent saves rich Notes, so make sure Notes is on: in <strong>Setup</strong> search
        <em> Notes Settings</em> and tick <strong>Enable Notes</strong>, then <strong>Save</strong>.
      </p>
      <ImageViewer src="/guide-shots/enable-notes.png" alt="Setup → Notes Settings → Enable Notes" />
      <DocCallout variant="note">
        <p>
          Most real sandboxes already have these enabled. Scratch orgs and some trial orgs don't — that's what
          these three toggles are for.
        </p>
      </DocCallout>
    </div>
  )
}

function InstallPackage() {
  return (
    <div className="content-section">
      <h1>Install the Workshop Package</h1>
      <p>
        Everything the agent needs <em>around</em> it — the permission sets, the action assets (the Flow, Apex,
        and prompt templates), a Lightning app, and the Employee Agent V1 starter — ships as a single
        installable package. No CLI, no Setup spelunking: just one install link.
      </p>

      <div className="scenario-box">
        <p><strong>Why a package?</strong> It lands cleanly in your sandbox and avoids the browser security warnings
        and login juggling that other deployment methods cause. You install once and you're ready to build.</p>
      </div>

      <HeaderAnchor id="install-link">Step 1 — Open the Install Link</HeaderAnchor>
      <p>
        Make sure you're logged into <strong>your own sandbox</strong> first, then click the install link
        that matches your org type:
      </p>
      <div className="install-button-row">
        <a className="install-button" href={PACKAGE_INSTALL_URL_SANDBOX} target="_blank" rel="noopener noreferrer">
          <Download size={18} /> Install in a Sandbox
        </a>
        <a className="install-button install-button--ghost" href={PACKAGE_INSTALL_URL} target="_blank" rel="noopener noreferrer">
          <Download size={18} /> Install in Production / Dev Edition
        </a>
      </div>
      <DocCallout variant="tip" header="Which one?">
        <p>
          Use <strong>Install in a Sandbox</strong> (<code>test.salesforce.com</code>) for a real sandbox. Use
          <strong> Production / Dev Edition</strong> (<code>login.salesforce.com</code>) for a Developer Edition,
          a production org, or the <strong>Agentforce Labs backup org</strong> (it's a Dev/trial org, not a sandbox).
        </p>
      </DocCallout>
      <p style={{ color: 'var(--muted-foreground)' }}>Prefer to paste the link manually?</p>
      <CodeBlock code={`Sandbox:\n${PACKAGE_INSTALL_URL_SANDBOX}\n\nProduction / Dev Edition:\n${PACKAGE_INSTALL_URL}`} language="text" />

      <hr className="step-divider" />

      <HeaderAnchor id="install-confirm">Step 2 — Install for Admins</HeaderAnchor>
      <p>On the install screen:</p>
      <ol>
        <li>Choose <strong>Install for Admins Only</strong>.</li>
        <li>If prompted, approve access to any third-party sites the actions need.</li>
        <li>Click <strong>Install</strong> and wait for the confirmation (this usually takes under a minute).</li>
      </ol>

      <hr className="step-divider" />

      <HeaderAnchor id="install-launchpad">Step 3 — Open the Workshop App</HeaderAnchor>
      <p>
        Open the <strong>App Launcher</strong> (the grid icon, top-left) and find the
        <strong> Employee Agent Workshop</strong> app (installed by the package). Its Home page is your
        launchpad for the day — it links back to this guide, runs the post-install setup, and installs
        the agents for you.
      </p>
      <ImageViewer src="/guide-shots/launchpad.png" alt="The Employee Agent Workshop launchpad: Run Setup, permission status, and the agent install buttons" />

      <hr className="step-divider" />

      <HeaderAnchor id="install-setup">Step 4 — Run Post-Install Setup</HeaderAnchor>
      <p>
        On the app's Home page, click <strong>Run Setup</strong>. This one-click step finishes preparing your sandbox:
      </p>
      <ul>
        <li>Assigns the required <strong>permission sets</strong> to you (Agentforce User, Prompt Template User,
          and the agent-access perms).</li>
        <li>Confirms the action assets are available in the agent's asset library.</li>
      </ul>
      <DocCallout variant="note" header="When it turns green">
        <p>
          You're authorized and ready for the next step. If it reports an issue, re-run it once — it's safe
          to click again — or ask a facilitator.
        </p>
      </DocCallout>

      <hr className="step-divider" />

      <HeaderAnchor id="install-agent">Step 5 — Install the Starter Agent</HeaderAnchor>
      <p>
        This is the key step. Once setup is green, scroll to <strong>Install the starter agent
        (Employee Agent V1)</strong> on the same Home page and click it. This deploys, publishes, and
        activates your starter agent, then grants you access — all in one click, no CLI.
      </p>
      <DocCallout variant="tip" header="What you'll see">
        <p>
          You'll get a confirmation that <strong>Employee Agent V1</strong> was published, activated, and you
          now have access. From there, open it in Agent Studio to start Part A.
        </p>
      </DocCallout>
      <p>
        You can also (optionally) install the <strong>Use-Case Research Agent</strong> — a second, ready-made
        agent — from the same page. Building Employee Agent V1 yourself in Agent Studio is the main exercise, though!
      </p>
    </div>
  )
}

const STARTER_SCRIPT = `system:
    instructions: |
        You are an AI Agent that helps employees turn meeting notes into action.

        The user's current context is:
        Current App Name: {!@variables.currentAppName}
        Current Object Name: {!@variables.currentObjectApiName}
        Current Page Type: {!@variables.currentPageType}
        Current Record ID: {!@variables.currentRecordId}
    messages:
        welcome: |
            Hi, I'm your Employee Agent. Share your meeting notes and I'll summarize them and log them for you. Type "Start" to begin.
        error: "Something went wrong. Try again."

config:
    agent_label: "Employee Agent V1"
    agent_template: "EmployeeCopilot__AgentforceEmployeeAgent"
    developer_name: "Note_taking_agent"
    agent_type: "AgentforceEmployeeAgent"
    description: "A meeting-note agent: ingest notes, summarize them, and log them to a Notes record."

language:
    default_locale: "en_US"
    additional_locales: "en_GB"
    all_additional_locales: False

variables:
    currentAppName: mutable string
        description: "Salesforce Application Name"
        visibility: "External"
    currentObjectApiName: mutable string
        description: "The API name of the current Salesforce object"
        visibility: "External"
    currentPageType: mutable string
        description: "Page type (record, list, home)"
        visibility: "External"
    currentRecordId: mutable string
        description: "The Salesforce ID of the current record"
        visibility: "External"

start_agent notes_agent:
    label: "Notes Agent"
    description: "Summarize the user's meeting notes and log them to a Notes record."
    reasoning:
        instructions: ->
            | You are a meeting-note summarizer agent. Your job is to take unstructured meeting notes and store them as a Notes record.
              When the user gives you notes:
              1. Summarize the notes into a short, clear summary.
              2. Log the notes by calling the Log Note action.
                 - If a record is already open (currentRecordId is set), pass it as the
                   recordId so the note is associated with that record automatically.
                 - If no record is open (currentRecordId is empty), leave recordId blank
                   and create a standalone note. Do NOT ask the user which record to use.
              3. Respond in the chat with ALL of the following:
                 - The full formatted summary you generated
                 - A short confirmation of what you saved.
                 - The created Note record link if the action returned one, and its recordId.`

function PartA() {
  const sampleTranscript = `### TRANSCRIPT: Discovery Call - Customer Support AI Implementation

Participants: Sarah (Salesforce Consultant), Mark (Director of Customer Service), Elena (Head of Sales Operations)

Sarah: Thanks for jumping on, Mark and Elena. Let's focus on how Service Cloud and AI can reduce your team's manual workload. Mark, what are the biggest bottlenecks right now?

Mark: The absolute biggest pain point is order-status chasing — the classic "where is my order / tracking number?" It's clogging up our queues, and it's worse for high-value or time-sensitive orders. For funeral arrangements, someone literally babysits the status all day, manually refreshing the courier page, because missing the delivery window is a disaster.

Sarah: That's a prime use case for proactive automated alerts. How are complaints coming in?

Mark: Mostly email, and it's a mess. "It arrived broken" with no photo, no order number — so three or four back-and-forth emails just to open a case. Mid-thread the customer drifts to a refund on a different order. We need something that classifies the intent, extracts the data, and translates — French and German volumes are spiking and the team relies on Google Translate.

Elena: On the sales side: inbound pricing requests all go into one bucket. I want AI to auto-handle quotes under €1,000 and send standard pricing back. Anything over €1,000, or custom routing, should go to a human rep via Omni-Channel immediately.

Sarah: Got it — auto-triage and generate quotes under €1K, route anything larger. Let me write up my notes.`

  const richInstructions = `You are a meeting-note summarizer agent. Your job is to take unstructured meeting notes and store them as a Notes record.

1. When the user gives you notes, produce a summary with these parts, in this order:
   - Executive Summary — 2-3 sentences at the top capturing the purpose and outcome of the meeting.
   - Detailed Sections — break the notes into clear topic sections (e.g. Decisions, Discussion, Risks), each with a heading and the key points underneath.
   - Action Items — a clear list of follow-ups, each showing the owner and the task.

   Then format the whole summary as rich, beautifully styled HTML in the Salesforce Lightning style:
   - Use INLINE CSS only (no <style> blocks or CSS classes — they get stripped from Notes).
   - Use the Lightning palette: deep blue #032D60 for headings, accent #0176D3, body text #181818, light fill #F3F3F3.
   - Make it visual, not a plain list: a header band at the top, the Executive Summary in a callout card with a left accent border, detailed sections under styled headings, and Action Items as rounded colored badges/pills.

2. Log the notes by calling the Log Note action.
   - If a record is already open (currentRecordId is set), pass it as the recordId so the note is associated with that record automatically.
   - If no record is open (currentRecordId is empty), leave recordId blank and create a standalone note. Do NOT ask the user which record to use.

3. Respond in the chat with ALL of the following:
   - The full formatted summary you generated
   - A short confirmation of what you saved.
   - The created Note record link if the action returned one, and its recordId.`

  return (
    <div className="content-section">
      <h1>Part A — Set Up the MVP (Guided)</h1>
      <p>
        Now you'll build the core of the agent together with the facilitator: open the starter agent, understand
        its instructions, preview it, make its response richer, add the Create Note action, and put it live.
        By the end of Part A you'll have a working agent that summarizes notes into a polished report and logs
        them as a Note.
      </p>

      <HeaderAnchor id="a-basics">1. Open Your Agent in Agent Builder</HeaderAnchor>
      <p>
        Back in <strong>Agentforce Studio</strong>, open the <strong>Agents</strong> list and click
        <strong> Employee Agent V1</strong> (your starter agent).
      </p>
      <ImageViewer src="/guide-shots/studio-agents-list.png" alt="The Agents list in Agentforce Studio showing Employee Agent V1" />
      <DocCallout variant="warning" header="Don't see Employee Agent V1?">
        <p>
          If it isn't in the list, the install on the Workshop app may not have finished. You can add it manually:
          in the Agents list click the arrow next to <strong>New Agent</strong> → <strong>New from Script</strong>,
          then paste the starter script below.
        </p>
      </DocCallout>
      <div className="image-grid-2">
        <ImageViewer src="/guide-shots/new-from-script.png" alt="New Agent → New from Script" />
        <ImageViewer src="/guide-shots/new-from-script-2.png" alt="Paste the agent script" />
      </div>
      <Collapsible title="Starter agent script (only needed for the manual fallback)">
        <CodeBlock code={STARTER_SCRIPT} language="yaml" />
      </Collapsible>
      <p>
        Opening the agent takes you into the <strong>Agent Builder</strong>. On the left is the
        <strong> Explorer</strong> (Agent Definition, Settings, Subagents, Variables); the middle is the canvas
        where you edit; the top-right has <strong>New Version</strong> and <strong>Activate</strong>.
      </p>
      <ImageViewer src="/guide-shots/agent-builder-overview.png" alt="The Agent Builder layout — Explorer, canvas, and the Notes Agent subagent" />

      <hr className="step-divider" />

      <HeaderAnchor id="a-instructions">2. Understand the Reasoning Instructions</HeaderAnchor>
      <p>
        In the <strong>Explorer</strong>, expand <strong>Subagents</strong> and click the
        <strong> Notes Agent</strong> subagent. Your template already ships with simple reasoning instructions —
        <strong> you don't need to copy/paste anything yet</strong>. Let's read what they say.
      </p>
      <DocCallout variant="note" header="What these instructions do">
        <ul>
          <li>They tell the agent to <strong>summarize</strong> the notes you paste.</li>
          <li>They tell it to <strong>call an action</strong> to log the note — we haven't added that action
            yet, but we will shortly.</li>
          <li>They tell it to associate the note with the <strong>open record</strong> (via
            <code> currentRecordId</code>) — so when you open the agent from inside an Account or Case, it
            knows which record the notes belong to.</li>
        </ul>
      </DocCallout>
      <DocCallout variant="tip">
        <p>
          Reasoning Instructions are natural-language guidelines — you're not writing code, you're writing clear
          directions for a very capable assistant: what to do, when, and how to respond. A solid pattern is
          <strong> Goal → high-level steps → numbered steps</strong> when order matters.
        </p>
      </DocCallout>

      <hr className="step-divider" />

      <HeaderAnchor id="a-preview">3. Test It in Preview</HeaderAnchor>
      <p>
        On the top-left of the canvas, click <strong>Preview</strong> to open <strong>Live Test Mode</strong>.
      </p>
      <ImageViewer src="/guide-shots/preview-button.png" alt="Click the Preview button to open Live Test Mode" />
      <DocCallout variant="warning" header="Test in the CENTER panel, not the right one">
        <p>
          The <strong>center</strong> panel — <strong>Live Test Mode</strong> ("Let's chat!") — is where you talk
          to <em>your agent</em>. The panel on the <strong>right</strong> (labelled "Agentforce") is a coding
          assistant that helps you build — it is <strong>not</strong> your agent. You can close it for now.
        </p>
      </DocCallout>
      <p>
        Paste this sample transcript into the center Live Test Mode chat and send it:
      </p>
      <CodeBlock code={sampleTranscript} language="text" />
      <ImageViewer src="/guide-shots/preview-paste-transcript.png" alt="Paste the transcript into the center Live Test Mode panel" />
      <p>
        Watch the output and the <strong>Interaction Summary</strong> on the right — Agentforce shows you the
        reasoning it went through. Right now the summary is fairly <strong>basic, short and simple</strong>.
        Let's make it better.
      </p>
      <ImageViewer src="/guide-shots/preview-basic-response.png" alt="The agent's first, basic response in preview" />

      <hr className="step-divider" />

      <HeaderAnchor id="a-rich">4. Make the Response Richer</HeaderAnchor>
      <p>
        We'll adjust the instructions so the agent produces a more detailed, beautifully formatted HTML summary.
        To edit a committed agent we first need a <strong>draft</strong>: on the top-right click
        <strong> New Version</strong>. (Your first version is kept as a backup you can roll back to.)
      </p>
      <ImageViewer src="/guide-shots/new-version.png" alt="Click New Version to create an editable draft" />
      <p>
        Now select the first instruction in the <strong>Notes Agent</strong> reasoning and replace it with the
        instruction below — it asks for an Executive Summary, detailed sections, and Action Items, all formatted
        as rich Salesforce-Lightning-styled HTML:
      </p>
      <CodeBlock code={richInstructions} language="text" />
      <ImageViewer src="/guide-shots/reasoning-instructions-rich.png" alt="The richer reasoning instructions in the Notes Agent" />
      <p>Preview it again with the same transcript — you should now get a polished, structured response:</p>
      <ImageViewer src="/guide-shots/preview-rich-response.png" alt="The agent's richer, formatted response in preview" />

      <hr className="step-divider" />

      <HeaderAnchor id="a-actions">5. Give It Actionable Power — Add the Create Note Action</HeaderAnchor>
      <DocCallout variant="note" header="What actions are">
        <p>
          Actions are what the agent can actually <em>do</em>, not just think or say. The reasoning instructions
          say <em>what</em> to do and <em>when</em>; the action makes the agent <em>able</em> to execute it.
          Actions can be Flows, Apex, Prompt Templates, or standard out-of-the-box actions.
        </p>
      </DocCallout>
      <p>
        We'll add just one action: <strong>Create Note</strong>. On the left, hover over the
        <strong> + </strong> next to the <strong>Notes Agent</strong> subagent →
        <strong> Add from Asset Library</strong>.
      </p>
      <ImageViewer src="/guide-shots/add-from-asset-library.png" alt="Add from Asset Library on the Notes Agent subagent" />
      <p>Search for <strong>Create Note</strong> and select it.</p>
      <ImageViewer src="/guide-shots/asset-library-create-note.png" alt="Find and select the Create Note action" />
      <p>
        The action details open. Here you can fine-tune how the agent uses it — these descriptions are what the
        agent reads to understand <em>how and when</em> to call the action and what to pass:
      </p>
      <ul>
        <li><strong>Description</strong> — how and when the agent should use this action.</li>
        <li><strong>Input &amp; Output descriptions</strong> — what the action needs and what it returns.</li>
      </ul>
      <ImageViewer src="/guide-shots/action-details.png" alt="The Create Note action details: description, inputs, outputs" />
      <p>
        We already told the <strong>Notes Agent</strong> to create a note record in its reasoning instructions,
        so the wiring is done — you can see the action listed under <strong>Actions Available For Reasoning</strong>.
      </p>
      <ImageViewer src="/guide-shots/action-wired-instructions.png" alt="The Create Note action wired into the Notes Agent" />
      <DocCallout variant="tip">
        <p>
          Test it again in Preview. If it returns a Note record but doesn't show the summary inline, that's the
          instruction's job — we already ask it to "respond with the full formatted summary," so adjust the
          wording if you want more or less in the chat.
        </p>
      </DocCallout>

      <hr className="step-divider" />

      <HeaderAnchor id="a-commit">6. Put It Live — Commit &amp; Activate</HeaderAnchor>
      <p>
        Happy with it? <strong>Save</strong>, then <strong>Commit</strong> the version, then click
        <strong> Activate</strong> so the version goes live. Keep the instructions as they are.
      </p>
      <ImageViewer src="/guide-shots/activate.png" alt="Activate the committed version" />
      <DocCallout variant="note" header="Commit vs. Activate">
        <p>
          Committing saves a snapshot of the version; activating makes that version the live one. You can only
          have one active version at a time. Live Test Mode and the agent on record pages both need an
          <em> active</em> version.
        </p>
      </DocCallout>

      <hr className="step-divider" />

      <HeaderAnchor id="a-test">7. Use It — Test on a Record</HeaderAnchor>
      <p>
        Open the agent from your app (the agent icon appears because access was granted during install) and try
        it for real. Verify that the agent summarizes the notes, logs them as a Note, and gives you back a
        clickable link to the created note.
      </p>
      <DocCallout variant="note">
        <p>
          <strong>From a Home page:</strong> it creates a standalone note.<br />
          <strong>From a record</strong> (an Account, Contact, etc.): it picks up the record automatically via
          <code> currentRecordId</code> and associates the note with it.
        </p>
      </DocCallout>
      <p>🎉 That's the MVP. You built a working agent. In Part B you'll make it yours.</p>
    </div>
  )
}

function PartB() {
  const queryRecordsInstructions = `When the user gives you notes but no record is open (no
@variables.currentRecordId), find the right record to attach the note to:

1. Ask the user which company or record the notes relate to (e.g. an account name).
2. Use the @actions.QueryRecords action to search Accounts whose Name matches what
   the user said.
3. If you find one clear match, use its record Id as the varAccountID input of the
   Log Note action.
4. If you find several possible matches, list them and ask the user to pick one before
   logging.
5. If you find none, tell the user and ask them to re-check the name.

Once you have the record Id, log the note and confirm back which record it was saved on.`

  return (
    <div className="content-section">
      <h1>Part B — Improve and Fine-Tune (Free Exercise)</h1>
      <p>
        You have a working agent. Now experiment. Pick any of the following — there's no required order, and you
        won't break anything. Re-preview and re-commit whenever you want to try a change live.
      </p>

      <HeaderAnchor id="b-query">Worked Example — Find &amp; Associate a Record (Query Records)</HeaderAnchor>
      <p>
        Right now, if no record is open the agent just <em>asks</em> which record to use. Let's make it smarter:
        give it the ability to <strong>search for the right Account by name</strong> and associate the note
        automatically. This is the single most useful upgrade, and it shows the full loop:
        <strong> add an action → tell the agent when to use it</strong>.
      </p>

      <h3>Step 1 — Add the Query Records action</h3>
      <p>
        Next to the agent, click the <strong>⋯ (three dots)</strong> → <strong>Add from Asset Library</strong>,
        and add <strong>Query Records</strong> (a standard, out-of-the-box action — no code). It lets the agent
        run a safe search against your Salesforce data.
      </p>
      <ImageViewer src="/images/new_agent_template.png" alt="Add the Query Records action from the asset library" />

      <h3>Step 2 — Tell the agent when and how to use it</h3>
      <p>
        Adding an action isn't enough — the agent only uses it if your <strong>reasoning instructions</strong>
        say when to. Update the instructions to add this search-and-associate behavior:
      </p>
      <CodeBlock code={queryRecordsInstructions} language="text" />

      <h3>Step 3 — Test it in Preview</h3>
      <p>
        Open <strong>Preview</strong> from a Home page (so no record is pre-selected) and try:
      </p>
      <div className="scenario-box">
        <p><em>"Log these notes from my call with Acme — they want a renewal quote by Friday and raised a
        billing question."</em></p>
      </div>
      <p>
        Watch the reasoning panel on the right: the agent should call <strong>QueryRecords</strong> to find the
        <strong> Acme</strong> account, then call <strong>Log Note</strong> with that account's Id — and confirm
        which record it saved against. If there are several "Acme" accounts, it should ask you to choose.
      </p>
      <div className="scenario-box">
        <p><strong>🧑‍🏫 Why this works:</strong> the action gives the agent the <em>capability</em> to search;
        the instructions give it the <em>judgment</em> of when to search, how to handle one vs. many vs. no
        matches, and what to do with the result. That pairing — capability + judgment — is the heart of building
        any agent.</p>
      </div>

      <hr className="step-divider" />

      <HeaderAnchor id="b-email">Add a "Draft Follow-up Email" Action</HeaderAnchor>
      <p>
        Go from input to action as fast as possible: have the agent draft a tailored follow-up email based on the
        transcript. Add the action, then play with the email format and input parameters to match your business's
        tone of voice.
      </p>

      <hr className="step-divider" />

      <HeaderAnchor id="b-summary">Adapt the Summary Format</HeaderAnchor>
      <p>
        A valuable agent adapts to how <em>your</em> business works. Adjust the reasoning instructions to enforce
        a summary format that fits your processes (e.g. headings for Decisions, Risks, and Next Steps).
      </p>

      <hr className="step-divider" />

      <HeaderAnchor id="b-tasks">Fetch Tasks from the Notes</HeaderAnchor>
      <p>
        Automatically pull the action items out of the notes so they show up in your to-do list at the right
        moment — no manual work. Add the action that creates follow-up tasks from the captured notes.
      </p>

      <hr className="step-divider" />

      <HeaderAnchor id="b-web">Enrich the Transcript with Web Info</HeaderAnchor>
      <p>
        Add a <strong>web search</strong> retriever so the agent can enrich the notes with relevant public
        information before saving them.
      </p>

      <hr className="step-divider" />

      <HeaderAnchor id="b-voice">Enrich the Input — Image or Voice</HeaderAnchor>
      <p>
        Notes don't always start as text. Explore accepting an uploaded image or a voice recording as input —
        typically via a small Lightning Web Component wired into the agent.
      </p>

      <hr className="step-divider" />

      <HeaderAnchor id="b-custom">Add Your Own Actions</HeaderAnchor>
      <p>Add whatever would make this agent useful in <em>your</em> world. A few ideas:</p>
      <ul>
        <li><strong>Update CRM</strong> — write structured fields back to the related record</li>
        <li><strong>Query Records</strong> — let the agent find the right account, case, or opportunity to log against</li>
        <li><strong>Answer FAQs with Knowledge</strong> — ground responses in your knowledge articles</li>
        <li><strong>A custom action</strong> — a Flow, a Prompt Template, or Apex that does something specific to your team</li>
      </ul>

      <div className="scenario-box">
        <p><strong>🧑‍🏫 Remember:</strong> add only the actions the agent needs, keep the reasoning
        instructions clear, and re-test in Preview after each change. Small, deliberate iterations beat one big
        rewrite.</p>
      </div>

      <h2>Resources</h2>
      <ul>
        <li><a href="https://help.salesforce.com/s/articleView?id=ai.agent_studio.htm&type=5" target="_blank" rel="noopener noreferrer">Agent Studio — Salesforce Help</a></li>
        <li><a href="https://developer.salesforce.com/docs/ai/agentforce/guide/agent-script.html" target="_blank" rel="noopener noreferrer">Agent Script Reference</a></li>
        <li><a href="https://help.salesforce.com/s/articleView?id=ai.agent_manage_aea_access.htm&type=5" target="_blank" rel="noopener noreferrer">Manage Employee Agent Access</a></li>
        <li><a href={BACKUP_ORG_URL} target="_blank" rel="noopener noreferrer">Agentforce Labs (backup org)</a></li>
      </ul>
    </div>
  )
}

export default MainContent

import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import CodeBlock from './CodeBlock'
import ImageViewer from './ImageViewer'
import RightSidebar from './RightSidebar'
import HeaderAnchor from './HeaderAnchor'
import AgentChat from './AgentChat'

// ---------------------------------------------------------------------------
// Workshop-wide placeholders — fill these in before the event.
// ---------------------------------------------------------------------------
// The AppExchange / install link for the supporting-assets package (perm sets,
// actions, the Lightning app + LWC launchpad, the Employee Agent V1 starter).
const PACKAGE_INSTALL_URL = 'https://login.salesforce.com/packaging/installPackage.apexp?p0=04tWt000000GFntIAG'
// The free, pre-configured backup org (Agentforce Labs) — used if a primary org won't cooperate.
const BACKUP_ORG_URL = 'https://labs.agentforce.com/'

const sections = ['overview', 'get-org', 'install-package', 'part-a', 'part-b', 'try-agent']

const sectionTitles = {
  'overview': 'Workshop Overview',
  'get-org': 'Get Your Sandbox',
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
      { id: 'org-verify', label: 'Verify Agentforce Is On' }
    ]
  } else if (activeSection === 'install-package') {
    steps = [
      { id: 'install-link', label: 'Step 1: Open the Install Link' },
      { id: 'install-confirm', label: 'Step 2: Install for Admins' },
      { id: 'install-launchpad', label: 'Step 3: Open the Workshop App' },
      { id: 'install-setup', label: 'Step 4: Run Post-Install Setup' }
    ]
  } else if (activeSection === 'part-a') {
    steps = [
      { id: 'a-basics', label: '1. Check the Basics' },
      { id: 'a-instructions', label: '2. Reasoning Instructions' },
      { id: 'a-actions', label: '3. Add the Actions' },
      { id: 'a-preview', label: '4. Preview' },
      { id: 'a-commit', label: '5. Commit the Version' },
      { id: 'a-test', label: '6. Test on a Record' }
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
      <div className="try-agent-intro">
        <h1>Try the Use-Case Research Agent</h1>
        <p>
          This is a live Agentforce agent, hosted on our sandbox — no setup needed. Give it your
          design-thinking workshop output (a meeting transcript and your Lucid-board notes), and it
          researches your use cases on the web and in Salesforce documentation, then builds a polished
          report you can download as a PDF. You can <strong>talk to it</strong> or <strong>drop in an
          image or PDF</strong> of your board, too.
        </p>
      </div>
      <AgentChat />
    </div>
  )
}

function Overview({ setActiveSection }) {
  return (
    <div className="content-section">
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
      <h1>Get Your Sandbox</h1>
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
      <p>Make sure you're logged into <strong>your own sandbox</strong> first, then click to install the package:</p>
      <p>
        <a className="install-button" href={PACKAGE_INSTALL_URL} target="_blank" rel="noopener noreferrer">
          <Download size={18} /> Install the Workshop Package
        </a>
      </p>
      <p style={{ color: 'var(--muted-foreground)' }}>
        The same link installs in the backup lab sandbox too. If you'd rather paste it manually:
      </p>
      <CodeBlock code={PACKAGE_INSTALL_URL} language="text" />

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
        Open the <strong>App Launcher</strong> and find the <strong>Employee Agent Workshop</strong> app
        (installed by the package). Its Home page is your launchpad for the day — it links back to this guide and
        hosts the post-install setup button.
      </p>

      <hr className="step-divider" />

      <HeaderAnchor id="install-setup">Step 4 — Run Post-Install Setup</HeaderAnchor>
      <p>
        On the app's Home page, click <strong>Run Setup</strong>. This one-click step finishes preparing your sandbox:
      </p>
      <ul>
        <li>Assigns the required <strong>permission sets</strong> to you (Agentforce User, Prompt Template User,
          and the agent-access perms).</li>
        <li>Confirms the action assets are available in the agent's asset library.</li>
        <li>Gets the <strong>Employee Agent V1</strong> starter ready to open in Agent Studio.</li>
      </ul>
      <div className="scenario-box">
        <p><strong>When it turns green</strong>, you're authorized and ready to build. If it reports an issue,
        re-run it once — it's safe to click again — or ask a facilitator.</p>
      </div>
    </div>
  )
}

function PartA() {
  const reasoningInstructions = `You are a meeting-note summarizer agent. Your job is to take
unstructured meeting notes and store them as a Notes record.

When the user gives you notes:
1. Summarize the notes into a short, clear summary.
2. Log the notes by calling the Log Note action.
   - If a record is already open (currentRecordId is set), associate the
     note to that record automatically.
   - If no record is open, ask the user which record to associate it with
     (e.g. an account, case, or opportunity).
3. Confirm back to the user what you saved and where.`

  return (
    <div className="content-section">
      <h1>Part A — Set Up the MVP (Guided)</h1>
      <p>
        Now you'll build the core of the agent together with the facilitator: open the starter, tell it what to
        do, give it two actions, preview it, and put it live. By the end of Part A you'll have a working agent
        that summarizes notes and logs them to a record.
      </p>

      <HeaderAnchor id="a-basics">1. Check the Basics</HeaderAnchor>
      <p>
        Open the <strong>App Launcher</strong> (the grid icon, top-left) and go to <strong>Agentforce
        Studio</strong>.
      </p>
      <ImageViewer src="/guide-shots/app-launcher.png" alt="Open Agentforce Studio from the App Launcher" />
      <p>In the <strong>Agents</strong> list, click <strong>Employee Agent V1</strong> (your starter agent).</p>
      <ImageViewer src="/guide-shots/studio-agents.png" alt="The agents list in Agentforce Studio" />
      <p>
        This opens the <strong>Agent Builder</strong>. On the left is the <strong>Explorer</strong> (Agent
        Definition, Settings, Subagents, Variables); the middle is the canvas; the right is the Agentforce
        assistant that helps you build.
      </p>
      <ImageViewer src="/guide-shots/agent-builder.png" alt="The Agent Builder layout" />
      <p>
        Review the <strong>Agent Details</strong>, <strong>System Settings</strong>, and <strong>Language
        Settings</strong>.
      </p>
      <div className="scenario-box">
        <p><strong>ℹ️ What this is:</strong> The details are the agent's "identity card." Leave them as-is for
        now — but when your organization runs multiple agents, the system uses these to route conversations to
        the right one.</p>
      </div>

      <hr className="step-divider" />

      <HeaderAnchor id="a-instructions">2. Define What the Agent Does — Reasoning Instructions</HeaderAnchor>
      <p>
        In the <strong>Explorer</strong> panel on the left, expand <strong>Subagents</strong> and click the
        <strong> Notes Agent</strong> subagent. Its <strong>Reasoning Instructions</strong> box is where you
        tell the agent how to behave.
      </p>
      <div className="scenario-box">
        <p><strong>ℹ️ What these are:</strong> Reasoning Instructions are natural-language guidelines that tell
        your agent how to think and behave in a conversation. You're not writing code — you're writing clear
        directions for a very capable assistant: what to do, when to do it, and how to respond.</p>
      </div>
      <div className="scenario-box">
        <p><strong>🧑‍🏫 Tip:</strong> If your instructions are vague or conflicting, the agent behaves
        unpredictably (wrong action, ungrounded answers, or doing nothing). A solid pattern is
        <strong> Goal → high-level steps → numbered steps</strong> when order matters.</p>
      </div>
      <p>Paste these working instructions for Employee Agent V1 (keep it simple — you'll refine in Part B):</p>
      <CodeBlock code={reasoningInstructions} language="text" />
      <p>Your subagent's Reasoning Instructions box should now look like this:</p>
      <ImageViewer src="/guide-shots/reasoning-instructions.png" alt="Reasoning Instructions on the Notes Agent subagent" />

      <hr className="step-divider" />

      <HeaderAnchor id="a-actions">3. Give It Actionable Power — Add Actions</HeaderAnchor>
      <div className="scenario-box">
        <p><strong>ℹ️ What actions are:</strong> Actions are what the agent can actually <em>do</em>, not just
        think or say. The reasoning instructions say <em>what</em> to do and <em>when</em>; the actions make the
        agent <em>able</em> to execute it. Actions can be Flows, Apex, Prompt Templates, Data Cloud actions, or
        standard out-of-the-box actions.</p>
      </div>
      <div className="scenario-box">
        <p><strong>🧑‍🏫 Tip:</strong> Only add the actions the agent actually needs. Too many choices confuse
        the reasoning engine.</p>
      </div>
      <p>
        Still on the <strong>Notes Agent</strong> subagent, find <strong>Actions Available For Reasoning</strong>
        and click <strong>Select action → Add from Asset Library</strong>. For V1, add these two:
      </p>
      <div className="activity-box">
        <ul>
          <li>
            <strong>Log / Create Note</strong> (a Flow) — so the notes you input are actually stored as a Notes
            record you can refer back to. Nothing gets forgotten.
          </li>
          <li>
            <strong>Summarize the Input</strong> (a Prompt Template) — turns the raw input into a clear, concise
            summary that's easy to digest.
          </li>
        </ul>
      </div>

      <hr className="step-divider" />

      <HeaderAnchor id="a-preview">4. Test It Out — Preview</HeaderAnchor>
      <p>
        Click the <strong>Preview</strong> tab (top-left of the canvas) to open <strong>Live Test Mode</strong>.
      </p>
      <ImageViewer src="/guide-shots/live-test-mode.png" alt="Live Test Mode — the center preview panel" />
      <div className="scenario-box">
        <p><strong>⚠️ Test in the CENTER panel, not the right one.</strong> The <strong>center</strong> panel —
        labelled <strong>Live Test Mode</strong> ("Let's chat!") — is where you talk to <em>your agent</em>. The
        panel on the <strong>right</strong> (labelled "Agentforce") is a <em>coding assistant</em> that helps you
        build — it is <strong>not</strong> your agent. Type your test notes into the center one.</p>
      </div>
      <div className="scenario-box">
        <p><strong>ℹ️ While you chat in the center</strong>, the <strong>Trace</strong> tab below shows the
        agent's reasoning in real time — which subagent it routes to and which actions it calls. Use
        <strong> Set Context</strong> to simulate opening the agent from a record (it sets
        <code>currentRecordId</code>).</p>
      </div>
      <div className="scenario-box">
        <p><strong>No notes handy?</strong> If you don't have meeting notes top of mind, the package includes a
        small helper to generate sample notes so you can test different scenarios without losing time.</p>
      </div>

      <hr className="step-divider" />

      <HeaderAnchor id="a-commit">5. Put It Live — Commit &amp; Activate</HeaderAnchor>
      <p>
        All good? <strong>Save</strong> your changes, then <strong>Commit</strong> the version (top-right). Then
        click <strong>Activate</strong> so the version goes live — Live Test Mode and the agent on record pages
        both need an <em>active</em> version.
      </p>
      <ImageViewer src="/guide-shots/activate.png" alt="Activate the committed version" />
      <div className="scenario-box">
        <p><strong>ℹ️ Commit vs. Activate:</strong> committing saves a snapshot of the version; activating makes
        that version the live one. You can only have one active version at a time.</p>
      </div>
      <p>
        Now navigate to one of your apps and check that the <strong>agent icon</strong> appears. (It appears
        because the permission to use the agent was already assigned to you during post-install setup.)
      </p>

      <hr className="step-divider" />

      <HeaderAnchor id="a-test">6. Use It — Test on a Record</HeaderAnchor>
      <p>Click the agent and try it out. Verify that the agent:</p>
      <ul>
        <li>Asks you for notes</li>
        <li>Validates what the notes relate to (optional)</li>
        <li>Summarizes the notes</li>
        <li>Logs the notes to a record</li>
      </ul>
      <div className="scenario-box">
        <p>
          <strong>From a Home page:</strong> the agent will ask what you want to log the notes against.<br />
          <strong>From a record</strong> (an Account, Contact, etc.): the agent picks up the record
          automatically via <code>currentRecordId</code>.
        </p>
      </div>
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

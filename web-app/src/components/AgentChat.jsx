import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Mic, Square, Paperclip, Loader2, User, Sparkles, Globe, BookOpen, FileText, Check } from 'lucide-react'
import { createSession, streamMessage, splitReport } from '../lib/agentClient'
import ReportArtifact from './ReportArtifact'
import AgentAstro from './AgentAstro'

const SUGGESTIONS = [
  'Load a sample workshop',
  'What can you do?',
]

/**
 * Hosted demo of the Use-Case Research agent. Starts as a clean, centered Agentforce prompt
 * ("What use cases should we research?"). When the agent begins streaming a <report>, the
 * artifact canvas slides in from the right and the chat shifts left — the report renders live
 * as it streams. Supports talking to it (browser speech → text) and dropping images/PDFs
 * (→ extracted text); only text ever reaches Agentforce.
 */
export default function AgentChat() {
  const [messages, setMessages] = useState([]) // {role, text, steps?:[], done?:bool}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(null)
  const [reportPending, setReportPending] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [recording, setRecording] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [error, setError] = useState('')

  const seqRef = useRef(1)
  const scrollRef = useRef(null)
  const mediaRef = useRef(null)
  const fileInputRef = useRef(null)
  const taRef = useRef(null)

  const started = messages.length > 0
  const hasArtifact = !!report || reportPending

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // auto-grow the textarea
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [input])

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId
    const id = await createSession()
    setSessionId(id)
    return id
  }, [sessionId])

  // append a live "step" (tool call / progress) to the in-flight assistant message
  const pushStep = (label) => {
    setMessages((m) => {
      const copy = [...m]
      const last = copy[copy.length - 1]
      if (!last || last.role !== 'assistant') return copy
      const steps = last.steps ? [...last.steps] : []
      if (steps.length) steps[steps.length - 1] = { ...steps[steps.length - 1], done: true }
      if (!steps.length || steps[steps.length - 1].label !== label) steps.push({ label, done: false })
      copy[copy.length - 1] = { ...last, steps }
      return copy
    })
  }

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || busy) return
    setError('')
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: content }, { role: 'assistant', text: '', steps: [{ label: 'Thinking', done: false }] }])
    setBusy(true)

    let id
    try {
      id = await ensureSession()
    } catch (e) {
      setError(e.message)
      setBusy(false)
      setMessages((m) => m.slice(0, -1))
      return
    }

    const seq = seqRef.current++
    streamMessage({
      sessionId: id,
      text: content,
      sequenceId: seq,
      onProgress: (p) => pushStep(p || 'Working'),
      onText: (full) => {
        const { chat, report: rep, reportPending: pending } = splitReport(full)
        setMessages((m) => {
          const copy = [...m]
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = { ...last, text: chat }
          return copy
        })
        setReportPending(pending)
        if (rep) setReport(rep)
      },
      onDone: (full) => {
        const { chat, report: rep } = splitReport(full)
        setMessages((m) => {
          const copy = [...m]
          const last = copy[copy.length - 1]
          const steps = (last.steps || []).map((s) => ({ ...s, done: true }))
          copy[copy.length - 1] = {
            ...last,
            steps,
            done: true,
            text: chat || (rep ? 'Your report is ready on the right →' : 'Done.'),
          }
          return copy
        })
        if (rep) setReport(rep)
        setReportPending(false)
        setBusy(false)
      },
      onError: (msg) => {
        setError(msg)
        setBusy(false)
        setReportPending(false)
        setMessages((m) => {
          const copy = [...m]
          if (copy.length && copy[copy.length - 1].role === 'assistant' && !copy[copy.length - 1].text)
            copy.pop()
          return copy
        })
      },
    })
  }

  const onSuggestion = (s) => {
    if (s === 'Load a sample workshop') {
      loadSample()
      setTimeout(() => taRef.current?.focus(), 50)
    } else {
      send(s)
    }
  }

  // ── Audio: talk → transcribe in the BROWSER (Web Speech API) → input ────────────────────
  const toggleRecording = () => {
    if (recording) {
      mediaRef.current?.stop?.()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Voice input needs the Web Speech API (try Chrome). You can type or paste instead.')
      return
    }
    setError('')
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = true
    const startText = input ? input + ' ' : ''
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t + ' '
        else interim += t
      }
      setInput(startText + finalText + interim)
    }
    rec.onerror = (e) => {
      setRecording(false)
      if (e.error !== 'no-speech' && e.error !== 'aborted')
        setError(`Voice input error: ${e.error}. You can type or paste instead.`)
    }
    rec.onend = () => setRecording(false)
    mediaRef.current = rec
    rec.start()
    setRecording(true)
  }

  // ── Files: image/PDF → extracted text → input ──────────────────────────────────────────
  const onFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setAttaching(true)
    setError('')
    for (const file of files) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/extract/file', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not read the file')
        setInput((v) => v + `\n\n=== ${file.name} ===\n` + (data.text || ''))
      } catch (e) {
        setError(e.message)
      }
    }
    setAttaching(false)
    taRef.current?.focus()
  }

  const onDrop = (e) => {
    e.preventDefault()
    onFiles(e.dataTransfer.files)
  }

  // A richer, FICTIONAL sample (no real customer) — a design-thinking workshop output.
  const loadSample = () => {
    setInput(
      'Here is the output of our design-thinking workshop with Lumina Outdoor (a fictional outdoor-gear retailer).\n\n' +
        '### TRANSCRIPT — Discovery & Use-Case Workshop\n' +
        'Participants: Priya (Salesforce architect), Tom (VP Customer Care), Dana (Head of E-commerce), Raj (Field Service lead).\n\n' +
        'Tom: Our #1 driver of contacts is "where is my order" and "where is my refund" — agents copy-paste tracking numbers all day, and for backordered seasonal gear the volume explodes before peak season.\n' +
        'Dana: On the storefront, product questions are huge — sizing, waterproof ratings, compatibility ("does this tent fit this footprint?"). Shoppers bounce when they can\'t get a quick answer, and our return rate is high because of wrong sizing.\n' +
        'Tom: Complaints come in by email and are always incomplete — no order number, no photo of the damaged item — so it\'s three or four emails just to open a case. We also see a lot of non-English contacts now.\n' +
        'Raj: Field service is manual — scheduling repair visits for tents and stoves, and techs arrive without the right parts because the case notes are thin.\n' +
        'Dana: For B2B, bulk-order quotes under €2,000 are standard and could be auto-generated; anything larger or custom should go to a human rep.\n' +
        'Priya: Great — let me map these to Agentforce capabilities and prioritize them.\n\n' +
        '### LUCID BOARD — Impact / Effort matrix\n' +
        'High impact / low effort: order-status & track-and-trace self-service; proactive shipping-delay notifications.\n' +
        'High impact / medium effort: product-advisor (sizing/compatibility) on the storefront; complaint intake that extracts order # + asks for a photo; auto-quote for B2B orders under €2,000.\n' +
        'Medium impact / medium effort: case classification & multilingual triage; knowledge-article expansion.\n' +
        'Higher effort / later: field-service scheduling with parts prediction.'
    )
  }

  const stepIcon = (label) => {
    const l = (label || '').toLowerCase()
    if (l.includes('web')) return <Globe size={13} />
    if (l.includes('document') || l.includes('salesforce')) return <BookOpen size={13} />
    if (l.includes('report') || l.includes('build')) return <FileText size={13} />
    return <Sparkles size={13} />
  }

  // The composer (mic + attach + textarea + send) — shared by the centered hero and chat states.
  const composer = (placeholder) => (
    <div className="chat-input">
      <button
        className={`icon-btn ${recording ? 'rec' : ''}`}
        onClick={toggleRecording}
        disabled={busy || attaching}
        title={recording ? 'Stop recording' : 'Talk to the agent'}
      >
        {recording ? <Square size={17} /> : <Mic size={17} />}
      </button>
      <button
        className="icon-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy || attaching}
        title="Attach an image or PDF"
      >
        {attaching ? <Loader2 size={17} className="spin" /> : <Paperclip size={17} />}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <textarea
        ref={taRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        placeholder={recording ? 'Listening… tap stop when done' : placeholder}
        rows={1}
      />
      <button className="send-btn" onClick={() => send()} disabled={busy || !input.trim()} title="Send">
        {busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
      </button>
    </div>
  )

  return (
    <div
      className={`chat-shell ${hasArtifact ? 'with-artifact' : 'solo'}`}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="chat-pane">
        {!started ? (
          /* ── Centered, clean Agentforce prompt (the hero state) ───────────────────── */
          <div className="chat-hero">
            <div className="chat-hero-orb"><AgentAstro size={40} /></div>
            <h2 className="chat-hero-title">What use cases should we research?</h2>
            <p className="chat-hero-sub">
              Paste your workshop transcript and Lucid-board notes — or <b>talk to me</b> with the mic, or
              <b> drop in an image or PDF</b> of your board. I'll research them on the web and in Salesforce
              docs, then build a polished report.
            </p>
            <div className="chat-hero-composer">
              {composer('Describe the use cases, or paste your workshop notes…')}
              <div className="chat-hint">Press Enter to send · Shift+Enter for a new line</div>
            </div>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion-chip" onClick={() => onSuggestion(s)}>{s}</button>
              ))}
            </div>
            {error && (
              <div className="chat-error">
                {error}
                <button className="retry-link" onClick={() => setError('')}>Dismiss</button>
              </div>
            )}
          </div>
        ) : (
          /* ── Conversation state ───────────────────────────────────────────────────── */
          <>
            <div className="chat-head">
              <div className="chat-head-icon"><AgentAstro size={20} /></div>
              <div className="chat-head-meta">
                <div className="chat-head-title">Use-Case Research Agent</div>
                <div className="chat-head-sub"><span className="live-dot" /> Live · hosted on our Agentforce sandbox</div>
              </div>
            </div>

            <div className="chat-log" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`msg msg-${m.role}`}>
                  <div className="msg-avatar">{m.role === 'user' ? <User size={15} /> : <AgentAstro size={16} />}</div>
                  <div className="msg-body">
                    {m.role === 'assistant' && m.steps && m.steps.length > 0 && (
                      <div className="agent-steps">
                        {m.steps.map((s, si) => (
                          <div key={si} className={`agent-step ${s.done ? 'done' : 'active'}`}>
                            <span className="step-ico">
                              {s.done ? <Check size={12} /> : <Loader2 size={12} className="spin" />}
                            </span>
                            <span className="step-ico-kind">{stepIcon(s.label)}</span>
                            <span className="step-label">{s.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.text && (
                      <div className="msg-bubble">
                        {m.text}
                        {m.role === 'assistant' && !m.done && busy && <span className="caret" />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="chat-error">
                {error}
                <button className="retry-link" onClick={() => setError('')}>Dismiss</button>
              </div>
            )}

            <div className="chat-input-wrap">
              {composer('Message the research agent…')}
              <div className="chat-hint">Press Enter to send · Shift+Enter for a new line</div>
            </div>
          </>
        )}
      </div>

      {/* The artifact canvas slides in only once a report starts streaming. */}
      {hasArtifact && (
        <div className="artifact-pane">
          <ReportArtifact report={report} streaming={reportPending || busy} />
        </div>
      )}
    </div>
  )
}

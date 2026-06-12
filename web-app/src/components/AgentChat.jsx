import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Mic, Square, Paperclip, Loader2, Bot, User, Sparkles, Globe, BookOpen, FileText, Check } from 'lucide-react'
import { createSession, streamMessage, splitReport } from '../lib/agentClient'
import ReportArtifact from './ReportArtifact'

const SUGGESTIONS = [
  'Load a sample workshop',
  'What can you do?',
]

/**
 * Hosted demo of the Use-Case Research agent: a sleek conversational chat on the left, a live
 * report artifact canvas on the right. Surfaces the agent's tool calls (web / Salesforce-docs
 * research) as live activity so the long research pause feels alive. Supports talking to it
 * (browser speech → text) and dropping images/PDFs (→ extracted text); only text reaches Agentforce.
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
      // mark previous step complete, add the new one as active
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

  const loadSample = () => {
    setInput(
      'Here is our MidOcean Agentforce workshop.\n\n' +
        'TRANSCRIPT: The biggest pain for the customer-service team is order-status chasing — ' +
        'customers constantly ask "where is my order / tracking?", and for high-value or sensitive ' +
        'orders (e.g. funeral orders) someone babysits status all day. Complaints arrive incomplete ' +
        '(missing photos and order numbers). Email threads drift from order-status to other topics and ' +
        'need classification + translation. Pricing: auto-handle quotes under €1,000, route larger to a human.\n\n' +
        'LUCID BOARD: impact/effort matrix. Top-right (high impact / low effort): order status & ' +
        'track-and-trace, proactive delay notifications. High impact / medium effort: complaint triage, ' +
        'complaint photo analysis. Enablers: case classification, knowledge-article expansion, FAQ tone-of-voice.'
    )
  }

  const stepIcon = (label) => {
    const l = (label || '').toLowerCase()
    if (l.includes('web')) return <Globe size={13} />
    if (l.includes('document') || l.includes('salesforce')) return <BookOpen size={13} />
    if (l.includes('report') || l.includes('build')) return <FileText size={13} />
    return <Sparkles size={13} />
  }

  return (
    <div className="chat-shell">
      <div className="chat-pane">
        <div className="chat-head">
          <div className="chat-head-icon"><Bot size={18} /></div>
          <div className="chat-head-meta">
            <div className="chat-head-title">Use-Case Research Agent</div>
            <div className="chat-head-sub"><span className="live-dot" /> Live · hosted on our Agentforce sandbox</div>
          </div>
        </div>

        <div className="chat-log" ref={scrollRef} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="welcome-orb"><Sparkles size={24} /></div>
              <h3>Turn your workshop into a researched report</h3>
              <p>
                Paste your meeting transcript and Lucid-board notes, <b>talk to it</b> with the mic, or
                <b> drop in an image / PDF</b> of your board. I'll research your use cases on the web and in
                Salesforce docs, then build a polished report on the right.
              </p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="suggestion-chip" onClick={() => onSuggestion(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg msg-${m.role}`}>
              <div className="msg-avatar">{m.role === 'user' ? <User size={15} /> : <Bot size={15} />}</div>
              <div className="msg-body">
                {/* live agent activity (tool calls) */}
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
              placeholder={recording ? 'Listening… tap stop when done' : 'Message the research agent…'}
              rows={1}
            />
            <button className="send-btn" onClick={() => send()} disabled={busy || !input.trim()} title="Send">
              {busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
            </button>
          </div>
          <div className="chat-hint">Press Enter to send · Shift+Enter for a new line</div>
        </div>
      </div>

      <div className="artifact-pane">
        <ReportArtifact report={report} streaming={reportPending || busy} />
      </div>
    </div>
  )
}

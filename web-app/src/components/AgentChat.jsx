import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Mic, Square, Paperclip, Loader2, Bot, User, Sparkles } from 'lucide-react'
import { createSession, streamMessage, splitReport } from '../lib/agentClient'
import ReportArtifact from './ReportArtifact'

/**
 * The hosted demo of the Use-Case Research agent: a conversational chat on the left, a live
 * report artifact canvas on the right. Supports talking to it (audio → transcribed text) and
 * dropping images/PDFs (→ extracted text) — only text is ever sent to Agentforce.
 */
export default function AgentChat() {
  const [messages, setMessages] = useState([]) // {role, text}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [report, setReport] = useState(null)
  const [reportPending, setReportPending] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [recording, setRecording] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [error, setError] = useState('')

  const seqRef = useRef(1)
  const scrollRef = useRef(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, progress])

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId
    const id = await createSession()
    setSessionId(id)
    return id
  }, [sessionId])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || busy) return
    setError('')
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: content }, { role: 'assistant', text: '' }])
    setBusy(true)
    setProgress('Thinking…')

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
      onProgress: (p) => setProgress(p || 'Working…'),
      onText: (full) => {
        const { chat, report: rep, reportPending: pending } = splitReport(full)
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', text: chat || '…' }
          return copy
        })
        setReportPending(pending)
        if (rep) setReport(rep)
      },
      onDone: (full) => {
        const { chat, report: rep } = splitReport(full)
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = {
            role: 'assistant',
            text: chat || 'Your report is ready on the right.',
          }
          return copy
        })
        if (rep) setReport(rep)
        setReportPending(false)
        setBusy(false)
        setProgress('')
      },
      onError: (msg) => {
        setError(msg)
        setBusy(false)
        setProgress('')
        setMessages((m) => {
          const copy = [...m]
          if (copy.length && copy[copy.length - 1].role === 'assistant' && !copy[copy.length - 1].text)
            copy.pop()
          return copy
        })
      },
    })
  }

  // ── Audio: record → transcribe → send ────────────────────────────────────────────────
  const toggleRecording = async () => {
    if (recording) {
      mediaRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAttaching(true)
        setProgress('Transcribing your audio…')
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'recording.webm')
          const res = await fetch('/api/extract/audio', { method: 'POST', body: fd })
          const data = await res.json()
          setAttaching(false)
          setProgress('')
          if (!res.ok) throw new Error(data.error || 'Transcription failed')
          if (data.text) setInput((v) => (v ? v + '\n' : '') + data.text)
        } catch (e) {
          setAttaching(false)
          setProgress('')
          setError(e.message)
        }
      }
      mediaRef.current = mr
      mr.start()
      setRecording(true)
    } catch {
      setError('Microphone access was blocked. Allow mic access to talk to the agent.')
    }
  }

  // ── Files: image/PDF → extracted text → input ──────────────────────────────────────────
  const onFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setAttaching(true)
    setError('')
    for (const file of files) {
      setProgress(`Reading ${file.name}…`)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/extract/file', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not read the file')
        const header = `\n\n=== ${file.name} ===\n`
        setInput((v) => v + header + (data.text || ''))
      } catch (e) {
        setError(e.message)
      }
    }
    setAttaching(false)
    setProgress('')
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

  return (
    <div className="chat-shell">
      <div className="chat-pane">
        <div className="chat-head">
          <div className="chat-head-icon"><Bot size={18} /></div>
          <div>
            <div className="chat-head-title">Use-Case Research Agent</div>
            <div className="chat-head-sub">Live demo · hosted on our Agentforce sandbox</div>
          </div>
        </div>

        <div className="chat-log" ref={scrollRef} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          {messages.length === 0 && (
            <div className="chat-welcome">
              <Sparkles size={26} />
              <h3>Turn your workshop into a researched report</h3>
              <p>
                Paste your meeting transcript and Lucid-board notes, <b>talk to it</b> with the mic, or
                <b> drop in an image / PDF</b>. The agent researches your use cases on the web and in
                Salesforce docs, then builds a polished report on the right.
              </p>
              <button className="btn-sample" onClick={loadSample}>Load a sample workshop</button>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg msg-${m.role}`}>
              <div className="msg-avatar">{m.role === 'user' ? <User size={15} /> : <Bot size={15} />}</div>
              <div className="msg-bubble">{m.text || <span className="dots">…</span>}</div>
            </div>
          ))}

          {busy && progress && (
            <div className="msg msg-assistant">
              <div className="msg-avatar"><Bot size={15} /></div>
              <div className="msg-progress"><Loader2 size={14} className="spin" /> {progress}</div>
            </div>
          )}
        </div>

        {error && <div className="chat-error">{error}</div>}

        <div className="chat-input">
          <button
            className={`icon-btn ${recording ? 'rec' : ''}`}
            onClick={toggleRecording}
            disabled={busy || attaching}
            title={recording ? 'Stop recording' : 'Talk to the agent'}
          >
            {recording ? <Square size={18} /> : <Mic size={18} />}
          </button>
          <button
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || attaching}
            title="Attach an image or PDF"
          >
            {attaching ? <Loader2 size={18} className="spin" /> : <Paperclip size={18} />}
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={recording ? 'Listening… tap stop when done' : 'Paste your transcript & board notes, or talk / drop a file…'}
            rows={1}
          />
          <button className="send-btn" onClick={() => send()} disabled={busy || !input.trim()}>
            {busy ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      <div className="artifact-pane">
        <ReportArtifact report={report} streaming={reportPending || busy} />
      </div>
    </div>
  )
}

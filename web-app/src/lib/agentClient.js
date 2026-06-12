// Browser-side Agentforce client. Talks to OUR backend (/api/agent/*), which holds the secrets
// and proxies the Salesforce Agent API. Parses the SSE stream and surfaces callbacks.

export async function createSession() {
  const res = await fetch('/api/agent/session', { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Could not start a session')
  return data.sessionId
}

export async function endSession(sessionId) {
  if (!sessionId) return
  try {
    await fetch('/api/agent/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
  } catch {
    /* best-effort */
  }
}

/**
 * Streams a message. Callbacks:
 *   onProgress(text)   — a status/progress indicator
 *   onText(fullText)   — the accumulated assistant text so far (re-sent on each chunk)
 *   onDone(fullText)   — stream finished (EndOfTurn or close)
 *   onError(message)   — an error event
 * Returns an AbortController so the caller can cancel.
 */
export function streamMessage({ sessionId, text, sequenceId, onProgress, onText, onDone, onError }) {
  const controller = new AbortController()

  ;(async () => {
    let acc = ''
    try {
      const res = await fetch('/api/agent/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, text, sequenceId }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({}))
        onError?.(e.error || `Stream failed (HTTP ${res.status})`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // keep the incomplete line

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (!payload) continue
          let ev
          try {
            ev = JSON.parse(payload)
          } catch {
            continue
          }
          const m = ev.message || {}
          switch (m.type) {
            case 'ProgressIndicator':
              onProgress?.(m.message || '')
              break
            case 'TextChunk':
              // offset 0 = new message; >0 = append. We accumulate either way.
              if (m.offset === 0) acc = m.message || ''
              else acc += m.message || ''
              onText?.(acc)
              break
            case 'Inform':
            case 'Inquire':
              acc = m.message || acc
              onText?.(acc)
              break
            case 'ValidationFailureChunk':
              onError?.(m.message || 'Validation failed')
              break
            case 'Error':
            case 'Failure':
              onError?.(m.message || 'The agent reported an error')
              break
            case 'EndOfTurn':
              onDone?.(acc)
              return
            default:
              break
          }
        }
      }
      onDone?.(acc)
    } catch (e) {
      if (e.name !== 'AbortError') onError?.(e.message || 'Connection error')
    }
  })()

  return controller
}

/**
 * Splits an assistant message into a conversational part and an optional report payload.
 * The agent wraps the report JSON in <report>...</report>. While streaming, the closing tag
 * may not have arrived yet, so we tolerate a missing close (report stays null until parseable).
 */
export function splitReport(fullText) {
  const open = fullText.indexOf('<report>')
  if (open === -1) return { chat: fullText, report: null, reportPending: false }
  const close = fullText.indexOf('</report>', open)
  const chat = fullText.slice(0, open).trim()
  if (close === -1) {
    return { chat, report: null, reportPending: true } // still streaming the report
  }
  const raw = fullText.slice(open + 8, close).trim()
  let report = null
  try {
    report = JSON.parse(raw)
  } catch {
    // tolerate minor issues: strip markdown fences if present
    try {
      report = JSON.parse(raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim())
    } catch {
      report = null
    }
  }
  const after = fullText.slice(close + 9).trim()
  return { chat: (chat + (after ? '\n' + after : '')).trim(), report, reportPending: false }
}

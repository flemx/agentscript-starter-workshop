import { useMemo } from 'react'
import { Download, FileText } from 'lucide-react'

/**
 * Renders the agent's compact report JSON into a beautiful, on-brand Agentforce report and
 * offers a "Download as PDF" button. The agent emits JSON (so it never hits its output cap);
 * the styling lives here in the client.
 *
 * `report` is the parsed object: { title, client, executiveSummary, useCases[], webResearch[],
 * salesforceGuidance[], recommendations[], sources[] }. While the agent is still streaming we
 * may only have partial JSON — callers pass `streaming` to show a soft "building…" state.
 */
export default function ReportArtifact({ report, streaming }) {
  const html = useMemo(() => (report ? buildReportHtml(report) : ''), [report])

  if (!report) {
    return (
      <div className="artifact-empty">
        <FileText size={40} strokeWidth={1.5} />
        <h3>Your report will appear here</h3>
        <p>
          Paste your workshop transcript and Lucid board notes into the chat — talk to it, or drop in
          an image or PDF. The agent researches your use cases and builds a polished report right here.
        </p>
        {streaming && <div className="artifact-building">Building your report…</div>}
      </div>
    )
  }

  const downloadPdf = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
    // Give the new doc a tick to lay out, then invoke the browser's Save-as-PDF print path.
    w.onload = () => setTimeout(() => w.print(), 350)
  }

  return (
    <div className="artifact-wrap">
      <div className="artifact-toolbar">
        <span className="artifact-title">{report.title || 'Use-Case Research Report'}</span>
        <button className="btn-pdf" onClick={downloadPdf}>
          <Download size={15} /> Download PDF
        </button>
      </div>
      <iframe
        className="artifact-frame"
        title="Use-case research report"
        srcDoc={html}
        sandbox="allow-same-origin allow-popups allow-modals"
      />
    </div>
  )
}

/* ── HTML template (mirrors the Apex WorkshopReportBuilder styling) ───────────────────── */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function pill(level) {
  const v = String(level || '').toLowerCase()
  const cls = v.startsWith('high') ? 'hi' : v.startsWith('low') ? 'lo' : 'mid'
  return `<span class="pill pill-${cls}">${esc(level)}</span>`
}

function list(items) {
  if (!items || !items.length) return ''
  return '<ul>' + items.map((i) => `<li>${esc(i)}</li>`).join('') + '</ul>'
}

export function buildReportHtml(r) {
  const useCaseRows = (r.useCases || [])
    .map(
      (u) =>
        `<tr><td><strong>${esc(u.name)}</strong></td><td>${pill(u.impact)}</td>` +
        `<td>${pill(u.effort)}</td><td>${esc(u.description)}</td></tr>`
    )
    .join('')

  const sources = (r.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label || s.url)}</a></li>`)
    .join('')

  const section = (heading, body) =>
    body ? `<section class="card"><h2>${esc(heading)}</h2><div class="body">${body}</div></section>` : ''

  const robot =
    '<svg class="mark" viewBox="0 0 120 120" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,.4)" stroke-width="3"/>' +
    '<rect x="34" y="46" width="52" height="38" rx="11" fill="rgba(255,255,255,.18)"/>' +
    '<circle cx="50" cy="65" r="5.5" fill="#fff" stroke="none"/><circle cx="70" cy="65" r="5.5" fill="#fff" stroke="none"/>' +
    '<line x1="60" y1="32" x2="60" y2="46"/><circle cx="60" cy="30" r="4" fill="#fff" stroke="none"/></svg>'

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      background:radial-gradient(900px 500px at 50% -120px,#dfeaff,#eef3fb 60%);color:#0b1d3a;line-height:1.6;padding:26px 18px}
    .page{max-width:820px;margin:0 auto}
    .hero{position:relative;overflow:hidden;display:flex;align-items:center;gap:20px;
      background:linear-gradient(135deg,#061330,#13357f 48%,#0aa3e0);color:#fff;border-radius:22px;
      padding:30px 32px;box-shadow:0 20px 50px rgba(9,30,70,.3)}
    .mark{width:74px;height:74px;flex:0 0 auto;filter:drop-shadow(0 6px 14px rgba(0,0,0,.25))}
    .kicker{text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:800;color:#bfe0ff}
    .hero h1{font-size:25px;line-height:1.15;margin:6px 0 6px;font-weight:800;letter-spacing:-.3px}
    .hero .sub{color:#e2edff;font-size:14px}
    .card{background:#fff;border:1px solid #e0e9f6;border-radius:16px;padding:20px 26px;margin-top:18px;
      box-shadow:0 10px 26px rgba(13,40,90,.07)}
    .card h2{font-size:18px;font-weight:800;color:#10336e;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #eef4fc}
    .card .body p{margin:0 0 11px}.card .body ul{margin:0 0 6px 20px}.card .body li{margin:6px 0}
    table{width:100%;border-collapse:separate;border-spacing:0;font-size:13.5px;border:1px solid #e0e9f6;border-radius:12px;overflow:hidden}
    th,td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid #eef4fc}
    th{background:#10336e;color:#fff;font-weight:700;font-size:12.5px}
    tr:last-child td{border-bottom:none}tbody tr:nth-child(even){background:#f7faff}
    a{color:#0a6ed1;text-decoration:none;font-weight:600}a:hover{text-decoration:underline}
    .pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap}
    .pill-hi{background:#e3f6ec;color:#1b7a45}.pill-mid{background:#fff3da;color:#9a6400}.pill-lo{background:#eef1f6;color:#5a6b86}
    .foot{color:#5b7299;font-size:12px;text-align:center;margin:22px 8px 0}
    @media print{body{background:#fff;padding:0}.card,.hero{box-shadow:none}}
  `

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${esc(r.title || 'Use-Case Research Report')}</title><style>${css}</style></head>
    <body><div class="page">
      <header class="hero">${robot}<div>
        <div class="kicker">Agentforce · Design-Thinking Workshop</div>
        <h1>${esc(r.title || 'Use-Case Research Report')}</h1>
        <p class="sub">${esc(r.client || '')} — use-case discovery, researched and ready to act on.</p>
      </div></header>
      ${section('Executive summary', r.executiveSummary ? `<p>${esc(r.executiveSummary)}</p>` : '')}
      ${
        useCaseRows
          ? `<section class="card"><h2>Prioritized use cases</h2><div class="body"><table>
             <thead><tr><th>Use case</th><th>Impact</th><th>Effort</th><th>What it does</th></tr></thead>
             <tbody>${useCaseRows}</tbody></table></div></section>`
          : ''
      }
      ${section('What the web tells us', list(r.webResearch))}
      ${section('How Salesforce &amp; Agentforce helps', list(r.salesforceGuidance))}
      ${section('Recommended next steps', list(r.recommendations))}
      ${sources ? `<section class="card"><h2>Sources &amp; further reading</h2><div class="body"><ul>${sources}</ul></div></section>` : ''}
      <div class="foot">Generated by Agentforce · ${esc(r.client || 'AI Workshop')}</div>
    </div></body></html>`
}

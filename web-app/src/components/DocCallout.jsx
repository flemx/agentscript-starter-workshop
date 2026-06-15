import { Info, Lightbulb, AlertTriangle } from 'lucide-react'

/**
 * Salesforce-docs-style callout (mirrors the developer.salesforce.com `doc-content-callout`).
 * variant: 'note' | 'tip' | 'warning'. Pass a `header` and children for the body.
 */
const ICONS = {
  note: Info,
  tip: Lightbulb,
  warning: AlertTriangle,
}

const DEFAULT_HEADER = {
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
}

export default function DocCallout({ variant = 'note', header, children }) {
  const Icon = ICONS[variant] || Info
  return (
    <div className={`doc-callout doc-callout-${variant}`}>
      <span className="doc-callout-icon">
        <Icon size={15} />
      </span>
      <div className="doc-callout-body">
        <p className="doc-callout-title">{header || DEFAULT_HEADER[variant]}</p>
        {children}
      </div>
    </div>
  )
}

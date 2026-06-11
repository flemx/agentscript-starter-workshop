import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

function Collapsible({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="collapsible">
      <button
        className={`collapsible-header ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ChevronRight size={16} className={`collapsible-icon ${isOpen ? 'rotated' : ''}`} />
        <span>{title}</span>
      </button>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  )
}

export default Collapsible

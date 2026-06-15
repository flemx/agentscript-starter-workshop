import React from 'react'
import { Sun, Moon } from 'lucide-react'

const navigationItems = [
  {
    section: 'Getting Started',
    items: [
      { id: 'overview', label: 'Workshop Overview' },
      { id: 'get-org', label: 'Setup your Org' },
      { id: 'install-package', label: 'Install the Package' },
    ]
  },
  {
    section: 'Part A — Build the MVP',
    items: [
      { id: 'part-a', label: 'Guided Build' },
    ]
  },
  {
    section: 'Part B — Make It Yours',
    items: [
      { id: 'part-b', label: 'Free Exercise' },
    ]
  },
  {
    section: 'Live Demo',
    items: [
      { id: 'try-agent', label: '✨ Try the Research Agent' },
    ]
  }
]

function Sidebar({ activeSection, setActiveSection, isOpen, theme, onToggleTheme }) {
  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logos">
          <img
            src="/images/salesforce_logo.svg"
            alt="Salesforce"
            className="logo-salesforce"
          />
        </div>
        <h1>Employee Agent V1 Workshop</h1>
        <p className="sidebar-subtitle">Build your own Agentforce agent in Agent Studio</p>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map((section, idx) => (
          <div key={idx} className="nav-section">
            <div className="nav-section-title">{section.section}</div>
            {section.items.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} />
              <span>Light mode</span>
            </>
          ) : (
            <>
              <Moon size={16} />
              <span>Dark mode</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default Sidebar

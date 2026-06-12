import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'

const THEME_KEY = 'pronto-workshop-theme'

function App() {
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    try {
      const stored = window.localStorage.getItem(THEME_KEY)
      if (stored === 'light' || stored === 'dark') return stored
    } catch {
      // ignore
    }
    return 'light' // light mode by default — Agentforce look & feel
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeSection])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  const handleSectionChange = (section) => {
    setActiveSection(section)
    closeSidebar()
  }

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <div className="app-container">
      <button className="hamburger-menu" onClick={toggleSidebar} aria-label="Toggle menu">
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={`mobile-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
        isOpen={sidebarOpen}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <MainContent
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
      />
    </div>
  )
}

export default App

import { useState, useEffect } from 'react'

function RightSidebar({ steps }) {
  const [activeStep, setActiveStep] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      const stepElements = steps.map(step => document.getElementById(step.id)).filter(Boolean)

      for (let i = stepElements.length - 1; i >= 0; i--) {
        const element = stepElements[i]
        const rect = element.getBoundingClientRect()
        if (rect.top <= 100) {
          setActiveStep(steps[i].id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [steps])

  const scrollToStep = (id) => {
    const element = document.getElementById(id)
    if (element) {
      const y = element.getBoundingClientRect().top + window.pageYOffset - 80
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  if (!steps || steps.length === 0) return null

  return (
    <div className="right-sidebar">
      <h4>On this page</h4>
      <div className="right-sidebar-nav">
        {steps.map((step) => (
          <a
            key={step.id}
            className={`right-sidebar-link ${activeStep === step.id ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              scrollToStep(step.id)
            }}
            href={`#${step.id}`}
          >
            {step.label}
          </a>
        ))}
      </div>
    </div>
  )
}

export default RightSidebar

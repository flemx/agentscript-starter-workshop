import React from 'react'

function HeaderAnchor({ id, children, level = 'h2' }) {
  const Tag = level

  const scrollToSection = (e) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const y = element.getBoundingClientRect().top + window.pageYOffset - 80
      window.scrollTo({ top: y, behavior: 'smooth' })

      // Update URL without triggering page reload
      window.history.pushState(null, '', `#${id}`)
    }
  }

  return (
    <Tag id={id} className="header-with-anchor">
      <a
        className="header-anchor"
        href={`#${id}`}
        aria-label={`Permalink to "${children}"`}
        onClick={scrollToSection}
      >
        #
      </a>
      {children}
    </Tag>
  )
}

export default HeaderAnchor

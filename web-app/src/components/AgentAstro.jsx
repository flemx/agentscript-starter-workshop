/**
 * Agentforce "agent_astro" mark — used wherever the guide needs an AI-agent icon
 * (instead of a generic robot). Inline SVG so there's no missing-asset risk and it
 * inherits color via currentColor. Pass a size (px) and optional className.
 */
export default function AgentAstro({ size = 22, className = '', title = 'Agentforce agent' }) {
  return (
    <svg
      className={`agent-astro-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      fill="none"
    >
      <defs>
        <linearGradient id="aa-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0aa3e0" />
          <stop offset="1" stopColor="#13357f" />
        </linearGradient>
      </defs>
      {/* helmet / head */}
      <circle cx="24" cy="22" r="14" fill="url(#aa-grad)" />
      {/* visor */}
      <rect x="14" y="16" width="20" height="13" rx="6.5" fill="#fff" opacity="0.95" />
      {/* eyes */}
      <circle cx="20" cy="22.5" r="2.3" fill="#13357f" />
      <circle cx="28" cy="22.5" r="2.3" fill="#13357f" />
      {/* antenna */}
      <line x1="24" y1="8" x2="24" y2="3.5" stroke="#0aa3e0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="3" r="2.4" fill="#0aa3e0" />
      {/* shoulders */}
      <path d="M9 42c2-7 7.5-10 15-10s13 3 15 10" fill="url(#aa-grad)" opacity="0.92" />
    </svg>
  )
}

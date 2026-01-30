'use client'

/**
 * Docvue Logo Icon Component
 * Rose-gold petal/leaf design
 */
export function DocvueLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 50 50" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="roseGoldGradient" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#E2A47F" />
          <stop offset="50%" stopColor="#C88A65" />
          <stop offset="100%" stopColor="#E2A47F" />
        </linearGradient>
      </defs>
      <path 
        d="M10 22 C 10 22, 16 28, 22 33 C 25 35, 28 32, 31 29 C 40 19, 50 6, 59 3 C 62 2, 65 6, 62 11 C 56 22, 44 35, 34 41 C 25 47, 16 41, 10 35 C 4 29, 0 19, 10 22 Z" 
        fill="url(#roseGoldGradient)"
        transform="scale(0.75) translate(5, 8)"
      />
      <circle cx="38" cy="12" r="2" fill="white" opacity="0.6"/>
    </svg>
  )
}

/**
 * Full Docvue Logo with text
 */
export function DocvueLogoFull({ className = "h-10" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 320 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="roseGoldGradientFull" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#E2A47F" />
          <stop offset="50%" stopColor="#C88A65" />
          <stop offset="100%" stopColor="#E2A47F" />
        </linearGradient>
      </defs>

      <g transform="translate(15, 10)">
        <path 
          d="M15 35 C 15 35, 25 45, 35 52 C 40 55, 45 50, 50 45 C 65 30, 80 10, 95 5 C 100 3, 105 10, 100 18 C 90 35, 70 55, 55 65 C 40 75, 25 65, 15 55 C 5 45, 0 30, 15 35 Z" 
          fill="url(#roseGoldGradientFull)"
        />
        <circle cx="90" cy="15" r="3" fill="white" opacity="0.6"/>
      </g>

      <g transform="translate(125, 55)" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontSize="48" fontWeight="600" letterSpacing="-1">
        <text x="0" y="0" fill="#33203A">doc</text>
        <text x="85" y="0" fill="url(#roseGoldGradientFull)">vue</text>
      </g>
    </svg>
  )
}

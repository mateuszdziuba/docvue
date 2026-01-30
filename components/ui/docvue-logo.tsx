'use client'

/**
 * Docvue Logo Icon Component
 * Ocean teal eye/checkmark design
 */
export function DocvueLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 90 65" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="oceanGradientIcon" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#009688" />
          <stop offset="100%" stopColor="#4DB6AC" />
        </linearGradient>
      </defs>
      <g transform="translate(0, 0)">
        <path 
          d="M 85 30 C 85 30, 75 5, 45 5 C 15 5, 5 30, 5 30 C 5 30, 15 60, 45 60 C 75 60, 85 30, 85 30 Z" 
          fill="url(#oceanGradientIcon)" 
          opacity="0.15"
        />
        <path 
          d="M 5 30 C 5 30, 15 60, 45 60 C 65 60, 80 45, 85 30" 
          stroke="url(#oceanGradientIcon)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none"
        />
        <path 
          d="M 5 30 C 5 30, 15 5, 45 5 C 75 5, 85 30, 85 30" 
          stroke="url(#oceanGradientIcon)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none"
        />
        <g transform="translate(32, 22)">
          <path 
            d="M 0 12 L 10 22 L 30 0" 
            stroke="url(#oceanGradientIcon)" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none"
          />
        </g>
      </g>
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
      viewBox="0 0 320 85" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="oceanGradientFull" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#009688" />
          <stop offset="100%" stopColor="#4DB6AC" />
        </linearGradient>
      </defs>

      <g transform="translate(10, 10)">
        <path 
          d="M 85 30 C 85 30, 75 5, 45 5 C 15 5, 5 30, 5 30 C 5 30, 15 60, 45 60 C 75 60, 85 30, 85 30 Z" 
          fill="url(#oceanGradientFull)" 
          opacity="0.15"
        />
        <path 
          d="M 5 30 C 5 30, 15 60, 45 60 C 65 60, 80 45, 85 30" 
          stroke="url(#oceanGradientFull)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none"
        />
        <path 
          d="M 5 30 C 5 30, 15 5, 45 5 C 75 5, 85 30, 85 30" 
          stroke="url(#oceanGradientFull)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none"
        />
        <g transform="translate(32, 22)">
          <path 
            d="M 0 12 L 10 22 L 30 0" 
            stroke="url(#oceanGradientFull)" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none"
          />
        </g>
      </g>

      <g transform="translate(115, 58)" fontFamily="'Poppins', 'Helvetica Neue', sans-serif" fontSize="48" fontWeight="700" letterSpacing="-1">
        <text x="0" y="0" fill="#0A2342">doc</text>
        <text x="85" y="0" fill="url(#oceanGradientFull)">vue</text>
      </g>
    </svg>
  )
}

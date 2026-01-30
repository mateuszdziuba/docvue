'use client'

/**
 * Docvue Logo Icon Component
 * Beauty eye with 6 eyelashes and checkmark design
 */
export function DocvueLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 95 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="beautyGradientIcon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <g transform="translate(0, 5)">
        {/* Lower eyelid */}
        <path 
          d="M 5 35 C 5 35, 15 65, 45 65 C 65 65, 80 50, 85 35" 
          stroke="url(#beautyGradientIcon)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none"
        />
        {/* Upper eyelid */}
        <path 
          d="M 5 35 C 5 28, 25 25, 45 25 C 65 25, 85 28, 85 35" 
          stroke="url(#beautyGradientIcon)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none"
        />
        {/* 6 Eyelashes */}
        <g stroke="url(#beautyGradientIcon)" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M 15 31 Q 5 20, 0 15" />
          <path d="M 28 27 Q 20 15, 15 10" />
          <path d="M 40 26 Q 38 12, 35 5" />
          <path d="M 50 26 Q 52 12, 55 5" />
          <path d="M 62 27 Q 70 15, 75 10" />
          <path d="M 75 31 Q 85 20, 90 15" />
        </g>
        {/* Checkmark */}
        <g transform="translate(32, 30)">
          <path 
            d="M 0 12 L 10 22 L 30 0" 
            stroke="url(#beautyGradientIcon)" 
            strokeWidth="5" 
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
      viewBox="0 0 320 90" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="beautyGradientFull" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>

      <g transform="translate(10, 15)">
        {/* Lower eyelid */}
        <path 
          d="M 5 35 C 5 35, 15 65, 45 65 C 65 65, 80 50, 85 35" 
          stroke="url(#beautyGradientFull)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none"
        />
        {/* Upper eyelid */}
        <path 
          d="M 5 35 C 5 28, 25 25, 45 25 C 65 25, 85 28, 85 35" 
          stroke="url(#beautyGradientFull)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none"
        />
        {/* 6 Eyelashes */}
        <g stroke="url(#beautyGradientFull)" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M 15 31 Q 5 20, 0 15" />
          <path d="M 28 27 Q 20 15, 15 10" />
          <path d="M 40 26 Q 38 12, 35 5" />
          <path d="M 50 26 Q 52 12, 55 5" />
          <path d="M 62 27 Q 70 15, 75 10" />
          <path d="M 75 31 Q 85 20, 90 15" />
        </g>
        {/* Checkmark */}
        <g transform="translate(32, 30)">
          <path 
            d="M 0 12 L 10 22 L 30 0" 
            stroke="url(#beautyGradientFull)" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none"
          />
        </g>
      </g>

      <g transform="translate(125, 68)" fontFamily="'Poppins', 'Helvetica Neue', sans-serif" fontSize="48" fontWeight="700" letterSpacing="-1">
        <text x="0" y="0" fill="#0A2342">doc</text>
        <text x="85" y="0" fill="url(#beautyGradientFull)">vue</text>
      </g>
    </svg>
  )
}

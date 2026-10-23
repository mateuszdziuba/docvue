'use client'

export function BrushCursor({
  x,
  y,
  diameter,
  soft,
}: {
  x: number
  y: number
  diameter: number
  soft: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-30 rounded-full border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.55)]"
      style={{
        left: x,
        top: y,
        width: diameter,
        height: diameter,
        transform: 'translate(-50%, -50%)',
        backgroundColor: soft ? 'rgba(255,255,255,0.12)' : 'transparent',
      }}
    >
      <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FACE_SEVERITY_OPTIONS } from '@/lib/consultation'
import {
  annotationAriaLabel,
  colorForCategory,
  drawFaceStrokes,
  FACE_COLOR_CLASSES,
  faceBoundsFromMesh,
} from '@/lib/face'
import type { FaceAnalysis, FaceColorKey, FaceDrawingStroke } from '@/types/consultation'
import { BrushCursor } from './brush-cursor'

export type FaceTool = 'orbit' | 'draw' | 'soft' | 'erase' | 'pin'

function strokeId(): string {
  return crypto.randomUUID()
}

export function Face2DCanvas({
  photoUrl,
  analysis,
  tool,
  color,
  width,
  hideDrawing,
  selectedId,
  disabled,
  onAddAnnotation,
  onSelectAnnotation,
  onCommitStroke,
}: {
  photoUrl: string
  analysis: FaceAnalysis
  tool: FaceTool
  color: FaceColorKey
  width: number
  hideDrawing: boolean
  selectedId: string | null
  disabled?: boolean
  onAddAnnotation: (uv: { x: number; y: number }) => void
  onSelectAnnotation: (id: string) => void
  onCommitStroke: (stroke: FaceDrawingStroke) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const liveStrokeRef = useRef<FaceDrawingStroke | null>(null)
  const drawingRef = useRef(false)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [dimensions, setDimensions] = useState({
    width: analysis.mesh?.imageWidth ?? 1200,
    height: analysis.mesh?.imageHeight ?? 1200,
  })

  const crop = useMemo(() => {
    const bounds = faceBoundsFromMesh(analysis.mesh)
    if (!bounds) return { x: 0, y: 0, width: 1, height: 1 }
    const paddingX = (bounds.maxX - bounds.minX) * 0.14
    const paddingY = (bounds.maxY - bounds.minY) * 0.14
    const x = Math.max(0, bounds.minX - paddingX)
    const y = Math.max(0, bounds.minY - paddingY)
    return {
      x,
      y,
      width: Math.min(1 - x, bounds.maxX - bounds.minX + paddingX * 2),
      height: Math.min(1 - y, bounds.maxY - bounds.minY + paddingY * 2),
    }
  }, [analysis.mesh])

  const containerAspect =
    (dimensions.width * crop.width) / Math.max(1, dimensions.height * crop.height)
  const imageStyle = {
    width: `${100 / crop.width}%`,
    height: `${100 / crop.height}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    top: `${(-crop.y / crop.height) * 100}%`,
  }

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    if (hideDrawing) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      if (liveStrokeRef.current) {
        drawFaceStrokes(context, [], canvas.width, canvas.height, liveStrokeRef.current)
      }
      return
    }
    drawFaceStrokes(context, analysis.strokes, canvas.width, canvas.height, liveStrokeRef.current)
  }, [analysis.strokes, hideDrawing])

  useEffect(() => {
    const maxEdge = 1200
    const scale = Math.min(1, maxEdge / Math.max(dimensions.width, dimensions.height))
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = Math.max(1, Math.round(dimensions.width * scale))
    canvas.height = Math.max(1, Math.round(dimensions.height * scale))
    redraw()
  }, [dimensions, redraw])

  useEffect(() => {
    redraw()
  }, [redraw])

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    }
  }

  const updateCursor = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    updateCursor(event)
    if (disabled) return
    const point = pointFromEvent(event)
    if (!point) return

    if (tool === 'pin') {
      onAddAnnotation(point)
      return
    }
    if (tool !== 'draw' && tool !== 'soft' && tool !== 'erase') return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    liveStrokeRef.current = {
      id: strokeId(),
      tool: tool === 'draw' ? 'pen' : tool === 'soft' ? 'soft' : 'eraser',
      color,
      width,
      points: [point],
    }
    redraw()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    updateCursor(event)
    if (!drawingRef.current) return
    const point = pointFromEvent(event)
    if (!point || !liveStrokeRef.current) return
    const points = liveStrokeRef.current.points
    const previous = points[points.length - 1]
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.0015) return
    points.push(point)
    if (points.length > 4000) points.splice(1, 1)
    redraw()
  }

  const endStroke = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    const live = liveStrokeRef.current
    liveStrokeRef.current = null
    if (live && live.points.length >= 2) onCommitStroke(live)
    redraw()
  }

  const canvasDisplayWidth = canvasRef.current?.getBoundingClientRect().width ?? 0
  const cursorDiameter = Math.max(
    6,
    width * (canvasDisplayWidth / 1000) * (tool === 'soft' ? 2.3 : 1),
  )
  const isTemplate = analysis.base === 'template'

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative mx-auto w-full overflow-hidden rounded-2xl border border-border/60 bg-panel-surface"
        style={{
          aspectRatio: containerAspect,
          maxWidth: `calc(62vh * ${containerAspect})`,
        }}
      >
        <img
          ref={imageRef}
          src={photoUrl}
          alt={
            isTemplate
              ? 'Szablon twarzy do zaznaczania obserwacji skórnych'
              : 'Zdjęcie twarzy klienta do mapy obserwacji skórnych'
          }
          className="absolute max-w-none"
          style={imageStyle}
          onLoad={(event) => {
            const image = event.currentTarget
            if (image.naturalWidth && image.naturalHeight) {
              setDimensions({ width: image.naturalWidth, height: image.naturalHeight })
            }
          }}
        />
        {!hideDrawing ? (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={
              isTemplate
                ? 'Obszar rysowania na szablonie twarzy — szczegóły obserwacji znajdziesz na liście obok'
                : 'Obszar rysowania po zdjęciu twarzy — szczegóły obserwacji znajdziesz na liście obok'
            }
            className={`absolute touch-none ${
              tool === 'draw' || tool === 'soft' || tool === 'erase'
                ? 'cursor-none'
                : tool === 'pin'
                  ? 'cursor-copy'
                  : 'cursor-default'
            }`}
            style={imageStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerEnter={updateCursor}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={(event) => {
              setCursor(null)
              if (drawingRef.current && event.buttons === 0) endStroke()
            }}
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0">
          {analysis.annotations.map((annotation) => {
            const colorKey = colorForCategory(annotation.category)
            const severity =
              FACE_SEVERITY_OPTIONS.find((option) => option.value === annotation.severity)?.label ??
              ''
            return (
              <button
                key={annotation.id}
                type="button"
                onClick={() => onSelectAnnotation(annotation.id)}
                aria-label={annotationAriaLabel(
                  annotation.number,
                  annotation.category,
                  annotation.region,
                  severity,
                )}
                aria-pressed={selectedId === annotation.id}
                className={`pointer-events-auto absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  FACE_COLOR_CLASSES[colorKey]
                } ${selectedId === annotation.id ? 'ring-2 ring-foreground/50' : ''}`}
                style={{
                  left: `${((annotation.uv.x - crop.x) / crop.width) * 100}%`,
                  top: `${((annotation.uv.y - crop.y) / crop.height) * 100}%`,
                }}
                title={annotation.label || `Obserwacja #${annotation.number}`}
              >
                {annotation.number}
              </button>
            )
          })}
        </div>

        {isTemplate ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-sm backdrop-blur">
            Szablon 2D
          </span>
        ) : null}

        {analysis.annotations.length === 0 && tool === 'pin' ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
            Kliknij na twarzy, aby dodać obserwację
          </div>
        ) : null}

        {cursor && !disabled && (tool === 'draw' || tool === 'soft' || tool === 'erase') ? (
          <BrushCursor x={cursor.x} y={cursor.y} diameter={cursorDiameter} soft={tool === 'soft'} />
        ) : null}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        {isTemplate
          ? 'Szablon 2D — możesz rysować i dodawać obserwacje bez zdjęcia. Widok 3D włączysz po dodaniu zdjęcia.'
          : 'Tryb 2D działa także bez WebGL. Rysunek i punkty zapisują się w tych samych danych co widok 3D.'}
      </p>
    </div>
  )
}

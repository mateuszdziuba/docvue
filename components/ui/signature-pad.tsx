'use client'

import { Check, Eraser, Pen, Pencil, RotateCcw } from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type SignaturePadProps = {
  value?: string | null
  onChange: (signature: string | null) => void
  disabled?: boolean
  className?: string
  id?: string
  holdToSignDuration?: number
}

const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 200
const DEFAULT_HOLD_DURATION = 1500

const disableTouchScroll = (canvas: HTMLCanvasElement) => {
  const preventScroll = (e: TouchEvent) => {
    e.preventDefault()
  }

  canvas.addEventListener('touchstart', preventScroll, { passive: false })
  canvas.addEventListener('touchmove', preventScroll, { passive: false })
  canvas.addEventListener('touchend', preventScroll, { passive: false })

  return () => {
    canvas.removeEventListener('touchstart', preventScroll)
    canvas.removeEventListener('touchmove', preventScroll)
    canvas.removeEventListener('touchend', preventScroll)
  }
}

export default function SignaturePad({
  value,
  onChange,
  disabled = false,
  className,
  id,
  holdToSignDuration = DEFAULT_HOLD_DURATION,
}: SignaturePadProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPosition, setLastPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [typedMode, setTypedMode] = useState(false)
  const [typedName, setTypedName] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)
  const holdStartRef = useRef<number | null>(null)
  const holdActiveRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const typedInputId = React.useId()

  // Podpis zawsze ciemnym tuszem na białej kanwie — spójnie z wydrukiem/PDF
  // i czytelnie w obu motywach.
  const getStrokeColor = useCallback(() => '#1b1c1c', [])

  useEffect(() => {
    if (!isDialogOpen) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = getStrokeColor()
    }

    const cleanupTouchScroll = disableTouchScroll(canvas)

    return () => {
      cleanupTouchScroll()
    }
  }, [isDialogOpen, getStrokeColor])

  useEffect(() => {
    if (isDialogOpen) {
      setHasDrawn(false)
      setHoldProgress(0)
      setIsHolding(false)
      setTypedMode(false)
      setTypedName('')
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [isDialogOpen])

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault()
    setIsDrawing(true)
    setHasDrawn(true)
    draw(e)
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    setLastPosition(null)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.beginPath()
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.strokeStyle = getStrokeColor()

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX
      const y = (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY

      if (lastPosition) {
        const midX = (lastPosition.x + x) / 2
        const midY = (lastPosition.y + y) / 2

        ctx.beginPath()
        ctx.moveTo(lastPosition.x, lastPosition.y)
        ctx.quadraticCurveTo(midX, midY, x, y)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.moveTo(x, y)
      }

      setLastPosition({ x, y })
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasDrawn(false)
      setHoldProgress(0)
      setTypedName('')
    }
  }

  const updateHoldProgress = useCallback(() => {
    if (!holdStartRef.current) return

    const elapsed = Date.now() - holdStartRef.current
    const progress = Math.min((elapsed / holdToSignDuration) * 100, 100)
    setHoldProgress(progress)

    if (progress < 100) {
      animationFrameRef.current = requestAnimationFrame(updateHoldProgress)
    }
  }, [holdToSignDuration])

  const exportDrawnSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const exportCtx = exportCanvas.getContext('2d')

    if (exportCtx) {
      exportCtx.fillStyle = '#ffffff'
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)

      const originalCtx = canvas.getContext('2d')
      if (originalCtx) {
        // Kreski zawsze na czarno (także w trybie ciemnym, gdzie rysujemy na
        // biało) i na nieprzezroczystym białym tle — podpis musi być czytelny
        // na wydruku/PDF niezależnie od motywu.
        const imageData = originalCtx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3]
          if (alpha > 0) {
            data[i] = 0
            data[i + 1] = 0
            data[i + 2] = 0
          }
        }

        const strokeCanvas = document.createElement('canvas')
        strokeCanvas.width = canvas.width
        strokeCanvas.height = canvas.height
        const strokeCtx = strokeCanvas.getContext('2d')
        if (strokeCtx) {
          strokeCtx.putImageData(imageData, 0, 0)
          exportCtx.drawImage(strokeCanvas, 0, 0)
        }
      }

      onChange(exportCanvas.toDataURL('image/png'))
    }
    setIsDialogOpen(false)
  }, [onChange])

  const handleHoldStart = useCallback(
    (event: React.PointerEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      if (!hasDrawn || holdActiveRef.current) return

      event.preventDefault()
      holdActiveRef.current = true
      setIsHolding(true)
      holdStartRef.current = Date.now()
      setHoldProgress(0)

      animationFrameRef.current = requestAnimationFrame(updateHoldProgress)

      holdTimerRef.current = setTimeout(() => {
        holdActiveRef.current = false
        exportDrawnSignature()
        setIsHolding(false)
        setHoldProgress(0)
      }, holdToSignDuration)
    },
    [hasDrawn, holdToSignDuration, exportDrawnSignature, updateHoldProgress],
  )

  const handleHoldEnd = useCallback(() => {
    holdActiveRef.current = false
    setIsHolding(false)
    holdStartRef.current = null

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setHoldProgress(0)
  }, [])

  const handleClearValue = () => {
    onChange(null)
  }

  const handleReset = () => {
    onChange(null)
    setIsDialogOpen(false)
  }

  const handleEditSignature = () => {
    setIsDialogOpen(true)
  }

  const confirmTypedSignature = () => {
    const name = typedName.trim()
    if (!name) return

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = CANVAS_WIDTH
    exportCanvas.height = CANVAS_HEIGHT
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    let fontSize = 44
    do {
      ctx.font = `600 ${fontSize}px Georgia, 'Times New Roman', serif`
      fontSize -= 2
    } while (ctx.measureText(name).width > CANVAS_WIDTH - 48 && fontSize > 16)

    ctx.fillText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    onChange(exportCanvas.toDataURL('image/png'))
    setIsDialogOpen(false)
  }

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      className={cn('mt-2 inline-flex items-center justify-start', className)}
    >
      {value ? (
        <div className="relative overflow-hidden rounded-md border border-input bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Podpis klienta" className="h-[100px] w-[200px] object-contain" />
          <div className="absolute bottom-1 right-1 flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="relative h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm before:absolute before:-inset-1.5 before:content-['']"
              onClick={handleEditSignature}
              disabled={disabled}
              aria-label="Edytuj podpis"
              title="Edytuj podpis"
            >
              <Pencil
                className="h-3 w-3 text-muted-foreground hover:text-primary"
                aria-hidden="true"
              />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="relative h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm before:absolute before:-inset-1.5 before:content-['']"
              onClick={handleClearValue}
              disabled={disabled}
              aria-label="Usuń podpis"
              title="Usuń podpis"
            >
              <Eraser
                className="h-3 w-3 text-muted-foreground hover:text-primary"
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 rounded-full"
          onClick={() => setIsDialogOpen(true)}
          disabled={disabled}
          aria-label="Dodaj podpis"
          title="Dodaj podpis"
        >
          <Pen className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pen className="h-4 w-4" aria-hidden="true" />
              Podpis
            </DialogTitle>
            <DialogDescription>
              Narysuj podpis poniżej, a następnie przytrzymaj przycisk, aby potwierdzić. Możesz też
              wpisać imię i nazwisko.
            </DialogDescription>
          </DialogHeader>

          {typedMode ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor={typedInputId}
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Imię i nazwisko
                </label>
                <input
                  id={typedInputId}
                  type="text"
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                  placeholder="np. Anna Kowalska"
                  autoComplete="name"
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <Button
                type="button"
                className="min-h-11 w-full"
                onClick={confirmTypedSignature}
                disabled={!typedName.trim()}
              >
                Zatwierdź podpis
              </Button>
              <button
                type="button"
                onClick={() => setTypedMode(false)}
                className="flex min-h-11 w-full items-center justify-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Wróć do rysowania
              </button>
            </div>
          ) : (
            <>
              <div className="relative overflow-hidden rounded-md border border-input bg-white">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  role="img"
                  aria-label="Obszar rysowania podpisu"
                  className="aspect-[2/1] h-auto w-full cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute bottom-2 left-2 h-8 w-8 rounded-full before:absolute before:-inset-1.5 before:content-['']"
                  onClick={clearSignature}
                  aria-label="Wyczyść rysunek"
                  title="Wyczyść rysunek"
                >
                  <Eraser className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setTypedMode(true)}
                className="flex min-h-11 w-full items-center justify-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Nie mogę podpisać odręcznie - wpisz imię i nazwisko
              </button>

              <DialogFooter className="flex-row gap-2 sm:flex-row">
                {value ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-shrink-0"
                    onClick={handleReset}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                    Wyczyść
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className={cn(
                    'relative flex-1 min-h-11 overflow-hidden border-2 border-transparent transition-all',
                    hasDrawn
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'cursor-not-allowed bg-muted text-muted-foreground',
                  )}
                  disabled={!hasDrawn}
                  onPointerDown={handleHoldStart}
                  onPointerUp={handleHoldEnd}
                  onPointerLeave={handleHoldEnd}
                  onPointerCancel={handleHoldEnd}
                  onKeyDown={(event) => {
                    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
                      handleHoldStart(event)
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      handleHoldEnd()
                    }
                  }}
                >
                  <span
                    className="absolute bottom-0 left-0 top-0 bg-success transition-none"
                    style={{ width: `${holdProgress}%` }}
                    aria-hidden="true"
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    <Check
                      className={cn('h-4 w-4', isHolding && 'animate-pulse')}
                      aria-hidden="true"
                    />
                    {isHolding ? 'Trzymaj...' : 'Przytrzymaj, aby potwierdzić'}
                  </span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

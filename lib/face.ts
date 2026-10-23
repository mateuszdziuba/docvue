import { FACE_CATEGORY_OPTIONS, FACE_COLOR_OPTIONS, FACE_REGION_OPTIONS } from '@/lib/consultation'
import type {
  FaceAnnotationCategory,
  FaceColorKey,
  FaceDrawingStroke,
  FaceMeshData,
  FaceRegion,
} from '@/types/consultation'

export interface FaceBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Wbudowany szablon twarzy używany, gdy klient nie ma zdjęcia w konsultacji. */
export const FACE_TEMPLATE_URL = '/face-template.webp'

/**
 * Obszar twarzy w szablonie. Szablon ma włosy, marginesy i szyję, więc bez
 * tych granic podpowiedzi stref (czoło, policzki, broda) wypadałyby poza twarz.
 */
export const FACE_TEMPLATE_BOUNDS: FaceBounds = {
  minX: 0.22,
  minY: 0.13,
  maxX: 0.78,
  maxY: 0.89,
}

export function faceBoundsFromMesh(mesh: FaceMeshData | null): FaceBounds | null {
  if (!mesh?.landmarks.length) return null
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const [x, y] of mesh.landmarks) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

function localUv(
  uv: { x: number; y: number },
  bounds: FaceBounds | null,
): { x: number; y: number } {
  if (!bounds) return uv
  const width = Math.max(bounds.maxX - bounds.minX, 0.0001)
  const height = Math.max(bounds.maxY - bounds.minY, 0.0001)
  return {
    x: Math.min(1, Math.max(0, (uv.x - bounds.minX) / width)),
    y: Math.min(1, Math.max(0, (uv.y - bounds.minY) / height)),
  }
}

export function regionFromUv(
  uv: { x: number; y: number },
  bounds: FaceBounds | null = null,
): FaceRegion {
  const point = localUv(uv, bounds)
  const { x, y } = point

  if (y < 0.24) return 'forehead'
  if (y < 0.44 && (x < 0.36 || x > 0.64)) return 'eyeArea'
  if (x >= 0.4 && x <= 0.6 && y >= 0.28 && y <= 0.64) return 'nose'
  if (y >= 0.62 && y <= 0.78 && x >= 0.34 && x <= 0.66) return 'mouth'
  if (y > 0.78 && x >= 0.28 && x <= 0.72) return 'chin'
  if (y >= 0.34 && y <= 0.72 && x < 0.46) return 'leftCheek'
  if (y >= 0.34 && y <= 0.72 && x > 0.54) return 'rightCheek'
  if (y > 0.7 && (x < 0.3 || x > 0.7)) return 'jawline'
  return 'other'
}

const REGION_CENTERS: Record<FaceRegion, { x: number; y: number }> = {
  forehead: { x: 0.5, y: 0.16 },
  eyeArea: { x: 0.3, y: 0.36 },
  nose: { x: 0.5, y: 0.5 },
  leftCheek: { x: 0.28, y: 0.55 },
  rightCheek: { x: 0.72, y: 0.55 },
  mouth: { x: 0.5, y: 0.7 },
  chin: { x: 0.5, y: 0.82 },
  jawline: { x: 0.25, y: 0.68 },
  other: { x: 0.5, y: 0.5 },
}

export function regionCenterUv(
  region: FaceRegion,
  bounds: FaceBounds | null = null,
): { x: number; y: number } {
  const center = REGION_CENTERS[region] ?? REGION_CENTERS.other
  if (!bounds) return center
  return {
    x: bounds.minX + center.x * (bounds.maxX - bounds.minX),
    y: bounds.minY + center.y * (bounds.maxY - bounds.minY),
  }
}

export function faceCategoryLabel(category: FaceAnnotationCategory): string {
  return FACE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? 'Obserwacja'
}

export function faceRegionLabel(region: FaceRegion): string {
  return FACE_REGION_OPTIONS.find((option) => option.value === region)?.label ?? 'Twarz'
}

export function colorForCategory(category: FaceAnnotationCategory): FaceColorKey {
  return FACE_CATEGORY_OPTIONS.find((option) => option.value === category)?.color ?? 'neutral'
}

export const FACE_COLOR_CLASSES: Record<FaceColorKey, string> = {
  destructive: 'border-destructive bg-destructive text-destructive-foreground',
  warning: 'border-warning bg-warning text-warning-foreground',
  primary: 'border-primary bg-primary text-primary-foreground',
  info: 'border-info bg-info text-info-foreground',
  success: 'border-success bg-success text-success-foreground',
  neutral: 'border-foreground bg-foreground text-background',
}

export const FACE_SWATCH_CLASSES: Record<FaceColorKey, string> = {
  destructive: 'bg-destructive',
  warning: 'bg-warning',
  primary: 'bg-primary',
  info: 'bg-info',
  success: 'bg-success',
  neutral: 'bg-foreground',
}

export function resolveFaceColor(color: FaceColorKey): string {
  const cssVar =
    FACE_COLOR_OPTIONS.find((option) => option.value === color)?.cssVar ?? '--foreground'
  if (typeof window === 'undefined') return 'black'
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  return value || 'black'
}

export function drawFaceStrokes(
  context: CanvasRenderingContext2D,
  strokes: FaceDrawingStroke[],
  width: number,
  height: number,
  liveStroke?: FaceDrawingStroke | null,
): void {
  context.clearRect(0, 0, width, height)
  context.lineCap = 'round'
  context.lineJoin = 'round'

  const draw = (stroke: FaceDrawingStroke) => {
    if (stroke.points.length < 2) return
    const color = stroke.tool === 'eraser' ? 'black' : resolveFaceColor(stroke.color)
    const lineWidth = Math.max(1, stroke.width * (width / 1000))

    const path = () => {
      context.beginPath()
      const first = stroke.points[0]
      context.moveTo(first.x * width, first.y * height)
      for (let index = 1; index < stroke.points.length; index += 1) {
        const point = stroke.points[index]
        context.lineTo(point.x * width, point.y * height)
      }
      context.stroke()
    }

    if (stroke.tool === 'soft') {
      // Miękki pędzel: kilka szerokich, półprzezroczystych przejść tworzy
      // rozmyty ślad do zaznaczania większych obszarów.
      context.save()
      context.globalCompositeOperation = 'source-over'
      context.strokeStyle = color
      for (let pass = 0; pass < 3; pass += 1) {
        context.globalAlpha = 0.16
        context.lineWidth = lineWidth * (1 + pass * 0.65)
        path()
      }
      context.restore()
      return
    }

    context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'

    if (stroke.tool !== 'eraser') {
      context.strokeStyle = 'rgba(255,255,255,0.5)'
      context.lineWidth = lineWidth + Math.max(1, lineWidth * 0.35)
      path()
    }

    context.strokeStyle = color
    context.lineWidth = lineWidth
    path()
  }

  for (const stroke of strokes) draw(stroke)
  if (liveStroke) draw(liveStroke)
  context.globalCompositeOperation = 'source-over'
}

export function annotationAriaLabel(
  number: number,
  category: FaceAnnotationCategory,
  region: FaceRegion,
  severity: string,
): string {
  return `Obserwacja ${number}: ${faceCategoryLabel(category)}, ${faceRegionLabel(region)}, ${severity}`
}

'use client'

import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Cloud,
  Eraser,
  Eye,
  EyeOff,
  Hand,
  Loader2,
  MapPin,
  Pencil,
  Redo2,
  ScanFace,
  Trash2,
  Undo2,
} from 'lucide-react'
import {
  Component,
  type Dispatch,
  lazy,
  type ReactNode,
  type SetStateAction,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  createEmptyFaceAnalysis,
  FACE_COLOR_OPTIONS,
  nextAnnotationNumber,
} from '@/lib/consultation'
import {
  FACE_SWATCH_CLASSES,
  FACE_TEMPLATE_BOUNDS,
  FACE_TEMPLATE_URL,
  faceBoundsFromMesh,
  regionCenterUv,
  regionFromUv,
} from '@/lib/face'
import { detectFaceMesh } from '@/lib/face-detection'
import { saveFaceAnalysisFn } from '@/src/server/consultations'
import type {
  FaceAnalysis,
  FaceAnnotation,
  FaceColorKey,
  FaceDrawingStroke,
  FaceRegion,
} from '@/types/consultation'
import { Face2DCanvas, type FaceTool } from './face-2d-canvas'
import { type AnnotationDraft, FaceAnnotationDialog } from './face-annotation-dialog'
import { FaceAnnotationList } from './face-annotation-list'
import { FacePhotoPanel } from './face-photo-panel'

const Face3DCanvas = lazy(() =>
  import('./face-3d-canvas').then((module) => ({ default: module.Face3DCanvas })),
)

class Face3DErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-warning" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-foreground">
            Nie udało się uruchomić widoku 3D
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Przełącz na widok 2D — dane pozostaną bez zmian.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

type ToolbarButtonProps = {
  active: boolean
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}

function ToolbarButton({ active, label, icon, onClick, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-surface-container-low hover:text-foreground'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

export function FaceEditor({
  consultationId,
  photoUrl,
  consentAt,
  analysis,
  setAnalysis,
  disabled,
  onPhotoChanged,
}: {
  consultationId: string
  photoUrl: string | null
  consentAt: string | null
  analysis: FaceAnalysis
  setAnalysis: Dispatch<SetStateAction<FaceAnalysis>>
  disabled?: boolean
  onPhotoChanged: (url: string | null) => void
}) {
  const [tool, setTool] = useState<FaceTool>('orbit')
  const [color, setColor] = useState<FaceColorKey>('destructive')
  const [strokeWidth, setStrokeWidth] = useState(5)
  const [softWidth, setSoftWidth] = useState(64)
  const [hideDrawing, setHideDrawing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAnnotation, setEditingAnnotation] = useState<FaceAnnotation | null>(null)
  const [pendingUv, setPendingUv] = useState<{ x: number; y: number } | null>(null)
  const [pendingPoint, setPendingPoint] = useState<[number, number, number] | null>(null)
  const [manualAdd, setManualAdd] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectionError, setDetectionError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [clearOpen, setClearOpen] = useState(false)
  const [deleteAnnotationTarget, setDeleteAnnotationTarget] = useState<FaceAnnotation | null>(null)
  const [redoStack, setRedoStack] = useState<FaceDrawingStroke[]>([])
  const [skinTextureEnabled, setSkinTextureEnabled] = useState(true)
  const [skinTextureStrength, setSkinTextureStrength] = useState(0.4)
  const [mounted, setMounted] = useState(false)
  const [effectiveConsentAt, setEffectiveConsentAt] = useState(consentAt)
  const lastSavedRef = useRef(JSON.stringify(analysis))
  const analysisRef = useRef(analysis)
  const detectionUrlRef = useRef<string | null>(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => setEffectiveConsentAt(consentAt), [consentAt])
  useEffect(() => {
    analysisRef.current = analysis
  }, [analysis])

  useEffect(() => {
    return () => {
      if (disabled) return
      if (JSON.stringify(analysisRef.current) === lastSavedRef.current) return
      void saveFaceAnalysisFn({
        data: { id: consultationId, analysis: analysisRef.current },
      })
    }
  }, [consultationId, disabled])

  const templateMode = !photoUrl && analysis.base === 'template'
  const bounds = templateMode ? FACE_TEMPLATE_BOUNDS : faceBoundsFromMesh(analysis.mesh)
  const hasMesh = Boolean(analysis.mesh)
  const effectiveView = templateMode
    ? '2d'
    : analysis.view === '3d' && !hasMesh
      ? '2d'
      : analysis.view
  const canvasUrl = templateMode ? FACE_TEMPLATE_URL : photoUrl

  const runDetection = useCallback(
    async (url: string) => {
      if (disabled || templateMode) return
      detectionUrlRef.current = url
      setDetecting(true)
      setDetectionError(null)
      try {
        const result = await detectFaceMesh(url)
        setAnalysis((previous) => ({
          ...previous,
          mesh: result.mesh,
          view: previous.view === '2d' ? '2d' : '3d',
        }))
        if (result.warning) toast.warning(result.warning)
        else toast.success('Model 3D twarzy jest gotowy')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Nie udało się przygotować modelu 3D'
        setDetectionError(message)
        setAnalysis((previous) => ({ ...previous, view: '2d' }))
      } finally {
        setDetecting(false)
      }
    },
    [disabled, setAnalysis, templateMode],
  )

  useEffect(() => {
    if (templateMode || !photoUrl || analysis.mesh || disabled || detecting) return
    if (detectionUrlRef.current === photoUrl) return
    detectionUrlRef.current = photoUrl
    void runDetection(photoUrl)
  }, [templateMode, photoUrl, analysis.mesh, disabled, detecting, runDetection])

  useEffect(() => {
    if (disabled) return
    const serialized = JSON.stringify(analysis)
    if (serialized === lastSavedRef.current) return
    const timer = window.setTimeout(async () => {
      setSaveState('saving')
      const result = await saveFaceAnalysisFn({
        data: { id: consultationId, analysis },
      })
      if ('error' in result && result.error) {
        setSaveState('error')
        return
      }
      lastSavedRef.current = serialized
      setSaveState('saved')
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [analysis, consultationId, disabled])

  const saveNow = async () => {
    setSaveState('saving')
    const result = await saveFaceAnalysisFn({ data: { id: consultationId, analysis } })
    if ('error' in result && result.error) {
      setSaveState('error')
      toast.error(result.error)
      return
    }
    lastSavedRef.current = JSON.stringify(analysis)
    setSaveState('saved')
    toast.success('Mapa twarzy zapisana')
  }

  const handlePhotoChanged = (url: string | null) => {
    setAnalysis(createEmptyFaceAnalysis())
    setDetectionError(null)
    detectionUrlRef.current = null
    setSelectedId(null)
    setRedoStack([])
    if (url) setEffectiveConsentAt(new Date().toISOString())
    onPhotoChanged(url)
  }

  const startTemplate = () => {
    if (disabled) return
    setDetectionError(null)
    detectionUrlRef.current = null
    setSelectedId(null)
    setRedoStack([])
    setAnalysis({ ...createEmptyFaceAnalysis(), base: 'template', view: '2d' })
  }

  const openAddAnnotation = (uv: { x: number; y: number }, point?: [number, number, number]) => {
    if (disabled) return
    setEditingAnnotation(null)
    setPendingUv(uv)
    setPendingPoint(point ?? null)
    setManualAdd(false)
    setDialogOpen(true)
  }

  const openManualAnnotation = () => {
    if (disabled) return
    setEditingAnnotation(null)
    setPendingUv(regionCenterUv('other', bounds))
    setPendingPoint(null)
    setManualAdd(true)
    setDialogOpen(true)
  }

  const openEditAnnotation = (annotation: FaceAnnotation) => {
    if (disabled) return
    setEditingAnnotation(annotation)
    setPendingUv(annotation.uv)
    setPendingPoint(annotation.point)
    setManualAdd(false)
    setDialogOpen(true)
  }

  const handleSaveAnnotation = (draft: AnnotationDraft) => {
    if (editingAnnotation) {
      setAnalysis((previous) => ({
        ...previous,
        annotations: previous.annotations.map((annotation) =>
          annotation.id === editingAnnotation.id ? { ...annotation, ...draft } : annotation,
        ),
      }))
      return
    }

    const uv = manualAdd
      ? regionCenterUv(draft.region, bounds)
      : (pendingUv ?? regionCenterUv('other', bounds))
    const annotation: FaceAnnotation = {
      id: crypto.randomUUID(),
      number: nextAnnotationNumber(analysis.annotations),
      ...draft,
      uv,
      point: manualAdd ? null : pendingPoint,
    }
    setAnalysis((previous) => ({
      ...previous,
      annotations: [...previous.annotations, annotation],
    }))
    setSelectedId(annotation.id)
  }

  const confirmDeleteAnnotation = () => {
    if (!deleteAnnotationTarget) return
    setAnalysis((previous) => ({
      ...previous,
      annotations: previous.annotations
        .filter((item) => item.id !== deleteAnnotationTarget.id)
        .map((item, index) => ({ ...item, number: index + 1 })),
    }))
    if (selectedId === deleteAnnotationTarget.id) setSelectedId(null)
    setDeleteAnnotationTarget(null)
  }

  const commitStroke = (stroke: FaceDrawingStroke) => {
    setRedoStack([])
    setAnalysis((previous) => ({ ...previous, strokes: [...previous.strokes, stroke] }))
  }

  const undoStroke = () => {
    if (analysis.strokes.length === 0) return
    const last = analysis.strokes[analysis.strokes.length - 1]
    setRedoStack((stack) => [...stack, last])
    setAnalysis((previous) => ({ ...previous, strokes: previous.strokes.slice(0, -1) }))
  }

  const redoStroke = () => {
    const last = redoStack[redoStack.length - 1]
    if (!last) return
    setRedoStack((stack) => stack.slice(0, -1))
    setAnalysis((previous) => ({ ...previous, strokes: [...previous.strokes, last] }))
  }

  const setView = (view: '2d' | '3d') => {
    if (templateMode && view === '3d') return
    setAnalysis((previous) => ({ ...previous, view }))
    if (view === '3d' && !analysis.mesh && photoUrl && !detecting && !templateMode) {
      detectionUrlRef.current = null
      void runDetection(photoUrl)
    }
  }

  const selectTool = (next: FaceTool) => {
    setTool(next)
    if (next === 'draw' || next === 'erase' || next === 'pin') setHideDrawing(false)
  }

  const selectedAnnotation = analysis.annotations.find((annotation) => annotation.id === selectedId)

  return (
    <div className="space-y-4">
      <FacePhotoPanel
        consultationId={consultationId}
        photoUrl={photoUrl}
        consentAt={effectiveConsentAt}
        disabled={disabled}
        onPhotoChanged={handlePhotoChanged}
      />

      {!photoUrl && !templateMode ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <ScanFace className="h-7 w-7" aria-hidden="true" />
            </span>
            <h3 className="mt-3 font-serif text-2xl text-foreground">
              Mapa twarzy — zdjęcie lub szablon
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Ze zdjęciem otrzymasz interaktywną siatkę 2.5D do obracania i rysowania. Bez zdjęcia
              możesz pracować na szablonie twarzy i zaznaczać zmiany na ilustracji.
            </p>
            <div className="mt-4 grid gap-2 text-left sm:grid-cols-3">
              {[
                [
                  'Lokalnie',
                  'MediaPipe działa w przeglądarce — zdjęcie nie opuszcza urządzenia podczas analizy.',
                ],
                [
                  'Precyzyjnie',
                  'Rysunek i punkty są zapisywane w przestrzeni UV, więc trzymają się twarzy.',
                ],
                ['Bezpiecznie', 'Prywatny bucket, podpisane URL-e i dostęp tylko dla personelu.'],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-xl border border-border/50 bg-background/60 p-3"
                >
                  <p className="text-xs font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col items-center gap-2">
              <Button type="button" variant="outline" onClick={startTemplate} className="min-h-11">
                <ScanFace className="mr-2 h-4 w-4" aria-hidden="true" />
                Użyj szablonu twarzy
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Szablon nie wymaga zgody na zdjęcie. Zdjęcie możesz dodać później.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {templateMode ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-info/20 bg-info-container/50 px-4 py-3 text-sm text-on-info-container">
              <div className="flex items-start gap-2">
                <ScanFace className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">Pracujesz na szablonie twarzy</p>
                  <p className="mt-0.5 text-xs leading-relaxed">
                    Zdjęcie jest opcjonalne. Dodanie zdjęcia zastąpi rysunek i obserwacje z
                    szablonu.
                  </p>
                </div>
              </div>
              <span className="text-[11px]">Widok 3D po dodaniu zdjęcia</span>
            </div>
          ) : null}

          {detecting ? (
            <div className="flex items-center gap-3 rounded-2xl border border-info/20 bg-info-container/50 px-4 py-3 text-sm text-on-info-container">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Przygotowuję model 3D twarzy — możesz już korzystać z widoku 2D.
            </div>
          ) : null}

          {detectionError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/25 bg-warning-container/60 px-4 py-3 text-sm text-on-warning-container">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{detectionError}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!photoUrl) return
                  detectionUrlRef.current = null
                  void runDetection(photoUrl)
                }}
              >
                Spróbuj ponownie
              </Button>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border/60 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
              <div className="flex flex-wrap items-center gap-1">
                <ToolbarButton
                  active={tool === 'orbit'}
                  label={effectiveView === '3d' ? 'Obróć' : 'Przeglądaj'}
                  icon={<Hand className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => selectTool('orbit')}
                />
                <ToolbarButton
                  active={tool === 'draw'}
                  label="Rysuj"
                  icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => selectTool('draw')}
                  disabled={disabled}
                />
                <ToolbarButton
                  active={tool === 'soft'}
                  label="Miękki pędzel"
                  icon={<Cloud className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => selectTool('soft')}
                  disabled={disabled}
                />
                <ToolbarButton
                  active={tool === 'erase'}
                  label="Gumka"
                  icon={<Eraser className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => selectTool('erase')}
                  disabled={disabled}
                />
                <ToolbarButton
                  active={tool === 'pin'}
                  label="Punkt"
                  icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => selectTool('pin')}
                  disabled={disabled}
                />
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <div className="mr-1 flex rounded-full bg-surface-container-low p-0.5">
                  <button
                    type="button"
                    onClick={() => setView('2d')}
                    aria-pressed={effectiveView === '2d'}
                    className={`min-h-9 rounded-full px-2.5 text-xs font-medium transition-colors ${
                      effectiveView === '2d'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    2D
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('3d')}
                    aria-pressed={effectiveView === '3d'}
                    disabled={!photoUrl || templateMode || (!hasMesh && detecting)}
                    title={
                      !photoUrl || templateMode ? 'Dodaj zdjęcie, aby użyć widoku 3D' : undefined
                    }
                    className={`min-h-9 rounded-full px-2.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                      effectiveView === '3d'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    3D
                  </button>
                </div>
                <ToolbarButton
                  active={false}
                  label="Cofnij"
                  icon={<Undo2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={undoStroke}
                  disabled={disabled || analysis.strokes.length === 0}
                />
                <ToolbarButton
                  active={false}
                  label="Ponów"
                  icon={<Redo2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={redoStroke}
                  disabled={disabled || redoStack.length === 0}
                />
                <ToolbarButton
                  active={hideDrawing}
                  label={hideDrawing ? 'Pokaż rysunek' : 'Ukryj rysunek'}
                  icon={
                    hideDrawing ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )
                  }
                  onClick={() => setHideDrawing((value) => !value)}
                />
                <ToolbarButton
                  active={false}
                  label="Wyczyść rysunek"
                  icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setClearOpen(true)}
                  disabled={disabled || analysis.strokes.length === 0}
                />
              </div>
            </div>

            {(tool === 'draw' || tool === 'soft' || tool === 'erase') && !disabled ? (
              <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-3 py-2">
                {tool !== 'erase' ? (
                  <fieldset className="m-0 flex items-center gap-1 border-0 p-0">
                    <legend className="sr-only">Kolor rysunku</legend>
                    {FACE_COLOR_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setColor(option.value)}
                        aria-label={option.label}
                        aria-pressed={color === option.value}
                        className={`h-7 w-7 rounded-full border-2 border-background ring-offset-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          FACE_SWATCH_CLASSES[option.value]
                        } ${color === option.value ? 'ring-2 ring-foreground/60' : ''}`}
                      />
                    ))}
                  </fieldset>
                ) : null}
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  {tool === 'soft' ? 'Rozmiar' : 'Grubość'}
                  <input
                    type="range"
                    min={tool === 'soft' ? 24 : 2}
                    max={tool === 'soft' ? 160 : 16}
                    step={tool === 'soft' ? 4 : 1}
                    value={tool === 'soft' ? softWidth : strokeWidth}
                    onChange={(event) =>
                      tool === 'soft'
                        ? setSoftWidth(Number(event.target.value))
                        : setStrokeWidth(Number(event.target.value))
                    }
                    className="h-1.5 w-28 accent-primary"
                  />
                </label>
                {tool === 'soft' ? (
                  <span className="text-[11px] text-muted-foreground">
                    Rozmyty pędzel do większych obszarów.
                  </span>
                ) : null}
                {tool === 'erase' ? (
                  <span className="text-[11px] text-muted-foreground">
                    Gumka usuwa tylko rysunek — obserwacje zostają.
                  </span>
                ) : null}
              </div>
            ) : null}

            {effectiveView === '3d' && hasMesh && !disabled ? (
              <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-3 py-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Relief 3D
                  <input
                    type="range"
                    min={0.4}
                    max={2}
                    step={0.05}
                    value={analysis.depthScale}
                    onChange={(event) =>
                      setAnalysis((previous) => ({
                        ...previous,
                        depthScale: Number(event.target.value),
                      }))
                    }
                    className="h-1.5 w-28 accent-primary"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={skinTextureEnabled}
                    onChange={(event) => setSkinTextureEnabled(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Tekstura skóry
                </label>
                {skinTextureEnabled ? (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Detal
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={skinTextureStrength}
                      onChange={(event) => setSkinTextureStrength(Number(event.target.value))}
                      className="h-1.5 w-24 accent-primary"
                    />
                  </label>
                ) : null}
                <span className="text-[11px] text-muted-foreground">
                  Pory, blizny i zmarszczki — podbicie detalu ze zdjęcia. Model 2.5D bez tyłu głowy.
                </span>
              </div>
            ) : null}

            <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
              <div className="min-w-0">
                <p className="sr-only">
                  Mapa twarzy. Rysowanie odbywa się wskaźnikiem lub palcem. Aby dodać obserwację bez
                  rysowania, użyj listy obserwacji i przycisku Dodaj.
                </p>
                {effectiveView === '3d' && hasMesh && !templateMode && photoUrl ? (
                  mounted ? (
                    <Face3DErrorBoundary
                      onError={() => {
                        setAnalysis((previous) => ({ ...previous, view: '2d' }))
                        toast.error('Widok 3D nie jest dostępny na tym urządzeniu. Włączono 2D.')
                      }}
                    >
                      <Suspense
                        fallback={
                          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-border/60">
                            <Loader2
                              className="h-5 w-5 animate-spin text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                        }
                      >
                        <Face3DCanvas
                          photoUrl={photoUrl ?? ''}
                          analysis={analysis}
                          tool={tool}
                          color={color}
                          width={tool === 'soft' ? softWidth : strokeWidth}
                          hideDrawing={hideDrawing}
                          selectedId={selectedId}
                          disabled={disabled}
                          skinTextureEnabled={skinTextureEnabled}
                          skinTextureStrength={skinTextureStrength}
                          onAddAnnotation={openAddAnnotation}
                          onSelectAnnotation={setSelectedId}
                          onCommitStroke={commitStroke}
                        />
                      </Suspense>
                    </Face3DErrorBoundary>
                  ) : (
                    <div className="flex min-h-72 items-center justify-center rounded-2xl border border-border/60">
                      <Loader2
                        className="h-5 w-5 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  )
                ) : (
                  <Face2DCanvas
                    photoUrl={canvasUrl ?? ''}
                    analysis={analysis}
                    tool={tool}
                    color={color}
                    width={tool === 'soft' ? softWidth : strokeWidth}
                    hideDrawing={hideDrawing}
                    selectedId={selectedId}
                    disabled={disabled}
                    onAddAnnotation={openAddAnnotation}
                    onSelectAnnotation={setSelectedId}
                    onCommitStroke={commitStroke}
                  />
                )}

                {templateMode ? (
                  <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface-container-low/50 px-3 py-2 text-xs text-muted-foreground">
                    <ScanFace className="h-3.5 w-3.5" aria-hidden="true" />
                    Szablon 2D — dodaj zdjęcie, aby przejść do mapy 3D.
                  </div>
                ) : !hasMesh && !detecting ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface-container-low/50 px-3 py-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Box className="h-3.5 w-3.5" aria-hidden="true" />
                      Widok 3D nie jest jeszcze gotowy.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!photoUrl) return
                        detectionUrlRef.current = null
                        void runDetection(photoUrl)
                      }}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Uruchom model 3D
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="lg:sticky lg:top-4 lg:max-h-[60vh]">
                <FaceAnnotationList
                  annotations={analysis.annotations}
                  selectedId={selectedId}
                  disabled={disabled}
                  onSelect={setSelectedId}
                  onEdit={openEditAnnotation}
                  onDelete={(annotation) => setDeleteAnnotationTarget(annotation)}
                  onAdd={openManualAnnotation}
                />
                {selectedAnnotation ? (
                  <div className="mt-2 rounded-xl border border-border/60 bg-surface-container-low/50 px-3 py-2 text-[11px] text-muted-foreground">
                    Wybrano #{selectedAnnotation.number}. Kliknij ołówkiem, aby zmienić opis.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5" aria-live="polite">
                {saveState === 'saving' ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Zapisywanie
                    mapy…
                  </>
                ) : saveState === 'saved' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-success" aria-hidden="true" /> Mapa
                    zapisana automatycznie
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 text-warning" aria-hidden="true" /> Nie udało
                    się zapisać mapy
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => void saveNow()}
                disabled={disabled || saveState === 'saving'}
                className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
              >
                Zapisz teraz
              </button>
            </div>
          </div>
        </>
      )}

      <FaceAnnotationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingAnnotation(null)
            setPendingUv(null)
            setPendingPoint(null)
            setManualAdd(false)
          }
        }}
        initial={editingAnnotation}
        suggestedRegion={pendingUv ? regionFromUv(pendingUv, bounds) : ('other' as FaceRegion)}
        onSave={handleSaveAnnotation}
      />

      <AlertDialog
        open={deleteAnnotationTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAnnotationTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć obserwację?</AlertDialogTitle>
            <AlertDialogDescription>
              Usunięta zostanie obserwacja{' '}
              <strong>
                #{deleteAnnotationTarget?.number} {deleteAnnotationTarget?.label || 'bez nazwy'}
              </strong>
              . Pozostałe obserwacje zostaną przenumerowane.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                confirmDeleteAnnotation()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń obserwację
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyczyścić cały rysunek?</AlertDialogTitle>
            <AlertDialogDescription>
              Usunięte zostaną wszystkie pociągnięcia pędzla i gumki. Numerowane obserwacje
              pozostaną na mapie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setAnalysis((previous) => ({ ...previous, strokes: [] }))
                setRedoStack([])
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Wyczyść rysunek
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

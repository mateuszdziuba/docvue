'use client'

import { Canvas, type ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FACE_SEVERITY_OPTIONS } from '@/lib/consultation'
import {
  annotationAriaLabel,
  colorForCategory,
  drawFaceStrokes,
  FACE_COLOR_CLASSES,
} from '@/lib/face'
import type {
  FaceAnalysis,
  FaceAnnotation,
  FaceColorKey,
  FaceDrawingStroke,
  FaceMeshData,
} from '@/types/consultation'
import { BrushCursor } from './brush-cursor'
import type { FaceTool } from './face-2d-canvas'
import {
  annotationPoint,
  buildFaceAlphaMask,
  buildFaceBackingGeometry,
  buildFaceEyeGeometry,
  buildFaceGeometry,
  createOverlaySurface,
  createSkinDetailTexture,
} from './face-3d-utils'

function CameraControls({ enabled, resetSignal }: { enabled: boolean; resetSignal: number }) {
  const { camera, gl } = useThree()
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl])

  useEffect(() => {
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 2.7
    controls.maxDistance = 6
    controls.minPolarAngle = Math.PI * 0.33
    controls.maxPolarAngle = Math.PI * 0.67
    controls.minAzimuthAngle = -Math.PI * 0.22
    controls.maxAzimuthAngle = Math.PI * 0.22
    controls.rotateSpeed = 0.55
    controls.zoomSpeed = 0.7
    controls.update()
    return () => controls.dispose()
  }, [controls])

  useEffect(() => {
    controls.enabled = enabled
  }, [controls, enabled])

  useEffect(() => {
    if (resetSignal === 0) return
    camera.position.set(0, 0, 4.15)
    controls.target.set(0, 0, 0)
    controls.update()
  }, [camera, controls, resetSignal])

  useFrame(() => controls.update())
  return null
}

function LoadingFace() {
  return (
    <mesh>
      <sphereGeometry args={[0.72, 32, 24]} />
      <meshBasicMaterial color="#8b6f6b" wireframe transparent opacity={0.35} />
    </mesh>
  )
}

function PinProjector({
  geometry,
  annotations,
  pinRefs,
  depthScale,
}: {
  geometry: THREE.BufferGeometry
  annotations: FaceAnnotation[]
  pinRefs: React.RefObject<Map<string, HTMLButtonElement>>
  depthScale: number
}) {
  const { camera, size } = useThree()
  const scaleVector = useMemo(() => new THREE.Vector3(1, 1, depthScale), [depthScale])

  useFrame(() => {
    for (const annotation of annotations) {
      const element = pinRefs.current?.get(annotation.id)
      if (!element) continue
      const local = annotationPoint(geometry, annotation)
      if (!local) {
        element.style.display = 'none'
        continue
      }
      const world = local.clone().multiply(scaleVector)
      const projected = world.clone().project(camera)
      const x = (projected.x * 0.5 + 0.5) * size.width
      const y = (-projected.y * 0.5 + 0.5) * size.height
      element.style.display = projected.z < 1 ? 'flex' : 'none'
      element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    }
  })

  return null
}

function FaceScene({
  photoUrl,
  mesh,
  geometry,
  analysis,
  tool,
  color,
  width,
  hideDrawing,
  depthScale,
  skinTextureEnabled,
  skinTextureStrength,
  onAddAnnotation,
  onCommitStroke,
}: {
  photoUrl: string
  mesh: FaceMeshData
  geometry: THREE.BufferGeometry
  analysis: FaceAnalysis
  tool: FaceTool
  color: FaceColorKey
  width: number
  hideDrawing: boolean
  depthScale: number
  skinTextureEnabled: boolean
  skinTextureStrength: number
  onAddAnnotation: (uv: { x: number; y: number }, point: [number, number, number]) => void
  onCommitStroke: (stroke: FaceDrawingStroke) => void
}) {
  const photoTexture = useLoader(THREE.TextureLoader, photoUrl)
  photoTexture.colorSpace = THREE.SRGBColorSpace
  photoTexture.flipY = false
  photoTexture.anisotropy = 8
  photoTexture.needsUpdate = true
  const alphaMask = useMemo(() => buildFaceAlphaMask(mesh), [mesh])
  const backingGeometry = useMemo(() => buildFaceBackingGeometry(mesh), [mesh])
  const eyeGeometries = useMemo(
    () => ({
      left: buildFaceEyeGeometry(mesh, 'left'),
      right: buildFaceEyeGeometry(mesh, 'right'),
    }),
    [mesh],
  )
  const skinDetail = useMemo(
    () =>
      skinTextureEnabled && photoTexture.image
        ? createSkinDetailTexture(photoTexture.image as HTMLImageElement)
        : null,
    [photoTexture.image, skinTextureEnabled],
  )
  const faceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: photoTexture,
        alphaMap: alphaMask ?? null,
        transparent: true,
        alphaTest: 0.04,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [photoTexture, alphaMask],
  )
  useEffect(() => {
    return () => faceMaterial.dispose()
  }, [faceMaterial])
  const overlay = useMemo(() => createOverlaySurface(mesh), [mesh])
  useEffect(() => {
    return () => {
      alphaMask?.dispose()
      backingGeometry.dispose()
      eyeGeometries.left?.dispose()
      eyeGeometries.right?.dispose()
      skinDetail?.dispose()
      overlay?.texture.dispose()
    }
  }, [alphaMask, backingGeometry, eyeGeometries, skinDetail, overlay])
  const liveStrokeRef = useRef<FaceDrawingStroke | null>(null)
  const drawingRef = useRef(false)
  const redrawOverlay = useCallback(() => {
    if (!overlay) return
    const context = overlay.canvas.getContext('2d')
    if (!context) return
    if (hideDrawing) {
      context.clearRect(0, 0, overlay.canvas.width, overlay.canvas.height)
    } else {
      drawFaceStrokes(
        context,
        analysis.strokes,
        overlay.canvas.width,
        overlay.canvas.height,
        liveStrokeRef.current,
      )
    }
    overlay.texture.needsUpdate = true
  }, [analysis.strokes, hideDrawing, overlay])

  useEffect(() => {
    redrawOverlay()
  }, [redrawOverlay])

  const uvFromEvent = (event: ThreeEvent<PointerEvent>) => {
    if (!event.uv) return null
    return { x: event.uv.x, y: event.uv.y }
  }

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (tool === 'orbit') return
    event.stopPropagation()
    const uv = uvFromEvent(event)
    if (!uv) return

    if (tool === 'pin') {
      const point = event.point
      onAddAnnotation(uv, [point.x, point.y, point.z / Math.max(depthScale, 0.001)])
      return
    }

    if (hideDrawing) return
    if (tool !== 'draw' && tool !== 'soft' && tool !== 'erase') return

    drawingRef.current = true
    liveStrokeRef.current = {
      id: crypto.randomUUID(),
      tool: tool === 'draw' ? 'pen' : tool === 'soft' ? 'soft' : 'eraser',
      color,
      width,
      points: [uv],
    }
    ;(
      event.target as unknown as { setPointerCapture?: (pointerId: number) => void }
    ).setPointerCapture?.(event.pointerId)
    redrawOverlay()
  }

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!drawingRef.current || !liveStrokeRef.current) return
    event.stopPropagation()
    const uv = uvFromEvent(event)
    if (!uv) return
    const points = liveStrokeRef.current.points
    const previous = points[points.length - 1]
    if (previous && Math.hypot(uv.x - previous.x, uv.y - previous.y) < 0.0015) return
    points.push(uv)
    if (points.length > 4000) points.splice(1, 1)
    redrawOverlay()
  }

  const endStroke = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    const live = liveStrokeRef.current
    liveStrokeRef.current = null
    if (live && live.points.length >= 2) onCommitStroke(live)
    redrawOverlay()
  }

  return (
    <group scale={[1, 1, depthScale]}>
      <ambientLight intensity={1.0} />
      <directionalLight position={[2.5, 2, 3.5]} intensity={1.2} />
      <directionalLight position={[-2.5, -1, 2]} intensity={0.4} />

      <mesh geometry={backingGeometry} raycast={() => null}>
        <meshBasicMaterial map={photoTexture} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <mesh
        geometry={geometry}
        material={faceMaterial}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={(event) => {
          if (drawingRef.current && event.buttons === 0) endStroke()
        }}
      />

      {skinDetail ? (
        <mesh
          geometry={geometry}
          scale={[1.001, 1.001, 1.001]}
          renderOrder={1}
          raycast={() => null}
        >
          <meshBasicMaterial
            map={skinDetail}
            transparent
            opacity={Math.min(0.7, skinTextureStrength * 0.7)}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      {eyeGeometries.left ? (
        <mesh geometry={eyeGeometries.left} renderOrder={3} raycast={() => null}>
          <meshBasicMaterial map={photoTexture} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ) : null}
      {eyeGeometries.right ? (
        <mesh geometry={eyeGeometries.right} renderOrder={3} raycast={() => null}>
          <meshBasicMaterial map={photoTexture} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ) : null}

      {overlay && !hideDrawing ? (
        <mesh
          geometry={geometry}
          renderOrder={2}
          raycast={() => null}
          scale={[1.001, 1.001, 1.001]}
        >
          <meshBasicMaterial
            map={overlay.texture}
            transparent
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  )
}

export function Face3DCanvas({
  photoUrl,
  analysis,
  tool,
  color,
  width,
  hideDrawing,
  selectedId,
  disabled,
  skinTextureEnabled,
  skinTextureStrength,
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
  skinTextureEnabled: boolean
  skinTextureStrength: number
  onAddAnnotation: (uv: { x: number; y: number }, point: [number, number, number]) => void
  onSelectAnnotation: (id: string) => void
  onCommitStroke: (stroke: FaceDrawingStroke) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pinRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [resetSignal, setResetSignal] = useState(0)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const mesh = analysis.mesh
  const geometry = useMemo(() => (mesh ? buildFaceGeometry(mesh) : null), [mesh])

  const updateCursor = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  const cursorDiameter = Math.max(6, width * (tool === 'soft' ? 2.6 : 1.1))

  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  if (!mesh || !geometry) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-panel-surface/5 text-sm text-muted-foreground">
        Model 3D nie jest jeszcze gotowy.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative mx-auto w-full overflow-hidden rounded-2xl border border-border/60 bg-panel-surface"
        onPointerMoveCapture={updateCursor}
        onPointerEnter={updateCursor}
        onPointerLeave={() => setCursor(null)}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.16),transparent_58%)]"
        />
        <Canvas
          camera={{ position: [0, 0, 4.15], fov: 35, near: 0.1, far: 100 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          className={`!h-[min(62vh,38rem)] !w-full ${
            tool === 'draw' || tool === 'soft' || tool === 'erase'
              ? 'cursor-none'
              : tool === 'pin'
                ? 'cursor-copy'
                : 'cursor-grab'
          }`}
        >
          <Suspense fallback={<LoadingFace />}>
            <FaceScene
              photoUrl={photoUrl}
              mesh={mesh}
              geometry={geometry}
              analysis={analysis}
              tool={disabled ? 'orbit' : tool}
              color={color}
              width={width}
              hideDrawing={hideDrawing}
              depthScale={analysis.depthScale}
              skinTextureEnabled={skinTextureEnabled}
              skinTextureStrength={skinTextureStrength}
              onAddAnnotation={onAddAnnotation}
              onCommitStroke={onCommitStroke}
            />
            <PinProjector
              geometry={geometry}
              annotations={analysis.annotations}
              pinRefs={pinRefs}
              depthScale={analysis.depthScale}
            />
          </Suspense>
          <CameraControls enabled={!disabled && tool === 'orbit'} resetSignal={resetSignal} />
        </Canvas>

        <div className="pointer-events-none absolute inset-0">
          {analysis.annotations.map((annotation) => {
            const colorKey = colorForCategory(annotation.category)
            const severity =
              FACE_SEVERITY_OPTIONS.find((option) => option.value === annotation.severity)?.label ??
              ''
            return (
              <button
                key={annotation.id}
                ref={(element) => {
                  if (element) pinRefs.current.set(annotation.id, element)
                  else pinRefs.current.delete(annotation.id)
                }}
                type="button"
                onClick={() => onSelectAnnotation(annotation.id)}
                aria-label={annotationAriaLabel(
                  annotation.number,
                  annotation.category,
                  annotation.region,
                  severity,
                )}
                aria-pressed={selectedId === annotation.id}
                className={`pointer-events-auto absolute left-0 top-0 hidden h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  FACE_COLOR_CLASSES[colorKey]
                } ${selectedId === annotation.id ? 'ring-2 ring-foreground/50' : ''}`}
                style={{ willChange: 'transform' }}
                title={annotation.label || `Obserwacja #${annotation.number}`}
              >
                {annotation.number}
              </button>
            )
          })}
        </div>

        {cursor && !disabled && (tool === 'draw' || tool === 'soft' || tool === 'erase') ? (
          <BrushCursor x={cursor.x} y={cursor.y} diameter={cursorDiameter} soft={tool === 'soft'} />
        ) : null}

        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground backdrop-blur">
          3D · 2.5D mesh
        </div>
        <button
          type="button"
          onClick={() => setResetSignal((value) => value + 1)}
          className="absolute bottom-3 right-3 min-h-9 rounded-full bg-background/85 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Widok frontalny
        </button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Przeciągnij, aby obrócić (±35–40°) · kółko / pinch, aby przybliżyć. W trybie rysowania obrót
        jest zablokowany.
      </p>
    </div>
  )
}

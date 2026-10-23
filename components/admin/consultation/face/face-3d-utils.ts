import * as THREE from 'three'
import type { FaceAnnotation, FaceMeshData } from '@/types/consultation'

const MESH_SCALE = 2.2
const DEPTH_FACTOR = 1.2
const EYE_PATCH_OFFSET = 0.025

interface FaceTransform {
  aspect: number
  centerX: number
  centerY: number
  fitScale: number
}

function faceTransform(mesh: FaceMeshData): FaceTransform {
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

  const faceHeight = Math.max(0.001, maxY - minY)
  return {
    aspect: mesh.imageWidth / Math.max(1, mesh.imageHeight),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    fitScale: MESH_SCALE / faceHeight,
  }
}

function localPosition(
  transform: FaceTransform,
  x: number,
  y: number,
  z: number,
  zOffset = 0,
): [number, number, number] {
  return [
    (x - transform.centerX) * transform.aspect * transform.fitScale,
    -(y - transform.centerY) * transform.fitScale,
    -z * transform.fitScale * DEPTH_FACTOR + zOffset,
  ]
}

function findNoseTip(mesh: FaceMeshData): { x: number; y: number } {
  let best = { x: 0.5, y: 0.5, z: Number.POSITIVE_INFINITY }
  for (const [x, y, z] of mesh.landmarks) {
    if (x < 0.4 || x > 0.6 || y < 0.3 || y > 0.7) continue
    if (z < best.z) best = { x, y, z }
  }
  return { x: best.x, y: best.y }
}

export function buildFaceGeometry(mesh: FaceMeshData): THREE.BufferGeometry {
  const transform = faceTransform(mesh)
  const nose = findNoseTip(mesh)
  const positions = new Float32Array(mesh.landmarks.length * 3)
  const uvs = new Float32Array(mesh.landmarks.length * 2)

  mesh.landmarks.forEach(([x, y, z], index) => {
    const [px, py, baseZ] = localPosition(transform, x, y, z)
    // Delikatne podbicie grzbietu i czubka nosa — MediaPipe daje płaski
    // relief, a to właśnie nos najbardziej zdradza brak głębi.
    const dx = x - nose.x
    const dy = y - nose.y
    const tipWeight = Math.exp(-(dx * dx + dy * dy) / (2 * 0.05 * 0.05))
    const bridgeWeight = Math.exp(
      -((x - nose.x) ** 2 / (2 * 0.022 * 0.022) + (y - (nose.y - 0.09)) ** 2 / (2 * 0.055 * 0.055)),
    )
    positions[index * 3] = px
    positions[index * 3 + 1] = py
    positions[index * 3 + 2] = baseZ + tipWeight * 0.06 + bridgeWeight * 0.025
    uvs[index * 2] = x
    uvs[index * 2 + 1] = y
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(mesh.triangles.filter((index) => index < mesh.landmarks.length))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function buildFaceBackingGeometry(mesh: FaceMeshData): THREE.BufferGeometry {
  const transform = faceTransform(mesh)
  const contour =
    mesh.oval.length > 2 ? mesh.oval : mesh.landmarks.map(([x, y]) => [x, y] as [number, number])

  const centerUv = contour.reduce(
    (accumulator, [x, y]) => ({ x: accumulator.x + x, y: accumulator.y + y }),
    { x: 0, y: 0 },
  )
  centerUv.x /= contour.length
  centerUv.y /= contour.length

  const nearestZ = (x: number, y: number): number => {
    let bestDistance = Number.POSITIVE_INFINITY
    let z = 0
    for (const [landmarkX, landmarkY, landmarkZ] of mesh.landmarks) {
      const distance = (landmarkX - x) ** 2 + (landmarkY - y) ** 2
      if (distance < bestDistance) {
        bestDistance = distance
        z = landmarkZ
      }
    }
    return z
  }

  const contourZ = contour.map(([x, y]) => nearestZ(x, y))
  const centerZ = contourZ.reduce((total, value) => total + value, 0) / contourZ.length
  const zOffset = -0.1

  const positions: number[] = [
    ...localPosition(transform, centerUv.x, centerUv.y, centerZ, zOffset),
  ]
  const uvs: number[] = [centerUv.x, centerUv.y]

  contour.forEach(([x, y], index) => {
    positions.push(...localPosition(transform, x, y, contourZ[index], zOffset))
    uvs.push(x, y)
  })

  const indices: number[] = []
  for (let index = 1; index <= contour.length; index += 1) {
    indices.push(0, index, index === contour.length ? 1 : index + 1)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Łata na otwór oka. MediaPipe nie zamyka powieki od strony gałki, więc
 * bez tej geometrii w miejscu oczu widać zapadniętą teksturę policzka.
 */
export function buildFaceEyeGeometry(
  mesh: FaceMeshData,
  side: 'left' | 'right',
): THREE.BufferGeometry | null {
  const indices = mesh.eyeIndices?.[side]
  if (!indices || indices.length < 3) return null

  const points = indices
    .map((index) => mesh.landmarks[index])
    .filter((point): point is [number, number, number] => Boolean(point))
  if (points.length < 3) return null

  const transform = faceTransform(mesh)
  const center = points.reduce(
    (accumulator, [x, y, z]) => ({
      x: accumulator.x + x,
      y: accumulator.y + y,
      z: accumulator.z + z,
    }),
    { x: 0, y: 0, z: 0 },
  )
  center.x /= points.length
  center.y /= points.length
  center.z /= points.length

  const ordered = [...points].sort(
    (a, b) =>
      Math.atan2(a[1] - center.y, a[0] - center.x) - Math.atan2(b[1] - center.y, b[0] - center.x),
  )

  const positions: number[] = [
    ...localPosition(transform, center.x, center.y, center.z, EYE_PATCH_OFFSET),
  ]
  const uvs: number[] = [center.x, center.y]

  for (const [x, y, z] of ordered) {
    positions.push(...localPosition(transform, x, y, z, EYE_PATCH_OFFSET))
    uvs.push(x, y)
  }

  const triangleIndices: number[] = []
  for (let index = 1; index <= ordered.length; index += 1) {
    triangleIndices.push(0, index, index === ordered.length ? 1 : index + 1)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(triangleIndices)
  geometry.computeVertexNormals()
  return geometry
}

export function positionFromUv(
  geometry: THREE.BufferGeometry,
  uv: { x: number; y: number },
): THREE.Vector3 | null {
  const positions = geometry.getAttribute('position')
  const uvs = geometry.getAttribute('uv')
  const index = geometry.getIndex()
  if (!positions || !uvs || !index) return null

  const triangles = index.count / 3
  for (let triangle = 0; triangle < triangles; triangle += 1) {
    const a = index.getX(triangle * 3)
    const b = index.getX(triangle * 3 + 1)
    const c = index.getX(triangle * 3 + 2)

    const ax = uvs.getX(a)
    const ay = uvs.getY(a)
    const bx = uvs.getX(b)
    const by = uvs.getY(b)
    const cx = uvs.getX(c)
    const cy = uvs.getY(c)

    const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if (Math.abs(denominator) < 1e-8) continue
    const w1 = ((by - cy) * (uv.x - cx) + (cx - bx) * (uv.y - cy)) / denominator
    const w2 = ((cy - ay) * (uv.x - cx) + (ax - cx) * (uv.y - cy)) / denominator
    const w3 = 1 - w1 - w2
    if (w1 < -0.001 || w2 < -0.001 || w3 < -0.001) continue

    return new THREE.Vector3(
      positions.getX(a) * w1 + positions.getX(b) * w2 + positions.getX(c) * w3,
      positions.getY(a) * w1 + positions.getY(b) * w2 + positions.getY(c) * w3,
      positions.getZ(a) * w1 + positions.getZ(b) * w2 + positions.getZ(c) * w3,
    )
  }

  return null
}

export function annotationPoint(
  geometry: THREE.BufferGeometry,
  annotation: FaceAnnotation,
): THREE.Vector3 | null {
  if (annotation.point) {
    return new THREE.Vector3(...annotation.point)
  }
  return positionFromUv(geometry, annotation.uv)
}

export function buildFaceAlphaMask(mesh: FaceMeshData): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const size = 768
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = 'black'
  context.fillRect(0, 0, size, size)
  context.fillStyle = 'white'
  context.filter = 'blur(7px)'

  const points =
    mesh.oval.length > 4
      ? mesh.oval
      : [
          [0.2, 0.16],
          [0.5, 0.1],
          [0.8, 0.16],
          [0.9, 0.5],
          [0.78, 0.84],
          [0.5, 0.92],
          [0.22, 0.84],
          [0.1, 0.5],
        ]

  context.beginPath()
  points.forEach(([x, y], index) => {
    const px = x * size
    const py = y * size
    if (index === 0) context.moveTo(px, py)
    else context.lineTo(px, py)
  })
  context.closePath()
  context.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.flipY = false
  texture.needsUpdate = true
  return texture
}

function boxBlur(
  source: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const horizontal = new Float32Array(source.length)
  const output = new Float32Array(source.length)
  const diameter = radius * 2 + 1

  for (let y = 0; y < height; y += 1) {
    let sum = 0
    for (let x = -radius; x <= radius; x += 1) {
      sum += source[y * width + Math.min(width - 1, Math.max(0, x))]
    }
    for (let x = 0; x < width; x += 1) {
      horizontal[y * width + x] = sum / diameter
      const removeX = Math.min(width - 1, Math.max(0, x - radius))
      const addX = Math.min(width - 1, Math.max(0, x + radius + 1))
      sum += source[y * width + addX] - source[y * width + removeX]
    }
  }

  for (let x = 0; x < width; x += 1) {
    let sum = 0
    for (let y = -radius; y <= radius; y += 1) {
      sum += horizontal[Math.min(height - 1, Math.max(0, y)) * width + x]
    }
    for (let y = 0; y < height; y += 1) {
      output[y * width + x] = sum / diameter
      const removeY = Math.min(height - 1, Math.max(0, y - radius))
      const addY = Math.min(height - 1, Math.max(0, y + radius + 1))
      sum += horizontal[addY * width + x] - horizontal[removeY * width + x]
    }
  }

  return output
}

/**
 * Tworzy mapę bump z prawdziwego zdjęcia: łączy drobny detal (pory, blizny)
 * z szerszym pasmem (zmarszczki). To wizualne podbicie tekstury, nie diagnoza.
 */
export function createSkinBumpTexture(
  image: HTMLImageElement | ImageBitmap,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const maxEdge = 640
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null

  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height)
  const luminance = new Float32Array(width * height)

  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4
    luminance[index] =
      pixels.data[offset] * 0.299 +
      pixels.data[offset + 1] * 0.587 +
      pixels.data[offset + 2] * 0.114
  }

  const fine = boxBlur(luminance, width, height, 1)
  const coarse = boxBlur(luminance, width, height, 4)
  const output = context.createImageData(width, height)

  for (let index = 0; index < luminance.length; index += 1) {
    const detail = (luminance[index] - fine[index]) * 1.35
    const folds = (luminance[index] - coarse[index]) * 0.9
    const value = Math.max(0, Math.min(255, 128 + (detail + folds) * 2.1))
    const offset = index * 4
    output.data[offset] = value
    output.data[offset + 1] = value
    output.data[offset + 2] = value
    output.data[offset + 3] = 255
  }

  context.putImageData(output, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.flipY = false
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

export function createSkinDetailTexture(
  image: HTMLImageElement | ImageBitmap,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const maxEdge = 640
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null

  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height)
  const luminance = new Float32Array(width * height)

  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4
    luminance[index] =
      pixels.data[offset] * 0.299 +
      pixels.data[offset + 1] * 0.587 +
      pixels.data[offset + 2] * 0.114
  }

  const fine = boxBlur(luminance, width, height, 1)
  const coarse = boxBlur(luminance, width, height, 4)
  const output = context.createImageData(width, height)

  for (let index = 0; index < luminance.length; index += 1) {
    const detail =
      (luminance[index] - fine[index]) * 1.35 + (luminance[index] - coarse[index]) * 0.9
    const normalized = Math.max(-1, Math.min(1, detail / 34))
    const offset = index * 4
    const value = normalized >= 0 ? 255 : 0
    output.data[offset] = value
    output.data[offset + 1] = value
    output.data[offset + 2] = value
    output.data[offset + 3] = Math.round(Math.abs(normalized) * 255 * 0.65)
  }

  context.putImageData(output, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.flipY = false
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

export function createOverlaySurface(
  mesh: FaceMeshData,
): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } | null {
  if (typeof document === 'undefined') return null
  const maxEdge = 1200
  const scale = Math.min(1, maxEdge / Math.max(mesh.imageWidth, mesh.imageHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(mesh.imageWidth * scale))
  canvas.height = Math.max(1, Math.round(mesh.imageHeight * scale))
  const texture = new THREE.CanvasTexture(canvas)
  texture.flipY = false
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return { canvas, texture }
}

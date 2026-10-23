import type { FaceLandmarker as FaceLandmarkerType } from '@mediapipe/tasks-vision'
import type { FaceMeshData } from '@/types/consultation'

const MEDIAPIPE_VERSION = '1.1.1'
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let landmarkerPromise: Promise<FaceLandmarkerType> | null = null

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nie udało się wczytać zdjęcia'))
    image.src = url
  })
}

async function createLandmarker(): Promise<FaceLandmarkerType> {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
  const vision = await FilesetResolver.forVisionTasks(WASM_URL)

  const options = {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU' as const,
    },
    runningMode: 'IMAGE' as const,
    numFaces: 2,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  }

  try {
    return await FaceLandmarker.createFromOptions(vision, options)
  } catch {
    return await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'CPU' as const },
    })
  }
}

function getLandmarker(): Promise<FaceLandmarkerType> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker().catch((error) => {
      landmarkerPromise = null
      throw error
    })
  }
  return landmarkerPromise
}

function convexHull(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length < 3) return points
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (origin: [number, number], a: [number, number], b: [number, number]): number =>
    (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0])

  const lower: Array<[number, number]> = []
  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop()
    }
    lower.push(point)
  }

  const upper: Array<[number, number]> = []
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    ) {
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

function faceArea(landmarks: Array<{ x: number; y: number }>): number {
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const point of landmarks) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY)
}

export interface FaceDetectionResult {
  mesh: FaceMeshData
  warning: string | null
}

export async function detectFaceMesh(imageUrl: string): Promise<FaceDetectionResult> {
  const [image, landmarker] = await Promise.all([loadImage(imageUrl), getLandmarker()])
  const { FaceLandmarker } = await import('@mediapipe/tasks-vision')

  let result: ReturnType<FaceLandmarkerType['detect']>
  try {
    result = landmarker.detect(image)
  } catch {
    throw new Error('Nie udało się uruchomić analizy twarzy. Spróbuj ponownie.')
  }

  if (!result.faceLandmarks?.length) {
    throw new Error(
      'Nie wykryto twarzy. Użyj zdjęcia frontalnego, z dobrze widoczną twarzą i równomiernym światłem.',
    )
  }

  let selectedIndex = 0
  let selectedArea = -1
  result.faceLandmarks.forEach((landmarks, index) => {
    const area = faceArea(landmarks)
    if (area > selectedArea) {
      selectedArea = area
      selectedIndex = index
    }
  })

  const selected = result.faceLandmarks[selectedIndex]
  const landmarks = selected.map((point) => [point.x, point.y, point.z] as [number, number, number])

  const triangles: number[] = []
  const connections = FaceLandmarker.FACE_LANDMARKS_TESSELATION
  for (let index = 0; index + 2 < connections.length; index += 3) {
    const a = connections[index].start
    const b = connections[index].end
    const c = connections[index + 1].end
    if (a < landmarks.length && b < landmarks.length && c < landmarks.length) {
      triangles.push(a, b, c)
    }
  }

  // Obrys twarzy budujemy z wypukłej otoczki wszystkich punktów. Kolejność
  // połączeń FACE_OVAL bywa różna między wersjami modelu, a otoczka daje
  // stabilną, gładką maskę niezależnie od wariantu.
  const oval = convexHull(landmarks.map(([x, y]) => [x, y] as [number, number]))

  const collectEyeIndices = (connections: Array<{ start: number; end: number }>) => {
    const indices = new Set<number>()
    for (const connection of connections) {
      indices.add(connection.start)
      indices.add(connection.end)
    }
    return Array.from(indices).filter((index) => index < landmarks.length)
  }

  return {
    mesh: {
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      landmarks,
      triangles,
      oval,
      eyeIndices: {
        left: collectEyeIndices(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE),
        right: collectEyeIndices(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE),
      },
    },
    warning:
      result.faceLandmarks.length > 1
        ? 'Na zdjęciu wykryto więcej niż jedną twarz — użyto największej.'
        : null,
  }
}

export function detectFaceMeshFromFile(
  file: File,
): Promise<{ mesh: FaceMeshData; warning: string | null }> {
  const url = URL.createObjectURL(file)
  return detectFaceMesh(url).finally(() => URL.revokeObjectURL(url))
}

import { describe, expect, it, vi } from 'vitest'
import {
  buildFaceBackingGeometry,
  buildFaceEyeGeometry,
  buildFaceGeometry,
  positionFromUv,
} from '@/components/admin/consultation/face/face-3d-utils'
import {
  calculateAge,
  consultationSummaryFromRow,
  createEmptyConsultationData,
  createEmptyFaceAnalysis,
  faceAnalysisSchema,
  getStepCompletion,
  normalizeConsultationData,
} from '@/lib/consultation'
import { regionFromUv } from '@/lib/face'
import type { FaceMeshData } from '@/types/consultation'

const mesh: FaceMeshData = {
  imageWidth: 1000,
  imageHeight: 1200,
  landmarks: [
    [0.4, 0.2, 0],
    [0.6, 0.2, 0],
    [0.5, 0.8, 0.1],
  ],
  triangles: [0, 1, 2],
  oval: [
    [0.4, 0.2],
    [0.6, 0.2],
    [0.5, 0.8],
  ],
  eyeIndices: null,
}

describe('consultation data', () => {
  it('tworzy puste dane z poprawną datą', () => {
    const data = createEmptyConsultationData(new Date(2026, 0, 1, 12))
    expect(data.meta.consultationDate).toBe('2026-01-01')
    expect(data.rhythm.sleepHours).toBeNull()
    expect(data.summary.plan.stage1.homeCare).toBe('')
  })

  it('normalizuje wartości i odrzuca nieznane opcje', () => {
    const data = normalizeConsultationData({
      meta: { consultationDate: '2026-10-23', comment: 'Test' },
      rhythm: { sleepHours: 99, bedtime: '23:00', sleepIssues: 'yes' },
      lifestyle: {
        stressSymptoms: ['bezsennosc', 'nieznana_opcja', 42],
        workMode: ['siedzacy', 'siedzacy'],
      },
      health: { pregnancy: 'na' },
    })

    expect(data.meta.consultationDate).toBe('2026-10-23')
    expect(data.rhythm.sleepHours).toBe(16)
    expect(data.rhythm.sleepIssues).toBe('yes')
    expect(data.lifestyle.stressSymptoms).toEqual(['bezsennosc'])
    expect(data.lifestyle.workMode).toEqual(['siedzacy'])
    expect(data.health.pregnancy).toBe('na')
  })

  it('zwraca domyślne dane dla niepoprawnego wejścia', () => {
    const data = normalizeConsultationData(null)
    expect(data.intro.motivation).toBe('')
    expect(data.summary.plan.stage3.treatments).toBe('')
  })

  it('oblicza wiek i formatuje datę', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'))
    expect(calculateAge('1992-04-12')).toBe(34)
    expect(calculateAge('1992-12-12')).toBe(33)
    expect(calculateAge(null)).toBeNull()
    vi.useRealTimers()
  })

  it('liczy postęp kroków', () => {
    const empty = createEmptyConsultationData()
    expect(getStepCompletion(empty, 'intro')).toBe(0)
    const data = normalizeConsultationData({
      intro: { motivation: 'A', expectations: 'B', previousTreatments: 'C' },
    })
    expect(getStepCompletion(data, 'intro')).toBe(100)
  })

  it('buduje podsumowanie listy', () => {
    const summary = consultationSummaryFromRow({
      id: '1',
      status: 'completed',
      consultation_date: '2026-10-23',
      completed_at: '2026-10-23T10:00:00Z',
      updated_at: '2026-10-23T10:00:00Z',
      created_by_name: 'Anna',
      face_annotation_count: 3,
      face_photo_path: 'path.jpg',
      data: { summary: { cosmeticGoal: 'Nawilżenie', areasToImprove: ['dieta'] } },
    })
    expect(summary.status).toBe('completed')
    expect(summary.face_annotation_count).toBe(3)
    expect(summary.has_face_photo).toBe(true)
    expect(summary.cosmetic_goal).toBe('Nawilżenie')
  })
})

describe('face analysis', () => {
  it('waliduje pustą analizę', () => {
    const parsed = faceAnalysisSchema.safeParse(createEmptyFaceAnalysis())
    expect(parsed.success).toBe(true)
  })

  it('domyślnie zapisuje analizę jako zdjęciową', () => {
    expect(createEmptyFaceAnalysis().base).toBe('photo')
  })

  it('akceptuje szablon twarzy bez zdjęcia', () => {
    const parsed = faceAnalysisSchema.safeParse({
      ...createEmptyFaceAnalysis(),
      base: 'template',
      view: '2d',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.base).toBe('template')
  })

  it('akceptuje szeroki ślad miękkiego pędzla', () => {
    const analysis = createEmptyFaceAnalysis()
    analysis.strokes = [
      {
        id: 'soft-1',
        tool: 'soft',
        color: 'primary',
        width: 160,
        points: [
          { x: 0.4, y: 0.4 },
          { x: 0.6, y: 0.6 },
        ],
      },
    ]
    expect(faceAnalysisSchema.safeParse(analysis).success).toBe(true)
  })

  it('odrzuca zbyt wiele obserwacji', () => {
    const analysis = createEmptyFaceAnalysis()
    analysis.annotations = Array.from({ length: 101 }, (_, index) => ({
      id: String(index),
      number: index + 1,
      category: 'lesion' as const,
      severity: 'mild' as const,
      region: 'other' as const,
      label: '',
      description: '',
      uv: { x: 0.5, y: 0.5 },
      point: null,
    }))
    expect(faceAnalysisSchema.safeParse(analysis).success).toBe(false)
  })

  it('odrzuca nieprawidłową siatkę', () => {
    const analysis = createEmptyFaceAnalysis()
    analysis.mesh = {
      ...mesh,
      triangles: [0, 1],
    }
    expect(faceAnalysisSchema.safeParse(analysis).success).toBe(false)
  })
})

describe('face geometry', () => {
  it('buduje geometrię i znajduje pozycję z UV', () => {
    const geometry = buildFaceGeometry(mesh)
    expect(geometry.getAttribute('position').count).toBe(3)
    expect(geometry.getIndex()?.count).toBe(3)
    const point = positionFromUv(geometry, { x: 0.5, y: 0.5 })
    expect(point).not.toBeNull()
    geometry.dispose()
  })

  it('buduje wypukłe tło dla ust i oczu', () => {
    const geometry = buildFaceBackingGeometry(mesh)
    expect(geometry.getAttribute('position').count).toBe(4)
    expect(geometry.getIndex()?.count).toBe(9)
    geometry.dispose()
  })

  it('buduje łatę oka z indeksów landmarków', () => {
    const geometry = buildFaceEyeGeometry(
      { ...mesh, eyeIndices: { left: [0, 1, 2], right: [] } },
      'left',
    )
    expect(geometry).not.toBeNull()
    expect(geometry?.getAttribute('position').count).toBe(4)
    geometry?.dispose()
  })

  it('klasyfikuje region twarzy', () => {
    const bounds = { minX: 0.4, minY: 0.1, maxX: 0.6, maxY: 0.9 }
    expect(regionFromUv({ x: 0.5, y: 0.15 }, bounds)).toBe('forehead')
    expect(regionFromUv({ x: 0.42, y: 0.55 }, bounds)).toBe('leftCheek')
    expect(regionFromUv({ x: 0.58, y: 0.55 }, bounds)).toBe('rightCheek')
    expect(regionFromUv({ x: 0.5, y: 0.85 }, bounds)).toBe('chin')
  })
})

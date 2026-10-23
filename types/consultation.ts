export type YesNo = 'yes' | 'no'
export type YesNoMaybe = 'yes' | 'no' | 'sometimes'
export type YesNoPartly = 'yes' | 'no' | 'partly'
export type YesNoNa = 'yes' | 'no' | 'na'

export type ConsultationStatus = 'draft' | 'completed'

export interface ConsultationPlanStage {
  homeCare: string
  treatments: string
  supplementation: string
  /** Zabiegi z katalogu gabinetu przypisane do etapu. */
  treatmentIds: string[]
}

export interface ConsultationData {
  meta: {
    consultationDate: string
    comment: string
  }
  intro: {
    motivation: string
    expectations: string
    previousTreatments: string
    satisfaction: string
  }
  rhythm: {
    sleepHours: number | null
    bedtime: string
    wakeTime: string
    sleepIssues: YesNo | null
    sleepIssuesDetails: string
    screensBeforeBed: YesNoMaybe | null
    ventilate: YesNo | null
    darkness: YesNo | null
    roomTemperature: string
    dinner: string
    notes: string
  }
  lifestyle: {
    workMode: string[]
    workLocation: string[]
    responsibility: YesNoPartly | null
    wearsMakeup: YesNo | null
    makeupIntensity: number | null
    stressFrequency: string
    stressSymptoms: string[]
    stressReactions: string[]
    stressReactionOther: string
    restTime: 'yes' | 'no' | 'varies' | null
    freeTime: string[]
    freeTimeOther: string
    activityFrequency: string
    activityTypes: string[]
    activityOther: string
    postWorkoutCare: string
    smoking: YesNo | null
    smokingDetails: string
    otherStimulants: YesNo | null
    otherStimulantsDetails: string
    notes: string
  }
  diet: {
    specialDiets: string[]
    specialDietOther: string
    breakfast: string
    secondBreakfast: string
    lunch: string
    dinner: string
    snacks: string
    processedFood: string
    eatingOut: string
    vegetables: string
    dietAssessment: string
    mealBreaks: YesNoMaybe | null
    digestiveSymptoms: string[]
    digestiveDetails: string
    waterGlasses: number | null
    snacking: YesNo | null
    snackingDetails: string
    sweets: YesNo | null
    sweetsFrequency: string
    fattyFish: 'yes' | 'no' | 'sometimes' | null
    metabolicFlags: string[]
    supplements: string[]
    supplementOther: string
    notes: string
  }
  health: {
    conditions: YesNo | null
    conditionsDetails: string
    anaphylaxis: YesNo | null
    anaphylaxisDetails: string
    specialistCare: YesNo | null
    specialistDetails: string
    allergies: YesNo | null
    allergyDetails: string
    pregnancy: YesNoNa | null
    pregnancyMonth: string
    menstrualRegular: YesNoNa | null
    menopause: YesNoNa | null
    hrt: YesNoNa | null
    medications: YesNo | null
    medicationsDetails: string
    keloids: YesNo | null
    comorbidities: string[]
    comorbidityOther: string
    tests: string[]
    testResults: string
    notes: string
  }
  care: {
    habits: string[]
    homeBudget: string
    salonBudget: string
    morningRoutine: string
    eveningRoutine: string
    notes: string
  }
  summary: {
    identifiedProblems: string
    areasToImprove: string[]
    diagnostics: string[]
    diagnosticsOther: string
    cosmeticGoal: string
    notes: string
    plan: {
      stage1: ConsultationPlanStage
      stage2: ConsultationPlanStage
      stage3: ConsultationPlanStage
    }
  }
}

export type FaceView = '2d' | '3d'

/** Źródło mapy: zdjęcie klienta albo wbudowany szablon twarzy. */
export type FaceBase = 'photo' | 'template'

export type FaceAnnotationCategory =
  | 'erythema'
  | 'pigmentation'
  | 'lesion'
  | 'dryness'
  | 'wrinkles'
  | 'vessels'
  | 'scar'
  | 'other'

export type FaceSeverity = 'mild' | 'moderate' | 'severe'

export type FaceRegion =
  | 'forehead'
  | 'eyeArea'
  | 'nose'
  | 'leftCheek'
  | 'rightCheek'
  | 'mouth'
  | 'chin'
  | 'jawline'
  | 'other'

export interface FaceAnnotation {
  id: string
  number: number
  category: FaceAnnotationCategory
  severity: FaceSeverity
  region: FaceRegion
  label: string
  description: string
  uv: { x: number; y: number }
  point: [number, number, number] | null
}

export type FaceColorKey = 'destructive' | 'warning' | 'primary' | 'info' | 'success' | 'neutral'

export interface FaceDrawingPoint {
  x: number
  y: number
}

export interface FaceDrawingStroke {
  id: string
  tool: 'pen' | 'eraser' | 'soft'
  color: FaceColorKey
  width: number
  points: FaceDrawingPoint[]
}

export interface FaceMeshData {
  imageWidth: number
  imageHeight: number
  landmarks: Array<[number, number, number]>
  /** Indeksy trójkątów tessellation MediaPipe (po 3 na trójkąt). */
  triangles: number[]
  /** Kolejne punkty obrysu twarzy w współrzędnych znormalizowanych. */
  oval: Array<[number, number]>
  /** Indeksy landmarków tworzących obrysy oczu (do łatania otworów). */
  eyeIndices: { left: number[]; right: number[] } | null
}

export interface FaceAnalysis {
  version: 1
  base: FaceBase
  mesh: FaceMeshData | null
  annotations: FaceAnnotation[]
  strokes: FaceDrawingStroke[]
  view: FaceView
  depthScale: number
}

export interface ClientConsultation {
  id: string
  salon_id: string
  client_id: string
  created_by: string | null
  created_by_name: string | null
  updated_by: string | null
  status: ConsultationStatus
  consultation_date: string
  schema_version: number
  data: ConsultationData
  face_photo_path: string | null
  face_photo_consent_at: string | null
  face_photo_consent_by: string | null
  face_analysis: FaceAnalysis | null
  face_annotation_count: number
  completed_at: string | null
  revision: number
  created_at: string
  updated_at: string
}

export interface ConsultationSummary {
  id: string
  status: ConsultationStatus
  consultation_date: string
  completed_at: string | null
  updated_at: string
  created_by_name: string | null
  face_annotation_count: number
  has_face_photo: boolean
  cosmetic_goal: string
  areas_to_improve: string[]
  recommended_treatment_ids: string[]
}

export interface ConsultationClient {
  id: string
  name: string
  email: string | null
  phone: string
  birth_date: string | null
  gender: string | null
  important_info: string | null
  location: string | null
  city: string | null
}

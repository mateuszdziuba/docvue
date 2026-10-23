import { z } from 'zod'
import type {
  ClientConsultation,
  ConsultationData,
  ConsultationPlanStage,
  FaceAnalysis,
  FaceAnnotation,
  FaceAnnotationCategory,
  FaceColorKey,
  FaceDrawingStroke,
  FaceRegion,
  FaceSeverity,
  YesNo,
  YesNoMaybe,
  YesNoNa,
  YesNoPartly,
} from '@/types/consultation'

export const CONSULTATION_SCHEMA_VERSION = 1
export const MAX_FACE_ANALYSIS_BYTES = 1_500_000
export const MAX_CONSULTATION_DATA_BYTES = 750_000

export type Option = { value: string; label: string }

const options = (...labels: string[]): Option[] =>
  labels.map((label) => ({
    value: label
      .toLowerCase()
      .replaceAll('ą', 'a')
      .replaceAll('ć', 'c')
      .replaceAll('ę', 'e')
      .replaceAll('ł', 'l')
      .replaceAll('ń', 'n')
      .replaceAll('ó', 'o')
      .replaceAll('ś', 's')
      .replaceAll('ź', 'z')
      .replaceAll('ż', 'z')
      .replaceAll(/[^a-z0-9]+/g, '_')
      .replaceAll(/^_+|_+$/g, ''),
    label,
  }))

export const WORK_MODE_OPTIONS = options('Dzienny', 'Nocny', 'Aktywny', 'Siedzący', 'Hybrydowy')
export const WORK_LOCATION_OPTIONS = options(
  'W pomieszczeniu (biuro, gabinet, dom)',
  'Na zewnątrz (świeże powietrze)',
  'W trasie (podróże, praca w samochodzie)',
)
export const RESPONSIBILITY_OPTIONS = options('Tak', 'Nie', 'Częściowo')
export const STRESS_FREQUENCY_OPTIONS = options(
  'Codziennie',
  'Kilka razy w tygodniu',
  'Sporadycznie',
  'Rzadko',
)
export const STRESS_SYMPTOM_OPTIONS = options(
  'Bezsenność',
  'Zaburzenia koncentracji lub pamięci',
  'Świąd, pieczenie lub nadwrażliwość skóry',
  'Częste infekcje lub przeziębienia',
  'Duża emocjonalność',
  'Zastoje limfatyczne',
  'Mało się ruszam',
  'Świecenie się lub nadmierna tłustość skóry',
  'Przewlekły stres',
  'Przesuszenie skóry',
  'Napięciowe bóle głowy, karku lub pleców',
)
export const STRESS_REACTION_OPTIONS = options(
  'Wycofanie / zmęczenie',
  'Rozdrażnienie / napięcie emocjonalne',
  'Problemy ze snem',
  'Objawy skórne (świąd, wysypka, pogorszenie cery)',
  'Sięganie po słodycze',
  'Sięganie po używki (papierosy, alkohol)',
)
export const REST_TIME_OPTIONS = options('Tak', 'Nie', 'Różnie bywa')
export const FREE_TIME_OPTIONS = options(
  'Spacer lub kontakt z naturą',
  'Czas z bliskimi',
  'Aktywność fizyczna',
  'Czytanie',
  'Odpoczynek / relaks / medytacja',
  'Oglądanie filmów',
  'Pielęgnacja i dbanie o siebie',
  'Gotowanie',
)
export const ACTIVITY_FREQUENCY_OPTIONS = options(
  'Codziennie',
  'Kilka razy w tygodniu',
  'Raz w tygodniu',
  'Sporadycznie',
  'Wcale',
)
export const ACTIVITY_TYPE_OPTIONS = options(
  'Spacery',
  'Nordic walking',
  'Bieganie',
  'Rower',
  'Joga / pilates / stretching',
  'Trening siłowy',
  'Taniec / zajęcia ruchowe',
  'Pływanie',
  'Fitness',
)
export const SPECIAL_DIET_OPTIONS = options(
  'Wegetariańska',
  'Wegańska',
  'Bezglutenowa',
  'Ketogeniczna',
  'Bez nabiału',
  'Niskotłuszczowa',
)
export const PROCESSED_FOOD_OPTIONS = options(
  'Tak, codziennie',
  '3–4 razy w tygodniu',
  '1–2 razy w tygodniu',
  'Wcale',
)
export const VEGETABLES_OPTIONS = options('Tak', 'Raczej tak, ale nie zawsze', 'Raczej nie', 'Nie')
export const DIET_ASSESSMENT_OPTIONS = options(
  'Zdrowa, zrównoważona i różnorodna',
  'Przeciętna, z pewnymi niedoborami',
  'Uboga lub nieregularna',
)
export const YES_NO_MAYBE_OPTIONS = options('Tak', 'Nie', 'Czasami')
export const DIGESTIVE_SYMPTOM_OPTIONS = options(
  'Bóle brzucha',
  'Wzdęcia',
  'Przelewanie w jelitach',
  'Zgaga / refluks',
  'Nieregularne wypróżnienia (zaparcia, biegunki)',
  'Uczucie ciężkości po posiłku',
  'Nudności',
  'Gazy / odbijanie',
  'Świąd skóry lub wysypki po spożyciu niektórych pokarmów',
)
export const METABOLIC_FLAG_OPTIONS = options(
  'Łatwo przybieram na wadze',
  'Miewam napady wilczego głodu na węglowodany',
  'Bardzo uważam na to, co jem, by kontrolować wagę',
  'Odczuwam senność lub spadek energii po słodkich przekąskach',
  'Większość posiłków przygotowuję samodzielnie w domu',
)
export const SUPPLEMENT_OPTIONS = options(
  'Omega 3',
  'Witamina D3',
  'Probiotyki',
  'Prebiotyki',
  'Kolagen',
)
export const COMORBIDITY_OPTIONS = options(
  'Niedoczynność tarczycy',
  'Nadczynność tarczycy',
  'Łuszczyca',
  'Toczeń układowy',
  'Łojotokowe zapalenie skóry',
  'AZS',
  'Cukrzyca',
)
export const TEST_OPTIONS = options(
  'USG piersi',
  'Badanie ginekologiczne',
  'USG tarczycy',
  'Przegląd stomatologiczny',
  'Badania krwi',
  'Witamina D3',
  'Transferyna',
  'Witamina B12',
  'Ferrytyna',
  'Kwas foliowy',
  'Żelazo',
  'Glukoza',
  'Insulina',
  'Badanie ogólne moczu',
  'Morfologia',
  'Profil lipidowy',
  'TSH',
  'ALT',
  'AST',
  'FT3',
  'FT4',
)
export const CARE_HABIT_OPTIONS = options(
  'Zmieniam pościel rzadziej niż raz w tygodniu',
  'Zdarza mi się zasnąć w makijażu',
  'Nie używam osobnego ręcznika do twarzy i ciała',
  'Oczyszczam twarz i nakładam pielęgnację codziennie',
  'Wycieram twarz jednorazowym ręcznikiem papierowym',
  'Często testuję nowe kosmetyki',
  'Często dotykam twarzy rękami',
  'Zauważam wysyp po treningu',
  'Po umyciu twarzy czuję ściągnięcie i od razu muszę nałożyć krem',
)
export const AREA_OPTIONS = options(
  'Rytm dobowy',
  'Styl życia',
  'Dieta',
  'Stan zdrowia',
  'Pielęgnacja',
)
export const DIAGNOSTICS_OPTIONS = options(
  'Dermatolog',
  'Fizjoterapeuta',
  'Stomatolog',
  'Ginekolog',
  'Gastroenterolog',
  'Inny',
)

export const PILLARS = [
  { value: 'rhythm', label: 'Rytm dobowy', short: 'Sen' },
  { value: 'lifestyle', label: 'Styl życia', short: 'Styl' },
  { value: 'diet', label: 'Dieta', short: 'Dieta' },
  { value: 'health', label: 'Stan zdrowia', short: 'Zdrowie' },
  { value: 'care', label: 'Pielęgnacja', short: 'Pielęgnacja' },
] as const

export const CONSULTATION_STEPS = [
  { id: 'intro', label: 'Wstęp', short: 'Wstęp' },
  { id: 'rhythm', label: 'Rytm dobowy', short: 'Rytm' },
  { id: 'lifestyle', label: 'Styl życia', short: 'Styl' },
  { id: 'diet', label: 'Dieta', short: 'Dieta' },
  { id: 'health', label: 'Stan zdrowia', short: 'Zdrowie' },
  { id: 'care', label: 'Pielęgnacja', short: 'Pielęgnacja' },
  { id: 'face', label: 'Mapa twarzy', short: 'Twarz' },
  { id: 'summary', label: 'Podsumowanie', short: 'Plan' },
] as const

export type ConsultationStepId = (typeof CONSULTATION_STEPS)[number]['id']

export interface InfoContent {
  title: string
  lead: string
  bullets?: string[]
  callout?: string
  pyramid?: string[]
  pillars?: string[]
}

export const CARE_PYRAMID = [
  'Inne',
  'Retinol',
  'Złuszczanie',
  'Antyoksydacja',
  'Nawilżanie',
  'Fotoprotekcja',
  'Oczyszczanie',
]

export const CONSULTATION_INFO: Record<Exclude<ConsultationStepId, 'face'> | 'face', InfoContent> =
  {
    intro: {
      title: 'Jak przebiega konsultacja',
      lead: 'Przyglądamy się pięciu obszarom, które wspólnie budują fundament zdrowej i zadbanej skóry: rytmowi dobowemu, diecie, zdrowiu, pielęgnacji i stylowi życia.',
      bullets: [
        'Nie musisz wypełniać wszystkiego od razu — formularz zapisuje się automatycznie.',
        'Pytania otwierające pomagają ustalić cel współpracy i oczekiwania klientki/klienta.',
        'Na końcu powstaje plan terapii w trzech etapach.',
      ],
      pillars: PILLARS.map((pillar) => pillar.label),
    },
    rhythm: {
      title: 'Dlaczego rytm dobowy jest ważny?',
      lead: 'Melatonina to naturalny antyoksydant, który neutralizuje wolne rodniki powstające m.in. pod wpływem UV, stresu i zanieczyszczeń. Chroni komórki skóry przed uszkodzeniami oksydacyjnymi i wspiera regenerację nocą.',
      bullets: [
        'Produkcja melatoniny odbywa się głównie między 22:00 a 6:00.',
        'Zaburzony rytm może nasilać stany zapalne, trądzik, suchość i insulinooporność.',
        'Regularny sen wspiera barierę skórną i gospodarkę hormonalną.',
      ],
      callout: 'Zaburzony rytm dobowy uruchamia reakcję łańcuchową w całym organizmie.',
    },
    lifestyle: {
      title: 'Dlaczego styl życia jest ważny?',
      lead: 'Praca, stres, odpoczynek i aktywność tworzą codzienny obraz skóry. Długotrwałe napięcie i brak regeneracji osłabiają barierę hydrolipidową i spowalniają procesy naprawcze.',
      bullets: [
        'Zarówno brak ruchu, jak i jego nadmiar mogą wpływać na mikrokrążenie i wydzielanie sebum.',
        'Przewlekły stres sprzyja stanom zapalnym i pogorszeniu cery.',
        'Równowaga między aktywnością a odpoczynkiem wspiera układ limfatyczny.',
      ],
      callout: 'Sprawdź, czy zmiany na skórze nie są konsekwencją stylu życia.',
    },
    diet: {
      title: 'Dlaczego dieta jest ważna?',
      lead: 'W jelitach znajduje się około 70% komórek układu odpornościowego. Zaburzona mikrobiota może sprzyjać trądzikowi, AZS, łuszczycy i przewlekłym stanom zapalnym.',
      bullets: [
        'Skóra szybko reaguje na niedobory składników odżywczych i wahania glukozy.',
        'Niezdrowa dieta może prowadzić m.in. do insulinooporności, glikacji, odwodnienia i osłabionej bariery hydrolipidowej.',
        'Regularne posiłki i odpowiednia podaż wody wspierają regenerację.',
      ],
      callout:
        'Zdrowe jelita to fundament nie tylko odporności, ale także zdrowej, promiennej skóry.',
    },
    health: {
      title: 'Dane szczególnej kategorii',
      lead: 'Ta sekcja zawiera informacje o zdrowiu. Wypełniaj ją wyłącznie w zakresie potrzebnym do bezpiecznego zaplanowania zabiegów.',
      bullets: [
        'Dokument jest widoczny tylko dla właściciela i aktywnych pracowników gabinetu.',
        'Nie udostępniaj konsultacji klientowi ani osobom trzecim.',
        'Przetwarzanie danych zdrowotnych powinno być zgodne z polityką prywatności gabinetu.',
      ],
    },
    care: {
      title: 'Na co zwrócić uwagę?',
      lead: 'Piramida pielęgnacji porządkuje elementy według ich wpływu na skórę. Najpierw fundament: oczyszczanie, fotoprotekcja i nawilżanie; dopiero później aktywne składniki.',
      bullets: [
        'Dopasuj kosmetyki do potrzeb skóry i techniki aplikacji.',
        'Sprawdź kolejność, częstotliwość i kompatybilność produktów.',
        'Uwzględnij ryzyko przesuszenia, uszkodzenia bariery NMF i nadmiernej okluzyjności.',
        'Oceń realny wpływ produktów i regularność zmian w pielęgnacji.',
      ],
      pyramid: CARE_PYRAMID,
    },
    face: {
      title: 'Jak działa mapa twarzy?',
      lead: 'Zdjęcie jest przetwarzane lokalnie w przeglądarce. Na jego podstawie powstaje siatka 2.5D, po której można rysować i dodawać obserwacje skórne.',
      bullets: [
        'Zdjęcie powinno być frontalne, równomiernie oświetlone, bez zasłoniętej twarzy.',
        'Rysunki i punkty zapisują się w przestrzeni UV — pozostają na twarzy przy obrocie.',
        'Jeśli 3D nie jest dostępne, edytor przełącza się na widok 2D.',
        'Zdjęcie trafia wyłącznie do prywatnego magazynu gabinetu.',
      ],
    },
    summary: {
      title: 'Jak zaplanować terapię?',
      lead: 'Podsumowanie łączy obserwacje z całej konsultacji. Plan terapii podziel na trzy etapy, tak aby klientka/klient wiedział, co robić najpierw.',
      bullets: [
        'Wskaż obszary do poprawy i priorytety.',
        'Zaplanuj pielęgnację domową, zabiegi gabinetowe i suplementację.',
        'Uwzględnij dalszą diagnostykę, jeśli pojawiają się sygnały wymagające konsultacji medycznej.',
      ],
    },
  }

export const FACE_CATEGORY_OPTIONS: Array<{
  value: FaceAnnotationCategory
  label: string
  color: FaceColorKey
}> = [
  { value: 'erythema', label: 'Zaczerwienienie', color: 'destructive' },
  { value: 'pigmentation', label: 'Przebarwienie', color: 'warning' },
  { value: 'lesion', label: 'Niedoskonałość', color: 'primary' },
  { value: 'dryness', label: 'Suchość / napięcie', color: 'info' },
  { value: 'wrinkles', label: 'Zmarszczki', color: 'success' },
  { value: 'vessels', label: 'Naczynka', color: 'info' },
  { value: 'scar', label: 'Blizna', color: 'neutral' },
  { value: 'other', label: 'Inne', color: 'neutral' },
]

export const FACE_SEVERITY_OPTIONS: Array<{ value: FaceSeverity; label: string }> = [
  { value: 'mild', label: 'Łagodne' },
  { value: 'moderate', label: 'Umiarkowane' },
  { value: 'severe', label: 'Nasilone' },
]

export const FACE_REGION_OPTIONS: Array<{ value: FaceRegion; label: string }> = [
  { value: 'forehead', label: 'Czoło' },
  { value: 'eyeArea', label: 'Okolice oczu' },
  { value: 'nose', label: 'Nos' },
  { value: 'leftCheek', label: 'Policzek lewy' },
  { value: 'rightCheek', label: 'Policzek prawy' },
  { value: 'mouth', label: 'Okolice ust' },
  { value: 'chin', label: 'Broda' },
  { value: 'jawline', label: 'Linia żuchwy' },
  { value: 'other', label: 'Inne' },
]

export const FACE_COLOR_OPTIONS: Array<{ value: FaceColorKey; label: string; cssVar: string }> = [
  { value: 'destructive', label: 'Czerwony', cssVar: '--destructive' },
  { value: 'warning', label: 'Bursztynowy', cssVar: '--warning' },
  { value: 'primary', label: 'Różowy', cssVar: '--primary' },
  { value: 'info', label: 'Niebieski', cssVar: '--info' },
  { value: 'success', label: 'Zielony', cssVar: '--success' },
  { value: 'neutral', label: 'Grafitowy', cssVar: '--foreground' },
]

export const EMPTY_PLAN_STAGE: ConsultationPlanStage = {
  homeCare: '',
  treatments: '',
  supplementation: '',
  treatmentIds: [],
}

export function createEmptyConsultationData(date = new Date()): ConsultationData {
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
  return {
    meta: { consultationDate: isoDate, comment: '' },
    intro: {
      motivation: '',
      expectations: '',
      previousTreatments: '',
      satisfaction: '',
    },
    rhythm: {
      sleepHours: null,
      bedtime: '',
      wakeTime: '',
      sleepIssues: null,
      sleepIssuesDetails: '',
      screensBeforeBed: null,
      ventilate: null,
      darkness: null,
      roomTemperature: '',
      dinner: '',
      notes: '',
    },
    lifestyle: {
      workMode: [],
      workLocation: [],
      responsibility: null,
      wearsMakeup: null,
      makeupIntensity: null,
      stressFrequency: '',
      stressSymptoms: [],
      stressReactions: [],
      stressReactionOther: '',
      restTime: null,
      freeTime: [],
      freeTimeOther: '',
      activityFrequency: '',
      activityTypes: [],
      activityOther: '',
      postWorkoutCare: '',
      smoking: null,
      smokingDetails: '',
      otherStimulants: null,
      otherStimulantsDetails: '',
      notes: '',
    },
    diet: {
      specialDiets: [],
      specialDietOther: '',
      breakfast: '',
      secondBreakfast: '',
      lunch: '',
      dinner: '',
      snacks: '',
      processedFood: '',
      eatingOut: '',
      vegetables: '',
      dietAssessment: '',
      mealBreaks: null,
      digestiveSymptoms: [],
      digestiveDetails: '',
      waterGlasses: null,
      snacking: null,
      snackingDetails: '',
      sweets: null,
      sweetsFrequency: '',
      fattyFish: null,
      metabolicFlags: [],
      supplements: [],
      supplementOther: '',
      notes: '',
    },
    health: {
      conditions: null,
      conditionsDetails: '',
      anaphylaxis: null,
      anaphylaxisDetails: '',
      specialistCare: null,
      specialistDetails: '',
      allergies: null,
      allergyDetails: '',
      pregnancy: null,
      pregnancyMonth: '',
      menstrualRegular: null,
      menopause: null,
      hrt: null,
      medications: null,
      medicationsDetails: '',
      keloids: null,
      comorbidities: [],
      comorbidityOther: '',
      tests: [],
      testResults: '',
      notes: '',
    },
    care: {
      habits: [],
      homeBudget: '',
      salonBudget: '',
      morningRoutine: '',
      eveningRoutine: '',
      notes: '',
    },
    summary: {
      identifiedProblems: '',
      areasToImprove: [],
      diagnostics: [],
      diagnosticsOther: '',
      cosmeticGoal: '',
      notes: '',
      plan: {
        stage1: { ...EMPTY_PLAN_STAGE },
        stage2: { ...EMPTY_PLAN_STAGE },
        stage3: { ...EMPTY_PLAN_STAGE },
      },
    },
  }
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const asString = (value: unknown, max = 5000): string =>
  typeof value === 'string' ? value.slice(0, max) : ''

const asNumber = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : null

const asEnum = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null

const asStringArray = (value: unknown, max = 50, maxLength = 100): string[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim().slice(0, maxLength)
    if (trimmed) seen.add(trimmed)
    if (seen.size >= max) break
  }
  return Array.from(seen)
}

const asEnumArray = <T extends string>(value: unknown, allowed: readonly T[], max = 50): T[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<T>()
  for (const item of value) {
    const parsed = asEnum(item, allowed)
    if (parsed) seen.add(parsed)
    if (seen.size >= max) break
  }
  return Array.from(seen)
}

const YES_NO = ['yes', 'no'] as const satisfies readonly YesNo[]
const YES_NO_MAYBE = ['yes', 'no', 'sometimes'] as const satisfies readonly YesNoMaybe[]
const YES_NO_PARTLY = ['yes', 'no', 'partly'] as const satisfies readonly YesNoPartly[]
const YES_NO_NA = ['yes', 'no', 'na'] as const satisfies readonly YesNoNa[]

export function normalizeConsultationData(input: unknown): ConsultationData {
  const root = asObject(input)
  const empty = createEmptyConsultationData()
  const meta = asObject(root.meta)
  const intro = asObject(root.intro)
  const rhythm = asObject(root.rhythm)
  const lifestyle = asObject(root.lifestyle)
  const diet = asObject(root.diet)
  const health = asObject(root.health)
  const care = asObject(root.care)
  const summary = asObject(root.summary)
  const plan = asObject(summary.plan)

  const planStage = (value: unknown): ConsultationPlanStage => {
    const stage = asObject(value)
    return {
      homeCare: asString(stage.homeCare, 5000),
      treatments: asString(stage.treatments, 5000),
      supplementation: asString(stage.supplementation, 5000),
      treatmentIds: asStringArray(stage.treatmentIds, 50, 100),
    }
  }

  return {
    meta: {
      consultationDate: asString(meta.consultationDate, 10) || empty.meta.consultationDate,
      comment: asString(meta.comment, 2000),
    },
    intro: {
      motivation: asString(intro.motivation),
      expectations: asString(intro.expectations),
      previousTreatments: asString(intro.previousTreatments),
      satisfaction: asString(intro.satisfaction),
    },
    rhythm: {
      sleepHours: asNumber(rhythm.sleepHours, 1, 16),
      bedtime: asString(rhythm.bedtime, 5),
      wakeTime: asString(rhythm.wakeTime, 5),
      sleepIssues: asEnum(rhythm.sleepIssues, YES_NO),
      sleepIssuesDetails: asString(rhythm.sleepIssuesDetails, 3000),
      screensBeforeBed: asEnum(rhythm.screensBeforeBed, YES_NO_MAYBE),
      ventilate: asEnum(rhythm.ventilate, YES_NO),
      darkness: asEnum(rhythm.darkness, YES_NO),
      roomTemperature: asString(rhythm.roomTemperature, 50),
      dinner: asString(rhythm.dinner, 3000),
      notes: asString(rhythm.notes),
    },
    lifestyle: {
      workMode: asEnumArray(
        lifestyle.workMode,
        WORK_MODE_OPTIONS.map((option) => option.value),
        5,
      ),
      workLocation: asEnumArray(
        lifestyle.workLocation,
        WORK_LOCATION_OPTIONS.map((option) => option.value),
        3,
      ),
      responsibility: asEnum(lifestyle.responsibility, YES_NO_PARTLY),
      wearsMakeup: asEnum(lifestyle.wearsMakeup, YES_NO),
      makeupIntensity: asNumber(lifestyle.makeupIntensity, 1, 10),
      stressFrequency:
        asEnum(
          lifestyle.stressFrequency,
          STRESS_FREQUENCY_OPTIONS.map((option) => option.value),
        ) ?? '',
      stressSymptoms: asEnumArray(
        lifestyle.stressSymptoms,
        STRESS_SYMPTOM_OPTIONS.map((option) => option.value),
        11,
      ),
      stressReactions: asEnumArray(
        lifestyle.stressReactions,
        STRESS_REACTION_OPTIONS.map((option) => option.value),
        6,
      ),
      stressReactionOther: asString(lifestyle.stressReactionOther, 1000),
      restTime: asEnum(lifestyle.restTime, ['yes', 'no', 'varies'] as const),
      freeTime: asEnumArray(
        lifestyle.freeTime,
        FREE_TIME_OPTIONS.map((option) => option.value),
        8,
      ),
      freeTimeOther: asString(lifestyle.freeTimeOther, 1000),
      activityFrequency:
        asEnum(
          lifestyle.activityFrequency,
          ACTIVITY_FREQUENCY_OPTIONS.map((option) => option.value),
        ) ?? '',
      activityTypes: asEnumArray(
        lifestyle.activityTypes,
        ACTIVITY_TYPE_OPTIONS.map((option) => option.value),
        9,
      ),
      activityOther: asString(lifestyle.activityOther, 1000),
      postWorkoutCare: asString(lifestyle.postWorkoutCare, 3000),
      smoking: asEnum(lifestyle.smoking, YES_NO),
      smokingDetails: asString(lifestyle.smokingDetails, 2000),
      otherStimulants: asEnum(lifestyle.otherStimulants, YES_NO),
      otherStimulantsDetails: asString(lifestyle.otherStimulantsDetails, 2000),
      notes: asString(lifestyle.notes),
    },
    diet: {
      specialDiets: asEnumArray(
        diet.specialDiets,
        SPECIAL_DIET_OPTIONS.map((option) => option.value),
        6,
      ),
      specialDietOther: asString(diet.specialDietOther, 1000),
      breakfast: asString(diet.breakfast, 2000),
      secondBreakfast: asString(diet.secondBreakfast, 2000),
      lunch: asString(diet.lunch, 2000),
      dinner: asString(diet.dinner, 2000),
      snacks: asString(diet.snacks, 2000),
      processedFood:
        asEnum(
          diet.processedFood,
          PROCESSED_FOOD_OPTIONS.map((option) => option.value),
        ) ?? '',
      eatingOut: asString(diet.eatingOut, 3000),
      vegetables:
        asEnum(
          diet.vegetables,
          VEGETABLES_OPTIONS.map((option) => option.value),
        ) ?? '',
      dietAssessment:
        asEnum(
          diet.dietAssessment,
          DIET_ASSESSMENT_OPTIONS.map((option) => option.value),
        ) ?? '',
      mealBreaks: asEnum(diet.mealBreaks, YES_NO_MAYBE),
      digestiveSymptoms: asEnumArray(
        diet.digestiveSymptoms,
        DIGESTIVE_SYMPTOM_OPTIONS.map((option) => option.value),
        9,
      ),
      digestiveDetails: asString(diet.digestiveDetails, 3000),
      waterGlasses: asNumber(diet.waterGlasses, 0, 20),
      snacking: asEnum(diet.snacking, YES_NO),
      snackingDetails: asString(diet.snackingDetails, 2000),
      sweets: asEnum(diet.sweets, YES_NO),
      sweetsFrequency: asString(diet.sweetsFrequency, 1000),
      fattyFish: asEnum(diet.fattyFish, ['yes', 'no', 'sometimes'] as const),
      metabolicFlags: asEnumArray(
        diet.metabolicFlags,
        METABOLIC_FLAG_OPTIONS.map((option) => option.value),
        5,
      ),
      supplements: asEnumArray(
        diet.supplements,
        SUPPLEMENT_OPTIONS.map((option) => option.value),
        5,
      ),
      supplementOther: asString(diet.supplementOther, 1000),
      notes: asString(diet.notes),
    },
    health: {
      conditions: asEnum(health.conditions, YES_NO),
      conditionsDetails: asString(health.conditionsDetails, 3000),
      anaphylaxis: asEnum(health.anaphylaxis, YES_NO),
      anaphylaxisDetails: asString(health.anaphylaxisDetails, 3000),
      specialistCare: asEnum(health.specialistCare, YES_NO),
      specialistDetails: asString(health.specialistDetails, 3000),
      allergies: asEnum(health.allergies, YES_NO),
      allergyDetails: asString(health.allergyDetails, 3000),
      pregnancy: asEnum(health.pregnancy, YES_NO_NA),
      pregnancyMonth: asString(health.pregnancyMonth, 100),
      menstrualRegular: asEnum(health.menstrualRegular, YES_NO_NA),
      menopause: asEnum(health.menopause, YES_NO_NA),
      hrt: asEnum(health.hrt, YES_NO_NA),
      medications: asEnum(health.medications, YES_NO),
      medicationsDetails: asString(health.medicationsDetails, 3000),
      keloids: asEnum(health.keloids, YES_NO),
      comorbidities: asEnumArray(
        health.comorbidities,
        COMORBIDITY_OPTIONS.map((option) => option.value),
        7,
      ),
      comorbidityOther: asString(health.comorbidityOther, 1000),
      tests: asEnumArray(
        health.tests,
        TEST_OPTIONS.map((option) => option.value),
        21,
      ),
      testResults: asString(health.testResults, 10000),
      notes: asString(health.notes),
    },
    care: {
      habits: asEnumArray(
        care.habits,
        CARE_HABIT_OPTIONS.map((option) => option.value),
        9,
      ),
      homeBudget: asString(care.homeBudget, 100),
      salonBudget: asString(care.salonBudget, 100),
      morningRoutine: asString(care.morningRoutine, 3000),
      eveningRoutine: asString(care.eveningRoutine, 3000),
      notes: asString(care.notes),
    },
    summary: {
      identifiedProblems: asString(summary.identifiedProblems, 10000),
      areasToImprove: asEnumArray(
        summary.areasToImprove,
        AREA_OPTIONS.map((option) => option.value),
        5,
      ),
      diagnostics: asEnumArray(
        summary.diagnostics,
        DIAGNOSTICS_OPTIONS.map((option) => option.value),
        6,
      ),
      diagnosticsOther: asString(summary.diagnosticsOther, 1000),
      cosmeticGoal: asString(summary.cosmeticGoal, 5000),
      notes: asString(summary.notes, 10000),
      plan: {
        stage1: planStage(plan.stage1),
        stage2: planStage(plan.stage2),
        stage3: planStage(plan.stage3),
      },
    },
  }
}

export const faceAnalysisSchema = z
  .object({
    version: z.literal(1).default(1),
    base: z.enum(['photo', 'template']).default('photo'),
    mesh: z
      .object({
        imageWidth: z.number().int().min(1).max(4096),
        imageHeight: z.number().int().min(1).max(4096),
        landmarks: z
          .array(z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]))
          .min(100)
          .max(600),
        triangles: z
          .array(z.number().int().min(0).max(599))
          .min(3)
          .max(15_000)
          .refine((indices) => indices.length % 3 === 0, {
            message: 'Nieprawidłowa liczba indeksów siatki',
          }),
        oval: z
          .array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]))
          .max(120)
          .default([]),
        eyeIndices: z
          .object({
            left: z.array(z.number().int().min(0).max(599)).max(100),
            right: z.array(z.number().int().min(0).max(599)).max(100),
          })
          .nullable()
          .default(null),
      })
      .nullable()
      .default(null),
    annotations: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          number: z.number().int().min(1).max(200),
          category: z.enum([
            'erythema',
            'pigmentation',
            'lesion',
            'dryness',
            'wrinkles',
            'vessels',
            'scar',
            'other',
          ]),
          severity: z.enum(['mild', 'moderate', 'severe']),
          region: z.enum([
            'forehead',
            'eyeArea',
            'nose',
            'leftCheek',
            'rightCheek',
            'mouth',
            'chin',
            'jawline',
            'other',
          ]),
          label: z.string().max(200).default(''),
          description: z.string().max(3000).default(''),
          uv: z.object({
            x: z.number().min(0).max(1),
            y: z.number().min(0).max(1),
          }),
          point: z
            .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
            .nullable()
            .default(null),
        }),
      )
      .max(100)
      .default([]),
    strokes: z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          tool: z.enum(['pen', 'eraser', 'soft']),
          color: z.enum(['destructive', 'warning', 'primary', 'info', 'success', 'neutral']),
          width: z.number().min(1).max(200),
          points: z
            .array(
              z.object({
                x: z.number().min(0).max(1),
                y: z.number().min(0).max(1),
              }),
            )
            .min(2)
            .max(4000),
        }),
      )
      .max(500)
      .default([]),
    view: z.enum(['2d', '3d']).default('3d'),
    depthScale: z.number().min(0.4).max(2).default(1),
  })
  .refine(
    (analysis) =>
      analysis.strokes.reduce((total, stroke) => total + stroke.points.length, 0) <= 100_000,
    { message: 'Zbyt duża liczba punktów rysunku' },
  )

export function createEmptyFaceAnalysis(): FaceAnalysis {
  return {
    version: 1,
    base: 'photo',
    mesh: null,
    annotations: [],
    strokes: [],
    view: '3d',
    depthScale: 1,
  }
}

export function normalizeFaceAnalysis(input: unknown): FaceAnalysis {
  const parsed = faceAnalysisSchema.safeParse(input)
  if (!parsed.success) return createEmptyFaceAnalysis()
  return parsed.data as FaceAnalysis
}

export function nextAnnotationNumber(annotations: FaceAnnotation[]): number {
  const max = annotations.reduce((current, annotation) => Math.max(current, annotation.number), 0)
  return max + 1
}

export function faceAnnotationSummary(annotation: FaceAnnotation): string {
  const category =
    FACE_CATEGORY_OPTIONS.find((option) => option.value === annotation.category)?.label ??
    'Obserwacja'
  const region =
    FACE_REGION_OPTIONS.find((option) => option.value === annotation.region)?.label ?? 'Twarz'
  const severity =
    FACE_SEVERITY_OPTIONS.find((option) => option.value === annotation.severity)?.label ?? ''
  return `${category} · ${region} · ${severity}`
}

export function consultationSummaryFromRow(row: {
  id: string
  status: string
  consultation_date: string
  completed_at: string | null
  updated_at: string
  created_by_name: string | null
  face_annotation_count: number | null
  face_photo_path: string | null
  data: unknown
}) {
  const data = normalizeConsultationData(row.data)
  const recommendedTreatmentIds = new Set<string>()
  for (const stage of [
    data.summary.plan.stage1,
    data.summary.plan.stage2,
    data.summary.plan.stage3,
  ]) {
    for (const treatmentId of stage.treatmentIds) recommendedTreatmentIds.add(treatmentId)
  }

  return {
    id: row.id,
    status: row.status === 'completed' ? ('completed' as const) : ('draft' as const),
    consultation_date: row.consultation_date,
    completed_at: row.completed_at,
    updated_at: row.updated_at,
    created_by_name: row.created_by_name,
    face_annotation_count: row.face_annotation_count ?? 0,
    has_face_photo: Boolean(row.face_photo_path),
    cosmetic_goal: data.summary.cosmeticGoal,
    areas_to_improve: data.summary.areasToImprove,
    recommended_treatment_ids: Array.from(recommendedTreatmentIds),
  }
}

export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const date = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const month = today.getMonth() - date.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

export function formatConsultationDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStepCompletion(data: ConsultationData, stepId: ConsultationStepId): number {
  switch (stepId) {
    case 'intro':
      return ratio(
        [data.intro.motivation, data.intro.expectations, data.intro.previousTreatments].filter(
          Boolean,
        ).length,
        3,
      )
    case 'rhythm':
      return ratio(
        [
          data.rhythm.sleepHours,
          data.rhythm.bedtime,
          data.rhythm.wakeTime,
          data.rhythm.sleepIssues,
          data.rhythm.screensBeforeBed,
          data.rhythm.ventilate,
          data.rhythm.darkness,
          data.rhythm.dinner,
        ].filter((value) => value !== null && value !== undefined && value !== '').length,
        8,
      )
    case 'lifestyle':
      return ratio(
        [
          data.lifestyle.workMode.length,
          data.lifestyle.stressFrequency,
          data.lifestyle.activityFrequency,
          data.lifestyle.smoking,
          data.lifestyle.otherStimulants,
        ].filter(Boolean).length,
        5,
      )
    case 'diet':
      return ratio(
        [
          data.diet.breakfast,
          data.diet.lunch,
          data.diet.dinner,
          data.diet.processedFood,
          data.diet.waterGlasses,
          data.diet.supplements.length,
        ].filter(Boolean).length,
        6,
      )
    case 'health':
      return ratio(
        [
          data.health.conditions,
          data.health.allergies,
          data.health.medications,
          data.health.pregnancy,
          data.health.tests.length,
        ].filter(Boolean).length,
        5,
      )
    case 'care':
      return ratio(
        [data.care.habits.length, data.care.homeBudget, data.care.salonBudget].filter(Boolean)
          .length,
        3,
      )
    case 'face':
      return 0
    case 'summary':
      return ratio(
        [
          data.summary.identifiedProblems,
          data.summary.cosmeticGoal,
          data.summary.plan.stage1.homeCare,
        ].filter(Boolean).length,
        3,
      )
    default:
      return 0
  }
}

function ratio(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100)
}

export function isConsultationCompleted(consultation: Pick<ClientConsultation, 'status'>): boolean {
  return consultation.status === 'completed'
}

export function isDrawingStrokeEmpty(stroke: FaceDrawingStroke): boolean {
  return stroke.points.length < 2
}

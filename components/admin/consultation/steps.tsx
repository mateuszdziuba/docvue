'use client'

import { ScanFace, Sparkles, Stethoscope } from 'lucide-react'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { toast } from 'sonner'
import {
  ACTIVITY_FREQUENCY_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  AREA_OPTIONS,
  CARE_HABIT_OPTIONS,
  COMORBIDITY_OPTIONS,
  CONSULTATION_INFO,
  DIAGNOSTICS_OPTIONS,
  DIET_ASSESSMENT_OPTIONS,
  DIGESTIVE_SYMPTOM_OPTIONS,
  FACE_CATEGORY_OPTIONS,
  FACE_REGION_OPTIONS,
  FACE_SEVERITY_OPTIONS,
  FREE_TIME_OPTIONS,
  METABOLIC_FLAG_OPTIONS,
  PROCESSED_FOOD_OPTIONS,
  REST_TIME_OPTIONS,
  SPECIAL_DIET_OPTIONS,
  STRESS_FREQUENCY_OPTIONS,
  STRESS_REACTION_OPTIONS,
  STRESS_SYMPTOM_OPTIONS,
  SUPPLEMENT_OPTIONS,
  TEST_OPTIONS,
  VEGETABLES_OPTIONS,
  WORK_LOCATION_OPTIONS,
  WORK_MODE_OPTIONS,
  YES_NO_MAYBE_OPTIONS,
} from '@/lib/consultation'
import { useRouterCompat } from '@/lib/router-compat'
import { linkBeautyPlanToConsultationFn } from '@/src/server/beauty-plans'
import type {
  ConsultationData,
  FaceAnalysis,
  YesNo,
  YesNoMaybe,
  YesNoNa,
  YesNoPartly,
} from '@/types/consultation'
import type { StaffMember, Treatment } from '@/types/database'
import { ConsultationSection } from './consultation-section'
import {
  ChoiceChips,
  CurrencyQuestion,
  DateField,
  FieldGrid,
  NotesField,
  Question,
  ScaleField,
  Subsection,
  TextAreaQuestion,
  TextQuestion,
  TimePicker,
  YesNoField,
} from './fields'
import { ScheduleTreatmentSheet } from './schedule-treatment-sheet'
import { TreatmentPicker } from './treatment-picker'

export interface ConsultationStepProps {
  data: ConsultationData
  setData: Dispatch<SetStateAction<ConsultationData>>
  disabled?: boolean
}

export function IntroStep({ data, setData, disabled }: ConsultationStepProps) {
  const update = (patch: Partial<ConsultationData['intro']>) =>
    setData((previous) => ({ ...previous, intro: { ...previous.intro, ...patch } }))
  const updateMeta = (patch: Partial<ConsultationData['meta']>) =>
    setData((previous) => ({ ...previous, meta: { ...previous.meta, ...patch } }))

  return (
    <ConsultationSection
      index={1}
      title="Wprowadzenie do konsultacji"
      description="Ustal punkt wyjścia: co sprowadza klientkę/klienta, jakie ma oczekiwania i jak wyglądała dotychczasowa droga zabiegowa."
      info={CONSULTATION_INFO.intro}
      completion={0}
    >
      <FieldGrid>
        <DateField
          label="Data konsultacji"
          value={data.meta.consultationDate}
          onChange={(value) => updateMeta({ consultationDate: value })}
          disabled={disabled}
        />
        <TextQuestion
          label="Dodatkowy komentarz (opcjonalnie)"
          value={data.meta.comment}
          onChange={(value) => updateMeta({ comment: value })}
          placeholder="Np. konsultacja przed pierwszym zabiegiem"
          disabled={disabled}
        />
      </FieldGrid>

      <div className="space-y-6">
        <TextAreaQuestion
          label="Co skłoniło Panią/Pana do umówienia się na konsultację?"
          value={data.intro.motivation}
          onChange={(value) => update({ motivation: value })}
          placeholder="Np. nawracające niedoskonałości, suchość, chęć uporządkowania pielęgnacji…"
          disabled={disabled}
        />
        <TextAreaQuestion
          label="Jakie są Pani/Pana oczekiwania względem współpracy?"
          value={data.intro.expectations}
          onChange={(value) => update({ expectations: value })}
          placeholder="Np. poprawa nawilżenia, zmniejszenie przebarwień, stała rutyna…"
          disabled={disabled}
        />
        <TextAreaQuestion
          label="Jakie zabiegi kosmetyczne, medycyny estetycznej lub chirurgii plastycznej były wcześniej wykonywane i kiedy ostatnio?"
          value={data.intro.previousTreatments}
          onChange={(value) => update({ previousTreatments: value })}
          placeholder="Np. mezoterapia — marzec 2026, peeling medyczny — styczeń 2026…"
          disabled={disabled}
          rows={4}
        />
        <TextAreaQuestion
          label="Jak ocenia Pani/Pan dotychczasowe zadowolenie z wykonanych zabiegów?"
          value={data.intro.satisfaction}
          onChange={(value) => update({ satisfaction: value })}
          placeholder="Co się sprawdziło, a co warto zmienić?"
          disabled={disabled}
        />
      </div>
    </ConsultationSection>
  )
}

export function RhythmStep({ data, setData, disabled }: ConsultationStepProps) {
  const update = (patch: Partial<ConsultationData['rhythm']>) =>
    setData((previous) => ({ ...previous, rhythm: { ...previous.rhythm, ...patch } }))

  return (
    <ConsultationSection
      index={2}
      title="Rytm dobowy"
      description="Sen, światło i wieczorna rutyna wpływają na regenerację skóry oraz gospodarkę hormonalną."
      info={CONSULTATION_INFO.rhythm}
      completion={0}
    >
      <Question number={1} label="Jak długo zwykle Pani/Pan śpi?">
        <ScaleField
          value={data.rhythm.sleepHours}
          onChange={(value) => update({ sleepHours: value })}
          min={1}
          max={12}
          unit="h"
          lowLabel="1 h"
          highLabel="12 h i więcej"
          disabled={disabled}
        />
      </Question>

      <FieldGrid>
        <Question number={2} label="O której godzinie zazwyczaj kładzie się Pani/Pan spać?">
          <TimePicker
            label="Godzina zasypiania"
            value={data.rhythm.bedtime}
            onChange={(value) => update({ bedtime: value })}
            disabled={disabled}
          />
        </Question>
        <Question number={3} label="O której godzinie Pani/Pan wstaje?">
          <TimePicker
            label="Godzina pobudki"
            value={data.rhythm.wakeTime}
            onChange={(value) => update({ wakeTime: value })}
            disabled={disabled}
          />
        </Question>
      </FieldGrid>

      <Question number={4} label="Czy ma Pani/Pan trudności z zasypianiem lub przesypianiem nocy?">
        <YesNoField
          value={data.rhythm.sleepIssues}
          onChange={(value) => update({ sleepIssues: value as YesNo })}
        />
        {data.rhythm.sleepIssues === 'yes' ? (
          <TextAreaQuestion
            label="Jeśli tak, proszę opisać jakie"
            value={data.rhythm.sleepIssuesDetails}
            onChange={(value) => update({ sleepIssuesDetails: value })}
            placeholder="Np. wybudzenia ok. 3:00, trudność z ponownym zaśnięciem…"
            className="mt-3"
            disabled={disabled}
          />
        ) : null}
      </Question>

      <Question
        number={5}
        label="Czy przed snem korzysta Pani/Pan z telefonu lub ogląda telewizję?"
      >
        <YesNoField
          variant="maybe"
          value={data.rhythm.screensBeforeBed}
          onChange={(value) => update({ screensBeforeBed: value as YesNoMaybe })}
        />
      </Question>

      <FieldGrid>
        <Question number={6} label="Czy przed snem wietrzy Pani/Pan sypialnię?">
          <YesNoField
            value={data.rhythm.ventilate}
            onChange={(value) => update({ ventilate: value as YesNo })}
          />
        </Question>
        <Question number={7} label="Czy śpi Pani/Pan w całkowitej ciemności?">
          <YesNoField
            value={data.rhythm.darkness}
            onChange={(value) => update({ darkness: value as YesNo })}
          />
        </Question>
      </FieldGrid>

      <Question number={8} label="Jaka jest temperatura w pomieszczeniu, w którym Pani/Pan śpi?">
        <TextQuestion
          label="Temperatura"
          value={data.rhythm.roomTemperature}
          onChange={(value) => update({ roomTemperature: value })}
          placeholder="Np. 19°C"
          disabled={disabled}
          className="sm:max-w-xs"
        />
      </Question>

      <Question
        number={9}
        label="Ile czasu przed snem spożywa Pani/Pan kolację i co zazwyczaj znajduje się w tym posiłku?"
      >
        <TextAreaQuestion
          label="Kolacja"
          value={data.rhythm.dinner}
          onChange={(value) => update({ dinner: value })}
          placeholder="Np. 2 godziny przed snem, kanapki z twarogiem i warzywami…"
          disabled={disabled}
        />
      </Question>

      <NotesField
        value={data.rhythm.notes}
        onChange={(value) => update({ notes: value })}
        disabled={disabled}
      />
    </ConsultationSection>
  )
}

export function LifestyleStep({ data, setData, disabled }: ConsultationStepProps) {
  const update = (patch: Partial<ConsultationData['lifestyle']>) =>
    setData((previous) => ({ ...previous, lifestyle: { ...previous.lifestyle, ...patch } }))

  return (
    <ConsultationSection
      index={3}
      title="Styl życia"
      description="Praca, stres, odpoczynek i aktywność fizyczna — codzienne nawyki, które przekładają się na kondycję skóry."
      info={CONSULTATION_INFO.lifestyle}
      completion={0}
    >
      <Subsection title="Praca">
        <Question number={1} label="Jaki jest Pani/Pana tryb pracy?">
          <ChoiceChips
            multiple
            options={WORK_MODE_OPTIONS}
            value={data.lifestyle.workMode}
            onChange={(value) => update({ workMode: value as string[] })}
            columns={3}
          />
        </Question>
        <Question number={2} label="Gdzie najczęściej spędza Pani/Pan czas podczas pracy?">
          <ChoiceChips
            multiple
            options={WORK_LOCATION_OPTIONS}
            value={data.lifestyle.workLocation}
            onChange={(value) => update({ workLocation: value as string[] })}
            columns={1}
          />
        </Question>
        <Question number={3} label="Czy Pani/Pana stanowisko wiąże się z dużą odpowiedzialnością?">
          <YesNoField
            variant="partly"
            value={data.lifestyle.responsibility}
            onChange={(value) => update({ responsibility: value as YesNoPartly })}
          />
        </Question>
        <Question number={4} label="Czy na co dzień do pracy wykonuje Pani makijaż?">
          <YesNoField
            value={data.lifestyle.wearsMakeup}
            onChange={(value) => update({ wearsMakeup: value as YesNo })}
          />
          {data.lifestyle.wearsMakeup === 'yes' ? (
            <div className="mt-3 sm:max-w-md">
              <p className="mb-2 text-xs text-muted-foreground">Jak mocny?</p>
              <ScaleField
                value={data.lifestyle.makeupIntensity}
                onChange={(value) => update({ makeupIntensity: value })}
                min={1}
                max={10}
                lowLabel="Brak"
                highLabel="Mocny makijaż"
              />
            </div>
          ) : null}
        </Question>
      </Subsection>

      <Subsection title="Stres">
        <Question
          number={1}
          label="Jak często ma Pani/Pan poczucie napięcia, pośpiechu lub przeciążenia obowiązkami?"
        >
          <ChoiceChips
            options={STRESS_FREQUENCY_OPTIONS}
            value={data.lifestyle.stressFrequency}
            onChange={(value) => update({ stressFrequency: value as string })}
            columns={2}
          />
        </Question>
        <Question
          number={2}
          label="Czy któraś z poniższych sytuacji dotyczy Pani/Pana? Można zaznaczyć więcej niż jedną odpowiedź."
        >
          <ChoiceChips
            multiple
            options={STRESS_SYMPTOM_OPTIONS}
            value={data.lifestyle.stressSymptoms}
            onChange={(value) => update({ stressSymptoms: value as string[] })}
            columns={2}
          />
        </Question>
        <Question number={3} label="Jak najczęściej reaguje Pani/Pan na stres?">
          <ChoiceChips
            multiple
            options={STRESS_REACTION_OPTIONS}
            value={data.lifestyle.stressReactions}
            onChange={(value) => update({ stressReactions: value as string[] })}
            columns={2}
          />
          <TextQuestion
            label="Inne reakcje"
            value={data.lifestyle.stressReactionOther}
            onChange={(value) => update({ stressReactionOther: value })}
            placeholder="Dopisz, jeśli czegoś brakuje"
            className="mt-3"
            disabled={disabled}
          />
        </Question>
      </Subsection>

      <Subsection title="Czas wolny">
        <Question
          number={1}
          label="Czy ma Pani/Pan poczucie, że znajduje wystarczająco dużo czasu na odpoczynek?"
        >
          <ChoiceChips
            options={REST_TIME_OPTIONS}
            value={data.lifestyle.restTime}
            onChange={(value) => update({ restTime: value as 'yes' | 'no' | 'varies' })}
            columns={3}
          />
        </Question>
        <Question number={2} label="Jak najczęściej spędza Pani/Pan wolny czas?">
          <ChoiceChips
            multiple
            options={FREE_TIME_OPTIONS}
            value={data.lifestyle.freeTime}
            onChange={(value) => update({ freeTime: value as string[] })}
            columns={2}
          />
          <TextQuestion
            label="Inne"
            value={data.lifestyle.freeTimeOther}
            onChange={(value) => update({ freeTimeOther: value })}
            placeholder="Dopisz, jeśli czegoś brakuje"
            className="mt-3"
            disabled={disabled}
          />
        </Question>
      </Subsection>

      <Subsection title="Aktywność fizyczna">
        <Question number={1} label="Jak często podejmuje Pani/Pan aktywność fizyczną?">
          <ChoiceChips
            options={ACTIVITY_FREQUENCY_OPTIONS}
            value={data.lifestyle.activityFrequency}
            onChange={(value) => update({ activityFrequency: value as string })}
            columns={2}
          />
        </Question>
        <Question number={2} label="Jakie formy aktywności są najczęstsze?">
          <ChoiceChips
            multiple
            options={ACTIVITY_TYPE_OPTIONS}
            value={data.lifestyle.activityTypes}
            onChange={(value) => update({ activityTypes: value as string[] })}
            columns={2}
          />
          <TextQuestion
            label="Inne formy"
            value={data.lifestyle.activityOther}
            onChange={(value) => update({ activityOther: value })}
            placeholder="Dopisz, jeśli czegoś brakuje"
            className="mt-3"
            disabled={disabled}
          />
        </Question>
        <Question
          number={3}
          label="Jak wygląda Pani/Pana pielęgnacja skóry po treningu lub wysiłku fizycznym?"
        >
          <TextAreaQuestion
            label="Pielęgnacja po wysiłku"
            value={data.lifestyle.postWorkoutCare}
            onChange={(value) => update({ postWorkoutCare: value })}
            placeholder="Np. zmywam pot letnią wodą, nakładam krem nawilżający…"
            disabled={disabled}
          />
        </Question>
      </Subsection>

      <Subsection title="Używki">
        <Question number={1} label="Czy pali Pani/Pan papierosy?">
          <YesNoField
            value={data.lifestyle.smoking}
            onChange={(value) => update({ smoking: value as YesNo })}
          />
          {data.lifestyle.smoking === 'yes' ? (
            <TextQuestion
              label="Ile dziennie i od jak dawna?"
              value={data.lifestyle.smokingDetails}
              onChange={(value) => update({ smokingDetails: value })}
              placeholder="Np. 5 papierosów dziennie od 8 lat"
              className="mt-3"
              disabled={disabled}
            />
          ) : null}
        </Question>
        <Question
          number={2}
          label="Czy stosuje Pani/Pan inne używki (alkohol, napoje energetyczne, alternatywy nikotynowe)?"
        >
          <YesNoField
            value={data.lifestyle.otherStimulants}
            onChange={(value) => update({ otherStimulants: value as YesNo })}
          />
          {data.lifestyle.otherStimulants === 'yes' ? (
            <TextAreaQuestion
              label="Jakie i jak często?"
              value={data.lifestyle.otherStimulantsDetails}
              onChange={(value) => update({ otherStimulantsDetails: value })}
              className="mt-3"
              disabled={disabled}
            />
          ) : null}
        </Question>
      </Subsection>

      <NotesField
        value={data.lifestyle.notes}
        onChange={(value) => update({ notes: value })}
        disabled={disabled}
      />
    </ConsultationSection>
  )
}

export function DietStep({ data, setData, disabled }: ConsultationStepProps) {
  const update = (patch: Partial<ConsultationData['diet']>) =>
    setData((previous) => ({ ...previous, diet: { ...previous.diet, ...patch } }))

  return (
    <ConsultationSection
      index={4}
      title="Dieta"
      description="Jelita i skóra są połączone. Nawet 70% komórek odpornościowych znajduje się w jelitach, dlatego dieta ma bezpośredni wpływ na stany zapalne i cerę."
      info={CONSULTATION_INFO.diet}
      completion={0}
    >
      <Question number={1} label="Czy stosuje Pani/Pan jakąś specjalną dietę?">
        <ChoiceChips
          multiple
          options={SPECIAL_DIET_OPTIONS}
          value={data.diet.specialDiets}
          onChange={(value) => update({ specialDiets: value as string[] })}
          columns={2}
        />
        <TextQuestion
          label="Inna dieta"
          value={data.diet.specialDietOther}
          onChange={(value) => update({ specialDietOther: value })}
          placeholder="Dopisz, jeśli czegoś brakuje"
          className="mt-3"
          disabled={disabled}
        />
      </Question>

      <Question number={2} label="Proszę opisać najczęstszy jadłospis dnia.">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextAreaQuestion
            label="Śniadanie"
            value={data.diet.breakfast}
            onChange={(value) => update({ breakfast: value })}
            rows={2}
            disabled={disabled}
          />
          <TextAreaQuestion
            label="Drugie śniadanie"
            value={data.diet.secondBreakfast}
            onChange={(value) => update({ secondBreakfast: value })}
            rows={2}
            disabled={disabled}
          />
          <TextAreaQuestion
            label="Obiad"
            value={data.diet.lunch}
            onChange={(value) => update({ lunch: value })}
            rows={2}
            disabled={disabled}
          />
          <TextAreaQuestion
            label="Kolacja"
            value={data.diet.dinner}
            onChange={(value) => update({ dinner: value })}
            rows={2}
            disabled={disabled}
          />
          <TextAreaQuestion
            label="Dodatkowo (przekąski, napoje)"
            value={data.diet.snacks}
            onChange={(value) => update({ snacks: value })}
            rows={2}
            className="sm:col-span-2"
            disabled={disabled}
          />
        </div>
      </Question>

      <Question
        number={3}
        label="Jak często spożywa Pani/Pan żywność przetworzoną, gotowe posiłki lub półprodukty?"
      >
        <ChoiceChips
          options={PROCESSED_FOOD_OPTIONS}
          value={data.diet.processedFood}
          onChange={(value) => update({ processedFood: value as string })}
          columns={2}
        />
      </Question>

      <Question
        number={4}
        label="Co i jak często je Pani/Pan „na mieście”?"
        hint="np. obiady, kawa, ciastka, fast food"
      >
        <TextAreaQuestion
          label="Posiłki poza domem"
          value={data.diet.eatingOut}
          onChange={(value) => update({ eatingOut: value })}
          disabled={disabled}
        />
      </Question>

      <Question number={5} label="Czy codziennie spożywa Pani/Pan porcję warzyw i owoców?">
        <ChoiceChips
          options={VEGETABLES_OPTIONS}
          value={data.diet.vegetables}
          onChange={(value) => update({ vegetables: value as string })}
          columns={2}
        />
      </Question>

      <Question number={6} label="Jak ocenia Pani/Pan swoją dietę?">
        <ChoiceChips
          options={DIET_ASSESSMENT_OPTIONS}
          value={data.diet.dietAssessment}
          onChange={(value) => update({ dietAssessment: value as string })}
          columns={1}
        />
      </Question>

      <Question
        number={7}
        label="Czy zachowuje Pani/Pan przerwy między posiłkami (ok. 3–4 godziny)?"
      >
        <ChoiceChips
          options={YES_NO_MAYBE_OPTIONS}
          value={data.diet.mealBreaks}
          onChange={(value) => update({ mealBreaks: value as YesNoMaybe })}
          columns={3}
        />
      </Question>

      <Question
        number={8}
        label="Czy występują u Pani/Pana objawy ze strony układu pokarmowego?"
        hint="Zaznacz te, które pojawiają się regularnie lub w określonych sytuacjach."
      >
        <ChoiceChips
          multiple
          options={DIGESTIVE_SYMPTOM_OPTIONS}
          value={data.diet.digestiveSymptoms}
          onChange={(value) => update({ digestiveSymptoms: value as string[] })}
          columns={2}
        />
        <TextAreaQuestion
          label="W jakich sytuacjach się pojawiają?"
          value={data.diet.digestiveDetails}
          onChange={(value) => update({ digestiveDetails: value })}
          className="mt-3"
          disabled={disabled}
        />
      </Question>

      <Question number={9} label="Ile szklanek wody wypija Pani/Pan w ciągu dnia?">
        <ScaleField
          value={data.diet.waterGlasses}
          onChange={(value) => update({ waterGlasses: value })}
          min={0}
          max={15}
          unit="szklanek"
          lowLabel="0"
          highLabel="15 i więcej"
          disabled={disabled}
        />
      </Question>

      <FieldGrid>
        <Question number={10} label="Czy podjada Pani/Pan pomiędzy posiłkami?">
          <YesNoField
            value={data.diet.snacking}
            onChange={(value) => update({ snacking: value as YesNo })}
          />
          {data.diet.snacking === 'yes' ? (
            <TextAreaQuestion
              label="Co najczęściej i jak często?"
              value={data.diet.snackingDetails}
              onChange={(value) => update({ snackingDetails: value })}
              className="mt-3"
              disabled={disabled}
            />
          ) : null}
        </Question>
        <Question number={11} label="Czy je Pani/Pan słodycze?">
          <YesNoField
            value={data.diet.sweets}
            onChange={(value) => update({ sweets: value as YesNo })}
          />
          {data.diet.sweets === 'yes' ? (
            <TextQuestion
              label="Jak często?"
              value={data.diet.sweetsFrequency}
              onChange={(value) => update({ sweetsFrequency: value })}
              className="mt-3"
              disabled={disabled}
            />
          ) : null}
        </Question>
      </FieldGrid>

      <Question
        number={12}
        label="Czy spożywa Pani/Pan tłuste ryby (łosoś, tuńczyk, makrela, pstrąg)?"
      >
        <ChoiceChips
          options={[
            { value: 'yes', label: 'Tak' },
            { value: 'no', label: 'Nie' },
            { value: 'sometimes', label: 'Sporadycznie' },
          ]}
          value={data.diet.fattyFish}
          onChange={(value) => update({ fattyFish: value as 'yes' | 'no' | 'sometimes' })}
          columns={3}
        />
      </Question>

      <Question
        number={13}
        label="Czy któraś z poniższych sytuacji dotyczy Pani/Pana?"
        hint="Można zaznaczyć więcej niż jedną odpowiedź."
      >
        <ChoiceChips
          multiple
          options={METABOLIC_FLAG_OPTIONS}
          value={data.diet.metabolicFlags}
          onChange={(value) => update({ metabolicFlags: value as string[] })}
          columns={1}
        />
      </Question>

      <Subsection title="Suplementacja">
        <Question number={1} label="Czy przyjmuje Pani/Pan obecnie jakieś suplementy?">
          <ChoiceChips
            multiple
            options={SUPPLEMENT_OPTIONS}
            value={data.diet.supplements}
            onChange={(value) => update({ supplements: value as string[] })}
            columns={2}
          />
          <TextQuestion
            label="Inne suplementy"
            value={data.diet.supplementOther}
            onChange={(value) => update({ supplementOther: value })}
            placeholder="Nazwa, dawka, częstotliwość"
            className="mt-3"
            disabled={disabled}
          />
        </Question>
      </Subsection>

      <NotesField
        value={data.diet.notes}
        onChange={(value) => update({ notes: value })}
        disabled={disabled}
      />
    </ConsultationSection>
  )
}

export function HealthStep({ data, setData, disabled }: ConsultationStepProps) {
  const update = (patch: Partial<ConsultationData['health']>) =>
    setData((previous) => ({ ...previous, health: { ...previous.health, ...patch } }))

  return (
    <ConsultationSection
      index={5}
      title="Stan zdrowia"
      description="Bezpieczeństwo zabiegów jest ważniejsze niż tempo pracy. Uzupełnij sekcję spokojnie i tylko w zakresie niezbędnym."
      info={CONSULTATION_INFO.health}
      completion={0}
    >
      <div className="rounded-2xl border border-info/25 bg-info-container/50 px-4 py-3 text-sm leading-relaxed text-on-info-container">
        <div className="flex items-start gap-2">
          <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            To dane szczególnej kategorii. Dokument widzą wyłącznie właściciel i aktywni pracownicy
            gabinetu — nie udostępniaj go klientowi.
          </p>
        </div>
      </div>

      <Question number={1} label="Czy ma Pani/Pan zdiagnozowane jakiekolwiek choroby?">
        <YesNoField
          value={data.health.conditions}
          onChange={(value) => update({ conditions: value as YesNo })}
        />
        {data.health.conditions === 'yes' ? (
          <TextAreaQuestion
            label="Jakie?"
            value={data.health.conditionsDetails}
            onChange={(value) => update({ conditionsDetails: value })}
            className="mt-3"
            disabled={disabled}
          />
        ) : null}
      </Question>

      <Question
        number={2}
        label="Czy miała Pani/Pan kiedykolwiek epizod wstrząsu anafilaktycznego?"
      >
        <YesNoField
          value={data.health.anaphylaxis}
          onChange={(value) => update({ anaphylaxis: value as YesNo })}
        />
        {data.health.anaphylaxis === 'yes' ? (
          <TextAreaQuestion
            label="Kiedy i w jakiej sytuacji?"
            value={data.health.anaphylaxisDetails}
            onChange={(value) => update({ anaphylaxisDetails: value })}
            className="mt-3"
            disabled={disabled}
          />
        ) : null}
      </Question>

      <Question
        number={3}
        label="Czy jest Pani/Pan obecnie pod kontrolą specjalisty (lekarza, fizjoterapeuty, dietetyka, psychologa)?"
      >
        <YesNoField
          value={data.health.specialistCare}
          onChange={(value) => update({ specialistCare: value as YesNo })}
        />
        {data.health.specialistCare === 'yes' ? (
          <TextAreaQuestion
            label="Jakiego specjalisty i dlaczego?"
            value={data.health.specialistDetails}
            onChange={(value) => update({ specialistDetails: value })}
            className="mt-3"
            disabled={disabled}
          />
        ) : null}
      </Question>

      <Question number={4} label="Czy cierpi Pani/Pan na alergie lub nietolerancje pokarmowe?">
        <YesNoField
          value={data.health.allergies}
          onChange={(value) => update({ allergies: value as YesNo })}
        />
        {data.health.allergies === 'yes' ? (
          <TextAreaQuestion
            label="Jakie?"
            value={data.health.allergyDetails}
            onChange={(value) => update({ allergyDetails: value })}
            className="mt-3"
            disabled={disabled}
          />
        ) : null}
      </Question>

      <Subsection title="Zdrowie hormonalne">
        <FieldGrid>
          <Question number={5} label="Czy jest Pani w ciąży lub karmi piersią?">
            <YesNoField
              variant="na"
              value={data.health.pregnancy}
              onChange={(value) => update({ pregnancy: value as YesNoNa })}
            />
            {data.health.pregnancy === 'yes' ? (
              <TextQuestion
                label="Który miesiąc?"
                value={data.health.pregnancyMonth}
                onChange={(value) => update({ pregnancyMonth: value })}
                className="mt-3"
                disabled={disabled}
              />
            ) : null}
          </Question>
          <Question number={6} label="Czy cykle menstruacyjne są regularne?">
            <YesNoField
              variant="na"
              value={data.health.menstrualRegular}
              onChange={(value) => update({ menstrualRegular: value as YesNoNa })}
            />
          </Question>
          <Question number={7} label="Czy jest Pani w okresie menopauzy?">
            <YesNoField
              variant="na"
              value={data.health.menopause}
              onChange={(value) => update({ menopause: value as YesNoNa })}
            />
          </Question>
          <Question number={8} label="Czy stosuje Pani hormonalną terapię zastępczą?">
            <YesNoField
              variant="na"
              value={data.health.hrt}
              onChange={(value) => update({ hrt: value as YesNoNa })}
            />
          </Question>
        </FieldGrid>
      </Subsection>

      <FieldGrid>
        <Question number={9} label="Czy przyjmuje Pani/Pan leki lub maści na receptę?">
          <YesNoField
            value={data.health.medications}
            onChange={(value) => update({ medications: value as YesNo })}
          />
          {data.health.medications === 'yes' ? (
            <TextAreaQuestion
              label="Jakie?"
              value={data.health.medicationsDetails}
              onChange={(value) => update({ medicationsDetails: value })}
              className="mt-3"
              disabled={disabled}
            />
          ) : null}
        </Question>
        <Question number={10} label="Czy ma Pani/Pan skłonność do bliznowców lub keloidów?">
          <YesNoField
            value={data.health.keloids}
            onChange={(value) => update({ keloids: value as YesNo })}
          />
        </Question>
      </FieldGrid>

      <Question number={11} label="Choroby współistniejące">
        <ChoiceChips
          multiple
          options={COMORBIDITY_OPTIONS}
          value={data.health.comorbidities}
          onChange={(value) => update({ comorbidities: value as string[] })}
          columns={2}
        />
        <TextQuestion
          label="Inne choroby"
          value={data.health.comorbidityOther}
          onChange={(value) => update({ comorbidityOther: value })}
          placeholder="Dopisz, jeśli czegoś brakuje"
          className="mt-3"
          disabled={disabled}
        />
      </Question>

      <Question
        number={12}
        label="Czy w ostatnim roku wykonywane były któreś z poniższych badań?"
        hint="Zaznacz wykonane badania. Wyniki i daty możesz wpisać poniżej."
      >
        <ChoiceChips
          multiple
          options={TEST_OPTIONS}
          value={data.health.tests}
          onChange={(value) => update({ tests: value as string[] })}
          columns={2}
        />
        <TextAreaQuestion
          label="Wyniki badań / uwagi"
          value={data.health.testResults}
          onChange={(value) => update({ testResults: value })}
          placeholder="Tutaj wpisz wyniki, daty lub informację, gdzie znajdują się załączniki."
          rows={5}
          className="mt-3"
          disabled={disabled}
        />
      </Question>

      <NotesField
        value={data.health.notes}
        onChange={(value) => update({ notes: value })}
        disabled={disabled}
      />
    </ConsultationSection>
  )
}

export function CareStep({ data, setData, disabled }: ConsultationStepProps) {
  const update = (patch: Partial<ConsultationData['care']>) =>
    setData((previous) => ({ ...previous, care: { ...previous.care, ...patch } }))

  return (
    <ConsultationSection
      index={6}
      title="Pielęgnacja"
      description="Uporządkuj codzienną rutynę i budżet. Sprawdź, czy klientka/klient ma realne warunki, by stosować zalecenia."
      info={CONSULTATION_INFO.care}
      completion={0}
    >
      <Question
        number={1}
        label="Zaznacz, jeśli to Pani/Pana dotyczy"
        hint="Można zaznaczyć więcej niż jedną odpowiedź."
      >
        <ChoiceChips
          multiple
          options={CARE_HABIT_OPTIONS}
          value={data.care.habits}
          onChange={(value) => update({ habits: value as string[] })}
          columns={2}
        />
      </Question>

      <Question
        number={2}
        label="Jaką kwotę może Pani/Pan przeznaczyć na pielęgnację domową i zabiegi gabinetowe?"
      >
        <FieldGrid>
          <CurrencyQuestion
            label="Pielęgnacja domowa"
            value={data.care.homeBudget}
            onChange={(value) => update({ homeBudget: value })}
          />
          <CurrencyQuestion
            label="Zabiegi w gabinecie"
            value={data.care.salonBudget}
            onChange={(value) => update({ salonBudget: value })}
          />
        </FieldGrid>
      </Question>

      <FieldGrid>
        <TextAreaQuestion
          label="Aktualna rutyna poranna"
          value={data.care.morningRoutine}
          onChange={(value) => update({ morningRoutine: value })}
          placeholder="Np. oczyszczanie, serum, krem, SPF…"
          disabled={disabled}
        />
        <TextAreaQuestion
          label="Aktualna rutyna wieczorna"
          value={data.care.eveningRoutine}
          onChange={(value) => update({ eveningRoutine: value })}
          placeholder="Np. demakijaż, oczyszczanie, retinol 2×/tydz., krem…"
          disabled={disabled}
        />
      </FieldGrid>

      <NotesField
        value={data.care.notes}
        onChange={(value) => update({ notes: value })}
        disabled={disabled}
      />
    </ConsultationSection>
  )
}

export function SummaryStep({
  data,
  setData,
  faceAnalysis,
  disabled,
  treatments,
  clientId,
  clientName,
  consultationId,
  salonId,
  staffMembers,
  beautyPlan,
}: ConsultationStepProps & {
  faceAnalysis: FaceAnalysis | null
  treatments: Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>[]
  clientId: string
  clientName: string
  consultationId: string
  salonId: string
  staffMembers: Pick<StaffMember, 'id' | 'name'>[]
  beautyPlan: { id: string; consultation_id: string | null } | null
}) {
  const router = useRouterCompat()
  const [scheduledTreatment, setScheduledTreatment] = useState<Pick<
    Treatment,
    'id' | 'name' | 'duration_minutes' | 'price'
  > | null>(null)
  const [isLinkingPlan, setIsLinkingPlan] = useState(false)
  const update = (patch: Partial<ConsultationData['summary']>) =>
    setData((previous) => ({ ...previous, summary: { ...previous.summary, ...patch } }))
  const updateStage = (
    stage: 'stage1' | 'stage2' | 'stage3',
    patch: Partial<ConsultationData['summary']['plan'][typeof stage]>,
  ) =>
    setData((previous) => ({
      ...previous,
      summary: {
        ...previous.summary,
        plan: {
          ...previous.summary.plan,
          [stage]: { ...previous.summary.plan[stage], ...patch },
        },
      },
    }))

  const annotations = faceAnalysis?.annotations ?? []
  const insertAnnotations = () => {
    if (annotations.length === 0) return
    const lines = annotations.map((annotation) => {
      const category =
        FACE_CATEGORY_OPTIONS.find((option) => option.value === annotation.category)?.label ??
        'Obserwacja'
      const region =
        FACE_REGION_OPTIONS.find((option) => option.value === annotation.region)?.label ?? 'Twarz'
      const severity =
        FACE_SEVERITY_OPTIONS.find((option) => option.value === annotation.severity)?.label ?? ''
      return `• ${annotation.label || category} — ${region}, ${severity.toLowerCase()}${
        annotation.description ? `: ${annotation.description}` : ''
      }`
    })
    const existing = data.summary.identifiedProblems.trim()
    update({
      identifiedProblems: existing ? `${existing}\n${lines.join('\n')}` : lines.join('\n'),
    })
  }

  const isBeautyPlanLinked = beautyPlan?.consultation_id === consultationId

  const openBeautyPlan = async () => {
    if (isBeautyPlanLinked) {
      router.push(`/dashboard/clients/${clientId}/plan`)
      return
    }

    setIsLinkingPlan(true)
    try {
      const result = await linkBeautyPlanToConsultationFn({
        data: { consultationId },
      })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      await router.invalidate()
      router.push(`/dashboard/clients/${clientId}/plan`)
    } catch {
      toast.error('Nie udało się powiązać planu pielęgnacyjnego')
    } finally {
      setIsLinkingPlan(false)
    }
  }

  return (
    <ConsultationSection
      index={8}
      title="Podsumowanie i plan terapii"
      description="Połącz obserwacje w konkretny plan. To jest dokument roboczy — może być uzupełniany wraz z kolejnymi wizytami."
      info={CONSULTATION_INFO.summary}
      completion={0}
    >
      <div className="rounded-2xl border border-primary/20 bg-primary-container/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-caps text-on-primary-container">Mapa twarzy</p>
            <p className="mt-1 text-sm text-on-primary-container">
              {annotations.length > 0
                ? `${annotations.length} ${
                    annotations.length === 1 ? 'obserwacja' : 'obserwacji'
                  } zapisanych na mapie`
                : 'Brak obserwacji z mapy twarzy'}
            </p>
          </div>
          <button
            type="button"
            onClick={insertAnnotations}
            disabled={annotations.length === 0 || disabled}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-primary/30 bg-background/70 px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
          >
            <ScanFace className="h-3.5 w-3.5" aria-hidden="true" />
            Wstaw do rozpoznanych problemów
          </button>
        </div>
        {annotations.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {annotations.map((annotation) => (
              <li
                key={annotation.id}
                className="rounded-full bg-background/70 px-2.5 py-1 text-[11px] text-on-primary-container"
              >
                #{annotation.number} {annotation.label || 'Obserwacja'}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Question number={1} label="Rozpoznane problemy">
        <TextAreaQuestion
          label="Obserwacje i wnioski"
          value={data.summary.identifiedProblems}
          onChange={(value) => update({ identifiedProblems: value })}
          rows={5}
          disabled={disabled}
        />
      </Question>

      <Question number={2} label="Strefy do poprawy">
        <ChoiceChips
          multiple
          options={AREA_OPTIONS}
          value={data.summary.areasToImprove}
          onChange={(value) => update({ areasToImprove: value as string[] })}
          columns={3}
        />
      </Question>

      <Question number={3} label="Dalsza diagnostyka">
        <ChoiceChips
          multiple
          options={DIAGNOSTICS_OPTIONS}
          value={data.summary.diagnostics}
          onChange={(value) => update({ diagnostics: value as string[] })}
          columns={2}
        />
        <TextQuestion
          label="Inny specjalista / uwagi"
          value={data.summary.diagnosticsOther}
          onChange={(value) => update({ diagnosticsOther: value })}
          className="mt-3"
          disabled={disabled}
        />
      </Question>

      <Question number={4} label="Cel kosmetologiczny">
        <TextAreaQuestion
          label="Cel"
          value={data.summary.cosmeticGoal}
          onChange={(value) => update({ cosmeticGoal: value })}
          placeholder="Np. w ciągu 12 tygodni poprawić nawilżenie i wyrównać koloryt…"
          rows={3}
          disabled={disabled}
        />
      </Question>

      <NotesField
        value={data.summary.notes}
        onChange={(value) => update({ notes: value })}
        disabled={disabled}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <p className="label-caps text-muted-foreground">Plan terapii</p>
            <h3 className="mt-1 font-serif text-xl text-foreground">Trzy etapy</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Pielęgnacja domowa trafi do planu pielęgnacyjnego, a wybrane zabiegi będzie można od
              razu zaplanować jako wizyty.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/40 px-3 py-1.5 text-[11px] font-medium text-on-primary-container">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Plan pielęgnacyjny jest wspólny dla wszystkich etapów
          </span>
        </div>
        {(
          [
            ['stage1', 'Etap 1', 'Fundament i przygotowanie'],
            ['stage2', 'Etap 2', 'Intensyfikacja'],
            ['stage3', 'Etap 3', 'Utrzymanie i profilaktyka'],
          ] as const
        ).map(([stage, label, hint]) => (
          <section
            key={stage}
            className="rounded-2xl border border-border/60 bg-background/50 p-4 sm:p-5"
          >
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h4 className="font-serif text-lg text-foreground">{label}</h4>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-border/50 bg-background p-3.5">
                <p className="label-caps text-muted-foreground">Pielęgnacja domowa</p>
                <TextAreaQuestion
                  label="Opis pielęgnacji"
                  value={data.summary.plan[stage].homeCare}
                  onChange={(value) => updateStage(stage, { homeCare: value })}
                  rows={4}
                  disabled={disabled}
                />
                <div className="rounded-xl border border-primary/15 bg-primary-container/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-on-primary-container">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      Plan pielęgnacyjny
                    </div>
                    <button
                      type="button"
                      onClick={() => void openBeautyPlan()}
                      disabled={disabled || isLinkingPlan}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/25 bg-background/70 px-3 text-[11px] font-medium text-on-primary-container transition-colors hover:bg-background disabled:opacity-50"
                    >
                      {isLinkingPlan
                        ? 'Łączenie…'
                        : isBeautyPlanLinked
                          ? 'Otwórz plan'
                          : 'Powiąż plan'}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-on-primary-container/80">
                    {isBeautyPlanLinked
                      ? 'Ten plan jest powiązany z konsultacją. Otwórz go, aby uzupełnić produkty i rutynę.'
                      : 'Wspólny plan dla wszystkich etapów. Powiąż go, aby przenieść zalecenia do planu pielęgnacyjnego.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/50 bg-background p-3.5">
                <p className="label-caps text-muted-foreground">Zabiegi kosmetologiczne</p>
                <TextAreaQuestion
                  label="Opis / częstotliwość"
                  value={data.summary.plan[stage].treatments}
                  onChange={(value) => updateStage(stage, { treatments: value })}
                  rows={4}
                  disabled={disabled}
                />
                <div className="space-y-2">
                  <p className="label-caps text-muted-foreground">Zabiegi z katalogu</p>
                  <TreatmentPicker
                    treatments={treatments}
                    selectedIds={data.summary.plan[stage].treatmentIds}
                    onChange={(ids) => updateStage(stage, { treatmentIds: ids })}
                    onSchedule={setScheduledTreatment}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/50 bg-background p-3.5 lg:col-span-2">
                <p className="label-caps text-muted-foreground">Suplementacja</p>
                <TextAreaQuestion
                  label="Zalecenia"
                  value={data.summary.plan[stage].supplementation}
                  onChange={(value) => updateStage(stage, { supplementation: value })}
                  rows={3}
                  disabled={disabled}
                />
              </div>
            </div>
          </section>
        ))}
      </div>

      <ScheduleTreatmentSheet
        open={scheduledTreatment !== null}
        onOpenChange={(open) => {
          if (!open) setScheduledTreatment(null)
        }}
        clientId={clientId}
        clientName={clientName}
        treatment={scheduledTreatment}
        salonId={salonId}
        staffMembers={staffMembers}
        onCreated={() => {
          setScheduledTreatment(null)
          void router.invalidate()
        }}
      />
    </ConsultationSection>
  )
}

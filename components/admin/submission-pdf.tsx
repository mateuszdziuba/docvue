'use client'

import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { normalizeFieldType } from '@/lib/form-validation'
import { applySalonPlaceholders, type SalonContact } from '@/lib/salon-placeholders'
import { formatFieldValue, isImageSignature } from '@/lib/submission-format'
import type { FormField } from '@/types/database'

const origin = typeof window !== 'undefined' ? window.location.origin : ''

Font.register({
  family: 'Manrope',
  fonts: [
    { src: `${origin}/fonts/Manrope-Regular.woff` },
    { src: `${origin}/fonts/Manrope-Bold.woff`, fontWeight: 700 },
  ],
})

type PdfEntry =
  | { kind: 'separator'; key: string; label: string; description?: string }
  | { kind: 'info'; key: string; text: string }
  | { kind: 'field'; key: string; label: string; value: string }

function buildEntries(
  fields: FormField[],
  data: Record<string, unknown> | null | undefined,
  salon: SalonContact | null,
): PdfEntry[] {
  const questionNumbers = new Map<string, number>()
  {
    let index = 0
    for (const field of fields) {
      const type = normalizeFieldType(field.type)
      if (type === 'separator' || type === 'info' || type === 'signature') continue
      index += 1
      questionNumbers.set(field.name, index)
    }
  }

  const entries: PdfEntry[] = []
  for (const field of fields) {
    const type = normalizeFieldType(field.type)
    const rawLabel = applySalonPlaceholders(field.label ?? '', salon).replace(
      /^\s*\d{1,2}\s*[.)]\s+/,
      '',
    )
    const questionNumber = questionNumbers.get(field.name)
    const label = questionNumber ? `${questionNumber}. ${rawLabel}` : rawLabel
    if (type === 'separator') {
      entries.push({
        kind: 'separator',
        key: field.name,
        label,
        description: field.description
          ? applySalonPlaceholders(field.description, salon)
          : undefined,
      })
      continue
    }
    if (type === 'info') {
      if (field.description) {
        entries.push({
          kind: 'info',
          key: field.name,
          text: applySalonPlaceholders(field.description, salon),
        })
      }
      continue
    }
    if (type === 'signature') continue
    const value = formatFieldValue(field, data?.[field.name])
    if (value === null) continue
    entries.push({ kind: 'field', key: field.name, label, value })
  }
  return entries
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Manrope',
    fontSize: 10,
    color: '#1b1c1c',
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 56,
    lineHeight: 1.5,
  },
  salonName: { fontSize: 16, fontWeight: 700, color: '#1b1c1c' },
  salonContact: { fontSize: 9, color: '#6f5957', marginTop: 2 },
  headerDivider: { borderBottomWidth: 1, borderBottomColor: '#d2c3c1', marginTop: 12 },
  formTitle: { fontSize: 14, fontWeight: 700, marginTop: 12 },
  meta: { fontSize: 9, color: '#6f5957', marginTop: 3 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#6f5957',
    marginTop: 18,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e8dedd',
  },
  sectionDescription: { fontSize: 9, color: '#6f5957', marginTop: 4 },
  infoBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f6efee',
    fontSize: 9,
    color: '#4a3c3b',
  },
  row: { flexDirection: 'row', marginTop: 7 },
  rowLabel: { width: 150, fontSize: 9, color: '#6f5957', paddingRight: 10 },
  rowValue: { flex: 1, fontSize: 10 },
  rowShort: { flexDirection: 'row', marginTop: 7, alignItems: 'flex-start' },
  rowLabelWide: { flex: 1, fontSize: 9, color: '#6f5957', paddingRight: 12 },
  rowValueShort: { fontSize: 10, fontWeight: 700, marginLeft: 12 },
  signatureBlock: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#d2c3c1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureImage: { maxHeight: 80, maxWidth: 200, objectFit: 'contain' },
  signatureText: { fontSize: 14, fontStyle: 'italic' },
  signatureLine: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#8f7c7a',
    fontSize: 8,
    color: '#6f5957',
    textAlign: 'center',
    width: 200,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#8f7c7a',
  },
})

export interface SubmissionPdfProps {
  formTitle: string
  clientName: string | null
  createdAtLabel: string
  salon: SalonContact | null
  salonCity: string
  fields: FormField[]
  data: Record<string, unknown> | null | undefined
  signature: string | null
}

export function SubmissionPdf({
  formTitle,
  clientName,
  createdAtLabel,
  salon,
  salonCity,
  fields,
  data,
  signature,
}: SubmissionPdfProps) {
  const entries = buildEntries(fields, data, salon)
  const salonContactLine = [salon?.address, salon?.phone, salon?.email].filter(Boolean).join(' · ')

  return (
    <Document title={formTitle} author={salon?.name ?? 'docvue'} creator="docvue" producer="docvue">
      <Page size="A4" style={styles.page} wrap>
        <View>
          {salon?.name ? <Text style={styles.salonName}>{salon.name}</Text> : null}
          {salonContactLine ? <Text style={styles.salonContact}>{salonContactLine}</Text> : null}
        </View>
        <View style={styles.headerDivider} />
        <Text style={styles.formTitle}>{formTitle}</Text>
        <Text style={styles.meta}>
          {clientName ?? 'Anonim'} · {createdAtLabel}
        </Text>

        {entries.map((entry) => {
          if (entry.kind === 'separator') {
            return (
              <View key={entry.key} wrap={false}>
                <Text style={styles.sectionTitle}>{entry.label}</Text>
                {entry.description ? (
                  <Text style={styles.sectionDescription}>{entry.description}</Text>
                ) : null}
              </View>
            )
          }
          if (entry.kind === 'info') {
            return (
              <View key={entry.key} style={styles.infoBox} wrap={false}>
                <Text>{entry.text}</Text>
              </View>
            )
          }
          const shortAnswer = entry.value.length <= 24
          return (
            <View key={entry.key} style={shortAnswer ? styles.rowShort : styles.row} wrap={false}>
              <Text style={shortAnswer ? styles.rowLabelWide : styles.rowLabel}>{entry.label}</Text>
              <Text style={shortAnswer ? styles.rowValueShort : styles.rowValue}>
                {entry.value}
              </Text>
            </View>
          )
        })}

        <View style={styles.signatureBlock} wrap={false}>
          <Text style={styles.meta}>
            {salonCity ? `${salonCity}, ` : ''}
            {createdAtLabel}
          </Text>
          <View>
            {signature ? (
              isImageSignature(signature) ? (
                <Image src={signature} style={styles.signatureImage} />
              ) : (
                <Text style={styles.signatureText}>{signature}</Text>
              )
            ) : (
              <View style={{ height: 48 }} />
            )}
            <Text style={styles.signatureLine}>
              Podpis klienta{clientName ? ` — ${clientName}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Dokument wygenerowany z systemu docvue</Text>
          <Text render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

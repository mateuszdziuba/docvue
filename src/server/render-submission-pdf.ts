import { createElement } from 'react'
import { resolveSiteUrl } from './_site-url'

export interface RenderSubmissionPdfProps {
  formTitle: string
  clientName: string | null
  createdAtLabel: string
  salon: {
    name?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    city?: string | null
  } | null
  salonCity: string
  fields: unknown[]
  data: Record<string, unknown> | null | undefined
  signature: string | null
}

/**
 * Renderuje migawkę PDF zgody po stronie serwera (bez przeglądarki).
 * Zwraca Buffer albo null — wywołujący decyduje, czy zapisać artefakt.
 */
export async function renderSubmissionPdf(props: RenderSubmissionPdfProps): Promise<Buffer | null> {
  try {
    const [{ renderToBuffer }, { SubmissionPdf, registerPdfFonts }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/admin/submission-pdf'),
    ])
    registerPdfFonts(resolveSiteUrl())
    const element = createElement(SubmissionPdf, {
      formTitle: props.formTitle,
      clientName: props.clientName,
      createdAtLabel: props.createdAtLabel,
      salon: props.salon,
      salonCity: props.salonCity,
      fields: props.fields as never,
      data: props.data,
      signature: props.signature,
    })
    const buffer = await renderToBuffer(element as never)
    return Buffer.from(buffer)
  } catch (error) {
    console.error('[submission-pdf] Nie udało się wygenerować migawki PDF:', error)
    return null
  }
}

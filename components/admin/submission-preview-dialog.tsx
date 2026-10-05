'use client'

import { FileQuestion, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { getSubmissionFn } from '@/src/server/submissions'

interface SubmissionPreviewDialogProps {
  submission: any
  trigger?: React.ReactNode
}

interface SubmissionDetail {
  id: string
  data: Record<string, unknown> | null
  client_name: string | null
  created_at: string
  signature: string | null
  forms?: { title?: string; schema?: { fields?: any[] } } | null
}

export function SubmissionPreviewDialog({ submission, trigger }: SubmissionPreviewDialogProps) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || detail) return
    let active = true
    setIsLoading(true)
    getSubmissionFn({ data: { id: submission.id } })
      .then((result) => {
        if (active && 'submission' in result && result.submission) {
          setDetail(result.submission as SubmissionDetail)
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, detail, submission.id])

  const source = detail ?? submission
  const formFields: any[] = source.forms?.schema?.fields ?? []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Zobacz odpowiedź
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Odpowiedź: {source.forms?.title ?? 'Formularz'}</DialogTitle>
        </DialogHeader>

        {isLoading && !detail ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
            Wczytywanie odpowiedzi...
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-secondary/40 p-4 text-sm">
              <div>
                <span className="block text-muted-foreground">Klient</span>
                <span className="font-medium">{source.client_name ?? 'Anonim'}</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Data</span>
                <span className="font-medium">
                  {new Date(source.created_at).toLocaleString('pl-PL')}
                </span>
              </div>
            </div>

            {formFields.length === 0 ? (
              <EmptyState
                icon={<FileQuestion className="h-6 w-6" aria-hidden="true" />}
                title="Brak szczegółów formularza dla tej odpowiedzi"
              />
            ) : (
              <div className="space-y-4">
                {formFields.map((field: any) => {
                  const value = source.data?.[field.name]
                  if (field.type === 'separator') return null

                  const isSignature = field.type === 'signature' || field.type === 'Signature'

                  return (
                    <div key={field.name} className="border-b border-border pb-4 last:border-0">
                      <p className="mb-1 text-sm text-muted-foreground">
                        {field.label || field.name}
                      </p>
                      {isSignature && typeof value === 'string' && value.startsWith('data:') ? (
                        <img
                          src={value}
                          alt="Podpis"
                          className="mt-2 h-auto max-w-[200px] rounded-lg border border-border bg-background"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground">
                          {Array.isArray(value)
                            ? value.join(', ')
                            : typeof value === 'boolean'
                              ? value
                                ? 'Tak'
                                : 'Nie'
                              : value || (
                                  <span className="italic text-muted-foreground">
                                    Brak odpowiedzi
                                  </span>
                                )}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {source.signature && (
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-sm text-muted-foreground">Podpis końcowy</p>
                {source.signature.startsWith('data:') ? (
                  <img
                    src={source.signature}
                    alt="Podpis klienta"
                    className="max-w-[200px] rounded-lg border border-border"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{source.signature}</p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

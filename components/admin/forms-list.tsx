'use client'

import { FileText, Pencil, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { Switch } from '@/components/ui/switch'
import { Link } from '@/lib/link-compat'
import { useRouterCompat } from '@/lib/router-compat'
import { deleteFormFn, toggleFormActiveFn } from '@/src/server/forms'
import type { Form } from '@/types/database'
import { DeleteIconButton } from './delete-icon-button'

interface FormsListProps {
  forms: Form[]
  query?: string
  isOwner?: boolean
}

export function FormsList({ forms, query, isOwner = false }: FormsListProps) {
  const [formToDelete, setFormToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const router = useRouterCompat()

  const handleToggleActive = async (form: Form, nextActive: boolean) => {
    setTogglingId(form.id)
    try {
      const result = await toggleFormActiveFn({ data: { id: form.id, is_active: nextActive } })
      if (result && 'error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success(nextActive ? 'Formularz aktywowany' : 'Formularz dezaktywowany')
      router.refresh()
    } catch {
      toast.error('Nie udało się zmienić statusu formularza')
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!formToDelete) return
    setIsDeleting(true)
    try {
      const result = await deleteFormFn({ data: { id: formToDelete } })
      if (result && 'error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Formularz został usunięty')
      setFormToDelete(null)
      router.refresh()
    } catch {
      toast.error('Wystąpił błąd podczas usuwania formularza')
    } finally {
      setIsDeleting(false)
    }
  }

  if (forms.length === 0) {
    if (query) {
      return (
        <div className="space-y-6">
          <SearchInput placeholder="Szukaj formularzy..." />
          <div className="rounded-xl border border-border/60 bg-card">
            <EmptyState
              icon={<Search className="h-6 w-6" aria-hidden="true" />}
              title="Brak wyników wyszukiwania"
              description={`Nie znaleziono formularzy pasujących do zapytania „${query}"`}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="pb-8">
        <EmptyState
          icon={<FileText className="h-7 w-7" aria-hidden="true" />}
          title="Brak formularzy"
          description="Utwórz swój pierwszy formularz, aby rozpocząć zbieranie danych od klientów."
        />
        {isOwner && (
          <div className="flex justify-center">
            <Button asChild className="gap-2">
              <Link href="/dashboard/forms/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Utwórz formularz
              </Link>
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SearchInput placeholder="Szukaj formularzy..." />
        {isOwner && (
          <Button asChild className="gap-2">
            <Link href="/dashboard/forms/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nowy formularz
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {forms.map((form) => (
          <div
            key={form.id}
            className="rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h3 className="truncate text-lg font-semibold text-foreground">{form.title}</h3>
                  <Badge
                    variant="secondary"
                    className={
                      form.is_active
                        ? 'rounded-full border-transparent bg-success/15 px-2 py-1 text-xs font-medium text-success'
                        : 'rounded-full border-transparent bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground'
                    }
                  >
                    {form.is_active ? 'Aktywny' : 'Nieaktywny'}
                  </Badge>
                </div>
                {form.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {form.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Utworzono: {new Date(form.created_at).toLocaleDateString('pl-PL')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isOwner && (
                  <>
                    <label
                      htmlFor={`form-active-${form.id}`}
                      className="flex h-11 w-11 items-center justify-center cursor-pointer"
                    >
                      <Switch
                        id={`form-active-${form.id}`}
                        checked={form.is_active}
                        disabled={togglingId === form.id}
                        onCheckedChange={(checked) => handleToggleActive(form, checked)}
                        aria-label={`Formularz aktywny: ${form.title}`}
                      />
                    </label>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      <Link
                        href={`/dashboard/forms/${form.id}/edit`}
                        aria-label={`Edytuj formularz ${form.title}`}
                        title="Edytuj"
                      >
                        <Pencil className="h-5 w-5" aria-hidden="true" />
                      </Link>
                    </Button>
                    <DeleteIconButton
                      label={`Usuń formularz ${form.title}`}
                      onClick={() => setFormToDelete(form.id)}
                      className="h-11 w-11"
                      iconClassName="h-5 w-5"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog
        open={formToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFormToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń formularz</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć ten formularz? Ta operacja jest nieodwracalna. Usunięcie
              formularza spowoduje również usunięcie wszystkich przypisań do klientów oraz ich
              odpowiedzi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Usuwanie...' : 'Usuń formularz'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

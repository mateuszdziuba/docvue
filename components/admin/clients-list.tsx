'use client'

import { useNavigate } from '@tanstack/react-router'
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
import { SearchInput } from '@/components/ui/search-input'
import { Link } from '@/lib/link-compat'
import { useRouterCompat } from '@/lib/router-compat'
import { deleteClient } from '@/src/server/clients'
import type { Client } from '@/types/database'
import { AddClientForm } from './add-client-form'
import { DeleteIconButton } from './delete-icon-button'

interface ClientsListProps {
  clients: Client[]
  query?: string
  defaultOpenAdd?: boolean
  isOwner?: boolean
  page?: number
  pageSize?: number
  total?: number
}

export function ClientsList({
  clients,
  query,
  defaultOpenAdd = false,
  isOwner = false,
  page = 1,
  pageSize = 50,
  total = 0,
}: ClientsListProps) {
  const [showAddForm, setShowAddForm] = useState(defaultOpenAdd)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouterCompat()
  const navigate = useNavigate()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const goToPage = (nextPage: number) => {
    void navigate({
      to: '/dashboard/clients',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        page: nextPage <= 1 ? undefined : nextPage,
      }),
    })
  }

  const handleDeleteClick = (e: React.MouseEvent, clientId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setClientToDelete(clientId)
  }

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return
    setIsDeleting(true)
    try {
      const result = await deleteClient(clientToDelete)
      if (result && 'error' in result && result.error) throw new Error(result.error)
      toast.success('Klient został usunięty')
      setClientToDelete(null)
      router.refresh()
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Wystąpił błąd podczas usuwania klienta')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Add Client Button / Form */}
        <div className="bg-card rounded-xl p-6 border border-border/60">
          {showAddForm ? (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Dodaj nowego klienta</h3>
              <AddClientForm
                onSuccess={() => {
                  router.refresh()
                  setShowAddForm(false)
                }}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          ) : isOwner ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Dodaj klienta
            </button>
          ) : null}
        </div>

        {/* Search - Moved here as requested */}
        <div className="w-full">
          <SearchInput placeholder="Szukaj klientów (imię, telefon, lokalizacja)..." />
        </div>

        {/* Clients List */}
        {clients.length > 0 ? (
          <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Klient
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Lokalizacja
                    </th>
                    <th className="hidden px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:table-cell">
                      Ostatnia wizyta
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/dashboard/clients/${client.id}`} className="block min-w-0">
                          <p className="truncate text-sm font-medium text-foreground hover:text-primary transition-colors">
                            {client.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[client.email, client.phone].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block max-w-[14rem] truncate text-sm text-muted-foreground">
                          {client.location || '—'}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {client.last_visit_at
                            ? new Date(client.last_visit_at).toLocaleDateString('pl-PL')
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                          >
                            Zarządzaj
                          </Link>
                          {isOwner && (
                            <DeleteIconButton
                              label={`Usuń klienta ${client.name}`}
                              onClick={(e) => handleDeleteClick(e, client.id)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-xl border border-border/60">
            {query ? (
              <>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary mb-4">
                  <svg
                    className="w-6 h-6 text-muted-foreground/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Brak wyników wyszukiwania
                </h3>
                <p className="text-muted-foreground">
                  Nie znaleziono klientów pasujących do zapytania "{query}"
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
                  <svg
                    className="w-8 h-8 text-muted-foreground/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Brak klientów</h3>
                <p className="text-muted-foreground mb-6">
                  Dodaj pierwszego klienta używając przycisku powyżej.
                </p>
              </>
            )}
          </div>
        )}

        {total > pageSize && (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Strona {page} z {totalPages} · {total.toLocaleString('pl-PL')} klientów
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Poprzednia
              </button>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Następna →
              </button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={clientToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setClientToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń klienta</AlertDialogTitle>
            <AlertDialogDescription>
              Usunięcie klienta spowoduje trwałe usunięcie wszystkich jego danych, przypisanych
              formularzy oraz udzielonych odpowiedzi. Ta operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleConfirmDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Usuwanie…' : 'Usuń klienta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

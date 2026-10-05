'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
}

interface ClientComboboxProps {
  onSelect: (clientId: string) => void
  salonId: string
  id?: string
  labelledBy?: string
  describedBy?: string
  invalid?: boolean
}

export const ClientCombobox = React.forwardRef<HTMLButtonElement, ClientComboboxProps>(
  function ClientCombobox({ onSelect, salonId, id, labelledBy, describedBy, invalid }, ref) {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState('')
    const [selectedName, setSelectedName] = React.useState('')
    const [query, setQuery] = React.useState('')
    const [clients, setClients] = React.useState<Client[]>([])
    const [loading, setLoading] = React.useState(false)
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const listboxId = React.useId()

    const supabase = React.useMemo(() => createClient(), [])

    const handleSearch = React.useCallback(
      async (search: string) => {
        setLoading(true)
        let dbQuery = supabase.from('clients').select('id, name').eq('salon_id', salonId).limit(5)

        if (search) {
          dbQuery = dbQuery.ilike('name', `%${search}%`)
        }

        const { data } = await dbQuery

        if (data) setClients(data)
        setLoading(false)
      },
      [salonId, supabase],
    )

    const handleOpenChange = (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (nextOpen && clients.length === 0) {
        void handleSearch('')
      }
    }

    React.useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }, [])

    const onInputChange = (nextQuery: string) => {
      setQuery(nextQuery)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void handleSearch(nextQuery)
      }, 300)
    }

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-labelledby={labelledBy ?? id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(
              'w-full justify-between min-h-11 md:min-h-[40px]',
              invalid && 'border-destructive',
            )}
          >
            <span className={cn('truncate', !value && 'text-muted-foreground font-normal')}>
              {value && selectedName ? selectedName : 'Wybierz klienta...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(300px,calc(100vw-2rem))] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Szukaj klienta..."
              onValueChange={onInputChange}
              value={query}
            />
            <CommandList id={listboxId}>
              {loading && (
                <div className="py-6 text-center text-sm text-muted-foreground">Szukanie...</div>
              )}
              {!loading && clients.length === 0 && query.length > 0 && (
                <CommandEmpty>Nie znaleziono klienta.</CommandEmpty>
              )}
              <CommandGroup>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    className="min-h-11 md:min-h-0"
                    onSelect={() => {
                      const nextValue = value === client.id ? '' : client.id
                      setValue(nextValue)
                      setSelectedName(nextValue ? client.name : '')
                      if (nextValue) onSelect(nextValue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === client.id ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                    {client.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  },
)

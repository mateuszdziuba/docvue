"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"

interface Client {
    id: string
    name: string
}

interface ClientComboboxProps {
    onSelect: (clientId: string) => void
    salonId: string
}

export function ClientCombobox({ onSelect, salonId }: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = React.useState(false)
  
  const supabase = createClient()

  // Debounced search
  const handleSearch = React.useCallback(async (search: string) => {
    if (!search && search !== '') return // Allow empty search for initial load
    
    setLoading(true)
    let dbQuery = supabase
        .from('clients')
        .select('id, name')
        .eq('salon_id', salonId)
        .limit(5)
    
    if (search) {
        dbQuery = dbQuery.ilike('name', `%${search}%`)
    }
    
    const { data } = await dbQuery
    
    if (data) setClients(data)
    setLoading(false)
  }, [salonId, supabase])

  // Initial fetch (optional, maybe recent clients?)
  React.useEffect(() => {
    if (open && clients.length === 0) {
        handleSearch('') 
    }
  }, [open])

  // Simple debounce
  const [timer, setTimer] = React.useState<NodeJS.Timeout>()
  const onInputChange = (val: string) => {
      setQuery(val)
      clearTimeout(timer)
      const newTimer = setTimeout(() => {
        handleSearch(val)
      }, 300)
      setTimer(newTimer)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? clients.find((client) => client.id === value)?.name || (
                <span className="text-muted-foreground">{clients.find(c => c.id === value)?.name || 'Wybrano klienta'}</span> 
            )
            : "Wybierz klienta..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Szukaj klienta..." 
            onValueChange={onInputChange} 
            value={query}
          />
          <CommandList>
            {loading && <div className="py-6 text-center text-sm text-muted-foreground">Szukanie...</div>}
            {!loading && clients.length === 0 && query.length > 0 && <CommandEmpty>Nie znaleziono klienta.</CommandEmpty>}
            <CommandGroup>
                {clients.map((client) => (
                <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue)
                    onSelect(currentValue)
                    setOpen(false)
                    }}
                >
                    <Check
                    className={cn(
                        "mr-2 h-4 w-4",
                        value === client.id ? "opacity-100" : "opacity-0"
                    )}
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
}

'use client'

import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
  'aria-invalid'?: boolean
  'aria-required'?: boolean
  'aria-describedby'?: string
  'aria-label'?: string
}

export function DatePicker({
  date,
  setDate,
  disabled,
  className,
  placeholder = 'Wybierz datę',
  id,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
          aria-describedby={ariaDescribedBy}
          aria-label={ariaLabel}
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal border-input bg-card hover:bg-surface-container text-foreground rounded-xl h-11 px-4',
            !date && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {date ? format(date, 'PPP', { locale: pl }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          locale={pl}
          captionLayout="dropdown-buttons"
          fromYear={1920}
          toYear={new Date().getFullYear() + 2} // Allow slightly future dates for things like appointment scheduling maybe? Or stick to user request.
          // User asked for birth dates mostly, so 1900-202X.
          // New form has "Data". Could be anything.
          // EditClient has birth_date.
          // Best to give a wide range.
        />
      </PopoverContent>
    </Popover>
  )
}

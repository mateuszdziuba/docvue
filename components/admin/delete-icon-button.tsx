'use client'

import { Trash2 } from 'lucide-react'
import type * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DeleteIconButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  label: string
  iconClassName?: string
}

export function DeleteIconButton({
  label,
  className,
  iconClassName,
  children,
  ...props
}: DeleteIconButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={cn(
        'h-11 w-11 md:h-9 md:w-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40',
        className,
      )}
      {...props}
    >
      {children ?? <Trash2 className={cn('h-4 w-4', iconClassName)} aria-hidden="true" />}
    </Button>
  )
}

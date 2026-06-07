import { cn } from '@/lib/utils'
import { Button } from './button'
import type { ButtonProps } from './button'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: ButtonProps['variant']
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className,
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-5 text-secondary-foreground/60">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-lg font-normal text-foreground tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || 'default'}
          onClick={action.onClick}
          className="mt-6"
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

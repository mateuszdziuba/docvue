import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FloatingLabelInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ className, label, id, type, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={type}
          placeholder=" "
          className={cn(
            'peer h-13 w-full bg-transparent border-b-2 border-border pt-5 pb-1 px-0 text-sm text-foreground',
            'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200',
            className,
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            'absolute left-0 top-4 text-sm text-muted-foreground pointer-events-none',
            'peer-focus:text-xs peer-focus:top-0 peer-focus:font-semibold peer-focus:tracking-[0.12em] peer-focus:uppercase peer-focus:text-ring',
            'peer-placeholder-shown:text-sm peer-placeholder-shown:top-4',
            'peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:font-semibold',
            'transition-all duration-200',
          )}
        >
          {label}
        </label>
      </div>
    )
  },
)
FloatingLabelInput.displayName = 'FloatingLabelInput'

export { FloatingLabelInput }

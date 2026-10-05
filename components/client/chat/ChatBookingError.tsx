import { AlertCircle } from 'lucide-react'

interface ChatBookingErrorProps {
  message: string
}

export function ChatBookingError({ message }: ChatBookingErrorProps) {
  return (
    <div
      role="alert"
      className="mt-2 flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm leading-relaxed text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}

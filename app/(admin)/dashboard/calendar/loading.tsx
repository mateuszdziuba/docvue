import { Skeleton } from '@/components/ui/skeleton'

export default function CalendarLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden -m-4 md:-m-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-12 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-24 hidden sm:block" />
      </div>

      {/* Grid skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Time column */}
        <div className="w-13 shrink-0 border-r border-border/40 pt-12">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-16 flex items-start pt-1 pr-2 justify-end">
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1">
          {Array.from({ length: 7 }).map((_, dayIdx) => (
            <div key={dayIdx} className="flex-1 border-l border-border/40 first:border-l-0">
              {/* Day header */}
              <div className="h-12 flex flex-col items-center justify-center gap-1 border-b border-border/40">
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              {/* Appointment placeholders */}
              <div className="relative p-1 space-y-1">
                {dayIdx === 1 && (
                  <Skeleton className="h-16 w-full rounded-md mt-10" />
                )}
                {dayIdx === 3 && (
                  <>
                    <Skeleton className="h-10 w-full rounded-md mt-4" />
                    <Skeleton className="h-20 w-full rounded-md mt-2" />
                  </>
                )}
                {dayIdx === 5 && (
                  <Skeleton className="h-12 w-full rounded-md mt-16" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

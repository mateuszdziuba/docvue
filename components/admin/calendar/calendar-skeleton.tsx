'use client'

import { END_HOUR, HOUR_HEIGHT, START_HOUR, TIME_LABEL_WIDTH, TOTAL_GRID_HEIGHT } from './constants'

const BLOCK_HEIGHTS = [60, 40, 80, 40, 60, 30]
const BLOCK_TOPS = [110, 300, 500]
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const MONTH_CELL_KEYS = Array.from({ length: 35 }, (_, i) => `cell-${i}`)

function GridSkeleton({ columnCount }: { columnCount: number }) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
  const columns = Array.from({ length: Math.max(1, columnCount) }, (_, i) => i)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Time gutter — paski w miejscu etykiet godzin */}
      <div
        className="shrink-0 border-r border-border/60 bg-card"
        style={{ width: TIME_LABEL_WIDTH, minWidth: TIME_LABEL_WIDTH }}
      >
        <div className="h-[52px] border-b border-border/60" />
        {hours.map((hour) => (
          <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
            <div className="absolute -top-[9px] right-2 h-2.5 w-7 rounded-sm bg-muted" />
          </div>
        ))}
      </div>

      {/* Columns */}
      <div className="relative min-w-0 flex-1" style={{ height: 52 + TOTAL_GRID_HEIGHT }}>
        {hours.map((hour, index) => (
          <div key={hour}>
            <div
              className="absolute left-0 right-0 border-t border-border/60"
              style={{ top: 52 + index * HOUR_HEIGHT }}
            />
            <div
              className="absolute left-0 right-0 border-t border-dashed border-border/50"
              style={{ top: 52 + index * HOUR_HEIGHT + HOUR_HEIGHT * 0.25 }}
            />
            <div
              className="absolute left-0 right-0 border-t border-border/60"
              style={{ top: 52 + index * HOUR_HEIGHT + HOUR_HEIGHT * 0.5 }}
            />
            <div
              className="absolute left-0 right-0 border-t border-dashed border-border/50"
              style={{ top: 52 + index * HOUR_HEIGHT + HOUR_HEIGHT * 0.75 }}
            />
          </div>
        ))}

        <div className="flex h-full">
          {columns.map((columnIndex) => {
            const blockCount = columnIndex % 3 === 0 ? 1 : columnIndex % 3 === 1 ? 2 : 0
            return (
              <div
                key={columnIndex}
                className="relative min-w-0 flex-1 border-r border-border/50 last:border-r-0"
              >
                {/* Nagłówek kolumny */}
                <div className="flex h-[52px] items-center justify-center gap-1.5 border-b border-border/60 bg-card">
                  <div className="h-5 w-5 rounded-full bg-muted" />
                  <div className="h-2.5 w-16 rounded-sm bg-muted" />
                </div>

                {/* Bloki wizyt */}
                {Array.from({ length: blockCount }, (_, blockIndex) => {
                  const height = BLOCK_HEIGHTS[(columnIndex + blockIndex) % BLOCK_HEIGHTS.length]
                  const top = BLOCK_TOPS[(columnIndex + blockIndex) % BLOCK_TOPS.length]
                  return (
                    <div
                      key={`${top}-${height}`}
                      className="absolute left-1.5 right-1.5 animate-pulse overflow-hidden rounded-md border border-border/60 bg-muted/60"
                      style={{ top: 52 + top, height }}
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-muted-foreground/25" />
                      <div className="absolute left-3 top-2 h-2 w-10 rounded-sm bg-muted-foreground/20" />
                      {height >= 60 && (
                        <div className="absolute left-3 top-6 h-2 w-20 rounded-sm bg-muted-foreground/15" />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonthSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-7 border-b border-border/60 bg-card">
        {WEEKDAY_KEYS.map((day) => (
          <div key={day} className="flex justify-center py-2.5">
            <div className="h-2.5 w-8 rounded-sm bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7" style={{ gridAutoRows: 'minmax(110px, 1fr)' }}>
        {MONTH_CELL_KEYS.map((cellKey, index) => (
          <div key={cellKey} className="border-b border-r border-border/40 p-1.5 last:border-r-0">
            <div className="mb-1.5 h-5 w-5 rounded-md bg-muted" />
            {index % 4 !== 3 && (
              <div className="mb-1 h-3 w-full animate-pulse rounded-sm bg-muted/70" />
            )}
            {index % 5 === 1 && <div className="h-3 w-2/3 animate-pulse rounded-sm bg-muted/60" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CalendarSkeleton({
  variant = 'grid',
  columnCount = 7,
}: {
  variant?: 'grid' | 'month'
  columnCount?: number
}) {
  return (
    <div className="h-full" aria-hidden="true">
      {variant === 'month' ? <MonthSkeleton /> : <GridSkeleton columnCount={columnCount} />}
    </div>
  )
}

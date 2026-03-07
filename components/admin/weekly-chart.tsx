'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface WeeklyChartProps {
  data: { day: string; wizyty: number; odpowiedzi: number }[]
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillSubmissions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              fontSize: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="wizyty"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#fillVisits)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--color-card)' }}
          />
          <Area
            type="monotone"
            dataKey="odpowiedzi"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="url(#fillSubmissions)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--color-card)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface WeeklyChartProps {
  data: { day: string; wizyty: number; odpowiedzi: number }[]
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(172, 50%, 36%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(172, 50%, 36%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillSubmissions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(36, 80%, 56%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(36, 80%, 56%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(30, 12%, 88%)" 
            vertical={false}
          />
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(30, 12%, 88%)',
              borderRadius: '10px',
              fontSize: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="wizyty"
            stroke="hsl(172, 50%, 36%)"
            strokeWidth={2}
            fill="url(#fillVisits)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: 'white' }}
          />
          <Area
            type="monotone"
            dataKey="odpowiedzi"
            stroke="hsl(36, 80%, 56%)"
            strokeWidth={2}
            fill="url(#fillSubmissions)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: 'white' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

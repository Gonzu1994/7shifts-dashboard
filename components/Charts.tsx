// components/Charts.tsx
'use client';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area, CartesianGrid,
} from 'recharts';

function Wrap({ children, height = 320 }: { children: React.ReactNode; height?: number }) {
  // Uwaga: minWidth/minHeight zapewniają dodatnie wymiary dla ResponsiveContainer
  return (
    <div
      className="bg-zinc-900 rounded-2xl p-4 shadow min-w-0"
      style={{ minHeight: height + 56 /* padding + tytuł */, overflow: 'hidden' }}
    >
      {children}
    </div>
  );
}

export function StatusPerGroupChart({ data }: { data: Array<any> }) {
  return (
    <Wrap>
      <div className="text-zinc-200 font-semibold mb-2">Status wg grup</div>
      <div className="w-full" style={{ height: 320, minWidth: 0, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="group" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="on_time" stackId="a" name="Na czas" fill="#22c55e" />
            <Bar dataKey="late" stackId="a" name="Po czasie" fill="#f59e0b" />
            <Bar dataKey="missed" stackId="a" name="Niewykonane" fill="#ef4444" />
            <Bar dataKey="in_progress" stackId="a" name="W toku (dziś)" fill="#64748b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Wrap>
  );
}

export function ActivityChart({ data }: { data: Array<any> }) {
  return (
    <Wrap>
      <div className="text-zinc-200 font-semibold mb-2">Aktywność w ciągu dnia</div>
      <div className="w-full" style={{ height: 320, minWidth: 0, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="hour" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" allowDecimals={false} />
            <Tooltip />
            <Area dataKey="done" name="Ukończone" type="monotone" fill="url(#grad)" stroke="#93c5fd" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Wrap>
  );
}

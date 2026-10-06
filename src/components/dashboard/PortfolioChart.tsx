'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import type { PriceDataPoint } from '@/types';

interface PortfolioChartProps {
  data: PriceDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-lg text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export function PortfolioChart({ data }: PortfolioChartProps) {
  const hasData = data.length > 0;
  const firstValue = data[0]?.value ?? 0;
  const lastValue = data[data.length - 1]?.value ?? 0;
  const isPositive = lastValue >= firstValue;

  const chartData = data.map((d) => ({ ...d, date: formatDateShort(d.date) }));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Andamento Portafoglio</h3>
      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          Nessun dato disponibile ancora.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#6366f1' : '#f43f5e'} stopOpacity={0.2} />
                <stop offset="95%" stopColor={isPositive ? '#6366f1' : '#f43f5e'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? '#6366f1' : '#f43f5e'}
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

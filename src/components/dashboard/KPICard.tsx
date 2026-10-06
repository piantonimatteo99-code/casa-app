import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number; // percentuale positiva/negativa
  trendLabel?: string;
  accentColor?: string;
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  accentColor = 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
  className,
}: KPICardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <div className={cn(
      'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow',
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', accentColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {trend !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          isPositiveTrend ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
        )}>
          <span>{isPositiveTrend ? '▲' : '▼'}</span>
          <span>{Math.abs(trend).toFixed(1)}%</span>
          {trendLabel && <span className="text-slate-400 font-normal ml-1">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

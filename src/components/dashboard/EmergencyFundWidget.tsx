'use client';

import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { EmergencyFundStatus } from '@/types';

interface EmergencyFundWidgetProps {
  status: EmergencyFundStatus;
}

export function EmergencyFundWidget({ status }: EmergencyFundWidgetProps) {
  const { target_months, coverage_months, progress_pct, target_amount, current_amount, avg_monthly_expenses } = status;

  const isAchieved = coverage_months >= target_months;
  const isAtRisk = progress_pct < 50;

  const statusConfig = isAchieved
    ? { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500', label: 'Obiettivo raggiunto!' }
    : isAtRisk
    ? { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500', label: 'Fondo insufficiente' }
    : { icon: TrendingUp, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-500', label: 'In costruzione' };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Fondo di Emergenza</h3>
          <p className={`text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span>{formatCurrency(current_amount)}</span>
          <span>obiettivo: {formatCurrency(target_amount)}</span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${statusConfig.bgColor}`}
            style={{ width: `${Math.min(100, progress_pct)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {progress_pct.toFixed(0)}% dell&apos;obiettivo
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {coverage_months.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Mesi coperti</p>
        </div>
        <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
          <p className="text-lg font-bold text-slate-900 dark:text-white">{target_months}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Mesi target</p>
        </div>
        <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {formatCurrency(avg_monthly_expenses)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Media/mese</p>
        </div>
      </div>
    </div>
  );
}

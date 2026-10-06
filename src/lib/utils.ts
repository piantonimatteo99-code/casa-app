import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt, { locale: it });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  return formatDate(dateStr, 'dd/MM');
}

export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  try {
    return differenceInDays(parseISO(expiryDate), new Date());
  } catch {
    return null;
  }
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM-01');
}

export function getMonthRange(monthStr: string): { start: string; end: string } {
  const date = parseISO(monthStr);
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
}

export function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isExpiringSoon(expiryDate: string | null, thresholdDays = 7): boolean {
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null) return false;
  return days <= thresholdDays && days >= 0;
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function sumBy<T>(arr: T[], key: keyof T): number {
  return arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function getColorForValue(value: number, threshold = 0): string {
  if (value > threshold) return 'text-emerald-500';
  if (value < threshold) return 'text-rose-500';
  return 'text-slate-500';
}

export function getBgColorForValue(value: number, threshold = 0): string {
  if (value > threshold) return 'bg-emerald-500';
  if (value < threshold) return 'bg-rose-500';
  return 'bg-slate-500';
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Alimentari': '#22c55e',
  'Casa & Utenze': '#3b82f6',
  'Trasporti': '#f59e0b',
  'Svago & Ristoranti': '#ec4899',
  'Salute': '#ef4444',
  'Abbigliamento': '#8b5cf6',
  'Educazione': '#06b6d4',
  'Viaggi': '#f97316',
  'Tecnologia': '#64748b',
  'Altro': '#94a3b8',
};

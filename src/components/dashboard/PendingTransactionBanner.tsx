'use client';

import { useState } from 'react';
import { X, Check, CreditCard, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Expense } from '@/types';

interface PendingTransactionBannerProps {
  transactions: Expense[];
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function PendingTransactionBanner({ transactions, onConfirm, onDismiss }: PendingTransactionBannerProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);

  if (transactions.length === 0) return null;

  async function handleConfirm(expense: Expense) {
    setLoading(expense.id);
    await supabase
      .from('expenses')
      .update({ is_draft: false })
      .eq('id', expense.id);
    setLoading(null);
    onConfirm(expense.id);
  }

  async function handleDismiss(id: string) {
    setLoading(id);
    await supabase.from('expenses').delete().eq('id', id);
    setLoading(null);
    onDismiss(id);
  }

  return (
    <div className="space-y-2 mb-6">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl animate-fade-in"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {tx.merchant ?? tx.description ?? 'Transazione'}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              <span>Da confermare &bull; {formatDate(tx.date)}</span>
            </div>
          </div>
          <span className="font-bold text-slate-900 dark:text-white flex-shrink-0">
            {formatCurrency(tx.amount)}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleConfirm(tx)}
              disabled={loading === tx.id}
              className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition disabled:opacity-60"
              title="Conferma"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDismiss(tx.id)}
              disabled={loading === tx.id}
              className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 text-rose-600 dark:text-rose-400 flex items-center justify-center transition disabled:opacity-60"
              title="Scarta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

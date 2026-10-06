'use client';

import { useState, useEffect, useCallback } from 'react';
import { PiggyBank, Plus, AlertTriangle, CheckCircle, ArrowRight, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, getCurrentMonth, getMonthRange } from '@/lib/utils';
import type { Budget, ExpenseCategory } from '@/types';

export default function BudgetPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  // Form stato
  const [selectedCatId, setSelectedCatId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const currentMonth = getCurrentMonth();
  const { start, end } = getMonthRange(currentMonth);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from('couple_members').select('couple_id').eq('user_id', user.id).single();
    if (!member) return;
    const cid = member.couple_id;
    setCoupleId(cid);

    const [
      { data: cats },
      { data: budgList },
      { data: expList },
      { data: incomes },
    ] = await Promise.all([
      supabase.from('expense_categories').select('*').or(`couple_id.is.null,couple_id.eq.${cid}`).order('name'),
      supabase.from('budgets').select('*, category:expense_categories(*)').eq('couple_id', cid).eq('month', currentMonth),
      supabase.from('expenses').select('category_id, amount').eq('couple_id', cid).eq('is_draft', false).gte('date', start).lte('date', end),
      supabase.from('income_settings').select('amount, frequency').eq('couple_id', cid).eq('active', true),
    ]);

    setCategories((cats ?? []) as ExpenseCategory[]);
    setBudgets((budgList ?? []) as unknown as Budget[]);

    // Raggruppa spese reali per categoria
    const expMap: Record<string, number> = {};
    (expList ?? []).forEach((e) => {
      if (e.category_id) {
        expMap[e.category_id] = (expMap[e.category_id] ?? 0) + Number(e.amount);
      }
    });
    setExpensesByCategory(expMap);

    // Entrate mensili
    const incTotal = (incomes ?? []).reduce((acc, curr) => {
      const val = curr.frequency === 'annual' ? Number(curr.amount) / 12 : Number(curr.amount);
      return acc + val;
    }, 0);
    setMonthlyIncome(incTotal);

    setLoading(false);
  }, [supabase, currentMonth, start, end]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSetBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId || !selectedCatId) return;
    setSaving(true);

    await supabase.from('budgets').upsert(
      {
        couple_id: coupleId,
        category_id: selectedCatId,
        month: currentMonth,
        amount: parseFloat(budgetAmount),
      },
      { onConflict: 'couple_id,category_id,month' }
    );

    setSelectedCatId('');
    setBudgetAmount('');
    await loadData();
    setSaving(false);
  }

  // Calcoli riassuntivi
  const totalBudget = budgets.reduce((acc, b) => acc + Number(b.amount), 0);
  const totalSpent = Object.values(expensesByCategory).reduce((acc, val) => acc + val, 0);
  const plannedSavings = Math.max(0, monthlyIncome - totalBudget);
  const actualSavings = Math.max(0, monthlyIncome - totalSpent);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Budget Totale Allocato</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalBudget)}</p>
          <p className="text-xs text-slate-400 mt-1">Limite di spesa del mese</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Spesa Reale Attuale</p>
          <p className={`text-2xl font-bold ${totalSpent > totalBudget && totalBudget > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
            {formatCurrency(totalSpent)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Residuo: {formatCurrency(Math.max(0, totalBudget - totalSpent))}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Risparmio Pianificato</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(plannedSavings)}</p>
          <p className="text-xs text-slate-400 mt-1">Entrate ({formatCurrency(monthlyIncome)}) - Budget</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Quota Investibile Reale</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(actualSavings)}</p>
          <p className="text-xs text-slate-400 mt-1">Disponibile oggi per investimenti</p>
        </div>
      </div>

      {/* Form Impostazione Budget */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Imposta o Aggiorna Budget Mensile</h3>
        <form onSubmit={handleSetBudget} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <select
              required
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleziona Categoria...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <input
              required
              type="number"
              step="10"
              min="0"
              placeholder="Importo mensile (€)"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-60 shadow-sm"
          >
            {saving ? 'Salvataggio...' : 'Imposta Budget'}
          </button>
        </form>
      </div>

      {/* Lista Categorie con Barre di Avanzamento */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <h3 className="font-semibold text-slate-900 dark:text-white">Avanzamento Spese per Categoria</h3>

        {categories.map((cat) => {
          const budget = budgets.find((b) => b.category_id === cat.id);
          const limit = budget ? Number(budget.amount) : 0;
          const spent = expensesByCategory[cat.id] ?? 0;
          const pct = limit > 0 ? (spent / limit) * 100 : 0;
          const isOver = limit > 0 && spent > limit;
          const isWarning = limit > 0 && pct >= 85 && !isOver;

          return (
            <div key={cat.id} className="space-y-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-semibold text-slate-900 dark:text-white">{cat.name}</span>
                  {isOver && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Budget Superato!
                    </span>
                  )}
                  {isWarning && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Quasi al limite ({pct.toFixed(0)}%)
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(spent)}</span>
                  <span className="text-slate-400 text-xs"> / {limit > 0 ? formatCurrency(limit) : 'Nessun budget'}</span>
                </div>
              </div>

              {limit > 0 ? (
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Nessun budget impostato per questo mese. Speso finora: {formatCurrency(spent)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

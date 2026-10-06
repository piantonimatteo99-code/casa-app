'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Expense, ExpenseCategory } from '@/types';

export default function SpesePage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase
      .from('couple_members').select('couple_id').eq('user_id', user.id).single();
    if (!member) return;
    const cid = member.couple_id;
    setCoupleId(cid);

    const [{ data: exp }, { data: cats }] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, category:expense_categories(*)')
        .eq('couple_id', cid)
        .eq('is_draft', false)
        .order('date', { ascending: false })
        .limit(200),
      supabase
        .from('expense_categories')
        .select('*')
        .or(`couple_id.is.null,couple_id.eq.${cid}`)
        .order('name'),
    ]);

    setExpenses((exp ?? []) as unknown as Expense[]);
    setCategories((cats ?? []) as ExpenseCategory[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('expenses').insert({
      couple_id: coupleId,
      user_id: user.id,
      amount: parseFloat(amount),
      description: description || null,
      merchant: merchant || null,
      date,
      category_id: categoryId || null,
      is_draft: false,
    });

    setAmount(''); setDescription(''); setMerchant('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId(''); setShowForm(false);
    loadData();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa spesa?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = expenses.filter((e) => {
    const matchSearch =
      !search ||
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.merchant?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || e.category_id === filterCat;
    return matchSearch && matchCat;
  });

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Spese</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Totale visualizzato: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(totalFiltered)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </div>

      {/* Form aggiunta */}
      {showForm && (
        <form
          onSubmit={handleAddExpense}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 animate-fade-in"
        >
          <h3 className="font-semibold text-slate-900 dark:text-white">Nuova Spesa</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">€ Importo *</label>
              <input
                type="number" step="0.01" min="0" required
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Data *</label>
              <input
                type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Esercente</label>
              <input
                type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)}
                placeholder="Es. Esselunga"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Categoria</label>
              <select
                value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleziona...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Nota</label>
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione opzionale"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-60"
            >
              {saving ? 'Salvataggio...' : 'Salva Spesa'}
            </button>
            <button
              type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {/* Filtri */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Cerca spese..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tutte le categorie</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Receipt className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nessuna spesa trovata</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((expense) => {
              const cat = expense.category as unknown as ExpenseCategory;
              return (
                <li
                  key={expense.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={{ backgroundColor: cat?.color ?? '#94a3b8' }}
                  >
                    {cat?.name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {expense.merchant ?? expense.description ?? 'Spesa'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {cat?.name ?? 'Senza categoria'} &bull; {formatDate(expense.date)}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm flex-shrink-0">
                    {formatCurrency(expense.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

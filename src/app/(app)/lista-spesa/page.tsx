'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Plus, Check, RefreshCw, Trash2, Sparkles, CheckCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generateShoppingList } from '@/lib/meal-plan/shopping-list';
import type { ShoppingListItem, MealPlan, PantryItem } from '@/types';

export default function ListaSpesaPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('pz');
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from('couple_members').select('couple_id').eq('user_id', user.id).single();
    if (!member) return;
    const cid = member.couple_id;
    setCoupleId(cid);

    const { data } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('couple_id', cid)
      .order('checked', { ascending: true })
      .order('created_at', { ascending: false });

    setItems((data ?? []) as ShoppingListItem[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();

    // Sottoscrizione realtime per sincronizzazione istantanea tra i due partner al supermercato
    const channel = supabase
      .channel('shopping_list_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shopping_list_items',
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  // Spunta 1-Click
  async function handleToggleChecked(item: ShoppingListItem) {
    const newChecked = !item.checked;
    // Aggiornamento ottimistico
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, checked: newChecked, checked_at: newChecked ? new Date().toISOString() : null } : i
      )
    );

    await supabase.from('shopping_list_items').update({
      checked: newChecked,
      checked_at: newChecked ? new Date().toISOString() : null,
    }).eq('id', item.id);
  }

  // Aggiunta manuale
  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId || !newItemName.trim()) return;

    const { data: inserted } = await supabase.from('shopping_list_items').insert({
      couple_id: coupleId,
      name: newItemName.trim(),
      quantity: parseFloat(newItemQty) || 1,
      unit: newItemUnit,
      source: 'manual',
      checked: false,
    }).select().single();

    if (inserted) {
      setItems((prev) => [inserted as ShoppingListItem, ...prev]);
    }

    setNewItemName('');
    setNewItemQty('1');
  }

  // Generazione automatica da Piano Pasti e scomputo Dispensa
  async function handleGenerateFromMealPlan() {
    if (!coupleId) return;
    setGenerating(true);

    const [
      { data: mealPlans },
      { data: pantryItems },
    ] = await Promise.all([
      supabase.from('meal_plan').select('*, recipe:recipes(*)').eq('couple_id', coupleId).eq('consumed', false),
      supabase.from('pantry_items').select('*').eq('couple_id', coupleId),
    ]);

    const generated = generateShoppingList(
      (mealPlans ?? []) as unknown as MealPlan[],
      (pantryItems ?? []) as PantryItem[]
    );

    for (const gen of generated) {
      // Inserisci solo se non già presente nella lista non spuntata
      const existing = items.find((i) => i.name.toLowerCase() === gen.name.toLowerCase() && !i.checked);
      if (!existing) {
        await supabase.from('shopping_list_items').insert({
          couple_id: coupleId,
          name: gen.name,
          quantity: gen.quantity,
          unit: gen.unit,
          source: 'meal_plan',
          checked: false,
        });
      }
    }

    await loadData();
    setGenerating(false);
  }

  // Elimina spuntati
  async function handleClearChecked() {
    if (!coupleId) return;
    await supabase.from('shopping_list_items').delete().eq('couple_id', coupleId).eq('checked', true);
    setItems((prev) => prev.filter((i) => !i.checked));
  }

  async function handleDeleteItem(id: string) {
    await supabase.from('shopping_list_items').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const pendingItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header Azioni */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lista della Spesa</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sincronizzazione in tempo reale con smartphone partner
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateFromMealPlan}
            disabled={generating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generating ? 'Generazione...' : 'Genera da Piano Pasti'}
          </button>
          {checkedItems.length > 0 && (
            <button
              onClick={handleClearChecked}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-200 transition"
              title="Elimina acquistati"
            >
              <Trash2 className="w-3.5 h-3.5" /> Rimuovi spuntati
            </button>
          )}
        </div>
      </div>

      {/* Form Aggiunta Rapida (Mobile-friendly) */}
      <form onSubmit={handleAddItem} className="flex gap-2">
        <input
          required
          placeholder="Aggiungi ingrediente o prodotto..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
        <input
          type="number"
          min="0.1"
          step="any"
          value={newItemQty}
          onChange={(e) => setNewItemQty(e.target.value)}
          className="w-16 px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
        <select
          value={newItemUnit}
          onChange={(e) => setNewItemUnit(e.target.value)}
          className="w-20 px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        >
          <option value="pz">pz</option>
          <option value="g">g</option>
          <option value="kg">kg</option>
          <option value="ml">ml</option>
          <option value="L">L</option>
          <option value="conf">conf</option>
        </select>
        <button
          type="submit"
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* Lista Articoli da Comprare */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Da acquistare ({pendingItems.length})
        </h3>
        {pendingItems.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            Tutto fatto! Nessun articolo nella lista spesa.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleChecked(item)}
                className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-indigo-600 transition" />
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300">
                    {item.quantity} {item.unit}
                  </span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista Articoli Già Nel Carrello */}
      {checkedItems.length > 0 && (
        <div className="space-y-2 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Nel carrello ({checkedItems.length})
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 opacity-60 shadow-sm overflow-hidden">
            {checkedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleChecked(item)}
                className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <span className="line-through text-slate-500 dark:text-slate-400 text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-slate-400">
                    {item.quantity} {item.unit}
                  </span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

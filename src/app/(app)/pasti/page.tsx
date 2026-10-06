'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UtensilsCrossed, Snowflake, Check, Plus, Calendar, Clock, AlertTriangle, Trash2, Tag
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, isExpiringSoon } from '@/lib/utils';
import type { MealPlan, Recipe, FreezerItem, MealType } from '@/types';

export default function PastiPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [freezerItems, setFreezerItems] = useState<FreezerItem[]>([]);

  // Tab: 'piano' | 'freezer' | 'ricette'
  const [activeTab, setActiveTab] = useState<'piano' | 'freezer' | 'ricette'>('piano');

  // Form Piano Pasti
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [planMealType, setPlanMealType] = useState<MealType>('pranzo');
  const [planRecipeId, setPlanRecipeId] = useState('');
  const [planCustomName, setPlanCustomName] = useState('');
  const [planFromFreezer, setPlanFromFreezer] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Form Freezer
  const [freezerName, setFreezerName] = useState('');
  const [freezerQty, setFreezerQty] = useState('2');
  const [freezerUnit, setFreezerUnit] = useState('porzioni');
  const [freezerExpiry, setFreezerExpiry] = useState('');
  const [showFreezerForm, setShowFreezerForm] = useState(false);

  // Form Nuova Ricetta Batch Cooking / Schiscetta
  const [recipeName, setRecipeName] = useState('');
  const [recipeTags, setRecipeTags] = useState('schiscetta, batch-cook, freezer-friendly');
  const [recipeServings, setRecipeServings] = useState('4');
  const [recipeIngredients, setRecipeIngredients] = useState('Riso basmati: 250 g\nPollo a tocchetti: 400 g\nZucchine: 2 pz');
  const [showRecipeForm, setShowRecipeForm] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from('couple_members').select('couple_id').eq('user_id', user.id).single();
    if (!member) return;
    const cid = member.couple_id;
    setCoupleId(cid);

    const [
      { data: meals },
      { data: recs },
      { data: fItems },
    ] = await Promise.all([
      supabase.from('meal_plan').select('*, recipe:recipes(*)').eq('couple_id', cid).order('date', { ascending: true }),
      supabase.from('recipes').select('*').eq('couple_id', cid).order('name'),
      supabase.from('freezer_items').select('*').eq('couple_id', cid).order('expiry_date', { ascending: true }),
    ]);

    setMealPlans((meals ?? []) as unknown as MealPlan[]);
    setRecipes((recs ?? []) as Recipe[]);
    setFreezerItems((fItems ?? []) as FreezerItem[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle 1-Click Consumato
  async function handleToggleConsumed(meal: MealPlan) {
    const newStatus = !meal.consumed;
    await supabase.from('meal_plan').update({
      consumed: newStatus,
      consumed_at: newStatus ? new Date().toISOString() : null,
    }).eq('id', meal.id);

    setMealPlans((prev) =>
      prev.map((m) => (m.id === meal.id ? { ...m, consumed: newStatus } : m))
    );
  }

  // Aggiunta Piano Pasto
  async function handleAddMealPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId) return;

    await supabase.from('meal_plan').insert({
      couple_id: coupleId,
      date: planDate,
      meal_type: planMealType,
      recipe_id: planRecipeId || null,
      custom_name: planCustomName || null,
      from_freezer: planFromFreezer,
      servings: 2,
    });

    setPlanCustomName('');
    setPlanRecipeId('');
    setShowPlanForm(false);
    loadData();
  }

  // Aggiungi Alimento in Freezer
  async function handleAddFreezerItem(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId) return;

    await supabase.from('freezer_items').insert({
      couple_id: coupleId,
      name: freezerName.trim(),
      quantity: parseFloat(freezerQty),
      unit: freezerUnit,
      expiry_date: freezerExpiry || null,
    });

    setFreezerName('');
    setFreezerExpiry('');
    setShowFreezerForm(false);
    loadData();
  }

  // Aggiungi Ricetta
  async function handleAddRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId) return;

    const parsedIngredients = recipeIngredients.split('\n').filter(Boolean).map((line) => {
      const parts = line.split(':');
      const name = parts[0]?.trim() || line;
      const [qtyStr, unit] = (parts[1] || '').trim().split(' ');
      return {
        name,
        quantity: parseFloat(qtyStr || '1'),
        unit: unit || 'pz',
      };
    });

    await supabase.from('recipes').insert({
      couple_id: coupleId,
      name: recipeName.trim(),
      servings: parseInt(recipeServings),
      ingredients: parsedIngredients,
      tags: recipeTags.split(',').map((t) => t.trim()),
    });

    setRecipeName('');
    setShowRecipeForm(false);
    loadData();
  }

  async function handleDeleteMeal(id: string) {
    await supabase.from('meal_plan').delete().eq('id', id);
    setMealPlans((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleDeleteFreezer(id: string) {
    await supabase.from('freezer_items').delete().eq('id', id);
    setFreezerItems((prev) => prev.filter((f) => f.id !== id));
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('piano')}
          className={`flex items-center gap-2 py-3 px-5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'piano'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" /> Piano Alimentare
        </button>
        <button
          onClick={() => setActiveTab('freezer')}
          className={`flex items-center gap-2 py-3 px-5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'freezer'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Snowflake className="w-4 h-4" /> Registro Freezer ({freezerItems.length})
        </button>
        <button
          onClick={() => setActiveTab('ricette')}
          className={`flex items-center gap-2 py-3 px-5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'ricette'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" /> Ricettario Batch Cook ({recipes.length})
        </button>
      </div>

      {/* TAB 1: PIANO PASTI */}
      {activeTab === 'piano' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Pasti Pianificati</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clicca sulla spunta per contrassegnare con 1-click il pasto consumato
              </p>
            </div>
            <button
              onClick={() => setShowPlanForm(!showPlanForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Pianifica Pasto
            </button>
          </div>

          {/* Form Inserimento Pasto */}
          {showPlanForm && (
            <form onSubmit={handleAddMealPlan} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Data</label>
                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Tipo Pasto</label>
                  <select
                    value={planMealType}
                    onChange={(e) => setPlanMealType(e.target.value as MealType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  >
                    <option value="pranzo">Pranzo (Schiscetta)</option>
                    <option value="cena">Cena</option>
                    <option value="colazione">Colazione</option>
                    <option value="spuntino">Spuntino</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Seleziona Ricetta</label>
                  <select
                    value={planRecipeId}
                    onChange={(e) => setPlanRecipeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  >
                    <option value="">Oppure piatto personalizzato...</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!planRecipeId && (
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Nome Piatto Personalizzato</label>
                  <input
                    placeholder="es. Pasta al pomodoro e basilico"
                    value={planCustomName}
                    onChange={(e) => setPlanCustomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fromFreezer"
                  checked={planFromFreezer}
                  onChange={(e) => setPlanFromFreezer(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="fromFreezer" className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
                  <Snowflake className="w-3.5 h-3.5 text-blue-500" /> Prelevato dal Freezer (Batch Cooking)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
                  Aggiungi al Calendario
                </button>
                <button type="button" onClick={() => setShowPlanForm(false)} className="px-4 py-2 border rounded-xl text-xs text-slate-500">
                  Annulla
                </button>
              </div>
            </form>
          )}

          {/* Calendario Lista Pasti */}
          <div className="space-y-3">
            {mealPlans.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                Nessun pasto pianificato. Organizza la settimana in pochi click!
              </div>
            ) : (
              mealPlans.map((meal) => {
                const dishName = meal.recipe?.name ?? meal.custom_name ?? 'Pasto';
                return (
                  <div
                    key={meal.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                      meal.consumed
                        ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleConsumed(meal)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                          meal.consumed
                            ? 'bg-emerald-500 text-white'
                            : 'border-2 border-slate-300 dark:border-slate-700 hover:border-indigo-600 text-transparent'
                        }`}
                        title="Segna come consumato"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                            {meal.meal_type}
                          </span>
                          <span className="text-xs text-slate-400">&bull; {formatDate(meal.date)}</span>
                          {meal.from_freezer && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                              <Snowflake className="w-3 h-3" /> Freezer
                            </span>
                          )}
                        </div>
                        <p className={`font-semibold text-slate-900 dark:text-white ${meal.consumed ? 'line-through text-slate-400' : ''}`}>
                          {dishName}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REGISTRO FREEZER */}
      {activeTab === 'freezer' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Inventario Cibo Congelato</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pasti pronti batch cooking e scadenze sotto controllo
              </p>
            </div>
            <button
              onClick={() => setShowFreezerForm(!showFreezerForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Congela Alimento
            </button>
          </div>

          {showFreezerForm && (
            <form onSubmit={handleAddFreezerItem} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Nome Pietanza/Alimento *</label>
                  <input
                    required
                    placeholder="es. Ragù di carne (monoporzione)"
                    value={freezerName}
                    onChange={(e) => setFreezerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Quantità</label>
                  <input
                    type="number"
                    min="1"
                    value={freezerQty}
                    onChange={(e) => setFreezerQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Scadenza Consigliata</label>
                  <input
                    type="date"
                    value={freezerExpiry}
                    onChange={(e) => setFreezerExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
                  Aggiungi al Freezer
                </button>
                <button type="button" onClick={() => setShowFreezerForm(false)} className="px-4 py-2 border rounded-xl text-xs text-slate-500">
                  Annulla
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {freezerItems.map((item) => {
              const expiring = isExpiringSoon(item.expiry_date);
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    expiring
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">{item.name}</span>
                      {expiring && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                          <AlertTriangle className="w-3 h-3" /> In scadenza
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Disponibili: <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity} {item.unit}</span>
                    </p>
                    {item.expiry_date && (
                      <p className="text-[11px] text-slate-400">
                        Entro il: {formatDate(item.expiry_date)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteFreezer(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RICETTE BATCH COOK */}
      {activeTab === 'ricette' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Ricettario Schiscetta &amp; Batch Cooking</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pasti ideali per il riscaldamento al lavoro o congelamento in porzioni
              </p>
            </div>
            <button
              onClick={() => setShowRecipeForm(!showRecipeForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuova Ricetta
            </button>
          </div>

          {showRecipeForm && (
            <form onSubmit={handleAddRecipe} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Titolo Ricetta *</label>
                  <input
                    required
                    placeholder="es. Pollo al curry con riso e verdure"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Porzioni</label>
                  <input
                    type="number"
                    min="1"
                    value={recipeServings}
                    onChange={(e) => setRecipeServings(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                  Ingredienti (un ingrediente per riga, es: &quot;Ingrediente: Quantità Unità&quot;)
                </label>
                <textarea
                  rows={4}
                  value={recipeIngredients}
                  onChange={(e) => setRecipeIngredients(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
                  Salva Ricetta
                </button>
                <button type="button" onClick={() => setShowRecipeForm(false)} className="px-4 py-2 border rounded-xl text-xs text-slate-500">
                  Annulla
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map((rec) => (
              <div key={rec.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">{rec.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Rendimento: {rec.servings} porzioni</p>
                  </div>
                  <div className="flex gap-1">
                    {(rec.tags || []).map((t) => (
                      <span key={t} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Ingredienti:</p>
                  <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                    {((rec.ingredients as any[]) || []).map((ing, i) => (
                      <li key={i}>
                        &bull; {ing.name} ({ing.quantity} {ing.unit})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

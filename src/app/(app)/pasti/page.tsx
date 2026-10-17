'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UtensilsCrossed, Snowflake, Check, Plus, Calendar, Clock, AlertTriangle, Trash2, Tag,
  Edit3, Sparkles, ChefHat, Scale, ArrowRight, RefreshCw, ShoppingCart, Info, Flame,
  CheckCircle2, Filter, Search, X, Layers, Sun, Snowflake as SnowflakeIcon, Leaf, CloudSun
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, isExpiringSoon } from '@/lib/utils';
import type { MealPlan, Recipe, FreezerItem, MealType, RecipeIngredient } from '@/types';
import {
  DEFAULT_RECIPES, SEASONAL_PLANS, RAW_TO_COOKED_CONVERSIONS, RawToCookedItem, SeasonalMealPreset,
  INGREDIENT_NUTRITION, lookupIngredientNutrition, calculateRecipePortionsForCouple, IngredientProportionItem
} from '@/lib/meal-plan/seasonal-presets';

const DAYS_OF_WEEK = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const MEAL_TYPE_CONFIG: Record<string, { label: string; badgeClass: string; icon: string }> = {
  colazione: { label: 'Colazione', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', icon: '🌅' },
  spuntino_mattina: { label: 'Spuntino Mattina', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', icon: '🍏' },
  pranzo: { label: 'Pranzo / Schiscetta', badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300', icon: '🍱' },
  merenda: { label: 'Merenda Pomeridiana', badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300', icon: '☕' },
  spuntino: { label: 'Spuntino / Merenda', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', icon: '🍏' },
  cena: { label: 'Cena', badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300', icon: '🌙' },
};

export default function PastiPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  // Tab Principale: 'piano' | 'ricette' | 'mealprep' | 'freezer'
  const [activeTab, setActiveTab] = useState<'piano' | 'ricette' | 'mealprep' | 'freezer'>('piano');

  // Stato Dati
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [freezerItems, setFreezerItems] = useState<FreezerItem[]>([]);

  // Filtri & Selezione Giorno & Settimana nel Piano Bisettimanale
  const [selectedWeek, setSelectedWeek] = useState<'settimana_1' | 'settimana_2'>('settimana_1');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0); // 0 = Lunedì
  const [activeSeasonKey, setActiveSeasonKey] = useState<string>('autunno');
  const [showSeasonSelector, setShowSeasonSelector] = useState(false);

  // Modal / Form Inserimento & Modifica Pasto
  const [showMealModal, setShowMealModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealFormWeek, setMealFormWeek] = useState<'settimana_1' | 'settimana_2'>('settimana_1');
  const [mealFormDay, setMealFormDay] = useState('Lunedì');
  const [mealFormType, setMealFormType] = useState<MealType>('pranzo');
  const [mealFormRecipeId, setMealFormRecipeId] = useState('');
  const [mealFormCustomName, setMealFormCustomName] = useState('');
  const [mealFormIngM, setMealFormIngM] = useState('');
  const [mealFormIngF, setMealFormIngF] = useState('');
  const [mealFormCalories, setMealFormCalories] = useState('');
  const [mealFormIsSchiscetta, setMealFormIsSchiscetta] = useState(true);
  const [mealFormFromFreezer, setMealFormFromFreezer] = useState(false);
  const [mealFormNotes, setMealFormNotes] = useState('');

  // Modal / Form Ricetta (Crea o Modifica)
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeFormName, setRecipeFormName] = useState('');
  const [recipeFormCategory, setRecipeFormCategory] = useState<MealType>('pranzo');
  const [recipeFormSeason, setRecipeFormSeason] = useState('autunno');
  const [recipeFormSchiscetta, setRecipeFormSchiscetta] = useState(true);
  const [recipeFormCaloriesM, setRecipeFormCaloriesM] = useState('650');
  const [recipeFormCaloriesF, setRecipeFormCaloriesF] = useState('420');
  const [recipeFormProteinM, setRecipeFormProteinM] = useState('50');
  const [recipeFormProteinF, setRecipeFormProteinF] = useState('32');
  const [recipeFormTags, setRecipeFormTags] = useState('schiscetta, batch-cook, fit');
  const [recipeFormStorage, setRecipeFormStorage] = useState('Dura 3-4gg in frigo in contenitore di vetro ermetico.');
  
  // Builder Proporzionale Ricetta (es. 120g pasta + 40g ragù con freezer)
  const [recipeBuilderItems, setRecipeBuilderItems] = useState<IngredientProportionItem[]>([
    { name: 'Pasta di semola', quantity: 120, unit: 'g', kcal_100: 355, prot_100: 12.5 },
    { name: 'Ragù di carne', quantity: 40, unit: 'g', kcal_100: 160, prot_100: 12.5, from_freezer: true },
  ]);
  const [recipeTargetKcalM, setRecipeTargetKcalM] = useState<number>(750);
  const [recipeTargetKcalF, setRecipeTargetKcalF] = useState<number>(480);

  // Ricerca e Filtri Ricettario
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeFilterSeason, setRecipeFilterSeason] = useState('tutte');
  const [recipeFilterCategory, setRecipeFilterCategory] = useState('tutte');
  const [recipeFilterSchiscettaOnly, setRecipeFilterSchiscettaOnly] = useState(false);

  // Calcolatore Meal Prep Crudo -> Cotto
  const [selectedCalcItem, setSelectedCalcItem] = useState<RawToCookedItem>(RAW_TO_COOKED_CONVERSIONS[0]);
  const [customRawM, setCustomRawM] = useState<number>(RAW_TO_COOKED_CONVERSIONS[0].raw_m);
  const [customRawF, setCustomRawF] = useState<number>(RAW_TO_COOKED_CONVERSIONS[0].raw_f);

  // Freezer Form
  const [freezerName, setFreezerName] = useState('');
  const [freezerQty, setFreezerQty] = useState('2');
  const [freezerUnit, setFreezerUnit] = useState('porzioni');
  const [freezerExpiry, setFreezerExpiry] = useState('');
  const [showFreezerForm, setShowFreezerForm] = useState(false);

  // Notifica Toast / Feedback
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Caricamento Dati (Supabase con fallback su LocalStorage per resilienza totale)
  const loadData = useCallback(async () => {
    setLoading(true);
    let loadedFromSupabase = false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase
          .from('couple_members')
          .select('couple_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (member?.couple_id) {
          const cid = member.couple_id;
          setCoupleId(cid);

          const [{ data: meals }, { data: recs }, { data: fItems }] = await Promise.all([
            supabase.from('meal_plan').select('*, recipe:recipes(*)').eq('couple_id', cid).order('date', { ascending: true }),
            supabase.from('recipes').select('*').eq('couple_id', cid).order('name'),
            supabase.from('freezer_items').select('*').eq('couple_id', cid).order('expiry_date', { ascending: true }),
          ]);

          if (meals && meals.length > 0) {
            setMealPlans(meals as unknown as MealPlan[]);
          }
          if (recs && recs.length > 0) {
            // Unione tra ricette Supabase e default
            const recMap = new Map<string, Recipe>();
            DEFAULT_RECIPES.forEach((r) => recMap.set(r.id, r));
            recs.forEach((r: any) => recMap.set(r.id, r as Recipe));
            setRecipes(Array.from(recMap.values()));
          }
          if (fItems) {
            setFreezerItems(fItems as FreezerItem[]);
          }
          loadedFromSupabase = true;
        }
      }
    } catch {
      // Ignora errori di auth/supabase per fallback locale
    }

    // Fallback LocalStorage se non caricato da Supabase
    if (!loadedFromSupabase && typeof window !== 'undefined') {
      const savedPlans = localStorage.getItem('casa_app_meal_plans');
      const savedRecipes = localStorage.getItem('casa_app_recipes');
      const savedFreezer = localStorage.getItem('casa_app_freezer');

      if (savedPlans) {
        try { setMealPlans(JSON.parse(savedPlans)); } catch { /* ignore */ }
      } else {
        // Carica piano autunno di default se vuoto
        loadSeasonPreset('autunno', false);
      }

      if (savedRecipes) {
        try { setRecipes(JSON.parse(savedRecipes)); } catch { /* ignore */ }
      }
      if (savedFreezer) {
        try { setFreezerItems(JSON.parse(savedFreezer)); } catch { /* ignore */ }
      }
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sincronizzazione automatica su LocalStorage
  const persistState = (newPlans?: MealPlan[], newRecs?: Recipe[], newFreezer?: FreezerItem[]) => {
    if (typeof window === 'undefined') return;
    if (newPlans) localStorage.setItem('casa_app_meal_plans', JSON.stringify(newPlans));
    if (newRecs) localStorage.setItem('casa_app_recipes', JSON.stringify(newRecs));
    if (newFreezer) localStorage.setItem('casa_app_freezer', JSON.stringify(newFreezer));
  };

  // ---------------------------------------------------------------------------
  // CARICA PIANO STAGIONALE (PRESET BISETTIMANALE 1-CLICK CON 70 PASTI)
  // ---------------------------------------------------------------------------
  const loadSeasonPreset = (seasonKey: string, notify = true) => {
    const preset = SEASONAL_PLANS[seasonKey];
    if (!preset) return;

    setActiveSeasonKey(seasonKey);

    const baseMonday = new Date();
    // Calcola il lunedì della settimana corrente
    const currentDay = baseMonday.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    baseMonday.setDate(baseMonday.getDate() + diffToMonday);

    // Genera 70 pasti: 35 per Settimana 1 e 35 per Settimana 2 (con rotazione e varianti)
    const week1Meals: MealPlan[] = preset.meals.map((item, idx) => {
      const mealDate = new Date(baseMonday);
      mealDate.setDate(baseMonday.getDate() + item.day_index);
      const dateStr = mealDate.toISOString().split('T')[0];

      return {
        id: `preset_${seasonKey}_w1_${idx}_${Date.now()}`,
        couple_id: coupleId || 'local',
        date: dateStr,
        day_of_week: item.day_name,
        week_type: 'settimana_1',
        meal_type: item.meal_type,
        recipe_id: null,
        custom_name: item.dish_name,
        custom_ingredients_m: item.ingredients_m,
        custom_ingredients_f: item.ingredients_f,
        custom_calories: item.calories_text,
        is_schiscetta: item.is_schiscetta,
        servings: 2,
        consumed: false,
        consumed_at: null,
        from_freezer: false,
        notes: item.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const week2Meals: MealPlan[] = preset.meals.map((item, idx) => {
      const mealDate = new Date(baseMonday);
      mealDate.setDate(baseMonday.getDate() + 7 + item.day_index);
      const dateStr = mealDate.toISOString().split('T')[0];

      return {
        id: `preset_${seasonKey}_w2_${idx}_${Date.now()}`,
        couple_id: coupleId || 'local',
        date: dateStr,
        day_of_week: item.day_name,
        week_type: 'settimana_2',
        meal_type: item.meal_type,
        recipe_id: null,
        custom_name: item.dish_name,
        custom_ingredients_m: item.ingredients_m,
        custom_ingredients_f: item.ingredients_f,
        custom_calories: item.calories_text,
        is_schiscetta: item.is_schiscetta,
        servings: 2,
        consumed: false,
        consumed_at: null,
        from_freezer: false,
        notes: item.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const allGeneratedMeals = [...week1Meals, ...week2Meals];
    setMealPlans(allGeneratedMeals);
    persistState(allGeneratedMeals);
    setShowSeasonSelector(false);

    if (notify) {
      showToast(`Caricato con successo il ${preset.label} Bisettimanale (70 pasti completi su 2 settimane)!`);
    }
  };

  // ---------------------------------------------------------------------------
  // GESTIONE PASTI (AGGIUNGI, MODIFICA, CONSUMA, ELIMINA)
  // ---------------------------------------------------------------------------
  const handleOpenAddMeal = (dayName?: string, mealType?: MealType) => {
    setEditingMealId(null);
    setMealFormWeek(selectedWeek);
    setMealFormDay(dayName || DAYS_OF_WEEK[selectedDayIndex]);
    setMealFormType(mealType || 'pranzo');
    setMealFormRecipeId('');
    setMealFormCustomName('');
    setMealFormIngM('');
    setMealFormIngF('');
    setMealFormCalories('');
    setMealFormIsSchiscetta(true);
    setMealFormFromFreezer(false);
    setMealFormNotes('');
    setShowMealModal(true);
  };

  const handleOpenEditMeal = (meal: MealPlan) => {
    setEditingMealId(meal.id);
    setMealFormWeek(meal.week_type || selectedWeek);
    setMealFormDay(meal.day_of_week || DAYS_OF_WEEK[selectedDayIndex]);
    setMealFormType(meal.meal_type);
    setMealFormRecipeId(meal.recipe_id || '');
    setMealFormCustomName(meal.recipe?.name || meal.custom_name || '');
    setMealFormIngM(meal.custom_ingredients_m || '');
    setMealFormIngF(meal.custom_ingredients_f || '');
    setMealFormCalories(meal.custom_calories || '');
    setMealFormIsSchiscetta(meal.is_schiscetta ?? true);
    setMealFormFromFreezer(meal.from_freezer);
    setMealFormNotes(meal.notes || '');
    setShowMealModal(true);
  };

  const handleSelectRecipeInForm = (recipeId: string) => {
    setMealFormRecipeId(recipeId);
    if (!recipeId) return;

    const r = recipes.find((x) => x.id === recipeId);
    if (!r) return;

    setMealFormCustomName(r.name);
    const ingMList = r.ingredients.map((i) => `${i.name}: ${i.quantity_m ?? i.quantity} ${i.unit}`).join(', ');
    const ingFList = r.ingredients.map((i) => `${i.name}: ${i.quantity_f ?? Math.round(i.quantity * 0.65)} ${i.unit}`).join(', ');
    setMealFormIngM(ingMList);
    setMealFormIngF(ingFList);

    const calM = r.calories_m ? `M: ${r.calories_m} kcal (${r.protein_m}g P)` : '';
    const calF = r.calories_f ? `F: ${r.calories_f} kcal (${r.protein_f}g P)` : '';
    setMealFormCalories([calM, calF].filter(Boolean).join(' | '));
    setMealFormIsSchiscetta(r.schiscetta ?? true);
    if (r.storage_tips) setMealFormNotes(r.storage_tips);
  };

  const handleSaveMeal = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRecipe = recipes.find((r) => r.id === mealFormRecipeId);
    const title = selectedRecipe?.name || mealFormCustomName.trim() || 'Pasto';

    const dayIdx = DAYS_OF_WEEK.indexOf(mealFormDay);
    const baseDate = new Date();
    const currentDay = baseDate.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    const weekOffset = mealFormWeek === 'settimana_2' ? 7 : 0;
    baseDate.setDate(baseDate.getDate() + diff + weekOffset + (dayIdx >= 0 ? dayIdx : 0));
    const dateStr = baseDate.toISOString().split('T')[0];

    if (editingMealId) {
      // Modifica pasto esistente
      const updated = mealPlans.map((m) => {
        if (m.id === editingMealId) {
          return {
            ...m,
            day_of_week: mealFormDay,
            week_type: mealFormWeek,
            meal_type: mealFormType,
            date: dateStr,
            recipe_id: mealFormRecipeId || null,
            recipe: selectedRecipe,
            custom_name: title,
            custom_ingredients_m: mealFormIngM,
            custom_ingredients_f: mealFormIngF,
            custom_calories: mealFormCalories,
            is_schiscetta: mealFormIsSchiscetta,
            from_freezer: mealFormFromFreezer,
            notes: mealFormNotes,
            updated_at: new Date().toISOString(),
          };
        }
        return m;
      });
      setMealPlans(updated);
      persistState(updated);
      showToast('Pasto aggiornato con successo!');
    } else {
      // Nuovo pasto
      const newMeal: MealPlan = {
        id: `meal_${Date.now()}`,
        couple_id: coupleId || 'local',
        date: dateStr,
        day_of_week: mealFormDay,
        week_type: mealFormWeek,
        meal_type: mealFormType,
        recipe_id: mealFormRecipeId || null,
        recipe: selectedRecipe,
        custom_name: title,
        custom_ingredients_m: mealFormIngM,
        custom_ingredients_f: mealFormIngF,
        custom_calories: mealFormCalories,
        is_schiscetta: mealFormIsSchiscetta,
        servings: 2,
        consumed: false,
        consumed_at: null,
        from_freezer: mealFormFromFreezer,
        notes: mealFormNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [...mealPlans, newMeal];
      setMealPlans(updated);
      persistState(updated);
      showToast('Nuovo pasto inserito nel piano!');
    }

    setShowMealModal(false);
  };

  const handleToggleConsumed = (mealId: string) => {
    const updated = mealPlans.map((m) =>
      m.id === mealId ? { ...m, consumed: !m.consumed, consumed_at: !m.consumed ? new Date().toISOString() : null } : m
    );
    setMealPlans(updated);
    persistState(updated);
  };

  const handleDeleteMeal = (mealId: string) => {
    const updated = mealPlans.filter((m) => m.id !== mealId);
    setMealPlans(updated);
    persistState(updated);
    showToast('Pasto rimosso dal piano.');
  };

  // ---------------------------------------------------------------------------
  // GESTIONE RICETTARIO (CREA / MODIFICA / ASSEGNA RAPIDO)
  // ---------------------------------------------------------------------------
  const handleOpenAddRecipe = () => {
    setEditingRecipeId(null);
    setRecipeFormName('Pasta al ragù');
    setRecipeFormCategory('pranzo');
    setRecipeFormSeason('autunno');
    setRecipeFormSchiscetta(true);
    setRecipeFormTags('schiscetta, freezer-batch, carb-load');
    setRecipeFormStorage('Porzionare nei barattoli e congelare. Dura 3 mesi a -18°C.');
    setRecipeBuilderItems([
      { name: 'Pasta di semola', quantity: 120, unit: 'g', kcal_100: 355, prot_100: 12.5 },
      { name: 'Ragù di carne', quantity: 40, unit: 'g', kcal_100: 160, prot_100: 12.5, from_freezer: true },
    ]);
    setRecipeTargetKcalM(750);
    setRecipeTargetKcalF(480);
    setShowRecipeModal(true);
  };

  const handleOpenEditRecipe = (r: Recipe) => {
    setEditingRecipeId(r.id);
    setRecipeFormName(r.name);
    setRecipeFormCategory((r.meal_type?.[0] as MealType) || 'pranzo');
    setRecipeFormSeason(r.season || 'autunno');
    setRecipeFormSchiscetta(r.schiscetta ?? true);
    setRecipeFormCaloriesM(r.calories_m?.toString() || '650');
    setRecipeFormCaloriesF(r.calories_f?.toString() || '420');
    setRecipeFormProteinM(r.protein_m?.toString() || '50');
    setRecipeFormProteinF(r.protein_f?.toString() || '32');
    setRecipeFormTags(r.tags?.join(', ') || '');
    setRecipeFormStorage(r.storage_tips || '');

    if (r.ingredients && r.ingredients.length > 0) {
      const items: IngredientProportionItem[] = r.ingredients.map((ing) => {
        const nut = lookupIngredientNutrition(ing.name);
        return {
          name: ing.name,
          quantity: ing.quantity_m || ing.quantity || 100,
          unit: ing.unit || 'g',
          kcal_100: nut.kcal_100,
          prot_100: nut.prot_100,
          from_freezer: ing.name.toLowerCase().includes('ragù') || ing.name.toLowerCase().includes('sugo') || ing.name.toLowerCase().includes('pesto'),
        };
      });
      setRecipeBuilderItems(items);
    } else {
      setRecipeBuilderItems([
        { name: 'Pasta di semola', quantity: 120, unit: 'g', kcal_100: 355, prot_100: 12.5 },
        { name: 'Ragù di carne', quantity: 40, unit: 'g', kcal_100: 160, prot_100: 12.5, from_freezer: true },
      ]);
    }
    setRecipeTargetKcalM(r.calories_m || 750);
    setRecipeTargetKcalF(r.calories_f || 480);
    setShowRecipeModal(true);
  };

  // Calcolo dinamico in tempo reale per la ricetta corrente
  const calculatedRecipeProportions = useMemo(() => {
    return calculateRecipePortionsForCouple(recipeBuilderItems, recipeTargetKcalM, recipeTargetKcalF);
  }, [recipeBuilderItems, recipeTargetKcalM, recipeTargetKcalF]);

  const handleAddBuilderIngredient = () => {
    setRecipeBuilderItems([
      ...recipeBuilderItems,
      { name: 'Olio extravergine', quantity: 10, unit: 'g', kcal_100: 884, prot_100: 0 }
    ]);
  };

  const handleUpdateBuilderIngredient = (index: number, field: keyof IngredientProportionItem, value: any) => {
    const next = [...recipeBuilderItems];
    next[index] = { ...next[index], [field]: value };
    if (field === 'name') {
      const nut = lookupIngredientNutrition(value);
      next[index].kcal_100 = nut.kcal_100;
      next[index].prot_100 = nut.prot_100;
      // Cerca se esiste già un item corrispondente nel freezer
      const matchedF = freezerItems.find(f => f.name.toLowerCase().includes(value.toLowerCase()) || value.toLowerCase().includes(f.name.toLowerCase()));
      if (matchedF) {
        next[index].from_freezer = true;
        next[index].freezer_item_id = matchedF.id;
        next[index].freezer_available_qty = matchedF.quantity;
      }
    }
    if (field === 'freezer_item_id') {
      const item = freezerItems.find(f => f.id === value);
      if (item) {
        next[index].freezer_available_qty = item.quantity;
      }
    }
    setRecipeBuilderItems(next);
  };

  const handleRemoveBuilderIngredient = (index: number) => {
    setRecipeBuilderItems(recipeBuilderItems.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();

    // Converte gli ingredienti calcolati per M ed F
    const finalIngredients: RecipeIngredient[] = calculatedRecipeProportions.calculated.map((c) => ({
      name: c.name,
      quantity: c.base_qty,
      unit: c.unit,
      quantity_m: c.quantity_m,
      quantity_f: c.quantity_f,
    }));

    const finalCalM = calculatedRecipeProportions.totalKcalM;
    const finalCalF = calculatedRecipeProportions.totalKcalF;
    const finalProtM = calculatedRecipeProportions.totalProtM;
    const finalProtF = calculatedRecipeProportions.totalProtF;

    if (editingRecipeId) {
      const updated = recipes.map((r) => {
        if (r.id === editingRecipeId) {
          return {
            ...r,
            name: recipeFormName.trim(),
            meal_type: [recipeFormCategory],
            season: recipeFormSeason,
            schiscetta: recipeFormSchiscetta,
            calories_m: finalCalM,
            calories_f: finalCalF,
            protein_m: finalProtM,
            protein_f: finalProtF,
            tags: recipeFormTags.split(',').map((t) => t.trim()).filter(Boolean),
            storage_tips: recipeFormStorage,
            ingredients: finalIngredients,
            updated_at: new Date().toISOString(),
          };
        }
        return r;
      });
      setRecipes(updated);
      persistState(undefined, updated);
      showToast('Ricetta aggiornata con proporzioni e fabbisogno M/F!');
    } else {
      const newRec: Recipe = {
        id: `custom_rec_${Date.now()}`,
        couple_id: coupleId || 'local',
        name: recipeFormName.trim(),
        description: `Proporzioni calcolate: Uomo (85kg) ~${finalCalM} kcal | Donna (52kg) ~${finalCalF} kcal`,
        servings: 2,
        prep_time_min: 15,
        cook_time_min: 20,
        tags: recipeFormTags.split(',').map((t) => t.trim()).filter(Boolean),
        meal_type: [recipeFormCategory],
        image_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        calories_m: finalCalM,
        calories_f: finalCalF,
        protein_m: finalProtM,
        protein_f: finalProtF,
        season: recipeFormSeason,
        schiscetta: recipeFormSchiscetta,
        storage_tips: recipeFormStorage,
        ingredients: finalIngredients,
      };
      const updated = [newRec, ...recipes];
      setRecipes(updated);
      persistState(undefined, updated);
      showToast('Nuova ricetta salvata con calcolo fabbisogno M/F!');
    }

    setShowRecipeModal(false);
  };

  const handleDeleteRecipe = (id: string) => {
    const updated = recipes.filter((r) => r.id !== id);
    setRecipes(updated);
    persistState(undefined, updated);
    showToast('Ricetta eliminata.');
  };

  const handleAssignRecipeToDay = (recipe: Recipe) => {
    handleOpenAddMeal(DAYS_OF_WEEK[selectedDayIndex], (recipe.meal_type?.[0] as MealType) || 'pranzo');
    handleSelectRecipeInForm(recipe.id);
  };

  // ---------------------------------------------------------------------------
  // GENERAZIONE & INVIO A LISTA DELLA SPESA
  // ---------------------------------------------------------------------------
  const handleExportToShoppingList = () => {
    if (mealPlans.length === 0) {
      showToast('Nessun pasto pianificato da esportare.');
      return;
    }

    // Estrae e aggrega tutti gli ingredienti presenti nel piano settimanale
    const itemsMap = new Map<string, number>();

    mealPlans.forEach((m) => {
      if (m.recipe?.ingredients) {
        m.recipe.ingredients.forEach((ing) => {
          const tot = (ing.quantity_m || ing.quantity || 100) + (ing.quantity_f || Math.round(ing.quantity * 0.65) || 65);
          const key = `${ing.name} (${ing.unit})`;
          itemsMap.set(key, (itemsMap.get(key) || 0) + tot);
        });
      } else if (m.custom_ingredients_m) {
        // Fallback da testo ingredienti
        const parts = m.custom_ingredients_m.split('+');
        parts.forEach((p) => {
          const clean = p.trim();
          if (clean) {
            itemsMap.set(clean, (itemsMap.get(clean) || 0) + 1);
          }
        });
      }
    });

    // Salva in localStorage per la pagina lista-spesa
    const shoppingEntries = Array.from(itemsMap.entries()).map(([name, qty], idx) => ({
      id: `shop_meal_${Date.now()}_${idx}`,
      name,
      quantity: typeof qty === 'number' && qty > 5 ? Math.round(qty) : 1,
      unit: name.includes('kg') ? 'kg' : name.includes('L') ? 'L' : 'g',
      checked: false,
    }));

    if (typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem('casa_app_shopping_pending') || '[]');
      localStorage.setItem('casa_app_shopping_pending', JSON.stringify([...shoppingEntries, ...existing]));
    }

    showToast(`Esportati ${shoppingEntries.length} ingredienti nella Lista della Spesa!`);
  };

  // ---------------------------------------------------------------------------
  // FILTRI RICETTE
  // ---------------------------------------------------------------------------
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(recipeSearch.toLowerCase())) ||
        r.tags?.some((t) => t.toLowerCase().includes(recipeSearch.toLowerCase()));

      const matchesSeason =
        recipeFilterSeason === 'tutte' || r.season === recipeFilterSeason || r.season === 'tutto_anno';

      const matchesCategory =
        recipeFilterCategory === 'tutte' || r.meal_type?.includes(recipeFilterCategory);

      const matchesSchiscetta = !recipeFilterSchiscettaOnly || r.schiscetta;

      return matchesSearch && matchesSeason && matchesCategory && matchesSchiscetta;
    });
  }, [recipes, recipeSearch, recipeFilterSeason, recipeFilterCategory, recipeFilterSchiscettaOnly]);

  // Pasti del giorno selezionato (filtrati per la settimana attiva nella rotazione bisettimanale)
  const selectedDayName = DAYS_OF_WEEK[selectedDayIndex];
  const currentDayMeals = useMemo(() => {
    return mealPlans.filter(
      (m) => m.day_of_week === selectedDayName && (m.week_type || 'settimana_1') === selectedWeek
    );
  }, [mealPlans, selectedDayName, selectedWeek]);

  // ---------------------------------------------------------------------------
  // GESTIONE FREEZER
  // ---------------------------------------------------------------------------
  const handleAddFreezerItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freezerName.trim()) return;

    const newItem: FreezerItem = {
      id: `freezer_${Date.now()}`,
      couple_id: coupleId || 'local',
      name: freezerName.trim(),
      quantity: parseFloat(freezerQty) || 2,
      unit: freezerUnit,
      frozen_date: new Date().toISOString().split('T')[0],
      expiry_date: freezerExpiry || null,
      recipe_id: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [newItem, ...freezerItems];
    setFreezerItems(updated);
    persistState(undefined, undefined, updated);
    setFreezerName('');
    setFreezerExpiry('');
    setShowFreezerForm(false);
    showToast('Alimento registrato nel Freezer!');
  };

  const handleDeleteFreezer = (id: string) => {
    const updated = freezerItems.filter((f) => f.id !== id);
    setFreezerItems(updated);
    persistState(undefined, undefined, updated);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-500/40 animate-slide-up">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-medium">{notification}</span>
        </div>
      )}

      {/* Header Pagina & Badge Informativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-sm border border-slate-700/60">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30">
              Nutrizione &amp; Meal Prep Bisettimanale
            </span>
            <span className="text-xs text-slate-300 font-medium">
              🏊 M: 27a, 85 kg, 185 cm, Nuoto 3h/sett (~2.750 kcal) | 🏋️ F: 25a, 50 kg, 145 cm, Palestra 2h/sett (~1.800 kcal)
            </span>
            <span className="text-[11px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              🍝 Pasta normale di semola • ❄️ Spesa mensile ≤ 450€ • Batch Domenica
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Piano Alimentare Bisettimanale &amp; Schiscetta</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Menu stagionale a rotazione di 2 settimane (Settimana 1 &amp; Settimana 2). Cucina nel fine settimana, congela in vasetti ed estrai le schiscette per il lavoro.
          </p>
        </div>

        {/* Azioni Rapide Globali */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Menu Selezione Presets Stagionali */}
          <div className="relative">
            <button
              onClick={() => setShowSeasonSelector(!showSeasonSelector)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Carica Piano Stagionale
            </button>

            {showSeasonSelector && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-30 space-y-1 animate-scale-in">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Seleziona Stagione (35 Pasti):
                </p>
                {Object.entries(SEASONAL_PLANS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => loadSeasonPreset(key)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-800 dark:text-slate-200 font-medium transition flex items-center justify-between"
                  >
                    <span>{val.label}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleExportToShoppingList}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-600 transition"
            title="Invia tutti gli ingredienti necessari alla Lista della Spesa"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-teal-400" />
            Spesa
          </button>
        </div>
      </div>

      {/* Navigazione Tab */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab('piano')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs md:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'piano'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" /> Piano Settimanale ({mealPlans.length} pasti)
        </button>

        <button
          onClick={() => setActiveTab('ricette')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs md:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'ricette'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ChefHat className="w-4 h-4" /> Ricettario &amp; Scelta Piatti ({recipes.length})
        </button>

        <button
          onClick={() => setActiveTab('mealprep')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs md:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'mealprep'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" /> Studio Meal Prep &amp; Calcolatore
        </button>

        <button
          onClick={() => setActiveTab('freezer')}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs md:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'freezer'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Snowflake className="w-4 h-4" /> Registro Freezer ({freezerItems.length})
        </button>
      </div>

      {/* =====================================================================
          TAB 1: PIANO ALIMENTARE SETTIMANALE (BISETTIMANALE)
          ===================================================================== */}
      {activeTab === 'piano' && (
        <div className="space-y-5">
          {/* Selettore Rotazione Bisettimanale: Settimana 1 vs Settimana 2 */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Rotazione Menù:</span>
              <div className="inline-flex rounded-xl p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-xs">
                <button
                  type="button"
                  onClick={() => setSelectedWeek('settimana_1')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedWeek === 'settimana_1'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📅 Settimana 1</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedWeek === 'settimana_1' ? 'bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {mealPlans.filter((m) => (m.week_type || 'settimana_1') === 'settimana_1').length} pasti
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedWeek('settimana_2')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedWeek === 'settimana_2'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🔄 Settimana 2</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedWeek === 'settimana_2' ? 'bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {mealPlans.filter((m) => m.week_type === 'settimana_2').length} pasti
                  </span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1.5">
              <span>Menù bisettimanale con rotazione 14 giorni per varietà e meal prep</span>
            </div>
          </div>

          {/* Selettore Giorno Orizzontale */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((day, idx) => {
                const dayCount = mealPlans.filter(
                  (m) => m.day_of_week === day && (m.week_type || 'settimana_1') === selectedWeek
                ).length;
                const isSelected = selectedDayIndex === idx;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl text-xs font-semibold transition border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-teal-400'
                    }`}
                  >
                    <span>{day}</span>
                    <span className={`text-[10px] mt-0.5 px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {dayCount} pasti
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handleOpenAddMeal(selectedDayName)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Aggiungi Pasto
            </button>
          </div>

          {/* Dettaglio Pasti del Giorno Selezionato */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                Pasti di {selectedDayName} ({currentDayMeals.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Clicca sulla spunta per contrassegnare il pasto consumato
              </p>
            </div>

            {currentDayMeals.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 space-y-3">
                <ChefHat className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Nessun pasto pianificato per {selectedDayName}.</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => handleOpenAddMeal(selectedDayName)}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold"
                  >
                    Aggiungi Pasto a {selectedDayName}
                  </button>
                  <button
                    onClick={() => loadSeasonPreset('autunno')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium"
                  >
                    Carica Preset Stagionale
                  </button>
                </div>
              </div>
            ) : (
              currentDayMeals.map((meal) => {
                const conf = MEAL_TYPE_CONFIG[meal.meal_type] || MEAL_TYPE_CONFIG.pranzo;
                const dishTitle = meal.recipe?.name || meal.custom_name || 'Pasto';

                return (
                  <div
                    key={meal.id}
                    className={`p-4 rounded-2xl border transition space-y-2.5 ${
                      meal.consumed
                        ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-300'
                    }`}
                  >
                    {/* Header Pasto */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* 1-Click Toggle Consumato */}
                        <button
                          onClick={() => handleToggleConsumed(meal.id)}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                            meal.consumed
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'border-2 border-slate-300 dark:border-slate-700 hover:border-teal-500 text-transparent'
                          }`}
                          title="Segna come consumato"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${conf.badgeClass}`}>
                              {conf.icon} {conf.label}
                            </span>

                            {meal.is_schiscetta && (
                              <span className="text-[10px] bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 font-semibold">
                                🍱 Schiscetta Ufficio
                              </span>
                            )}

                            {meal.from_freezer && (
                              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 font-medium">
                                ❄️ Dal Freezer
                              </span>
                            )}
                          </div>

                          <h4 className={`font-bold text-slate-900 dark:text-white text-sm mt-1 ${meal.consumed ? 'line-through text-slate-400' : ''}`}>
                            {dishTitle}
                          </h4>
                        </div>
                      </div>

                      {/* Azioni Modifica / Elimina */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditMeal(meal)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Modifica pasto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Rimuovi pasto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dettaglio Porzioni Separate Uomo (85kg) e Donna (52kg) */}
                    {(meal.custom_ingredients_m || meal.custom_ingredients_f) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px] mb-0.5">
                            👨 Uomo (85 kg) [Crudo]:
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                            {meal.custom_ingredients_m}
                          </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px] mb-0.5">
                            👩 Donna (52 kg) [Crudo]:
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                            {meal.custom_ingredients_f}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Valori Nutrizionali & Note Operative */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                      {meal.custom_calories && (
                        <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" /> {meal.custom_calories}
                        </span>
                      )}

                      {meal.notes && (
                        <span className="italic text-slate-400 flex items-center gap-1 max-w-md truncate">
                          <Info className="w-3 h-3 shrink-0" /> {meal.notes}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: RICETTARIO & SCELTA PIATTI (GALLERIA CON FILTRI & AGGIUNTA)
          ===================================================================== */}
      {activeTab === 'ricette' && (
        <div className="space-y-5">
          {/* Barra Superiore Filtri & Ricerca */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Cerca */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca piatto, ingrediente (es. pollo, salmone, avena)..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Pulsante Crea Nuova Ricetta */}
              <button
                onClick={handleOpenAddRecipe}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Nuova Ricetta
              </button>
            </div>

            {/* Filtri Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Stagione:</span>
              {['tutte', 'autunno', 'inverno', 'primavera', 'estate'].map((s) => (
                <button
                  key={s}
                  onClick={() => setRecipeFilterSeason(s)}
                  className={`px-2.5 py-1 rounded-lg capitalize text-[11px] font-semibold transition ${
                    recipeFilterSeason === s
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {s}
                </button>
              ))}

              <span className="text-[11px] text-slate-400 font-medium ml-2">Pasto:</span>
              {['tutte', 'colazione', 'pranzo', 'cena', 'spuntino'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setRecipeFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg capitalize text-[11px] font-semibold transition ${
                    recipeFilterCategory === cat
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}

              <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={recipeFilterSchiscettaOnly}
                  onChange={(e) => setRecipeFilterSchiscettaOnly(e.target.checked)}
                  className="rounded text-teal-600"
                />
                Solo Schiscetta
              </label>
            </div>
          </div>

          {/* Griglia Card Ricette */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecipes.map((r) => (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 hover:border-teal-400 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase">
                          {r.meal_type?.[0] || 'Pasto'}
                        </span>
                        {r.schiscetta && (
                          <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 font-semibold">
                            🍱 Schiscetta
                          </span>
                        )}
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full capitalize font-medium">
                          {r.season || 'Tutto l\'anno'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{r.name}</h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditRecipe(r)}
                        className="p-1 text-slate-400 hover:text-teal-600 transition"
                        title="Modifica ricetta"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecipe(r.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                        title="Elimina ricetta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">{r.description}</p>

                  {/* Scomposizione Ingredienti & Porzioni M vs F */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl mt-3 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Ingredienti &amp; Porzioni a Crudo:
                    </p>
                    <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                      {r.ingredients.map((ing, i) => (
                        <li key={i} className="flex justify-between items-center text-[11px]">
                          <span>• {ing.name}</span>
                          <span className="font-mono text-slate-500">
                            👨 {ing.quantity_m ?? ing.quantity}g | 👩 {ing.quantity_f ?? Math.round(ing.quantity * 0.65)}g
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Macro e Shelf Life */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2">
                    <span>
                      🔥 M: <strong className="text-slate-700 dark:text-slate-300">{r.calories_m || 650} kcal</strong> ({r.protein_m || 45}g P) | F: <strong className="text-slate-700 dark:text-slate-300">{r.calories_f || 420} kcal</strong>
                    </span>

                    {r.estimated_cost_m && (
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        Costo Coppia: € {(r.estimated_cost_m + (r.estimated_cost_f || 0)).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Azione Aggiungi al Piano Settimanale */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleAssignRecipeToDay(r)}
                    className="w-full py-2 bg-slate-100 hover:bg-teal-600 hover:text-white dark:bg-slate-800 dark:hover:bg-teal-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Assegna al Piano di {selectedDayName}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: STUDIO MEAL PREP & CALCOLATORE PORZIONI DI COPPIA
          ===================================================================== */}
      {activeTab === 'mealprep' && (
        <div className="space-y-6">
          {/* Calcolatore Interattivo Crudo -> Cotto */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Calcolatore Crudo ➔ Cotto per la Coppia</h3>
                <p className="text-xs text-slate-500">
                  Calcola esattamente quanti grammi pesare da cotto sulla bilancia per l&apos;Uomo (85 kg) e per la Donna (50 kg)
                </p>
              </div>
            </div>

            {/* Selettore Alimento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RAW_TO_COOKED_CONVERSIONS.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setSelectedCalcItem(item);
                    setCustomRawM(item.raw_m);
                    setCustomRawF(item.raw_f);
                  }}
                  className={`p-3 rounded-xl border text-left text-xs transition ${
                    selectedCalcItem.name === item.name
                      ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="font-semibold text-xs truncate">{item.name}</p>
                  <span className="text-[10px] text-slate-400">{item.factor_label}</span>
                </button>
              ))}
            </div>

            {/* Input & Output Calcolatore */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Uomo */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  👨 Porzione Uomo (85 kg)
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-500">Crudo (g):</label>
                  <input
                    type="number"
                    value={customRawM}
                    onChange={(e) => setCustomRawM(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">PESO COTTO FINALE:</span>
                  <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400">
                    {Math.round(customRawM * selectedCalcItem.factor)} g
                  </span>
                </div>
              </div>

              {/* Donna */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  👩 Porzione Donna (50 kg)
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-500">Crudo (g):</label>
                  <input
                    type="number"
                    value={customRawF}
                    onChange={(e) => setCustomRawF(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">PESO COTTO FINALE:</span>
                  <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400">
                    {Math.round(customRawF * selectedCalcItem.factor)} g
                  </span>
                </div>
              </div>

              {/* Totale Pentola Comune */}
              <div className="bg-teal-50/60 dark:bg-teal-950/20 p-4 rounded-2xl border border-teal-200 dark:border-teal-800/60 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block mb-1">
                    🍲 Totale Pentola Comune:
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Cuoci insieme: <strong className="text-slate-800 dark:text-slate-200">{customRawM + customRawF} g a crudo</strong>.
                  </p>
                  <p className="text-2xl font-extrabold text-teal-700 dark:text-teal-300 mt-2">
                    {Math.round((customRawM + customRawF) * selectedCalcItem.factor)} g cotti
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 italic mt-2">
                  💡 {selectedCalcItem.tip}
                </p>
              </div>
            </div>
          </div>

          {/* Workflow Operativo Domenica & Mercoledì */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-sm">
                <Clock className="w-4 h-4" />
                <span>Sessione Domenica (Master Batch Cook - 120 min)</span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="font-bold text-teal-600">00-15m:</span>
                  <span>Preriscaldo forno a 190°C. Taglio verdure (zucca/carote/finocchi) e patate su teglie.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-teal-600">15-45m:</span>
                  <span>Cottura contemporanea su fornelli del cereale A (riso/farro) e di 6 uova sode.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-teal-600">45-80m:</span>
                  <span>Piastra e padelle per proteine (pollo, stufato o macinato magro).</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-teal-600">80-100m:</span>
                  <span>Assemblaggio vasetti colazione Overnight Oats o pancake per lun-mer.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-teal-600">100-120m:</span>
                  <span>Porzionatura con bilancia, raffreddamento entro 90 min e stoccaggio a +4°C.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <Clock className="w-4 h-4" />
                <span>Sessione Mercoledì (Mid-Week Refresh - 45 min)</span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="font-bold text-indigo-600">Fase 1:</span>
                  <span>Rinnovo verdure fresche: lavaggio e centrifugazione insalate per massima croccantezza.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-indigo-600">Fase 2:</span>
                  <span>Cottura rapida del secondo cereale (quinoa o pasta al dente) per giovedì e venerdì.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-indigo-600">Fase 3:</span>
                  <span>Cottura proteine delicate (merluzzo al cartoccio o straccetti) per evitare deperimento.</span>
                </li>
              </ul>

              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                ⚠️ <strong>Regola HACCP:</strong> Il pesce cotto e le insalate con condimenti non devono mai superare le 48-72 ore di conservazione a +4°C.
              </div>
            </div>
          </div>

          {/* Sezione Speciale: Gestione Barattoli Freezer & Meal Prep Settimanale (es. Pasta al Ragù 3-4 volte a settimana) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 border border-slate-700/80 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-500/30">
                  <Snowflake className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg">Strategia Freezer &amp; Condimenti Batch (es. Ragù nei Barattoli)</h3>
                  <p className="text-xs text-slate-300">
                    Cucina una volta grandi quantità di condimento/sugo, congela in vasetti ed estrai solo la quota necessaria per raggiungere le calorie M ed F.
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddRecipe}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" /> Crea Piatto da Barattolo Freezer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-1.5">
                <span className="text-teal-400 font-bold text-xs flex items-center gap-1.5">
                  1. Preparazione &amp; Barattoli
                </span>
                <p className="text-slate-300 text-[11px]">
                  Cucina ad es. 1 kg di ragù magro di manzo con soffritto leggero. Suddividilo ancora tiepido in barattoli di vetro da 150g o 250g con etichetta data.
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-1.5">
                <span className="text-teal-400 font-bold text-xs flex items-center gap-1.5">
                  2. Calcolo Fabbisogno M vs F
                </span>
                <p className="text-slate-300 text-[11px]">
                  Impostando la proporzione base (es. 120g pasta / 40g ragù), il sistema calcola la grammatura esatta per M (85 kg, ~750 kcal) e per F (50 kg, ~480 kcal).
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-1.5">
                <span className="text-teal-400 font-bold text-xs flex items-center gap-1.5">
                  3. Frequenza Pasti (3-4x Settimana)
                </span>
                <p className="text-slate-300 text-[11px]">
                  Un vasetto da 200g copre esattamente 3 pasti coppia. Scongelamento rapido in padella con poca acqua di cottura della pasta per mantenere la cremosità.
                </p>
              </div>
            </div>
          </div>

          {/* Sezione: Guida Strategica Spesa Mensile Unica (Budget 450€) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Piano Spesa Mensile Unica (Budget Target: 450 €)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Come fare la spesa solo 1 volta al mese senza sprechi, dividendo gli acquisti tra dispensa, freezer e prodotti a lunga tenuta.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                Totale Stimato: ~415 € / mese
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">🌾 Dispensa Secca</span>
                  <span className="text-teal-600 font-bold text-[11px]">~85 €</span>
                </div>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Pasta di semola normale: 8 kg</li>
                  <li>• Riso basmati / parboiled: 6 kg</li>
                  <li>• Fiocchi d&apos;avena per colazione: 3 kg</li>
                  <li>• Legumi secchi e barattoli: 16 barattoli</li>
                  <li>• Olio EVO (3 L) + Passata pomodoro</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">❄️ Proteine &amp; Freezer</span>
                  <span className="text-teal-600 font-bold text-[11px]">~160 €</span>
                </div>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Petto di pollo a fette: 8 kg (in sacchetti)</li>
                  <li>• Macinato magro manzo: 4 kg (per sughi)</li>
                  <li>• Tranci di salmone: 2 kg surgelati</li>
                  <li>• Filetti di merluzzo / platessa: 2.5 kg</li>
                  <li>• <em>Porzionare appena rientrati dalla spesa</em></li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">🥚 Latticini &amp; Uova</span>
                  <span className="text-teal-600 font-bold text-[11px]">~65 €</span>
                </div>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Uova fresche: 6 confezioni (60 uova)</li>
                  <li>• Ricotta vaccina &amp; feta: 6-8 confezioni</li>
                  <li>• Yogurt greco 0% (multipack/secchiello 1kg)</li>
                  <li>• Grana Padano / Parmigiano a pezzi (lunga tenuta)</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">🥔 Ortaggi &amp; Frutta</span>
                  <span className="text-teal-600 font-bold text-[11px]">~105 €</span>
                </div>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Patate (sacco 10 kg al buio fresco)</li>
                  <li>• Zucca intera (dura 2-3 mesi intera)</li>
                  <li>• Carote, cavolo cappuccio, finocchi</li>
                  <li>• Mele Fuji e agrumi (in frigo 4 settimane)</li>
                  <li>• Verdure surgelate (spinaci, piselli, fagiolini)</li>
                </ul>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓ Margine di Sicurezza:</span>
                Spesa media ~415 € rispetto al budget di 450 €, lasciando un margine di 35 € per emergenze o sfizi.
              </span>
              <button
                type="button"
                onClick={handleExportToShoppingList}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition flex items-center gap-1.5 shrink-0"
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Esporta Lista del Mese
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: REGISTRO FREEZER (BATCH COOKING)
          ===================================================================== */}
      {activeTab === 'freezer' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Inventario Cibo Congelato</h3>
              <p className="text-xs text-slate-500">
                Monoporzioni batch-cooking e scadenze sotto controllo
              </p>
            </div>
            <button
              onClick={() => setShowFreezerForm(!showFreezerForm)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
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
                    placeholder="es. Ragù magro di manzo (monoporzione)"
                    value={freezerName}
                    onChange={(e) => setFreezerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Quantità</label>
                  <input
                    type="number"
                    min="1"
                    value={freezerQty}
                    onChange={(e) => setFreezerQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Scadenza Consigliata</label>
                  <input
                    type="date"
                    value={freezerExpiry}
                    onChange={(e) => setFreezerExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold">
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
                    <p className="text-xs text-slate-500">
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
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: INSERISCI / MODIFICA PASTO NEL PIANO
          ===================================================================== */}
      {showMealModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingMealId ? 'Modifica Pasto' : 'Aggiungi Pasto al Piano'}
              </h3>
              <button onClick={() => setShowMealModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeal} className="space-y-3.5">
              {/* Settimana, Giorno e Tipo Pasto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Settimana</label>
                  <select
                    value={mealFormWeek}
                    onChange={(e) => setMealFormWeek(e.target.value as 'settimana_1' | 'settimana_2')}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  >
                    <option value="settimana_1">Settimana 1</option>
                    <option value="settimana_2">Settimana 2</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Giorno</label>
                  <select
                    value={mealFormDay}
                    onChange={(e) => setMealFormDay(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Tipo Pasto</label>
                  <select
                    value={mealFormType}
                    onChange={(e) => setMealFormType(e.target.value as MealType)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  >
                    <option value="colazione">Colazione</option>
                    <option value="spuntino_mattina">Spuntino Mattina</option>
                    <option value="pranzo">Pranzo (Schiscetta)</option>
                    <option value="merenda">Merenda Pomeridiana</option>
                    <option value="cena">Cena</option>
                  </select>
                </div>
              </div>

              {/* Scegli da Ricettario */}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                  Scegli Piatto dal Ricettario
                </label>
                <select
                  value={mealFormRecipeId}
                  onChange={(e) => handleSelectRecipeInForm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="">Oppure inserisci piatto personalizzato...</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.meal_type?.[0] || 'pasto'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome Piatto Personalizzato */}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Nome Piatto *</label>
                <input
                  required
                  placeholder="es. Riso basmati con pollo e zucchine"
                  value={mealFormCustomName}
                  onChange={(e) => setMealFormCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Porzioni Separate M vs F */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    👨 Ingredienti Uomo (85 kg)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="es. 120g Riso + 220g Pollo + 200g Zucchine + 15g EVO"
                    value={mealFormIngM}
                    onChange={(e) => setMealFormIngM(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    👩 Ingredienti Donna (52 kg)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="es. 75g Riso + 140g Pollo + 180g Zucchine + 10g EVO"
                    value={mealFormIngF}
                    onChange={(e) => setMealFormIngF(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Calorie & Note */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Calorie &amp; Macro</label>
                  <input
                    placeholder="M: 730 kcal | F: 470 kcal"
                    value={mealFormCalories}
                    onChange={(e) => setMealFormCalories(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Note Cucina</label>
                  <input
                    placeholder="Cotto in teglia unica a 190°C"
                    value={mealFormNotes}
                    onChange={(e) => setMealFormNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Checkboxes Opzioni */}
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mealFormIsSchiscetta}
                    onChange={(e) => setMealFormIsSchiscetta(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span>🍱 Schiscetta per ufficio</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mealFormFromFreezer}
                    onChange={(e) => setMealFormFromFreezer(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>❄️ Prelevato dal Freezer</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMealModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-500"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Salva nel Piano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREA / MODIFICA RICETTA
          ===================================================================== */}
      {showRecipeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingRecipeId ? 'Modifica Ricetta' : 'Crea Nuova Ricetta'}
              </h3>
              <button onClick={() => setShowRecipeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Titolo Piatto *</label>
                <input
                  required
                  placeholder="es. Salmone al forno con patate"
                  value={recipeFormName}
                  onChange={(e) => setRecipeFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Categoria Pasto</label>
                  <select
                    value={recipeFormCategory}
                    onChange={(e) => setRecipeFormCategory(e.target.value as MealType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="colazione">Colazione</option>
                    <option value="pranzo">Pranzo</option>
                    <option value="cena">Cena</option>
                    <option value="spuntino">Spuntino</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Stagione</label>
                  <select
                    value={recipeFormSeason}
                    onChange={(e) => setRecipeFormSeason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white capitalize"
                  >
                    <option value="autunno">Autunno</option>
                    <option value="inverno">Inverno</option>
                    <option value="primavera">Primavera</option>
                    <option value="estate">Estate</option>
                    <option value="tutto_anno">Tutto l&apos;anno</option>
                  </select>
                </div>
              </div>

              {/* Builder Ingredienti a Proporzione Libera con Integrazione Freezer */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Ingredienti &amp; Proporzione Base
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Inserisci le proporzioni di riferimento (es. 120g Pasta + 40g Ragù da freezer):
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBuilderIngredient}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-semibold hover:bg-teal-100 transition border border-teal-200 dark:border-teal-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Aggiungi Ingrediente
                  </button>
                </div>

                <div className="space-y-2">
                  {recipeBuilderItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          placeholder="Nome ingrediente (es. Pasta, Ragù, Pollo)"
                          value={item.name}
                          onChange={(e) => handleUpdateBuilderIngredient(idx, 'name', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateBuilderIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center"
                          />
                          <span className="text-slate-400 font-mono text-[11px]">{item.unit || 'g'}</span>
                        </div>
                        {recipeBuilderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBuilderIngredient(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Opzione Prodotto Congelato / Da Freezer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                        <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!item.from_freezer}
                            onChange={(e) => handleUpdateBuilderIngredient(idx, 'from_freezer', e.target.checked)}
                            className="rounded text-blue-600"
                          />
                          <span className="flex items-center gap-1">
                            <Snowflake className="w-3 h-3 text-blue-500" /> Prodotto da Freezer (es. barattolo sugo)
                          </span>
                        </label>

                        {item.from_freezer && (
                          <div className="flex items-center gap-2">
                            <select
                              value={item.freezer_item_id || ''}
                              onChange={(e) => handleUpdateBuilderIngredient(idx, 'freezer_item_id', e.target.value)}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                            >
                              <option value="">Collega alimento freezer...</option>
                              {freezerItems.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name} ({f.quantity} {f.unit})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Calorici Pasto (Uomo 85 kg vs Donna 52 kg) */}
              <div className="p-3.5 bg-slate-100/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Target Calorico Pasto da Raggiungere:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Formula Proporzionale Calcolata</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">👨 Uomo (85 kg) Target:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={recipeTargetKcalM}
                        onChange={(e) => setRecipeTargetKcalM(parseInt(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                      <span className="text-xs text-slate-400 font-mono">kcal</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">👩 Donna (52 kg) Target:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={recipeTargetKcalF}
                        onChange={(e) => setRecipeTargetKcalF(parseInt(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                      <span className="text-xs text-slate-400 font-mono">kcal</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box Risultato Calcolo Fabbisogno in Tempo Reale */}
              <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    Fabbisogno Calcolato Automaticamente
                  </span>
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">
                    Tot. Coppia: {calculatedRecipeProportions.totalKcalM + calculatedRecipeProportions.totalKcalF} kcal
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-teal-100 dark:border-teal-900/40">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      👨 Uomo: {calculatedRecipeProportions.totalKcalM} kcal ({calculatedRecipeProportions.totalProtM}g Prot)
                    </span>
                    <ul className="text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                      {calculatedRecipeProportions.calculated.map((c, i) => (
                        <li key={i} className="flex justify-between font-mono">
                          <span className="truncate pr-1">• {c.name}:</span>
                          <span className="font-bold text-teal-700 dark:text-teal-400 shrink-0">{c.quantity_m} {c.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-teal-100 dark:border-teal-900/40">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      👩 Donna: {calculatedRecipeProportions.totalKcalF} kcal ({calculatedRecipeProportions.totalProtF}g Prot)
                    </span>
                    <ul className="text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                      {calculatedRecipeProportions.calculated.map((c, i) => (
                        <li key={i} className="flex justify-between font-mono">
                          <span className="truncate pr-1">• {c.name}:</span>
                          <span className="font-bold text-teal-700 dark:text-teal-400 shrink-0">{c.quantity_f} {c.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Stima Barattoli & Pasti Freezer */}
                {calculatedRecipeProportions.freezerUsage.length > 0 && (
                  <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/60 space-y-1 text-[11px]">
                    {calculatedRecipeProportions.freezerUsage.map((u, i) => (
                      <div key={i} className="flex items-center justify-between text-teal-900 dark:text-teal-200 font-medium">
                        <span className="flex items-center gap-1">
                          <Snowflake className="w-3.5 h-3.5 text-blue-500" />
                          Consumo pasto coppia: <strong>{u.neededCouple}g {u.name}</strong>
                        </span>
                        <span className="bg-teal-200/60 dark:bg-teal-900/60 px-2 py-0.5 rounded-full font-bold">
                          Copre ~{u.mealsAvailable} pasti coppia
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Conservazione &amp; Shelf-Life</label>
                <input
                  placeholder="Dura 3-4gg in frigo a +4°C in vetro o 3 mesi in freezer"
                  value={recipeFormStorage}
                  onChange={(e) => setRecipeFormStorage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recSchisc"
                  checked={recipeFormSchiscetta}
                  onChange={(e) => setRecipeFormSchiscetta(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <label htmlFor="recSchisc" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Ideale per Schiscetta / Portabilità in ufficio
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecipeModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-500"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Salva Ricetta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

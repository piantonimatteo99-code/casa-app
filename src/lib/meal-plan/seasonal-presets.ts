import type { Recipe, MealType } from '@/types';

export interface SeasonalMealPreset {
  day_name: string; // 'Lunedì', 'Martedì', ...
  day_index: number; // 0 to 6 (Lunedì=0, Domenica=6)
  meal_type: MealType;
  dish_name: string;
  ingredients_m: string;
  ingredients_f: string;
  calories_text: string;
  is_schiscetta: boolean;
  notes: string;
  recipe_id?: string;
}

export interface RawToCookedItem {
  name: string;
  factor: number;
  factor_label: string;
  raw_m: number;
  cooked_m: number;
  raw_f: number;
  cooked_f: number;
  total_cooked: number;
  tip: string;
}

export interface IngredientProportionItem {
  name: string;
  quantity: number; // Quantità di riferimento proporzione base (es. 120 g)
  unit: string;
  kcal_100: number;
  prot_100: number;
  from_freezer?: boolean;
  freezer_item_id?: string;
  freezer_available_qty?: number;
}

// -----------------------------------------------------------------------------
// DIZIONARIO NUTRIZIONALE MEDIO INGREDIENTI PER 100G
// -----------------------------------------------------------------------------
export const INGREDIENT_NUTRITION: Record<string, { kcal_100: number; prot_100: number }> = {
  pasta: { kcal_100: 355, prot_100: 12.5 },
  'pasta di semola': { kcal_100: 355, prot_100: 12.5 },
  'pasta integrale': { kcal_100: 345, prot_100: 13.0 },
  riso: { kcal_100: 360, prot_100: 7.5 },
  'riso basmati': { kcal_100: 360, prot_100: 7.5 },
  'riso carnaroli': { kcal_100: 360, prot_100: 7.5 },
  ragu: { kcal_100: 160, prot_100: 12.5 },
  'ragù': { kcal_100: 160, prot_100: 12.5 },
  'ragù di carne': { kcal_100: 160, prot_100: 12.5 },
  sugo: { kcal_100: 75, prot_100: 2.5 },
  'sugo al pomodoro': { kcal_100: 60, prot_100: 2.0 },
  passata: { kcal_100: 32, prot_100: 1.5 },
  pesto: { kcal_100: 450, prot_100: 5.0 },
  pollo: { kcal_100: 110, prot_100: 23.5 },
  'petto di pollo': { kcal_100: 110, prot_100: 23.5 },
  manzo: { kcal_100: 140, prot_100: 21.0 },
  macinato: { kcal_100: 140, prot_100: 21.0 },
  'macinato magro': { kcal_100: 140, prot_100: 21.0 },
  tacchino: { kcal_100: 107, prot_100: 24.0 },
  salmone: { kcal_100: 208, prot_100: 20.0 },
  merluzzo: { kcal_100: 82, prot_100: 17.5 },
  orata: { kcal_100: 95, prot_100: 19.8 },
  tonno: { kcal_100: 103, prot_100: 24.0 },
  'tonno al naturale': { kcal_100: 103, prot_100: 24.0 },
  bresaola: { kcal_100: 151, prot_100: 32.0 },
  uova: { kcal_100: 143, prot_100: 12.8 },
  parmigiano: { kcal_100: 392, prot_100: 33.0 },
  grana: { kcal_100: 392, prot_100: 33.0 },
  mozzarella: { kcal_100: 250, prot_100: 18.0 },
  ricotta: { kcal_100: 146, prot_100: 9.0 },
  'yogurt greco': { kcal_100: 58, prot_100: 10.3 },
  latte: { kcal_100: 47, prot_100: 3.3 },
  avena: { kcal_100: 370, prot_100: 13.5 },
  pane: { kcal_100: 245, prot_100: 8.5 },
  patate: { kcal_100: 77, prot_100: 2.0 },
  farro: { kcal_100: 340, prot_100: 14.0 },
  quinoa: { kcal_100: 368, prot_100: 14.1 },
  ceci: { kcal_100: 120, prot_100: 7.0 },
  lenticchie: { kcal_100: 325, prot_100: 23.0 },
  fagioli: { kcal_100: 115, prot_100: 7.5 },
  piselli: { kcal_100: 78, prot_100: 5.5 },
  zucchine: { kcal_100: 17, prot_100: 1.2 },
  zucca: { kcal_100: 26, prot_100: 1.0 },
  pomodori: { kcal_100: 19, prot_100: 0.9 },
  broccoli: { kcal_100: 34, prot_100: 2.8 },
  spinaci: { kcal_100: 23, prot_100: 2.9 },
  asparagi: { kcal_100: 24, prot_100: 2.2 },
  funghi: { kcal_100: 22, prot_100: 3.1 },
  olio: { kcal_100: 884, prot_100: 0.0 },
  'olio evo': { kcal_100: 884, prot_100: 0.0 },
  'olio extravergine': { kcal_100: 884, prot_100: 0.0 },
  mandorle: { kcal_100: 600, prot_100: 20.0 },
  noci: { kcal_100: 650, prot_100: 15.0 },
  miele: { kcal_100: 304, prot_100: 0.3 },
  cioccolato: { kcal_100: 580, prot_100: 8.5 },
};

export function lookupIngredientNutrition(name: string): { kcal_100: number; prot_100: number } {
  const clean = name.toLowerCase().trim();
  for (const [key, val] of Object.entries(INGREDIENT_NUTRITION)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }
  // Default generico prudente se non trovato
  return { kcal_100: 120, prot_100: 5.0 };
}

// -----------------------------------------------------------------------------
// FUNZIONE CORE DI CALCOLO FABBISOGNO PROPORZIONALE COPPIA (M 85kg vs F 52kg)
// -----------------------------------------------------------------------------
export function calculateRecipePortionsForCouple(
  ingredients: IngredientProportionItem[],
  targetKcalM = 750,
  targetKcalF = 480
) {
  let baseTotalCalories = 0;
  let baseTotalProtein = 0;

  ingredients.forEach((ing) => {
    const c = (ing.quantity * (ing.kcal_100 || 100)) / 100;
    const p = (ing.quantity * (ing.prot_100 || 0)) / 100;
    baseTotalCalories += c;
    baseTotalProtein += p;
  });

  if (baseTotalCalories <= 0) baseTotalCalories = 1;

  const ratioM = targetKcalM / baseTotalCalories;
  const ratioF = targetKcalF / baseTotalCalories;

  const calculated = ingredients.map((ing) => {
    const qM = Math.round(ing.quantity * ratioM);
    const qF = Math.round(ing.quantity * ratioF);
    return {
      name: ing.name,
      unit: ing.unit,
      from_freezer: ing.from_freezer,
      freezer_item_id: ing.freezer_item_id,
      freezer_available_qty: ing.freezer_available_qty,
      base_qty: ing.quantity,
      quantity_m: qM,
      quantity_f: qF,
      total_couple_qty: qM + qF,
      kcal_m: Math.round((qM * (ing.kcal_100 || 100)) / 100),
      kcal_f: Math.round((qF * (ing.kcal_100 || 100)) / 100),
      prot_m: Math.round((qM * (ing.prot_100 || 0)) / 100),
      prot_f: Math.round((qF * (ing.prot_100 || 0)) / 100),
    };
  });

  const totalKcalM = calculated.reduce((acc, i) => acc + i.kcal_m, 0);
  const totalKcalF = calculated.reduce((acc, i) => acc + i.kcal_f, 0);
  const totalProtM = calculated.reduce((acc, i) => acc + i.prot_m, 0);
  const totalProtF = calculated.reduce((acc, i) => acc + i.prot_f, 0);

  // Calcola il consumo di eventuali prodotti freezer
  const freezerUsage = calculated
    .filter((i) => i.from_freezer && i.freezer_available_qty)
    .map((i) => {
      const neededPerMealCouple = i.total_couple_qty;
      const mealsAvailable = neededPerMealCouple > 0 ? (i.freezer_available_qty! / neededPerMealCouple).toFixed(1) : '0';
      return {
        name: i.name,
        available: i.freezer_available_qty!,
        neededCouple: neededPerMealCouple,
        mealsAvailable,
      };
    });

  return {
    ratioM,
    ratioF,
    baseTotalCalories: Math.round(baseTotalCalories),
    baseTotalProtein: Math.round(baseTotalProtein),
    calculated,
    totalKcalM,
    totalKcalF,
    totalProtM,
    totalProtF,
    freezerUsage,
  };
}

// -----------------------------------------------------------------------------
// TABELLA DI CONVERSIONE CRUDO -> COTTO PER LA COPPIA (M 85kg vs F 52kg)
// -----------------------------------------------------------------------------
export const RAW_TO_COOKED_CONVERSIONS: RawToCookedItem[] = [
  {
    name: 'Riso Basmati / Carnaroli',
    factor: 2.4,
    factor_label: 'x2.4 (Assorbimento acqua)',
    raw_m: 120,
    cooked_m: 288,
    raw_f: 75,
    cooked_f: 180,
    total_cooked: 468,
    tip: 'Pesare nel contenitore: 288g per lui (85kg), 180g per lei (52kg).',
  },
  {
    name: 'Farro Perlato / Quinoa',
    factor: 2.3,
    factor_label: 'x2.3 (Bollitura)',
    raw_m: 110,
    cooked_m: 253,
    raw_f: 70,
    cooked_f: 161,
    total_cooked: 414,
    tip: 'Scolare al dente e condire con un filo d\'olio prima di dividere.',
  },
  {
    name: 'Pasta di Semola Grano Duro',
    factor: 2.1,
    factor_label: 'x2.1 (Bollitura classica)',
    raw_m: 120,
    cooked_m: 252,
    raw_f: 70,
    cooked_f: 147,
    total_cooked: 399,
    tip: 'Scolare 2 minuti prima per schiscette calde; bloccare con acqua fredda se estiva.',
  },
  {
    name: 'Petto di Pollo alla Piastra',
    factor: 0.75,
    factor_label: 'x0.75 (Calo peso per evaporazione)',
    raw_m: 220,
    cooked_m: 165,
    raw_f: 140,
    cooked_f: 105,
    total_cooked: 270,
    tip: 'Il pollo perde circa il 25% di acqua: pesare da cotto 165g a lui e 105g a lei.',
  },
  {
    name: 'Macinato Magro di Manzo',
    factor: 0.78,
    factor_label: 'x0.78 (Cottura in padella)',
    raw_m: 200,
    cooked_m: 156,
    raw_f: 130,
    cooked_f: 101,
    total_cooked: 257,
    tip: 'Asciugare bene il grasso e dividere nelle vaschette sulla bilancia.',
  },
  {
    name: 'Filetto di Salmone al Forno',
    factor: 0.80,
    factor_label: 'x0.80 (Cottura forno 190°C)',
    raw_m: 220,
    cooked_m: 176,
    raw_f: 140,
    cooked_f: 112,
    total_cooked: 288,
    tip: 'Tagliare i tranci a crudo prima di infornare per evitare sfaldamenti.',
  },
  {
    name: 'Patate al Forno / Vapore',
    factor: 0.90,
    factor_label: 'x0.90 (Perdita minima)',
    raw_m: 300,
    cooked_m: 270,
    raw_f: 180,
    cooked_f: 162,
    total_cooked: 432,
    tip: 'Le patate mantengono quasi tutto il loro peso: 270g a lui e 162g a lei.',
  },
  {
    name: 'Zucca Arrostita al Forno',
    factor: 0.65,
    factor_label: 'x0.65 (Forte perdita idrica)',
    raw_m: 350,
    cooked_m: 228,
    raw_f: 250,
    cooked_f: 163,
    total_cooked: 391,
    tip: 'Concentra sapore e zuccheri: ottima anche da frullare come vellutata.',
  },
];

// -----------------------------------------------------------------------------
// CATALOGO RICETTARIO PREDEFINITO (24 RICETTE COMPLETE E CALIBRATE)
// -----------------------------------------------------------------------------
export const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'rec_01',
    couple_id: 'default',
    name: 'Porridge d\'Avena con Frutti di Bosco, Yogurt e Mandorle',
    description: 'Colazione energetica e saziante ricca di fibre solubili e antiossidanti.',
    servings: 2,
    prep_time_min: 5,
    cook_time_min: 3,
    tags: ['colazione', 'batch-cook', 'antiossidante', 'quick'],
    meal_type: ['colazione'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 520,
    calories_f: 340,
    protein_m: 26,
    protein_f: 18,
    season: 'tutto_anno',
    schiscetta: false,
    storage_tips: 'Ottimo come overnight oats preparato la sera prima e consumato freddo.',
    estimated_cost_m: 1.45,
    estimated_cost_f: 0.95,
    ingredients: [
      { name: 'Fiocchi d\'Avena', quantity: 130, unit: 'g', quantity_m: 80, quantity_f: 50 },
      { name: 'Frutti di Bosco', quantity: 170, unit: 'g', quantity_m: 100, quantity_f: 70 },
      { name: 'Yogurt Greco 0%', quantity: 250, unit: 'g', quantity_m: 150, quantity_f: 100 },
      { name: 'Mandorle Sgusciate', quantity: 32, unit: 'g', quantity_m: 20, quantity_f: 12 },
    ],
  },
  {
    id: 'rec_02',
    couple_id: 'default',
    name: 'Pancake Integrali Proteici con Ricotta e Miele',
    description: 'Pancake soffici ideali per il batch cooking delle colazioni di 3 giorni.',
    servings: 2,
    prep_time_min: 10,
    cook_time_min: 8,
    tags: ['colazione', 'batch-cook', 'proteico'],
    meal_type: ['colazione'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 490,
    calories_f: 310,
    protein_m: 27,
    protein_f: 17,
    season: 'tutto_anno',
    schiscetta: false,
    storage_tips: 'Preparare in batch per 3 giorni, conservare in frigo a +4°C e tostare al mattino.',
    estimated_cost_m: 1.35,
    estimated_cost_f: 0.85,
    ingredients: [
      { name: 'Farina Integrale', quantity: 115, unit: 'g', quantity_m: 70, quantity_f: 45 },
      { name: 'Uova Fresche Bio', quantity: 3, unit: 'pz', quantity_m: 2, quantity_f: 1 },
      { name: 'Ricotta Vaccina', quantity: 130, unit: 'g', quantity_m: 80, quantity_f: 50 },
      { name: 'Miele Millefiori', quantity: 25, unit: 'g', quantity_m: 15, quantity_f: 10 },
    ],
  },
  {
    id: 'rec_03',
    couple_id: 'default',
    name: 'Riso Basmati con Petto di Pollo al Curry, Zucchine ed EVO',
    description: 'Il classico della schiscetta da lavoro: equilibrio perfetto di macro e grande stabilità in frigo.',
    servings: 2,
    prep_time_min: 10,
    cook_time_min: 15,
    tags: ['pranzo', 'schiscetta', 'batch-cook', 'fit'],
    meal_type: ['pranzo'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 730,
    calories_f: 470,
    protein_m: 57,
    protein_f: 37,
    season: 'tutto_anno',
    schiscetta: true,
    storage_tips: 'Dura 3-4 giorni in contenitore di vetro ermetico. Scaldare a microonde con un cucchiaio d\'acqua.',
    estimated_cost_m: 2.75,
    estimated_cost_f: 1.80,
    ingredients: [
      { name: 'Riso Basmati', quantity: 195, unit: 'g', quantity_m: 120, quantity_f: 75 },
      { name: 'Petto di Pollo', quantity: 360, unit: 'g', quantity_m: 220, quantity_f: 140 },
      { name: 'Zucchine Verdi', quantity: 380, unit: 'g', quantity_m: 200, quantity_f: 180 },
      { name: 'Olio Extravergine d\'Oliva', quantity: 25, unit: 'g', quantity_m: 15, quantity_f: 10 },
    ],
  },
  {
    id: 'rec_04',
    couple_id: 'default',
    name: 'Pasta Integrale al Ragù Magro di Manzo e Pomodoro',
    description: 'Piatto gustoso della tradizione italiana riadattato con carne magra 5% e pasta al dente.',
    servings: 2,
    prep_time_min: 15,
    cook_time_min: 40,
    tags: ['pranzo', 'cena', 'batch-cook', 'comfort'],
    meal_type: ['pranzo', 'cena'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 750,
    calories_f: 480,
    protein_m: 48,
    protein_f: 32,
    season: 'autunno',
    schiscetta: true,
    storage_tips: 'Preparare il ragù nel weekend in quantità quadrupla e congelare in monoporzioni.',
    estimated_cost_m: 2.90,
    estimated_cost_f: 1.95,
    ingredients: [
      { name: 'Pasta Integrale', quantity: 190, unit: 'g', quantity_m: 120, quantity_f: 70 },
      { name: 'Macinato Magro Manzo (5%)', quantity: 300, unit: 'g', quantity_m: 180, quantity_f: 120 },
      { name: 'Pomodori Pelati / Passata', quantity: 350, unit: 'g', quantity_m: 200, quantity_f: 150 },
      { name: 'Olio Extravergine d\'Oliva', quantity: 25, unit: 'g', quantity_m: 15, quantity_f: 10 },
    ],
  },
  {
    id: 'rec_05',
    couple_id: 'default',
    name: 'Salmone al Forno con Patate al Rosmarino e Spinaci Saltati',
    description: 'Cena nutriente ricca di acidi grassi Omega-3, potassio e ferro.',
    servings: 2,
    prep_time_min: 10,
    cook_time_min: 25,
    tags: ['cena', 'omega-3', 'forno', 'senza-glutine'],
    meal_type: ['cena'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 770,
    calories_f: 480,
    protein_m: 51,
    protein_f: 33,
    season: 'inverno',
    schiscetta: false,
    storage_tips: 'Cottura in teglia unica a 190°C. Il salmone è ideale consumato espresso entro 24 ore.',
    estimated_cost_m: 5.10,
    estimated_cost_f: 3.30,
    ingredients: [
      { name: 'Filetto di Salmone Fresco', quantity: 360, unit: 'g', quantity_m: 220, quantity_f: 140 },
      { name: 'Patate a Pasta Gialla', quantity: 550, unit: 'g', quantity_m: 350, quantity_f: 200 },
      { name: 'Spinaci Freschi', quantity: 350, unit: 'g', quantity_m: 200, quantity_f: 150 },
      { name: 'Olio Extravergine d\'Oliva', quantity: 18, unit: 'g', quantity_m: 10, quantity_f: 8 },
    ],
  },
  {
    id: 'rec_06',
    couple_id: 'default',
    name: 'Quinoa con Merluzzo al Limone, Asparagi ed EVO',
    description: 'Piatto primaverile leggero, purificante e ad altissima digeribilità.',
    servings: 2,
    prep_time_min: 10,
    cook_time_min: 15,
    tags: ['pranzo', 'schiscetta', 'primavera', 'detox'],
    meal_type: ['pranzo'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 640,
    calories_f: 390,
    protein_m: 47,
    protein_f: 30,
    season: 'primavera',
    schiscetta: true,
    storage_tips: 'Consumare entro 48 ore dalla preparazione. Ottimo sia tiepido che riscaldato leggermente.',
    estimated_cost_m: 3.80,
    estimated_cost_f: 2.45,
    ingredients: [
      { name: 'Quinoa Reale', quantity: 175, unit: 'g', quantity_m: 110, quantity_f: 65 },
      { name: 'Filetti di Merluzzo', quantity: 330, unit: 'g', quantity_m: 200, quantity_f: 130 },
      { name: 'Asparagi Verdi', quantity: 360, unit: 'g', quantity_m: 200, quantity_f: 160 },
      { name: 'Olio Extravergine d\'Oliva', quantity: 25, unit: 'g', quantity_m: 15, quantity_f: 10 },
    ],
  },
  {
    id: 'rec_07',
    couple_id: 'default',
    name: 'Insalata Fredda di Riso con Tonno, Uova Sode e Pomodorini',
    description: 'La regina indiscussa della schiscetta estiva: zero riscaldamento, fresca e nutriente.',
    servings: 2,
    prep_time_min: 15,
    cook_time_min: 15,
    tags: ['pranzo', 'estate', 'freddo', 'schiscetta'],
    meal_type: ['pranzo'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 660,
    calories_f: 420,
    protein_m: 43,
    protein_f: 29,
    season: 'estate',
    schiscetta: true,
    storage_tips: 'Dura 3 giorni in frigo. Trasportare con borsa termica e 2 siberini per mantenere il fresco.',
    estimated_cost_m: 2.50,
    estimated_cost_f: 1.70,
    ingredients: [
      { name: 'Riso Basmati', quantity: 195, unit: 'g', quantity_m: 120, quantity_f: 75 },
      { name: 'Tonno al Naturale', quantity: 200, unit: 'g', quantity_m: 120, quantity_f: 80 },
      { name: 'Uova Fresche Bio', quantity: 2, unit: 'pz', quantity_m: 1, quantity_f: 1 },
      { name: 'Pomodori Grappolo', quantity: 320, unit: 'g', quantity_m: 180, quantity_f: 140 },
    ],
  },
  {
    id: 'rec_08',
    couple_id: 'default',
    name: 'Vellutata di Zucca con Ceci Croccanti alla Paprika e Crostoni',
    description: 'Cena calda autunnale corroborante ricca di betacarotene e fibre prebiotiche sazianti.',
    servings: 2,
    prep_time_min: 15,
    cook_time_min: 20,
    tags: ['cena', 'autunno', 'vegetariano', 'comfort'],
    meal_type: ['cena'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 560,
    calories_f: 360,
    protein_m: 21,
    protein_f: 14,
    season: 'autunno',
    schiscetta: false,
    storage_tips: 'Frullare la zucca cotta in batch e tostare i ceci in padella all\'ultimo momento.',
    estimated_cost_m: 1.60,
    estimated_cost_f: 1.10,
    ingredients: [
      { name: 'Zucca Delica / Butternut', quantity: 600, unit: 'g', quantity_m: 350, quantity_f: 250 },
      { name: 'Ceci Lessati in Vetro', quantity: 270, unit: 'g', quantity_m: 160, quantity_f: 110 },
      { name: 'Pane Integrale Artigianale', quantity: 130, unit: 'g', quantity_m: 80, quantity_f: 50 },
      { name: 'Olio Extravergine d\'Oliva', quantity: 25, unit: 'g', quantity_m: 15, quantity_f: 10 },
    ],
  },
  {
    id: 'rec_09',
    couple_id: 'default',
    name: 'Frittata al Forno con Spinaci Freschi, Parmigiano e Pane',
    description: 'Cottura uniforme in forno senza grassi aggiunti, perfetta da porzionare a fette.',
    servings: 2,
    prep_time_min: 10,
    cook_time_min: 20,
    tags: ['cena', 'pranzo', 'uova', 'facile'],
    meal_type: ['cena', 'pranzo'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 570,
    calories_f: 380,
    protein_m: 38,
    protein_f: 25,
    season: 'tutto_anno',
    schiscetta: true,
    storage_tips: 'Dura 2 giorni in frigo. Ottima sia fredda che scaldata leggermente in tostapane.',
    estimated_cost_m: 2.10,
    estimated_cost_f: 1.45,
    ingredients: [
      { name: 'Uova Fresche Bio', quantity: 5, unit: 'pz', quantity_m: 3, quantity_f: 2 },
      { name: 'Spinaci Freschi', quantity: 350, unit: 'g', quantity_m: 200, quantity_f: 150 },
      { name: 'Parmigiano Reggiano 24m', quantity: 50, unit: 'g', quantity_m: 30, quantity_f: 20 },
      { name: 'Pane Integrale', quantity: 115, unit: 'g', quantity_m: 70, quantity_f: 45 },
    ],
  },
  {
    id: 'rec_10',
    couple_id: 'default',
    name: 'Bresaola IGP con Rucola, Grana 24 Mesi e Pane ai Cereali',
    description: 'Cena pronta in 3 minuti: zero fornelli, 53g di proteine e profilo lipidico perfetto.',
    servings: 2,
    prep_time_min: 3,
    cook_time_min: 0,
    tags: ['cena', 'express', 'no-cook', 'proteico'],
    meal_type: ['cena'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 530,
    calories_f: 330,
    protein_m: 53,
    protein_f: 33,
    season: 'tutto_anno',
    schiscetta: false,
    storage_tips: 'Condire all\'istante con succo di limone fresco e un cucchiaio d\'olio EVO.',
    estimated_cost_m: 4.80,
    estimated_cost_f: 3.10,
    ingredients: [
      { name: 'Bresaola della Valtellina IGP', quantity: 200, unit: 'g', quantity_m: 120, quantity_f: 80 },
      { name: 'Rucola & Insalata', quantity: 180, unit: 'g', quantity_m: 100, quantity_f: 80 },
      { name: 'Parmigiano Reggiano 24m', quantity: 55, unit: 'g', quantity_m: 35, quantity_f: 20 },
      { name: 'Pane Integrale', quantity: 130, unit: 'g', quantity_m: 80, quantity_f: 50 },
    ],
  },
  {
    id: 'rec_11',
    couple_id: 'default',
    name: 'Farro con Lenticchie di Montagna, Carote e Sedano ed EVO',
    description: 'Zuppa densa o piatto unico di cereali e legumi ad alto tenore di proteine vegetali.',
    servings: 2,
    prep_time_min: 15,
    cook_time_min: 35,
    tags: ['pranzo', 'vegan', 'fibre', 'batch-cook'],
    meal_type: ['pranzo'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 690,
    calories_f: 440,
    protein_m: 32,
    protein_f: 21,
    season: 'autunno',
    schiscetta: true,
    storage_tips: 'Dura 4 giorni in frigo; più riposa più acquista sapore.',
    estimated_cost_m: 1.40,
    estimated_cost_f: 0.95,
    ingredients: [
      { name: 'Farro Perlato', quantity: 165, unit: 'g', quantity_m: 100, quantity_f: 65 },
      { name: 'Lenticchie Secche', quantity: 145, unit: 'g', quantity_m: 90, quantity_f: 55 },
      { name: 'Carote & Cipolle (Base)', quantity: 270, unit: 'g', quantity_m: 150, quantity_f: 120 },
      { name: 'Olio Extravergine d\'Oliva', quantity: 25, unit: 'g', quantity_m: 15, quantity_f: 10 },
    ],
  },
  {
    id: 'rec_12',
    couple_id: 'default',
    name: 'Caprese Estiva con Mozzarella Fiordilatte, Pomodori e Frisella',
    description: 'Il simbolo dell\'estate mediterranea: freschezza, sapore e zero calore in cucina.',
    servings: 2,
    prep_time_min: 5,
    cook_time_min: 0,
    tags: ['cena', 'estate', 'express', 'mediterraneo'],
    meal_type: ['cena'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 620,
    calories_f: 420,
    protein_m: 32,
    protein_f: 22,
    season: 'estate',
    schiscetta: false,
    storage_tips: 'Inumidire la frisella con un filo d\'acqua fredda prima di condire con pomodoro e olio.',
    estimated_cost_m: 2.40,
    estimated_cost_f: 1.65,
    ingredients: [
      { name: 'Mozzarella Fiordilatte', quantity: 250, unit: 'g', quantity_m: 150, quantity_f: 100 },
      { name: 'Pomodori Grappolo/Cuore bue', quantity: 450, unit: 'g', quantity_m: 250, quantity_f: 200 },
      { name: 'Pane / Frisella Integrale', quantity: 130, unit: 'g', quantity_m: 80, quantity_f: 50 },
      { name: 'Olio Extravergine d\'Oliva', quantity: 25, unit: 'g', quantity_m: 15, quantity_f: 10 },
    ],
  },
  {
    id: 'rec_13',
    couple_id: 'default',
    name: 'Spuntino Yogurt Greco 0%, Frutti di Bosco e Noci Sgusciate',
    description: 'Lo spuntino bilanciato perfetto per spezzare il digiuno delle ore 10:30 o 16:30.',
    servings: 2,
    prep_time_min: 2,
    cook_time_min: 0,
    tags: ['spuntino', 'merenda', 'grab-and-go', 'proteico'],
    meal_type: ['spuntino', 'colazione'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 260,
    calories_f: 180,
    protein_m: 23,
    protein_f: 16,
    season: 'tutto_anno',
    schiscetta: true,
    storage_tips: 'Preparare il vasetto la mattina o conservare in borsa lavoro con cucchiaino.',
    estimated_cost_m: 1.50,
    estimated_cost_f: 1.05,
    ingredients: [
      { name: 'Yogurt Greco 0%', quantity: 350, unit: 'g', quantity_m: 200, quantity_f: 150 },
      { name: 'Frutti di Bosco', quantity: 140, unit: 'g', quantity_m: 80, quantity_f: 60 },
      { name: 'Noci Sgusciate', quantity: 32, unit: 'g', quantity_m: 20, quantity_f: 12 },
    ],
  },
  {
    id: 'rec_14',
    couple_id: 'default',
    name: 'Snack Mela Fuji con Cioccolato Fondente 85% e Mandorle',
    description: 'Merenda pomeridiana energetica per favorire la lucidità mentale e il pre-workout.',
    servings: 2,
    prep_time_min: 1,
    cook_time_min: 0,
    tags: ['spuntino', 'merenda', 'pre-workout'],
    meal_type: ['spuntino'],
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calories_m: 280,
    calories_f: 190,
    protein_m: 6,
    protein_f: 4,
    season: 'tutto_anno',
    schiscetta: true,
    storage_tips: 'Nessuna preparazione necessaria; conservabile sempre a temperatura ambiente.',
    estimated_cost_m: 0.90,
    estimated_cost_f: 0.65,
    ingredients: [
      { name: 'Mele Fuji', quantity: 320, unit: 'g', quantity_m: 180, quantity_f: 140 },
      { name: 'Cioccolato Fondente 85%', quantity: 32, unit: 'g', quantity_m: 20, quantity_f: 12 },
      { name: 'Mandorle Sgusciate', quantity: 32, unit: 'g', quantity_m: 20, quantity_f: 12 },
    ],
  },
];

// -----------------------------------------------------------------------------
// PRESET PIANI SETTIMANALI STAGIONALI (35 PASTI PER STAGIONE)
// -----------------------------------------------------------------------------
export const SEASONAL_PLANS: Record<string, { label: string; season_key: string; description: string; meals: SeasonalMealPreset[] }> = {
  autunno: {
    label: 'Piano Autunno (Ott-Nov)',
    season_key: 'autunno',
    description: 'Zucca delica, funghi champignon, vellutate calde, spezzatino magro, risotti e mele Fuji.',
    meals: [
      // Lunedì
      { day_name: 'Lunedì', day_index: 0, meal_type: 'colazione', dish_name: 'Porridge caldo d\'avena con mela a dadini, cannella e mandorle', ingredients_m: '80g Avena + 180g Mela Fuji + 20g Mandorle + 150ml Latte', ingredients_f: '50g Avena + 140g Mela Fuji + 12g Mandorle + 100ml Latte', calories_text: 'M: 530 kcal (19g P) | F: 340 kcal (12g P)', is_schiscetta: false, notes: 'Cottura avena 3 min in microonde o pentolino; cannella senza zuccheri.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% naturale con noci sgusciate', ingredients_m: '200g Yogurt greco 0% + 20g Noci', ingredients_f: '150g Yogurt greco 0% + 12g Noci', calories_text: 'M: 250 kcal (22g P) | F: 170 kcal (16g P)', is_schiscetta: true, notes: 'Porzionare le noci in bustine salva-freschezza domenicali.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'pranzo', dish_name: 'Riso basmati con bocconcini di pollo, zucca al rosmarino ed Olio EVO', ingredients_m: '120g Riso basmati + 220g Pollo + 200g Zucca + 15g EVO', ingredients_f: '75g Riso basmati + 140g Pollo + 180g Zucca + 10g EVO', calories_text: 'M: 740 kcal (57g P) | F: 470 kcal (37g P)', is_schiscetta: true, notes: 'Batch Domenica: riso bollito + pollo e zucca cotti insieme in teglia.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'spuntino', dish_name: 'Mela Fuji fresca con cubetto di fondente 85%', ingredients_m: '1 Mela Fuji (180g) + 20g Fondente 85%', ingredients_f: '1 Mela Fuji (140g) + 12g Fondente 85%', calories_text: 'M: 210 kcal (3g P) | F: 140 kcal (2g P)', is_schiscetta: true, notes: 'Polifenoli antiossidanti e controllo glicemico pomeridiano.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'cena', dish_name: 'Vellutata di zucca e carote con ceci croccanti alla paprika e crostoni', ingredients_m: '350g Zucca + 150g Ceci cotti + 80g Pane int. + 15g EVO', ingredients_f: '250g Zucca + 100g Ceci cotti + 50g Pane int. + 10g EVO', calories_text: 'M: 560 kcal (22g P) | F: 370 kcal (15g P)', is_schiscetta: false, notes: 'Zucca lessata (10 min); ceci tostati in padella per croccantezza.' },

      // Martedì
      { day_name: 'Martedì', day_index: 1, meal_type: 'colazione', dish_name: 'Pancake integrali con ricotta vaccina e miele millefiori', ingredients_m: '70g Farina int. + 2 Uova + 80g Ricotta + 15g Miele', ingredients_f: '45g Farina int. + 1 Uovo + 50g Ricotta + 10g Miele', calories_text: 'M: 510 kcal (28g P) | F: 320 kcal (17g P)', is_schiscetta: false, notes: 'Pancake preparati la domenica e rigenerati in tostapane 1 min.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'spuntino', dish_name: 'Banana matura e mandorle tostate', ingredients_m: '1 Banana (150g) + 20g Mandorle', ingredients_f: '1 Banana (120g) + 12g Mandorle', calories_text: 'M: 250 kcal (6g P) | F: 180 kcal (4g P)', is_schiscetta: true, notes: 'Potassio e magnesio pre-concentrazione.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'pranzo', dish_name: 'Pasta integrale al ragù magro di manzo, pomodoro ed EVO', ingredients_m: '120g Pasta int. + 180g Macinato + 180g Pomodoro + 15g EVO', ingredients_f: '70g Pasta int. + 120g Macinato + 150g Pomodoro + 10g EVO', calories_text: 'M: 750 kcal (48g P) | F: 470 kcal (32g P)', is_schiscetta: true, notes: 'Ragù cotto in batch per 6 porzioni; pasta al dente.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con purea di frutti di bosco', ingredients_m: '180g Yogurt greco 0% + 80g Frutti di bosco', ingredients_f: '140g Yogurt greco 0% + 60g Frutti di bosco', calories_text: 'M: 140 kcal (19g P) | F: 100 kcal (14g P)', is_schiscetta: true, notes: 'Fresco e probiotico per l\'equilibrio intestinale.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'cena', dish_name: 'Filetto di salmone al forno con patate arrosto e cime di broccolo', ingredients_m: '220g Salmone + 300g Patate + 200g Broccoli + 10g EVO', ingredients_f: '140g Salmone + 180g Patate + 200g Broccoli + 8g EVO', calories_text: 'M: 760 kcal (52g P) | F: 480 kcal (33g P)', is_schiscetta: false, notes: 'Teglia unica da forno a 190°C per 25 min; broccoli croccanti.' },

      // Mercoledì
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'colazione', dish_name: 'Porridge d\'avena con frutti di bosco e gocce di latte', ingredients_m: '80g Avena + 100g Frutti bosco + 15g Miele + 150ml Latte', ingredients_f: '50g Avena + 70g Frutti bosco + 10g Miele + 100ml Latte', calories_text: 'M: 490 kcal (17g P) | F: 310 kcal (11g P)', is_schiscetta: false, notes: 'Aroma fruttato avvolgente, ricco di antociani e fibre.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'spuntino', dish_name: 'Mela Fuji con scaglie di Parmigiano Reggiano 24m', ingredients_m: '1 Mela Fuji + 25g Parmigiano 24m', ingredients_f: '1 Mela Fuji + 15g Parmigiano 24m', calories_text: 'M: 190 kcal (9g P) | F: 130 kcal (6g P)', is_schiscetta: true, notes: 'Abbinamento classico saziante ad alto apporto di calcio.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'pranzo', dish_name: 'Farro perlato con lenticchie rosse, carote, sedano ed EVO', ingredients_m: '110g Farro + 90g Lenticchie + 150g Carote/Sedano + 15g EVO', ingredients_f: '70g Farro + 55g Lenticchie + 120g Carote/Sedano + 10g EVO', calories_text: 'M: 720 kcal (34g P) | F: 450 kcal (21g P)', is_schiscetta: true, notes: 'Piatto unico ideale da rigenerare al microonde in 2 min.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'spuntino', dish_name: 'Pane integrale con fesa di tacchino al naturale', ingredients_m: '60g Pane int. + 80g Tacchino fesa', ingredients_f: '40g Pane int. + 50g Tacchino fesa', calories_text: 'M: 230 kcal (22g P) | F: 150 kcal (14g P)', is_schiscetta: true, notes: 'Spuntino salato proteico per colmare la fame pomeridiana.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'cena', dish_name: 'Frittata al forno con spinaci freschi, funghi champignon e pane int.', ingredients_m: '3 Uova + 200g Spinaci + 150g Funghi + 70g Pane + 10g EVO', ingredients_f: '2 Uova + 150g Spinaci + 120g Funghi + 45g Pane + 8g EVO', calories_text: 'M: 580 kcal (38g P) | F: 380 kcal (25g P)', is_schiscetta: false, notes: 'Cottura in teglia con carta forno; preparare 1 fetta in più per domani.' },

      // Giovedì
      { day_name: 'Giovedì', day_index: 3, meal_type: 'colazione', dish_name: 'Pane integrale tostato con ricotta e fondente 85%', ingredients_m: '90g Pane int. + 100g Ricotta + 15g Fondente 85%', ingredients_f: '50g Pane int. + 60g Ricotta + 10g Fondente 85%', calories_text: 'M: 460 kcal (18g P) | F: 280 kcal (11g P)', is_schiscetta: false, notes: 'Colazione ad alto indice di gradimento con proteine nobili.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con dadolata di pera', ingredients_m: '200g Yogurt greco + 1 Pera (150g)', ingredients_f: '150g Yogurt greco + 1 Pera (120g)', calories_text: 'M: 200 kcal (21g P) | F: 140 kcal (16g P)', is_schiscetta: true, notes: 'Idratazione e fibre insolubili.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'pranzo', dish_name: 'Bocconcini di tacchino con funghi trifolati, riso carnaroli ed EVO', ingredients_m: '120g Riso + 220g Tacchino + 200g Funghi + 15g EVO', ingredients_f: '75g Riso + 140g Tacchino + 150g Funghi + 10g EVO', calories_text: 'M: 710 kcal (58g P) | F: 450 kcal (37g P)', is_schiscetta: true, notes: 'Cottura veloce in wok antiaderente mercoledì sera.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'spuntino', dish_name: 'Arancia a spicchi e una manciata di mandorle sgusciate', ingredients_m: '1 Arancia (200g) + 20g Mandorle', ingredients_f: '1 Arancia (150g) + 12g Mandorle', calories_text: 'M: 210 kcal (5g P) | F: 140 kcal (3g P)', is_schiscetta: true, notes: 'Vitamina C sinergica con la vitamina E delle mandorle.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'cena', dish_name: 'Filetti di merluzzo al pomodoro, olive e patate al vapore', ingredients_m: '230g Merluzzo + 300g Patate + 150g Pomodoro + 15g EVO', ingredients_f: '150g Merluzzo + 180g Patate + 120g Pomodoro + 10g EVO', calories_text: 'M: 590 kcal (46g P) | F: 370 kcal (29g P)', is_schiscetta: false, notes: 'Merluzzo delicato cotto in padella coperta in 15 min.' },

      // Venerdì
      { day_name: 'Venerdì', day_index: 4, meal_type: 'colazione', dish_name: 'Porridge d\'avena al cacao amaro e banana a fette', ingredients_m: '80g Avena + 10g Cacao + 1 Banana + 150ml Latte', ingredients_f: '50g Avena + 6g Cacao + 1 Banana + 100ml Latte', calories_text: 'M: 520 kcal (18g P) | F: 330 kcal (12g P)', is_schiscetta: false, notes: 'Caldo ed energizzante per chiudere la settimana lavorativa.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'spuntino', dish_name: 'Mix di mandorle sgusciate e uvetta sultanina', ingredients_m: '25g Mandorle + 15g Uvetta', ingredients_f: '15g Mandorle + 10g Uvetta', calories_text: 'M: 200 kcal (6g P) | F: 130 kcal (4g P)', is_schiscetta: true, notes: 'Snack compatto da tenere nel cassetto.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'pranzo', dish_name: 'Pasta integrale con crema di broccoli, pollo e Parmigiano', ingredients_m: '120g Pasta int. + 180g Pollo + 250g Broccoli + 20g Grana + 10g EVO', ingredients_f: '75g Pasta int. + 120g Pollo + 180g Broccoli + 15g Grana + 8g EVO', calories_text: 'M: 740 kcal (60g P) | F: 480 kcal (40g P)', is_schiscetta: true, notes: 'Preparato la sera prima; cremoso e saporito.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con cannella e miele millefiori', ingredients_m: '180g Yogurt greco + 10g Miele + Cannella', ingredients_f: '140g Yogurt greco + 8g Miele + Cannella', calories_text: 'M: 140 kcal (19g P) | F: 110 kcal (14g P)', is_schiscetta: true, notes: 'Leggero prima dell\'allenamento del venerdì.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'cena', dish_name: 'Bresaola della Valtellina con rucola, limone, Grana e piadina int.', ingredients_m: '120g Bresaola + 80g Rucola + 30g Grana + 80g Pane int. + 10g EVO', ingredients_f: '80g Bresaola + 60g Rucola + 20g Grana + 50g Pane int. + 8g EVO', calories_text: 'M: 570 kcal (54g P) | F: 370 kcal (35g P)', is_schiscetta: false, notes: 'Cena veloce del venerdì sera senza accendere fornelli.' },

      // Sabato
      { day_name: 'Sabato', day_index: 5, meal_type: 'colazione', dish_name: 'Toast integrale con uovo in camicia e pomodorini a fette', ingredients_m: '80g Pane int. + 2 Uova + 120g Pomodori + 5g EVO', ingredients_f: '50g Pane int. + 1 Uovo + 100g Pomodori + 5g EVO', calories_text: 'M: 420 kcal (21g P) | F: 260 kcal (13g P)', is_schiscetta: false, notes: 'Brunch rilassato del weekend ad alto tenore di colina.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'spuntino', dish_name: 'Mela Fuji con crema di mandorle 100%', ingredients_m: '1 Mela Fuji + 20g Crema mandorle', ingredients_f: '1 Mela Fuji + 12g Crema mandorle', calories_text: 'M: 210 kcal (4g P) | F: 140 kcal (3g P)', is_schiscetta: false, notes: 'Snack energetico goloso.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'pranzo', dish_name: 'Gnocchi di patate con spezzatino magro di manzo e carote', ingredients_m: '250g Gnocchi + 200g Spezzatino + 150g Carote + 15g EVO', ingredients_f: '160g Gnocchi + 130g Spezzatino + 120g Carote + 10g EVO', calories_text: 'M: 710 kcal (50g P) | F: 460 kcal (33g P)', is_schiscetta: false, notes: 'Piatto caldo della tradizione autunnale.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'spuntino', dish_name: 'Tè verde bancha con fondente 85% e mandorle', ingredients_m: '20g Fondente 85% + 15g Mandorle', ingredients_f: '15g Fondente 85% + 10g Mandorle', calories_text: 'M: 200 kcal (5g P) | F: 140 kcal (3g P)', is_schiscetta: false, notes: 'Momento relax del pomeriggio.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'cena', dish_name: 'Pizza fatta in casa con farina tipo 1, fiordilatte e zucca/funghi', ingredients_m: 'Impasto 220g farina + 120g Mozzarella + Verdure', ingredients_f: 'Impasto 140g farina + 80g Mozzarella + Verdure', calories_text: 'M: 850 kcal (38g P) | F: 540 kcal (24g P)', is_schiscetta: false, notes: 'Pasto sociale e conviviale del sabato sera.' },

      // Domenica
      { day_name: 'Domenica', day_index: 6, meal_type: 'colazione', dish_name: 'Pancake della domenica con mirtilli freschi e miele millefiori', ingredients_m: '80g Farina int. + 2 Uova + 100g Mirtilli + 15g Miele', ingredients_f: '50g Farina int. + 1 Uovo + 70g Mirtilli + 10g Miele', calories_text: 'M: 530 kcal (25g P) | F: 330 kcal (15g P)', is_schiscetta: false, notes: 'Preparazione della colazione in coppia senza fretta.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'spuntino', dish_name: 'Yogurt bianco con gherigli di noce', ingredients_m: '150g Yogurt + 15g Noci', ingredients_f: '125g Yogurt + 10g Noci', calories_text: 'M: 200 kcal (7g P) | F: 140 kcal (5g P)', is_schiscetta: false, notes: 'Pausa digestiva.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'pranzo', dish_name: 'Risotto ai funghi porcini/champignon mantecato al Parmigiano', ingredients_m: '120g Riso carnaroli + 200g Funghi + 30g Grana + 15g EVO', ingredients_f: '75g Riso carnaroli + 150g Funghi + 20g Grana + 10g EVO', calories_text: 'M: 690 kcal (21g P) | F: 440 kcal (14g P)', is_schiscetta: false, notes: 'Cottura tradizionale all\'onda con brodo fatto in casa.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'spuntino', dish_name: 'Frutto fresco di stagione e tisana calda', ingredients_m: '1 Mela Fuji (180g) + Tisana digestiva', ingredients_f: '1 Mela Fuji (140g) + Tisana digestiva', calories_text: 'M: 90 kcal (0g P) | F: 70 kcal (0g P)', is_schiscetta: false, notes: 'Break prima della sessione di Meal Prep.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'cena', dish_name: 'Petto di pollo alla piastra con zucca e patate arrosto', ingredients_m: '230g Pollo + 250g Zucca + 200g Patate + 15g EVO', ingredients_f: '140g Pollo + 180g Zucca + 140g Patate + 10g EVO', calories_text: 'M: 660 kcal (57g P) | F: 410 kcal (35g P)', is_schiscetta: false, notes: 'Cena leggera mentre cuociono i pasti per lun-mar.' },
    ],
  },

  inverno: {
    label: 'Piano Inverno (Dic-Feb)',
    season_key: 'inverno',
    description: 'Minestroni densi di legumi, crucifere, agrumi ricchi di Vitamina C, stufati corroboranti e polenta.',
    meals: [
      { day_name: 'Lunedì', day_index: 0, meal_type: 'colazione', dish_name: 'Porridge caldo d\'avena con arancia tarocco, cannella e noci', ingredients_m: '80g Avena + 1 Arancia + 20g Noci + 150ml Latte', ingredients_f: '50g Avena + 1 Arancia + 12g Noci + 100ml Latte', calories_text: 'M: 520 kcal (19g P) | F: 330 kcal (12g P)', is_schiscetta: false, notes: 'Vitamina C e riscaldamento termogenico mattutino.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con kiwi e mandorle', ingredients_m: '200g Yogurt greco + 1 Kiwi + 10g Mandorle', ingredients_f: '150g Yogurt greco + 1 Kiwi + 8g Mandorle', calories_text: 'M: 230 kcal (22g P) | F: 160 kcal (16g P)', is_schiscetta: true, notes: 'Protezione immunitaria naturale.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'pranzo', dish_name: 'Pasta e lenticchie della tradizione con carote, sedano ed EVO', ingredients_m: '100g Pasta + 90g Lenticchie + Carote/Cipolle + 15g EVO', ingredients_f: '65g Pasta + 60g Lenticchie + Carote/Cipolle + 10g EVO', calories_text: 'M: 730 kcal (33g P) | F: 470 kcal (21g P)', is_schiscetta: true, notes: 'Conservare in termos o scaldare al microonde.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'spuntino', dish_name: 'Mandaranci di Sicilia con cioccolato fondente 85%', ingredients_m: '2 Mandaranci + 20g Fondente 85%', ingredients_f: '2 Mandaranci + 12g Fondente 85%', calories_text: 'M: 200 kcal (3g P) | F: 140 kcal (2g P)', is_schiscetta: true, notes: 'Fresco e saziante.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'cena', dish_name: 'Macinato magro di manzo con cavolfiore ripassato e patate', ingredients_m: '220g Manzo + 300g Patate + 250g Cavolfiore + 15g EVO', ingredients_f: '140g Manzo + 180g Patate + 200g Cavolfiore + 10g EVO', calories_text: 'M: 710 kcal (52g P) | F: 450 kcal (34g P)', is_schiscetta: false, notes: 'Ferro eme e indoli benefici delle crucifere.' },
      // ... Martedì - Domenica Inverno
      { day_name: 'Martedì', day_index: 1, meal_type: 'colazione', dish_name: 'Pane integrale tostato con ricotta vaccina e miele', ingredients_m: '80g Pane int. + 90g Ricotta + 15g Miele', ingredients_f: '50g Pane int. + 60g Ricotta + 10g Miele', calories_text: 'M: 420 kcal (16g P) | F: 270 kcal (10g P)', is_schiscetta: false, notes: 'Semplicità e calore mattutino.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'spuntino', dish_name: 'Banana e noci sgusciate', ingredients_m: '1 Banana + 20g Noci', ingredients_f: '1 Banana + 12g Noci', calories_text: 'M: 260 kcal (6g P) | F: 180 kcal (4g P)', is_schiscetta: true, notes: 'Potassio e lipidi nobili.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'pranzo', dish_name: 'Riso basmati con bocconcini di pollo al curry e porri stufati', ingredients_m: '120g Riso + 220g Pollo + Porri + 15g EVO', ingredients_f: '75g Riso + 140g Pollo + Porri + 10g EVO', calories_text: 'M: 730 kcal (57g P) | F: 460 kcal (37g P)', is_schiscetta: true, notes: 'Proprietà antinfiammatorie del curry.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con spolverata di cacao amaro', ingredients_m: '200g Yogurt greco + 8g Cacao amaro', ingredients_f: '150g Yogurt greco + 5g Cacao amaro', calories_text: 'M: 150 kcal (22g P) | F: 110 kcal (16g P)', is_schiscetta: true, notes: 'Cioccolatoso senza zuccheri aggiunti.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'cena', dish_name: 'Filetti di merluzzo al forno con finocchi e patate a spicchi', ingredients_m: '230g Merluzzo + 250g Patate + 250g Finocchi + 15g EVO', ingredients_f: '150g Merluzzo + 170g Patate + 200g Finocchi + 10g EVO', calories_text: 'M: 590 kcal (46g P) | F: 380 kcal (30g P)', is_schiscetta: false, notes: 'Finocchi digestivi; cena leggera e saziante.' },
      // Mercoledì - Domenica
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'colazione', dish_name: 'Porridge d\'avena con mela cotta e uvetta sultanina', ingredients_m: '80g Avena + Mela cotta + 15g Uvetta + Latte', ingredients_f: '50g Avena + Mela cotta + 10g Uvetta + Latte', calories_text: 'M: 500 kcal (17g P) | F: 320 kcal (11g P)', is_schiscetta: false, notes: 'Mela cotta in microonde 2 min.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'spuntino', dish_name: 'Arancia rossa a fette con mandorle tostate', ingredients_m: '1 Arancia + 20g Mandorle', ingredients_f: '1 Arancia + 12g Mandorle', calories_text: 'M: 210 kcal (5g P) | F: 140 kcal (3g P)', is_schiscetta: true, notes: 'Bioflavonoidi agrumati protettivi.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'pranzo', dish_name: 'Minestrone denso di farro perlato, borlotti, verza ed EVO', ingredients_m: '90g Farro + 180g Borlotti + Verza + 15g EVO', ingredients_f: '60g Farro + 120g Borlotti + Verza + 10g EVO', calories_text: 'M: 670 kcal (28g P) | F: 430 kcal (18g P)', is_schiscetta: true, notes: 'Cotto in pentola grande; il riposo esalta i sapori.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'spuntino', dish_name: 'Pane integrale con fesa di tacchino al naturale', ingredients_m: '60g Pane + 80g Tacchino', ingredients_f: '40g Pane + 50g Tacchino', calories_text: 'M: 230 kcal (22g P) | F: 150 kcal (14g P)', is_schiscetta: true, notes: 'Ricarica salata proteica.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'cena', dish_name: 'Frittata rustica con cime di rapa/spinaci, Grana e crostoni', ingredients_m: '3 Uova + 250g Cime rapa + 25g Grana + 70g Pane', ingredients_f: '2 Uova + 200g Cime rapa + 15g Grana + 45g Pane', calories_text: 'M: 610 kcal (40g P) | F: 390 kcal (26g P)', is_schiscetta: false, notes: 'Folati e calcio vegetale.' },
      // Giovedì
      { day_name: 'Giovedì', day_index: 3, meal_type: 'colazione', dish_name: 'Pancake d\'avena con ricotta e miele millefiori', ingredients_m: '70g Farina avena + 2 Uova + Ricotta + Miele', ingredients_f: '45g Farina avena + 1 Uovo + Ricotta + Miele', calories_text: 'M: 490 kcal (26g P) | F: 310 kcal (16g P)', is_schiscetta: false, notes: 'Energia prolungata.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con semi di chia e mandorle', ingredients_m: '200g Yogurt greco + 15g Mandorle', ingredients_f: '150g Yogurt greco + 10g Mandorle', calories_text: 'M: 220 kcal (22g P) | F: 150 kcal (16g P)', is_schiscetta: true, notes: 'Acidi grassi essenziali.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'pranzo', dish_name: 'Bocconcini di pollo con verza stufata, riso ed EVO', ingredients_m: '120g Riso + 220g Pollo + 250g Verza + 15g EVO', ingredients_f: '75g Riso + 140g Pollo + 200g Verza + 10g EVO', calories_text: 'M: 730 kcal (57g P) | F: 460 kcal (37g P)', is_schiscetta: true, notes: 'Verza dolce e morbida.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'spuntino', dish_name: 'Pera autunnale con mandorle sgusciate', ingredients_m: '1 Pera + 20g Mandorle', ingredients_f: '1 Pera + 12g Mandorle', calories_text: 'M: 210 kcal (5g P) | F: 140 kcal (3g P)', is_schiscetta: true, notes: 'Fibre sazianti.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'cena', dish_name: 'Trancio di salmone al cartoccio con finocchi e patate', ingredients_m: '220g Salmone + 250g Patate + Finocchi + 10g EVO', ingredients_f: '140g Salmone + 170g Patate + Finocchi + 8g EVO', calories_text: 'M: 720 kcal (51g P) | F: 460 kcal (33g P)', is_schiscetta: false, notes: 'Cottura al cartoccio salva-principi nutritivi.' },
      // Venerdì
      { day_name: 'Venerdì', day_index: 4, meal_type: 'colazione', dish_name: 'Porridge d\'avena al cacao amaro con noci tritate', ingredients_m: '80g Avena + 10g Cacao + 20g Noci + Latte', ingredients_f: '50g Avena + 6g Cacao + 12g Noci + Latte', calories_text: 'M: 520 kcal (19g P) | F: 330 kcal (12g P)', is_schiscetta: false, notes: 'Caldo ed energizzante.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'spuntino', dish_name: 'Mela Fuji e noci sgusciate', ingredients_m: '1 Mela + 15g Noci', ingredients_f: '1 Mela + 10g Noci', calories_text: 'M: 190 kcal (3g P) | F: 130 kcal (2g P)', is_schiscetta: true, notes: 'Anti-fame classico.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'pranzo', dish_name: 'Pasta integrale con crema di cavolfiore, noci e Grana', ingredients_m: '120g Pasta + 250g Cavolfiore + Grana + Noci + EVO', ingredients_f: '75g Pasta + 180g Cavolfiore + Grana + Noci + EVO', calories_text: 'M: 740 kcal (28g P) | F: 470 kcal (18g P)', is_schiscetta: true, notes: 'Cavolfiore vellutato senza panna.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con cannella e gocce fondenti', ingredients_m: '180g Yogurt + 15g Fondente + Cannella', ingredients_f: '140g Yogurt + 10g Fondente + Cannella', calories_text: 'M: 190 kcal (20g P) | F: 140 kcal (15g P)', is_schiscetta: true, notes: 'Goloso e tonificante.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'cena', dish_name: 'Burger magri di manzo con vellutata di carote e zenzero e pane', ingredients_m: '220g Manzo + 300g Carote/Zenzero + 80g Pane', ingredients_f: '140g Manzo + 200g Carote/Zenzero + 50g Pane', calories_text: 'M: 680 kcal (52g P) | F: 430 kcal (33g P)', is_schiscetta: false, notes: 'Zenzero termogenico e stimolante.' },
      // Sabato
      { day_name: 'Sabato', day_index: 5, meal_type: 'colazione', dish_name: 'Uova strapazzate con pane di segale e pomodorini', ingredients_m: '80g Pane + 2 Uova + 150g Pomodori', ingredients_f: '50g Pane + 1 Uovo + 120g Pomodori', calories_text: 'M: 420 kcal (21g P) | F: 260 kcal (13g P)', is_schiscetta: false, notes: 'Colazione salata calda.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'spuntino', dish_name: 'Spremuta d\'arancia fresca con mandorle tostate', ingredients_m: '2 Arance spremute + 20g Mandorle', ingredients_f: '2 Arance spremute + 12g Mandorle', calories_text: 'M: 220 kcal (5g P) | F: 150 kcal (3g P)', is_schiscetta: false, notes: 'Vitamina C immediata.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'pranzo', dish_name: 'Polenta con spezzatino magro di manzo e funghi trifolati', ingredients_m: '100g Farina mais + 220g Manzo + Funghi + EVO', ingredients_f: '65g Farina mais + 140g Manzo + Funghi + EVO', calories_text: 'M: 730 kcal (54g P) | F: 470 kcal (35g P)', is_schiscetta: false, notes: 'Piatto forte invernale.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'spuntino', dish_name: 'Tè nero speziato con scorza d\'arancia e fondente', ingredients_m: '20g Fondente + 15g Mandorle', ingredients_f: '15g Fondente + 10g Mandorle', calories_text: 'M: 200 kcal (5g P) | F: 140 kcal (3g P)', is_schiscetta: false, notes: 'Pausa calda del sabato.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'cena', dish_name: 'Pizza invernale con fiordilatte, radicchio e noci', ingredients_m: 'Impasto 220g farina + 120g Mozzarella + Radicchio', ingredients_f: 'Impasto 140g farina + 80g Mozzarella + Radicchio', calories_text: 'M: 860 kcal (39g P) | F: 550 kcal (25g P)', is_schiscetta: false, notes: 'Serata conviviale.' },
      // Domenica
      { day_name: 'Domenica', day_index: 6, meal_type: 'colazione', dish_name: 'Pancake caldi con ricotta vaccina, miele e cannella', ingredients_m: '70g Farina + 2 Uova + Ricotta + Miele', ingredients_f: '45g Farina + 1 Uovo + Ricotta + Miele', calories_text: 'M: 510 kcal (28g P) | F: 320 kcal (17g P)', is_schiscetta: false, notes: 'Brunch domenicale.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'spuntino', dish_name: 'Spicchi di mela cotta alla cannella', ingredients_m: '1 Mela cotta + Cannella', ingredients_f: '1 Mela cotta + Cannella', calories_text: 'M: 90 kcal (0g P) | F: 70 kcal (0g P)', is_schiscetta: false, notes: 'Fresco e depurativo.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'pranzo', dish_name: 'Pasta al forno con ragù magro e besciamella leggera', ingredients_m: '110g Pasta + 180g Ragù + 30g Grana', ingredients_f: '70g Pasta + 120g Ragù + 20g Grana', calories_text: 'M: 740 kcal (48g P) | F: 470 kcal (31g P)', is_schiscetta: false, notes: 'Gratinatura dorata.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'spuntino', dish_name: 'Yogurt bianco con tisana all\'anice', ingredients_m: '150g Yogurt + Tisana', ingredients_f: '125g Yogurt + Tisana', calories_text: 'M: 100 kcal (5g P) | F: 80 kcal (4g P)', is_schiscetta: false, notes: 'Digestivo.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'cena', dish_name: 'Zuppa di cannellini con scarola e crostini integrali', ingredients_m: '110g Fagioli + 250g Scarola + 70g Pane + EVO', ingredients_f: '70g Fagioli + 200g Scarola + 45g Pane + EVO', calories_text: 'M: 640 kcal (29g P) | F: 410 kcal (19g P)', is_schiscetta: false, notes: 'Cena calda pre-meal prep.' },
    ],
  },

  primavera: {
    label: 'Piano Primavera (Mar-Mag)',
    season_key: 'primavera',
    description: 'Asparagi verdi, piselli freschi, fragole, ricotta vaccina, carciofi e cotture delicate al vapore.',
    meals: [
      { day_name: 'Lunedì', day_index: 0, meal_type: 'colazione', dish_name: 'Porridge d\'avena con fragole fresche e scaglie di mandorle', ingredients_m: '80g Avena + 120g Fragole + 20g Mandorle + 150ml Latte', ingredients_f: '50g Avena + 80g Fragole + 12g Mandorle + 100ml Latte', calories_text: 'M: 510 kcal (18g P) | F: 320 kcal (11g P)', is_schiscetta: false, notes: 'Fresco e profumato.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con kiwi a fettine', ingredients_m: '200g Yogurt greco + 1 Kiwi', ingredients_f: '150g Yogurt greco + 1 Kiwi', calories_text: 'M: 170 kcal (21g P) | F: 120 kcal (16g P)', is_schiscetta: true, notes: 'Fibre prebiotiche ed enzimi benefici.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'pranzo', dish_name: 'Riso basmati con fesa di tacchino e asparagi verdi al vapore', ingredients_m: '120g Riso + 220g Tacchino + 200g Asparagi + 15g EVO', ingredients_f: '75g Riso + 140g Tacchino + 160g Asparagi + 10g EVO', calories_text: 'M: 720 kcal (58g P) | F: 460 kcal (38g P)', is_schiscetta: true, notes: 'Azione drenante naturale.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'spuntino', dish_name: 'Fragole al limone con cioccolato fondente 85%', ingredients_m: '150g Fragole + Limone + 20g Fondente', ingredients_f: '120g Fragole + Limone + 12g Fondente', calories_text: 'M: 170 kcal (3g P) | F: 120 kcal (2g P)', is_schiscetta: true, notes: 'Basso indice glicemico.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'cena', dish_name: 'Frittata alle erbe di campo e asparagi con patate novelle', ingredients_m: '3 Uova + 150g Asparagi + 300g Patate + 10g EVO', ingredients_f: '2 Uova + 120g Asparagi + 180g Patate + 8g EVO', calories_text: 'M: 570 kcal (32g P) | F: 360 kcal (20g P)', is_schiscetta: false, notes: 'Cena leggera di primavera.' },
      // ... Martedì - Domenica Primavera
      { day_name: 'Martedì', day_index: 1, meal_type: 'colazione', dish_name: 'Pane integrale con ricotta e fettine di fragole', ingredients_m: '80g Pane int. + 90g Ricotta + 100g Fragole', ingredients_f: '50g Pane int. + 60g Ricotta + 70g Fragole', calories_text: 'M: 380 kcal (16g P) | F: 240 kcal (10g P)', is_schiscetta: false, notes: 'Freschezza mattutina.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'spuntino', dish_name: 'Banana e mandorle tostate', ingredients_m: '1 Banana + 20g Mandorle', ingredients_f: '1 Banana + 12g Mandorle', calories_text: 'M: 250 kcal (6g P) | F: 180 kcal (4g P)', is_schiscetta: true, notes: 'Energia immediata.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'pranzo', dish_name: 'Pasta integrale con piselli primaverili, carote e Grana', ingredients_m: '120g Pasta + 150g Piselli + Grana + EVO', ingredients_f: '75g Pasta + 100g Piselli + Grana + EVO', calories_text: 'M: 730 kcal (34g P) | F: 460 kcal (22g P)', is_schiscetta: true, notes: 'Dolcezza naturale dei piselli.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con mirtilli freschi', ingredients_m: '180g Yogurt + 70g Mirtilli', ingredients_f: '140g Yogurt + 50g Mirtilli', calories_text: 'M: 140 kcal (19g P) | F: 110 kcal (14g P)', is_schiscetta: true, notes: 'Antiossidante.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'cena', dish_name: 'Orata al cartoccio con zucchine, pomodorini e pane', ingredients_m: '230g Orata + 200g Zucchine + 70g Pane + EVO', ingredients_f: '150g Orata + 160g Zucchine + 45g Pane + EVO', calories_text: 'M: 590 kcal (48g P) | F: 380 kcal (31g P)', is_schiscetta: false, notes: 'Cottura al vapore di forno in 18 min.' },
      // Mercoledì - Domenica
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'colazione', dish_name: 'Pancake all\'avena con purea di mela e cannella', ingredients_m: '70g Farina avena + 2 Uova + Mela', ingredients_f: '45g Farina avena + 1 Uovo + Mela', calories_text: 'M: 480 kcal (24g P) | F: 300 kcal (15g P)', is_schiscetta: false, notes: 'Senza zuccheri raffinati.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'spuntino', dish_name: 'Mela Fuji con noci sgusciate', ingredients_m: '1 Mela + 20g Noci', ingredients_f: '1 Mela + 12g Noci', calories_text: 'M: 220 kcal (4g P) | F: 150 kcal (3g P)', is_schiscetta: true, notes: 'Fibre e sazietà.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'pranzo', dish_name: 'Quinoa reale con ceci, zucchine trifolate, menta ed EVO', ingredients_m: '100g Quinoa + 160g Ceci + Zucchine + 15g EVO', ingredients_f: '65g Quinoa + 110g Ceci + Zucchine + 10g EVO', calories_text: 'M: 680 kcal (26g P) | F: 430 kcal (17g P)', is_schiscetta: true, notes: 'Fresca e aromatica.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'spuntino', dish_name: 'Pane integrale con fesa di tacchino al naturale', ingredients_m: '60g Pane + 80g Tacchino', ingredients_f: '40g Pane + 50g Tacchino', calories_text: 'M: 230 kcal (22g P) | F: 150 kcal (14g P)', is_schiscetta: true, notes: 'Spezza-fame ideale.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'cena', dish_name: 'Tagliata di pollo alla piastra con carciofi trifolati e pane', ingredients_m: '230g Pollo + 2 Carciofi + 70g Pane + 15g EVO', ingredients_f: '140g Pollo + 2 Carciofi + 45g Pane + 10g EVO', calories_text: 'M: 620 kcal (57g P) | F: 390 kcal (35g P)', is_schiscetta: false, notes: 'Carciofi depurativi per il fegato.' },
      // Giovedì
      { day_name: 'Giovedì', day_index: 3, meal_type: 'colazione', dish_name: 'Porridge d\'avena con gocce fondenti e banana', ingredients_m: '80g Avena + 1 Banana + 15g Fondente + Latte', ingredients_f: '50g Avena + 1 Banana + 10g Fondente + Latte', calories_text: 'M: 530 kcal (18g P) | F: 340 kcal (12g P)', is_schiscetta: false, notes: 'Energia costante.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con fragole fresche', ingredients_m: '200g Yogurt + 100g Fragole', ingredients_f: '150g Yogurt + 70g Fragole', calories_text: 'M: 150 kcal (21g P) | F: 110 kcal (16g P)', is_schiscetta: true, notes: 'Idratante e leggero.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'pranzo', dish_name: 'Riso integrale con bocconcini di salmone e asparagi', ingredients_m: '110g Riso + 200g Salmone + Asparagi + 10g EVO', ingredients_f: '70g Riso + 130g Salmone + Asparagi + 8g EVO', calories_text: 'M: 710 kcal (50g P) | F: 460 kcal (32g P)', is_schiscetta: true, notes: 'Piatto gourmet dai valori impeccabili.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'spuntino', dish_name: 'Macedonia di fragole e mela al limone', ingredients_m: '200g Frutta fresca + Limone', ingredients_f: '150g Frutta fresca + Limone', calories_text: 'M: 110 kcal (1g P) | F: 80 kcal (1g P)', is_schiscetta: true, notes: 'Purificante.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'cena', dish_name: 'Straccetti di manzo con rucola, pomodorini e patate', ingredients_m: '220g Manzo + 300g Patate + Rucola + 15g EVO', ingredients_f: '140g Manzo + 180g Patate + Rucola + 10g EVO', calories_text: 'M: 690 kcal (52g P) | F: 430 kcal (33g P)', is_schiscetta: false, notes: 'Ferro eme potenziato da vitamina C.' },
      // Venerdì
      { day_name: 'Venerdì', day_index: 4, meal_type: 'colazione', dish_name: 'Pane integrale con ricotta fresca, miele e noci', ingredients_m: '80g Pane + 90g Ricotta + 10g Miele + Noci', ingredients_f: '50g Pane + 60g Ricotta + 8g Miele + Noci', calories_text: 'M: 450 kcal (17g P) | F: 290 kcal (11g P)', is_schiscetta: false, notes: 'Equilibrio proteico e lipidico.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'spuntino', dish_name: 'Fragole fresche con mandorle sgusciate', ingredients_m: '150g Fragole + 20g Mandorle', ingredients_f: '120g Fragole + 12g Mandorle', calories_text: 'M: 180 kcal (5g P) | F: 130 kcal (3g P)', is_schiscetta: true, notes: 'Sinergia antiossidante.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'pranzo', dish_name: 'Pasta integrale con tonno al naturale, olive e zucchine', ingredients_m: '120g Pasta + 140g Tonno + 200g Zucchine + EVO', ingredients_f: '75g Pasta + 90g Tonno + 160g Zucchine + EVO', calories_text: 'M: 710 kcal (49g P) | F: 450 kcal (32g P)', is_schiscetta: true, notes: 'Preparazione rapida in 12 minuti.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con cannella', ingredients_m: '180g Yogurt + Cannella', ingredients_f: '140g Yogurt + Cannella', calories_text: 'M: 110 kcal (19g P) | F: 80 kcal (14g P)', is_schiscetta: true, notes: 'Regolatore glicemico.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'cena', dish_name: 'Insalatona con uova sode, mozzarella, carote e pane', ingredients_m: '2 Uova + 100g Mozzarella + Insalata + 70g Pane', ingredients_f: '1 Uovo + 70g Mozzarella + Insalata + 45g Pane', calories_text: 'M: 610 kcal (36g P) | F: 390 kcal (23g P)', is_schiscetta: false, notes: 'Uova pronte dal meal prep.' },
      // Sabato
      { day_name: 'Sabato', day_index: 5, meal_type: 'colazione', dish_name: 'Pancake leggeri con purea di fragole fresche', ingredients_m: '70g Farina + 2 Uova + 120g Fragole', ingredients_f: '45g Farina + 1 Uovo + 80g Fragole', calories_text: 'M: 440 kcal (22g P) | F: 270 kcal (13g P)', is_schiscetta: false, notes: 'Colazione all\'aperto.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'spuntino', dish_name: 'Mela verde acidula con cannella', ingredients_m: '1 Mela verde + Cannella', ingredients_f: '1 Mela verde + Cannella', calories_text: 'M: 90 kcal (0g P) | F: 70 kcal (0g P)', is_schiscetta: false, notes: 'Dissetante.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'pranzo', dish_name: 'Risotto primaverile con asparagi freschi e Parmigiano', ingredients_m: '120g Riso + 200g Asparagi + 25g Grana + EVO', ingredients_f: '75g Riso + 150g Asparagi + 18g Grana + EVO', calories_text: 'M: 680 kcal (21g P) | F: 430 kcal (14g P)', is_schiscetta: false, notes: 'Cottura con brodo di gambi d\'asparago.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'spuntino', dish_name: 'Tè freddo fatto in casa con menta e mandorle', ingredients_m: 'Infuso menta + 20g Mandorle', ingredients_f: 'Infuso menta + 12g Mandorle', calories_text: 'M: 120 kcal (4g P) | F: 80 kcal (3g P)', is_schiscetta: false, notes: 'Zero zuccheri.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'cena', dish_name: 'Pizza margherita artigianale con pomodorini e basilico', ingredients_m: 'Impasto 220g farina + 120g Mozzarella + Basilico', ingredients_f: 'Impasto 140g farina + 80g Mozzarella + Basilico', calories_text: 'M: 830 kcal (37g P) | F: 530 kcal (24g P)', is_schiscetta: false, notes: 'Serata svago.' },
      // Domenica
      { day_name: 'Domenica', day_index: 6, meal_type: 'colazione', dish_name: 'Yogurt greco bowl con avena croccante e fragole', ingredients_m: '200g Yogurt + 50g Avena + 100g Fragole + Miele', ingredients_f: '150g Yogurt + 35g Avena + 70g Fragole + Miele', calories_text: 'M: 460 kcal (26g P) | F: 310 kcal (18g P)', is_schiscetta: false, notes: 'Colorata e ricca di micronutrienti.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'spuntino', dish_name: 'Frutto fresco di stagione', ingredients_m: '1 Frutto medio', ingredients_f: '1 Frutto piccolo', calories_text: 'M: 90 kcal (1g P) | F: 65 kcal (1g P)', is_schiscetta: false, notes: 'Spuntino leggero.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'pranzo', dish_name: 'Grigliata di pollo e verdure miste con patate arrosto', ingredients_m: '250g Pollo + Verdure grigliate + 250g Patate', ingredients_f: '160g Pollo + Verdure grigliate + 160g Patate', calories_text: 'M: 680 kcal (62g P) | F: 440 kcal (40g P)', is_schiscetta: false, notes: 'Pranzo domenicale primaverile.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'spuntino', dish_name: 'Tisana ai frutti rossi con cubetto di fondente 85%', ingredients_m: '15g Fondente + Tisana', ingredients_f: '10g Fondente + Tisana', calories_text: 'M: 90 kcal (1g P) | F: 60 kcal (1g P)', is_schiscetta: false, notes: 'Relax pre-meal prep.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'cena', dish_name: 'Crema di piselli primaverili con ricotta fresca e crostoni', ingredients_m: '180g Piselli + 100g Ricotta + 70g Pane + EVO', ingredients_f: '120g Piselli + 70g Ricotta + 45g Pane + EVO', calories_text: 'M: 580 kcal (28g P) | F: 370 kcal (18g P)', is_schiscetta: false, notes: 'Chiusura di settimana delicata.' },
    ],
  },

  estate: {
    label: 'Piano Estate (Giu-Sett)',
    season_key: 'estate',
    description: 'Piatti freddi senza fornelli, insalate di cereali (farro, riso, quinoa), caprese, melone e carpacci.',
    meals: [
      { day_name: 'Lunedì', day_index: 0, meal_type: 'colazione', dish_name: 'Overnight oats freddo con yogurt, pesca e mandorle', ingredients_m: '70g Avena + 150g Yogurt + 1 Pesca + 15g Mandorle', ingredients_f: '45g Avena + 120g Yogurt + 1 Pesca + 10g Mandorle', calories_text: 'M: 480 kcal (23g P) | F: 320 kcal (16g P)', is_schiscetta: true, notes: 'Pronto in frigo: zero calore in cucina la mattina.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'spuntino', dish_name: 'Spicchi di melone cantalupo freschissimo', ingredients_m: '250g Melone fresco', ingredients_f: '180g Melone fresco', calories_text: 'M: 90 kcal (2g P) | F: 65 kcal (1g P)', is_schiscetta: true, notes: 'Betacarotene e idratazione cellulare.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'pranzo', dish_name: 'Insalata fredda di riso con tonno, uova sode e pomodorini', ingredients_m: '120g Riso + 120g Tonno + 1 Uovo + Pomodori + 15g EVO', ingredients_f: '75g Riso + 80g Tonno + 1 Uovo + Pomodori + 10g EVO', calories_text: 'M: 730 kcal (48g P) | F: 460 kcal (32g P)', is_schiscetta: true, notes: 'Regina delle schiscette estive: dura 3 giorni in frigo.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con frutti di bosco o pesca', ingredients_m: '180g Yogurt + 80g Frutta', ingredients_f: '140g Yogurt + 60g Frutta', calories_text: 'M: 140 kcal (19g P) | F: 110 kcal (14g P)', is_schiscetta: true, notes: 'Rinfrescante pomeridiano.' },
      { day_name: 'Lunedì', day_index: 0, meal_type: 'cena', dish_name: 'Carpaccio di bresaola IGP con rucola, limone, Grana e pane', ingredients_m: '130g Bresaola + 80g Rucola + 30g Grana + 80g Pane + EVO', ingredients_f: '80g Bresaola + 60g Rucola + 20g Grana + 50g Pane + EVO', calories_text: 'M: 610 kcal (57g P) | F: 390 kcal (36g P)', is_schiscetta: false, notes: 'Zero fornelli: assemblato in 3 minuti netti.' },
      // ... Martedì - Domenica Estate
      { day_name: 'Martedì', day_index: 1, meal_type: 'colazione', dish_name: 'Smoothie bowl proteico: banana fredda, yogurt e fragole', ingredients_m: '1 Banana + 200g Yogurt + Fragole + 15g Noci', ingredients_f: '1 Banana + 150g Yogurt + Fragole + 10g Noci', calories_text: 'M: 410 kcal (24g P) | F: 280 kcal (17g P)', is_schiscetta: false, notes: 'Consistenza simile a gelato naturale.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'spuntino', dish_name: 'Fetta di anguria fresca o melone', ingredients_m: '300g Anguria fresca', ingredients_f: '200g Anguria fresca', calories_text: 'M: 90 kcal (2g P) | F: 60 kcal (1g P)', is_schiscetta: true, notes: 'Reintegro idroelettrolitico.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'pranzo', dish_name: 'Insalata di farro freddo con pollo grigliato e pomodorini', ingredients_m: '110g Farro + 200g Pollo + Pomodori + 15g EVO', ingredients_f: '70g Farro + 130g Pollo + Pomodori + 10g EVO', calories_text: 'M: 710 kcal (56g P) | F: 450 kcal (36g P)', is_schiscetta: true, notes: 'Pollo grigliato la domenica e conservato a fette.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'spuntino', dish_name: 'Pesca noce a spicchi con mandorle sgusciate', ingredients_m: '1 Pesca + 20g Mandorle', ingredients_f: '1 Pesca + 12g Mandorle', calories_text: 'M: 200 kcal (5g P) | F: 140 kcal (3g P)', is_schiscetta: true, notes: 'Snack saziante per l\'ufficio.' },
      { day_name: 'Martedì', day_index: 1, meal_type: 'cena', dish_name: 'Caprese con mozzarella fiordilatte, pomodori e frisella', ingredients_m: '150g Mozzarella + 250g Pomodori + 80g Frisella + EVO', ingredients_f: '100g Mozzarella + 200g Pomodori + 50g Frisella + EVO', calories_text: 'M: 640 kcal (33g P) | F: 430 kcal (22g P)', is_schiscetta: false, notes: 'Condire all\'istante con olio e basilico fresco.' },
      // Mercoledì - Domenica
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'colazione', dish_name: 'Pane integrale con ricotta vaccina e fette di pesca', ingredients_m: '80g Pane + 90g Ricotta + 100g Pesca', ingredients_f: '50g Pane + 60g Ricotta + 70g Pesca', calories_text: 'M: 380 kcal (16g P) | F: 240 kcal (10g P)', is_schiscetta: false, notes: 'Gourmet e fresco.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con cubetti di melone', ingredients_m: '180g Yogurt + 100g Melone', ingredients_f: '140g Yogurt + 80g Melone', calories_text: 'M: 140 kcal (19g P) | F: 110 kcal (14g P)', is_schiscetta: true, notes: 'Pre-prandiale fresco.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'pranzo', dish_name: 'Quinoa fredda con ceci, cetrioli, menta, pomodori ed EVO', ingredients_m: '100g Quinoa + 160g Ceci + Cetrioli/Menta + 15g EVO', ingredients_f: '65g Quinoa + 110g Ceci + Cetrioli/Menta + 10g EVO', calories_text: 'M: 670 kcal (26g P) | F: 430 kcal (17g P)', is_schiscetta: true, notes: 'Piatto unico vegano e rinfrescante.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'spuntino', dish_name: 'Anguria fresca a cubetti', ingredients_m: '300g Anguria a cubetti', ingredients_f: '200g Anguria a cubetti', calories_text: 'M: 90 kcal (2g P) | F: 60 kcal (1g P)', is_schiscetta: true, notes: 'Dissetante.' },
      { day_name: 'Mercoledì', day_index: 2, meal_type: 'cena', dish_name: 'Filetto di salmone alla griglia con patate e fagiolini', ingredients_m: '220g Salmone + 250g Patate + Fagiolini + 10g EVO', ingredients_f: '140g Salmone + 170g Patate + Fagiolini + 8g EVO', calories_text: 'M: 710 kcal (51g P) | F: 460 kcal (33g P)', is_schiscetta: false, notes: 'Patate e fagiolini pronti dal meal prep; scottare il pesce.' },
      // Giovedì
      { day_name: 'Giovedì', day_index: 3, meal_type: 'colazione', dish_name: 'Overnight oats al cacao con latte freddo, banana e noci', ingredients_m: '70g Avena + 10g Cacao + Banana + 15g Noci + Latte', ingredients_f: '45g Avena + 6g Cacao + Banana + 10g Noci + Latte', calories_text: 'M: 520 kcal (18g P) | F: 330 kcal (12g P)', is_schiscetta: true, notes: 'Energia pulita anti-calura.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'spuntino', dish_name: 'Pesca bianca con mandorle sgusciate', ingredients_m: '1 Pesca + 20g Mandorle', ingredients_f: '1 Pesca + 12g Mandorle', calories_text: 'M: 200 kcal (5g P) | F: 140 kcal (3g P)', is_schiscetta: true, notes: 'Grassi monoinsaturi.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'pranzo', dish_name: 'Pasta fredda con mozzarella fiordilatte, pomodorini e basilico', ingredients_m: '120g Pasta + 100g Mozzarella + Pomodori + 15g EVO', ingredients_f: '75g Pasta + 70g Mozzarella + Pomodori + 10g EVO', calories_text: 'M: 720 kcal (34g P) | F: 460 kcal (22g P)', is_schiscetta: true, notes: 'Raffreddare la pasta sotto acqua corrente per bloccare la cottura.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'spuntino', dish_name: 'Yogurt greco 0% con cannella e fondente 85%', ingredients_m: '180g Yogurt + 15g Fondente + Cannella', ingredients_f: '140g Yogurt + 10g Fondente + Cannella', calories_text: 'M: 190 kcal (20g P) | F: 140 kcal (15g P)', is_schiscetta: true, notes: 'Snack a basso carico glicemico.' },
      { day_name: 'Giovedì', day_index: 3, meal_type: 'cena', dish_name: 'Tataki o trancio di tonno scottato con zucchine e pane', ingredients_m: '220g Tonno + 200g Zucchine grigliate + 70g Pane', ingredients_f: '140g Tonno + 160g Zucchine grigliate + 45g Pane', calories_text: 'M: 610 kcal (57g P) | F: 390 kcal (36g P)', is_schiscetta: false, notes: 'Scottatura rapida di 60 secondi per lato.' },
      // Venerdì
      { day_name: 'Venerdì', day_index: 4, meal_type: 'colazione', dish_name: 'Yogurt greco con avena, frutti di bosco e miele', ingredients_m: '200g Yogurt + 50g Avena + 80g Frutti + Miele', ingredients_f: '150g Yogurt + 35g Avena + 60g Frutti + Miele', calories_text: 'M: 440 kcal (26g P) | F: 300 kcal (18g P)', is_schiscetta: false, notes: 'Fresco e croccante.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'spuntino', dish_name: 'Melone o anguria fresca a fette', ingredients_m: '250g Melone/Anguria', ingredients_f: '180g Melone/Anguria', calories_text: 'M: 80 kcal (2g P) | F: 60 kcal (1g P)', is_schiscetta: true, notes: 'Dissetante.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'pranzo', dish_name: 'Insalata nizzarda: patate lesse, tonno, uova sode e fagiolini', ingredients_m: '250g Patate + 120g Tonno + 1 Uovo + Fagiolini + EVO', ingredients_f: '160g Patate + 80g Tonno + 1 Uovo + Fagiolini + EVO', calories_text: 'M: 670 kcal (43g P) | F: 430 kcal (29g P)', is_schiscetta: true, notes: 'Classico estivo bilanciato.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'spuntino', dish_name: 'Pesca noce con mandorle sgusciate', ingredients_m: '1 Pesca + 15g Mandorle', ingredients_f: '1 Pesca + 10g Mandorle', calories_text: 'M: 170 kcal (4g P) | F: 120 kcal (3g P)', is_schiscetta: true, notes: 'Comodo da consumare ovunque.' },
      { day_name: 'Venerdì', day_index: 4, meal_type: 'cena', dish_name: 'Prosciutto crudo dolce con melone cantalupo e pane tostato', ingredients_m: '110g Prosciutto crudo + 300g Melone + 70g Pane', ingredients_f: '75g Prosciutto crudo + 200g Melone + 45g Pane', calories_text: 'M: 530 kcal (36g P) | F: 350 kcal (24g P)', is_schiscetta: false, notes: 'Cena regina del venerdì sera estivo in 2 minuti.' },
      // Sabato
      { day_name: 'Sabato', day_index: 5, meal_type: 'colazione', dish_name: 'Frullato freddo di banana, latte scremato, cacao e avena', ingredients_m: '60g Avena + Banana + 250ml Latte + Cacao', ingredients_f: '40g Avena + Banana + 200ml Latte + Cacao', calories_text: 'M: 490 kcal (18g P) | F: 320 kcal (12g P)', is_schiscetta: false, notes: 'Bevanda dissetante pre-mare/montagna.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'spuntino', dish_name: 'Pesca noce fresca a spicchi', ingredients_m: '1 Pesca grande (200g)', ingredients_f: '1 Pesca media (150g)', calories_text: 'M: 80 kcal (2g P) | F: 60 kcal (1g P)', is_schiscetta: false, notes: 'Rinfresco naturale.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'pranzo', dish_name: 'Couscous freddo alle verdure estive e bocconcini di pollo', ingredients_m: '110g Couscous + 200g Pollo + Verdure + EVO', ingredients_f: '70g Couscous + 130g Pollo + Verdure + EVO', calories_text: 'M: 690 kcal (55g P) | F: 440 kcal (36g P)', is_schiscetta: false, notes: 'Il couscous si reidrata in 5 min con acqua fredda.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'spuntino', dish_name: 'Coppa gelato artigianale alla frutta o granita al limone', ingredients_m: '1 Coppa frutta / Granita', ingredients_f: '1 Coppa frutta / Granita', calories_text: 'M: 160 kcal (2g P) | F: 130 kcal (2g P)', is_schiscetta: false, notes: 'Sfizio del fine settimana.' },
      { day_name: 'Sabato', day_index: 5, meal_type: 'cena', dish_name: 'Apericena casalingo: bruschette al pomodoro, fiordilatte e pinzimonio', ingredients_m: '100g Pane tostato + 100g Mozzarella + Pinzimonio', ingredients_f: '60g Pane tostato + 70g Mozzarella + Pinzimonio', calories_text: 'M: 650 kcal (28g P) | F: 430 kcal (19g P)', is_schiscetta: false, notes: 'Serata conviviale.' },
      // Domenica
      { day_name: 'Domenica', day_index: 6, meal_type: 'colazione', dish_name: 'Pancake freddi preparati la sera prima con miele e mirtilli', ingredients_m: '70g Farina + 2 Uova + Mirtilli + Miele', ingredients_f: '45g Farina + 1 Uovo + Mirtilli + Miele', calories_text: 'M: 500 kcal (24g P) | F: 310 kcal (15g P)', is_schiscetta: false, notes: 'Colazione all\'ombra del terrazzo.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'spuntino', dish_name: 'Cubetti di anguria fresca', ingredients_m: '250g Anguria a cubetti', ingredients_f: '180g Anguria a cubetti', calories_text: 'M: 75 kcal (1g P) | F: 55 kcal (1g P)', is_schiscetta: false, notes: 'Idratazione continua.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'pranzo', dish_name: 'Spaghetti integrali ai frutti di mare o vongole con prezzemolo', ingredients_m: '120g Spaghetti + 250g Frutti mare + EVO', ingredients_f: '75g Spaghetti + 180g Frutti mare + EVO', calories_text: 'M: 680 kcal (42g P) | F: 430 kcal (27g P)', is_schiscetta: false, notes: 'Il profumo del mare domenicale.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'spuntino', dish_name: 'Caffè freddo shakerato con cubetto fondente 85%', ingredients_m: 'Caffè freddo + 15g Fondente', ingredients_f: 'Caffè freddo + 10g Fondente', calories_text: 'M: 90 kcal (1g P) | F: 60 kcal (1g P)', is_schiscetta: false, notes: 'Spinta energizzante pomeridiana.' },
      { day_name: 'Domenica', day_index: 6, meal_type: 'cena', dish_name: 'Insalata greca con feta DOP, cetrioli, pomodori e pane pita', ingredients_m: '100g Feta + Cetrioli/Pomodori + 80g Pane + EVO', ingredients_f: '70g Feta + Cetrioli/Pomodori + 50g Pane + EVO', calories_text: 'M: 640 kcal (26g P) | F: 420 kcal (18g P)', is_schiscetta: false, notes: 'Cena rinfrescante pre-cottura cereali del meal prep.' },
    ],
  },
};

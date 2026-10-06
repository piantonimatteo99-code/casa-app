import type { MealPlan, PantryItem, RecipeIngredient } from '@/types';

export interface ShoppingListEntry {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
}

function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim();
}

function canMerge(a: string, b: string): boolean {
  return normalizeUnit(a) === normalizeUnit(b);
}

export function generateShoppingList(
  mealPlans: MealPlan[],
  pantryItems: PantryItem[]
): ShoppingListEntry[] {
  // Aggrega ingredienti da tutti i pasti pianificati
  const needed = new Map<string, ShoppingListEntry>();

  for (const meal of mealPlans) {
    if (!meal.recipe?.ingredients) continue;
    const scaleFactor = meal.servings / (meal.recipe.servings || 2);

    for (const ing of meal.recipe.ingredients as RecipeIngredient[]) {
      const key = `${ing.name.toLowerCase()}_${normalizeUnit(ing.unit)}`;
      const existing = needed.get(key);
      const scaledQty = ing.quantity * scaleFactor;

      if (existing && canMerge(existing.unit, ing.unit)) {
        existing.quantity += scaledQty;
      } else {
        needed.set(key, {
          name: ing.name,
          quantity: scaledQty,
          unit: ing.unit,
        });
      }
    }
  }

  // Sottrai dalla dispensa
  for (const pantryItem of pantryItems) {
    const key = `${pantryItem.name.toLowerCase()}_${normalizeUnit(pantryItem.unit)}`;
    const needed_item = needed.get(key);
    if (needed_item && canMerge(needed_item.unit, pantryItem.unit)) {
      needed_item.quantity = Math.max(0, needed_item.quantity - pantryItem.quantity);
      if (needed_item.quantity === 0) {
        needed.delete(key);
      }
    }
  }

  return Array.from(needed.values()).filter((i) => i.quantity > 0);
}

export type UserRole = 'owner' | 'member';
export type AssetType = 'etf' | 'stock' | 'bond' | 'crypto' | 'cash' | 'other';
export type MealType = 'colazione' | 'pranzo' | 'cena' | 'spuntino';
export type ExpenseSource = 'manual' | 'meal_plan' | 'auto';
export type Frequency = 'monthly' | 'annual';

export interface Couple {
  id: string;
  name: string;
  api_key_webhook: string;
  currency: string;
  income_monthly: number;
  created_at: string;
  updated_at: string;
}

export interface CoupleMember {
  id: string;
  couple_id: string;
  user_id: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  couple_id: string | null;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  couple_id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  description: string | null;
  merchant: string | null;
  date: string;
  is_draft: boolean;
  webhook_payload: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  // joined
  category?: ExpenseCategory;
  author_name?: string;
}

export interface Budget {
  id: string;
  couple_id: string;
  category_id: string;
  month: string; // 'YYYY-MM-DD'
  amount: number;
  created_at: string;
  updated_at: string;
  // joined
  category?: ExpenseCategory;
  spent?: number; // calcolato
}

export interface IncomeSetting {
  id: string;
  couple_id: string;
  user_id: string;
  label: string;
  amount: number;
  frequency: Frequency;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  couple_id: string;
  ticker: string | null;
  isin: string | null;
  name: string;
  asset_type: AssetType;
  quantity: number;
  avg_buy_price: number;
  currency: string;
  is_emergency_fund: boolean;
  target_allocation: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // computed
  current_price?: number;
  current_value?: number;
  pnl_abs?: number;
  pnl_pct?: number;
  price_date?: string;
}

export interface InvestmentPrice {
  id: string;
  investment_id: string;
  date: string;
  price: number;
  currency: string;
  source: string;
  created_at: string;
}

export interface EmergencyFundSettings {
  id: string;
  couple_id: string;
  target_months: number;
  created_at: string;
  updated_at: string;
}

export interface EmergencyFundStatus {
  target_months: number;
  avg_monthly_expenses: number;
  target_amount: number;
  current_amount: number;
  coverage_months: number;
  progress_pct: number;
  assets: Investment[];
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  couple_id: string;
  name: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  tags: string[];
  meal_type: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  couple_id: string;
  date: string;
  meal_type: MealType;
  recipe_id: string | null;
  custom_name: string | null;
  servings: number;
  consumed: boolean;
  consumed_at: string | null;
  from_freezer: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  recipe?: Recipe;
}

export interface FreezerItem {
  id: string;
  couple_id: string;
  name: string;
  quantity: number;
  unit: string;
  frozen_date: string;
  expiry_date: string | null;
  recipe_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  recipe?: Recipe;
  // computed
  days_until_expiry?: number;
  is_expiring_soon?: boolean;
}

export interface PantryItem {
  id: string;
  couple_id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id: string;
  couple_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string | null;
  checked: boolean;
  checked_at: string | null;
  source: ExpenseSource;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  total_value: number;
  total_invested: number;
  pnl_abs: number;
  pnl_pct: number;
  emergency_fund_value: number;
  growth_value: number;
  assets: Investment[];
}

export interface DashboardKPIs {
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  monthly_budget_remaining: number;
  portfolio: PortfolioSummary;
  emergency_fund: EmergencyFundStatus;
  freezer_count: number;
  expiring_soon_count: number;
  pending_transactions: number;
}

export interface WebhookTransactionPayload {
  amount: number;
  merchant?: string;
  description?: string;
  date?: string;
  currency?: string;
  raw?: string;
}

export interface PriceDataPoint {
  date: string;
  value: number;
}

export interface BudgetVsActual {
  category: string;
  budget: number;
  actual: number;
  color: string;
}

-- ============================================================
-- CasaApp - Schema Iniziale Supabase
-- ============================================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELLA: couples
-- ============================================================
CREATE TABLE IF NOT EXISTS couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'La Nostra Famiglia',
  api_key_webhook TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  currency TEXT NOT NULL DEFAULT 'EUR',
  income_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELLA: couple_members (join utente <-> coppia)
-- ============================================================
CREATE TABLE IF NOT EXISTS couple_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (couple_id, user_id)
);

CREATE INDEX idx_couple_members_user_id ON couple_members(user_id);
CREATE INDEX idx_couple_members_couple_id ON couple_members(couple_id);

-- ============================================================
-- TABELLA: expense_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'circle',
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorie default (couple_id NULL = globali, inserite solo se tabella vuota)
INSERT INTO expense_categories (name, icon, color, is_default)
SELECT v.name, v.icon, v.color, v.is_default
FROM (VALUES
  ('Alimentari', 'shopping-cart', '#22c55e', TRUE),
  ('Casa & Utenze', 'home', '#3b82f6', TRUE),
  ('Trasporti', 'car', '#f59e0b', TRUE),
  ('Svago & Ristoranti', 'coffee', '#ec4899', TRUE),
  ('Salute', 'heart-pulse', '#ef4444', TRUE),
  ('Abbigliamento', 'shirt', '#8b5cf6', TRUE),
  ('Educazione', 'book', '#06b6d4', TRUE),
  ('Viaggi', 'plane', '#f97316', TRUE),
  ('Tecnologia', 'smartphone', '#64748b', TRUE),
  ('Altro', 'ellipsis', '#94a3b8', TRUE)
) AS v(name, icon, color, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories WHERE is_default = TRUE AND couple_id IS NULL
);

-- ============================================================
-- TABELLA: expenses (spese)
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category_id UUID REFERENCES expense_categories(id),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  merchant TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_payload JSONB,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_couple_id ON expenses(couple_id);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_is_draft ON expenses(is_draft) WHERE is_draft = TRUE;

-- ============================================================
-- TABELLA: budgets (budget mensili per categoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- primo giorno del mese, es. '2025-01-01'
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (couple_id, category_id, month)
);

CREATE INDEX idx_budgets_couple_month ON budgets(couple_id, month);

-- ============================================================
-- TABELLA: income_settings (entrate mensili)
-- ============================================================
CREATE TABLE IF NOT EXISTS income_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  label TEXT NOT NULL DEFAULT 'Stipendio',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'annual')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELLA: investments (portafoglio investimenti)
-- ============================================================
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  ticker TEXT, -- es. SWDA.MI, VWCE.DE
  isin TEXT, -- es. IE00B4L5Y983
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'etf' CHECK (asset_type IN ('etf', 'stock', 'bond', 'crypto', 'cash', 'other')),
  quantity NUMERIC(18,6) NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_emergency_fund BOOLEAN NOT NULL DEFAULT FALSE,
  target_allocation NUMERIC(5,2), -- percentuale target allocazione
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investments_couple_id ON investments(couple_id);
CREATE INDEX idx_investments_ticker ON investments(ticker);
CREATE INDEX idx_investments_isin ON investments(isin);

-- ============================================================
-- TABELLA: investment_prices (storico prezzi giornalieri)
-- ============================================================
CREATE TABLE IF NOT EXISTS investment_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC(12,4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  source TEXT DEFAULT 'yahoo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (investment_id, date)
);

CREATE INDEX idx_investment_prices_inv_date ON investment_prices(investment_id, date DESC);

-- ============================================================
-- TABELLA: emergency_fund_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_fund_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE UNIQUE,
  target_months INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELLA: recipes (ricette)
-- ============================================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]', -- [{name, quantity, unit}]
  servings INTEGER NOT NULL DEFAULT 2,
  prep_time_min INTEGER,
  cook_time_min INTEGER,
  tags TEXT[] DEFAULT '{}', -- ['freezer-friendly', 'batch-cook', 'schiscetta']
  meal_type TEXT[] DEFAULT '{''pranzo'',''cena''}',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipes_couple_id ON recipes(couple_id);

-- ============================================================
-- TABELLA: meal_plan (piano pasti mensile)
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('colazione', 'pranzo', 'cena', 'spuntino')),
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  custom_name TEXT, -- se non è una ricetta catalogata
  servings INTEGER NOT NULL DEFAULT 2,
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  consumed_at TIMESTAMPTZ,
  from_freezer BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (couple_id, date, meal_type)
);

CREATE INDEX idx_meal_plan_couple_date ON meal_plan(couple_id, date);

-- ============================================================
-- TABELLA: freezer_items (inventario freezer)
-- ============================================================
CREATE TABLE IF NOT EXISTS freezer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'porzioni',
  frozen_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_freezer_items_couple_id ON freezer_items(couple_id);
CREATE INDEX idx_freezer_items_expiry ON freezer_items(expiry_date);

-- ============================================================
-- TABELLA: pantry_items (dispensa)
-- ============================================================
CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pz',
  expiry_date DATE,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pantry_items_couple_id ON pantry_items(couple_id);

-- ============================================================
-- TABELLA: shopping_list_items (lista della spesa)
-- ============================================================
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pz',
  category TEXT,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'meal_plan', 'auto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopping_list_couple_id ON shopping_list_items(couple_id);
CREATE INDEX idx_shopping_list_checked ON shopping_list_items(checked);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_fund_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE freezer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Funzione helper: ottieni couple_id dell'utente corrente (schema public)
CREATE OR REPLACE FUNCTION public.get_couple_id()
RETURNS UUID
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT couple_id FROM couple_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Funzione: utente appartiene alla coppia? (schema public)
CREATE OR REPLACE FUNCTION public.user_in_couple(p_couple_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM couple_members
    WHERE user_id = auth.uid() AND couple_id = p_couple_id
  );
$$;

-- ---- COUPLES ----
DROP POLICY IF EXISTS "couples_select" ON couples;
CREATE POLICY "couples_select" ON couples
  FOR SELECT USING (public.user_in_couple(id));

DROP POLICY IF EXISTS "couples_update" ON couples;
CREATE POLICY "couples_update" ON couples
  FOR UPDATE USING (public.user_in_couple(id));

DROP POLICY IF EXISTS "couples_insert" ON couples;
CREATE POLICY "couples_insert" ON couples
  FOR INSERT WITH CHECK (TRUE);

-- ---- COUPLE_MEMBERS ----
DROP POLICY IF EXISTS "couple_members_select" ON couple_members;
CREATE POLICY "couple_members_select" ON couple_members
  FOR SELECT USING (couple_id = public.get_couple_id() OR user_id = auth.uid());

DROP POLICY IF EXISTS "couple_members_insert" ON couple_members;
CREATE POLICY "couple_members_insert" ON couple_members
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "couple_members_delete" ON couple_members;
CREATE POLICY "couple_members_delete" ON couple_members
  FOR DELETE USING (user_id = auth.uid());

-- ---- EXPENSE_CATEGORIES ----
DROP POLICY IF EXISTS "expense_categories_select" ON expense_categories;
CREATE POLICY "expense_categories_select" ON expense_categories
  FOR SELECT USING (couple_id IS NULL OR couple_id = public.get_couple_id());

DROP POLICY IF EXISTS "expense_categories_insert" ON expense_categories;
CREATE POLICY "expense_categories_insert" ON expense_categories
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id());

DROP POLICY IF EXISTS "expense_categories_update" ON expense_categories;
CREATE POLICY "expense_categories_update" ON expense_categories
  FOR UPDATE USING (couple_id = public.get_couple_id());

DROP POLICY IF EXISTS "expense_categories_delete" ON expense_categories;
CREATE POLICY "expense_categories_delete" ON expense_categories
  FOR DELETE USING (couple_id = public.get_couple_id());

-- Macro policy per tabelle con couple_id
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'expenses', 'budgets', 'income_settings', 'investments',
    'emergency_fund_settings', 'recipes', 'meal_plan',
    'freezer_items', 'pantry_items', 'shopping_list_items'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%1$s_couple_select" ON %1$I;
      CREATE POLICY "%1$s_couple_select" ON %1$I FOR SELECT
        USING (couple_id = public.get_couple_id());

      DROP POLICY IF EXISTS "%1$s_couple_insert" ON %1$I;
      CREATE POLICY "%1$s_couple_insert" ON %1$I FOR INSERT
        WITH CHECK (couple_id = public.get_couple_id());

      DROP POLICY IF EXISTS "%1$s_couple_update" ON %1$I;
      CREATE POLICY "%1$s_couple_update" ON %1$I FOR UPDATE
        USING (couple_id = public.get_couple_id());

      DROP POLICY IF EXISTS "%1$s_couple_delete" ON %1$I;
      CREATE POLICY "%1$s_couple_delete" ON %1$I FOR DELETE
        USING (couple_id = public.get_couple_id());
    ', t);
  END LOOP;
END;
$$;

-- ---- INVESTMENT_PRICES (accesso tramite join) ----
DROP POLICY IF EXISTS "investment_prices_select" ON investment_prices;
CREATE POLICY "investment_prices_select" ON investment_prices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM investments i
      WHERE i.id = investment_prices.investment_id
        AND i.couple_id = public.get_couple_id()
    )
  );

DROP POLICY IF EXISTS "investment_prices_insert" ON investment_prices;
CREATE POLICY "investment_prices_insert" ON investment_prices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM investments i
      WHERE i.id = investment_prices.investment_id
        AND i.couple_id = public.get_couple_id()
    )
  );

-- ============================================================
-- FUNZIONI HELPER
-- ============================================================

-- Calcola media spese mensili (ultimi N mesi) per coppia
CREATE OR REPLACE FUNCTION get_avg_monthly_expenses(
  p_couple_id UUID,
  p_months INTEGER DEFAULT 3
)
RETURNS NUMERIC
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(AVG(monthly_total), 0)
  FROM (
    SELECT
      DATE_TRUNC('month', date) AS month,
      SUM(amount) AS monthly_total
    FROM expenses
    WHERE couple_id = p_couple_id
      AND is_draft = FALSE
      AND date >= CURRENT_DATE - (p_months || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month DESC
    LIMIT p_months
  ) sub;
$$;

-- Calcola valore corrente portafoglio (o solo fondo emergenza)
CREATE OR REPLACE FUNCTION get_portfolio_value(
  p_couple_id UUID,
  p_emergency_only BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE SQL STABLE
AS $$
  SELECT jsonb_build_object(
    'total_value', COALESCE(SUM(latest_price.price * i.quantity), 0),
    'total_invested', COALESCE(SUM(i.avg_buy_price * i.quantity), 0),
    'asset_count', COUNT(i.id)
  )
  FROM investments i
  LEFT JOIN LATERAL (
    SELECT price FROM investment_prices
    WHERE investment_id = i.id
    ORDER BY date DESC
    LIMIT 1
  ) latest_price ON TRUE
  WHERE i.couple_id = p_couple_id
    AND (NOT p_emergency_only OR i.is_emergency_fund = TRUE);
$$;

-- Aggiorna updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Applica trigger updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'couples', 'expenses', 'budgets', 'income_settings', 'investments',
    'emergency_fund_settings', 'recipes', 'meal_plan',
    'freezer_items', 'pantry_items', 'shopping_list_items'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%1$I_updated_at ON %1$I;
      CREATE TRIGGER trigger_update_%1$I_updated_at
        BEFORE UPDATE ON %1$I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t);
  END LOOP;
END;
$$;

-- ============================================================
-- REALTIME
-- ============================================================
-- Abilita realtime su tabelle critiche in modo sicuro
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['expenses', 'shopping_list_items', 'meal_plan', 'investment_prices', 'freezer_items'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I;', tbl);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
      WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END;
$$;

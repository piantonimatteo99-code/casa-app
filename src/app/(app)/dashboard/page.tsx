'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, TrendingUp, PiggyBank, Shield, UtensilsCrossed, Calendar
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { EmergencyFundWidget } from '@/components/dashboard/EmergencyFundWidget';
import { PendingTransactionBanner } from '@/components/dashboard/PendingTransactionBanner';
import { BudgetChart } from '@/components/dashboard/BudgetChart';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';
import { createClient } from '@/lib/supabase/client';
import { calculatePortfolioSummary, calculateEmergencyFundStatus, projectGoalDate } from '@/lib/finance/calculations';
import { formatCurrency, formatPercent, getCurrentMonth, getMonthRange } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Expense, Investment, Budget, EmergencyFundSettings, BudgetVsActual, PriceDataPoint } from '@/types';

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [pendingTxs, setPendingTxs] = useState<Expense[]>([]);
  const [portfolio, setPortfolio] = useState<ReturnType<typeof calculatePortfolioSummary> | null>(null);
  const [efStatus, setEfStatus] = useState<ReturnType<typeof calculateEmergencyFundStatus> | null>(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [budgetData, setBudgetData] = useState<BudgetVsActual[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<PriceDataPoint[]>([]);
  const [freezerCount, setFreezerCount] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);

  const loadDashboard = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: member } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .single();

    if (!member) return;
    const cid = member.couple_id;
    setCoupleId(cid);

    const currentMonth = getCurrentMonth();
    const { start, end } = getMonthRange(currentMonth);

    // Load in parallel
    // Load in parallel with simplified queries
    const [draftRes, expRes, invRes, efRes, budgRes, incRes, freezRes] = await Promise.all([
      supabase.from('expenses').select('*').eq('couple_id', cid).eq('is_draft', true).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').eq('couple_id', cid).eq('is_draft', false).gte('date', start).lte('date', end),
      supabase.from('investments').select('*').eq('couple_id', cid),
      supabase.from('emergency_fund_settings').select('*').eq('couple_id', cid).maybeSingle(),
      supabase.from('budgets').select('*, category:expense_categories(*)').eq('couple_id', cid).eq('month', currentMonth),
      supabase.from('income_settings').select('*').eq('couple_id', cid).eq('active', true),
      supabase.from('freezer_items').select('*').eq('couple_id', cid),
    ]);

    const draftTxs = draftRes.data;
    const expenses = expRes.data;
    const investments = invRes.data;
    const efSettings = efRes.data;
    const budgets = budgRes.data;
    const incomes = incRes.data;
    const freezerItems = freezRes.data;

    // Pending transactions
    setPendingTxs((draftTxs ?? []) as unknown as Expense[]);

    // Monthly expenses
    const totalExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
    setMonthlyExpenses(totalExpenses);

    // Monthly income
    const totalIncome = (incomes ?? []).reduce((s, i) => {
      const m = i.frequency === 'annual' ? Number(i.amount) / 12 : Number(i.amount);
      return s + m;
    }, 0);
    setMonthlyIncome(totalIncome);

    // Portfolio
    const invList = (investments ?? []) as Investment[];

    // Enrich with latest prices
    const priceMap: Record<string, number> = {};
    const priceHistoryMap: Record<string, { date: string; price: number }[]> = {};

    // Load individual prices
    for (const inv of invList) {
      const { data: prices } = await supabase
        .from('investment_prices')
        .select('date, price')
        .eq('investment_id', inv.id)
        .order('date', { ascending: false })
        .limit(1);
      if (prices?.[0]) {
        priceMap[inv.id] = Number(prices[0].price);
      } else {
        priceMap[inv.id] = inv.avg_buy_price;
      }
    }

    const enrichedInvs: Investment[] = invList.map((inv) => ({
      ...inv,
      current_price: priceMap[inv.id] ?? inv.avg_buy_price,
    }));

    const portfolioSummary = calculatePortfolioSummary(enrichedInvs);
    setPortfolio(portfolioSummary);

    // Emergency fund
    const efSettings_ = efSettings as EmergencyFundSettings | null;
    const targetMonths = efSettings_?.target_months ?? 6;
    // Use 3-month avg expenses (fallback to current month)
    const avgExpenses = totalExpenses > 0 ? totalExpenses : 1500;
    const efStatusCalc = calculateEmergencyFundStatus(enrichedInvs, avgExpenses, targetMonths);
    setEfStatus(efStatusCalc);

    // Budget vs actual
    const budgetItems = (budgets ?? []) as Budget[];
    const expensesByCategory: Record<string, number> = {};
    (expenses ?? []).forEach((e) => {
      if (e.category_id) {
        expensesByCategory[e.category_id] = (expensesByCategory[e.category_id] ?? 0) + Number(e.amount);
      }
    });

    const bvA: BudgetVsActual[] = budgetItems.slice(0, 6).map((b) => ({
      category: (b.category as any)?.name ?? 'Cat.',
      budget: Number(b.amount),
      actual: expensesByCategory[b.category_id] ?? 0,
      color: (b.category as any)?.color ?? '#6366f1',
    }));
    setBudgetData(bvA);

    // Portfolio history: aggregate by date
    const dateValueMap: Record<string, number> = {};
    if (investments && investments.length > 0) {
      for (const inv of invList) {
        const { data: allPrices } = await supabase
          .from('investment_prices')
          .select('date, price')
          .eq('investment_id', inv.id)
          .order('date', { ascending: true })
          .limit(90);
        (allPrices ?? []).forEach((p) => {
          dateValueMap[p.date] = (dateValueMap[p.date] ?? 0) + Number(p.price) * inv.quantity;
        });
      }
    }
    const historyPoints: PriceDataPoint[] = Object.entries(dateValueMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
    setPortfolioHistory(historyPoints);

    // Freezer
    const today = new Date();
    const freezerList = freezerItems ?? [];
    setFreezerCount(freezerList.length);
    setExpiringSoon(freezerList.filter((f) => {
      if (!f.expiry_date) return false;
      const exp = new Date(f.expiry_date);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 7 && diff >= 0;
    }).length);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadDashboard();

    // Realtime subscription per transazioni bozza
    const channel = supabase
      .channel('dashboard_drafts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: 'is_draft=eq.true',
      }, () => loadDashboard())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadDashboard, supabase]);

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: it });
  const goalDate = portfolio && monthlySavings > 0
    ? projectGoalDate(portfolio.growth_value, portfolio.total_invested * 2, monthlySavings * 0.5)
    : null;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Benvenuto */}
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{today}</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Buongiorno! 👋</h2>
      </div>

      {/* Banner transazioni pendenti */}
      <PendingTransactionBanner
        transactions={pendingTxs}
        onConfirm={(id) => setPendingTxs((prev) => prev.filter((t) => t.id !== id))}
        onDismiss={(id) => setPendingTxs((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Risparmio Mensile"
          value={formatCurrency(monthlySavings)}
          subtitle={`Entrate: ${formatCurrency(monthlyIncome)}`}
          icon={Wallet}
          trend={monthlySavings > 0 ? (monthlySavings / monthlyIncome) * 100 : undefined}
          trendLabel="del reddito"
          accentColor={monthlySavings >= 0
            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
          }
        />
        <KPICard
          title="Spese Mensili"
          value={formatCurrency(monthlyExpenses)}
          subtitle={`Mese corrente`}
          icon={PiggyBank}
          accentColor="bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
        />
        <KPICard
          title="Portafoglio"
          value={formatCurrency(portfolio?.total_value ?? 0)}
          subtitle={portfolio ? `P&L: ${formatPercent(portfolio.pnl_pct)}` : ''}
          icon={TrendingUp}
          trend={portfolio?.pnl_pct}
          trendLabel="rendimento"
          accentColor="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
        />
        <KPICard
          title="Freezer"
          value={`${freezerCount} piatti`}
          subtitle={expiringSoon > 0 ? `⚠️ ${expiringSoon} in scadenza` : 'Nessuna scadenza imminente'}
          icon={UtensilsCrossed}
          accentColor="bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400"
        />
      </div>

      {/* Row 2: Emergency Fund + Portfolio Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {efStatus && <EmergencyFundWidget status={efStatus} />}
        <PortfolioChart data={portfolioHistory} />
      </div>

      {/* Row 3: Budget Chart + Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BudgetChart data={budgetData} />

        {/* Goal Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Proiezione Obiettivi</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data stimata raddoppio portafoglio</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {goalDate
                  ? format(goalDate, 'MMM yyyy', { locale: it })
                  : 'N/D (aggiungi entrate e investimenti)'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Fondo Emergenza</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {efStatus ? `${efStatus.coverage_months.toFixed(1)} mesi su ${efStatus.target_months}` : 'N/D'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Capacità di risparmio mensile</p>
              <p className={`text-xl font-bold ${monthlySavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {formatCurrency(monthlySavings)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

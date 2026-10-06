import type { Investment, EmergencyFundStatus, PortfolioSummary } from '@/types';

export function calculatePnL(investment: Investment): {
  pnl_abs: number;
  pnl_pct: number;
  current_value: number;
} {
  const current_price = investment.current_price ?? investment.avg_buy_price;
  const current_value = current_price * investment.quantity;
  const invested = investment.avg_buy_price * investment.quantity;
  const pnl_abs = current_value - invested;
  const pnl_pct = invested > 0 ? (pnl_abs / invested) * 100 : 0;
  return { pnl_abs, pnl_pct, current_value };
}

export function calculatePortfolioSummary(investments: Investment[]): PortfolioSummary {
  let total_value = 0;
  let total_invested = 0;
  let emergency_fund_value = 0;
  let growth_value = 0;

  const enriched = investments.map((inv) => {
    const { pnl_abs, pnl_pct, current_value } = calculatePnL(inv);
    const invested = inv.avg_buy_price * inv.quantity;
    total_value += current_value;
    total_invested += invested;
    if (inv.is_emergency_fund) {
      emergency_fund_value += current_value;
    } else {
      growth_value += current_value;
    }
    return { ...inv, pnl_abs, pnl_pct, current_value };
  });

  const pnl_abs = total_value - total_invested;
  const pnl_pct = total_invested > 0 ? (pnl_abs / total_invested) * 100 : 0;

  return {
    total_value,
    total_invested,
    pnl_abs,
    pnl_pct,
    emergency_fund_value,
    growth_value,
    assets: enriched,
  };
}

export function calculateEmergencyFundStatus(
  investments: Investment[],
  avgMonthlyExpenses: number,
  targetMonths: number
): EmergencyFundStatus {
  const efAssets = investments.filter((i) => i.is_emergency_fund);
  const current_amount = efAssets.reduce((sum, inv) => {
    const price = inv.current_price ?? inv.avg_buy_price;
    return sum + price * inv.quantity;
  }, 0);

  const target_amount = avgMonthlyExpenses * targetMonths;
  const coverage_months = avgMonthlyExpenses > 0 ? current_amount / avgMonthlyExpenses : 0;
  const progress_pct = target_amount > 0 ? Math.min(100, (current_amount / target_amount) * 100) : 0;

  return {
    target_months: targetMonths,
    avg_monthly_expenses: avgMonthlyExpenses,
    target_amount,
    current_amount,
    coverage_months,
    progress_pct,
    assets: efAssets,
  };
}

export function projectGoalDate(
  currentValue: number,
  targetValue: number,
  monthlySavings: number,
  annualReturnRate = 0.07
): Date | null {
  if (monthlySavings <= 0 || targetValue <= currentValue) {
    return currentValue >= targetValue ? new Date() : null;
  }

  const monthlyRate = annualReturnRate / 12;
  let value = currentValue;
  let months = 0;
  const maxMonths = 600; // 50 anni

  while (value < targetValue && months < maxMonths) {
    value = value * (1 + monthlyRate) + monthlySavings;
    months++;
  }

  if (months >= maxMonths) return null;

  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

export function calculateMonthlySavings(
  monthlyIncome: number,
  monthlyExpenses: number
): number {
  return Math.max(0, monthlyIncome - monthlyExpenses);
}

export function calculateAllocation(investments: Investment[]): Array<{
  name: string;
  value: number;
  percentage: number;
  color: string;
}> {
  const total = investments.reduce((sum, inv) => {
    const price = inv.current_price ?? inv.avg_buy_price;
    return sum + price * inv.quantity;
  }, 0);

  const ASSET_COLORS: Record<string, string> = {
    etf: '#6366f1',
    stock: '#22c55e',
    bond: '#3b82f6',
    crypto: '#f59e0b',
    cash: '#94a3b8',
    other: '#ec4899',
  };

  const grouped = investments.reduce((acc, inv) => {
    const price = inv.current_price ?? inv.avg_buy_price;
    const value = price * inv.quantity;
    if (!acc[inv.asset_type]) acc[inv.asset_type] = 0;
    acc[inv.asset_type] += value;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped).map(([type, value]) => ({
    name: type.toUpperCase(),
    value,
    percentage: total > 0 ? (value / total) * 100 : 0,
    color: ASSET_COLORS[type] ?? '#94a3b8',
  }));
}

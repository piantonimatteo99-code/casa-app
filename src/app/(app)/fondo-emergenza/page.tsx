'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Settings2, CheckCircle2, AlertCircle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { calculateEmergencyFundStatus } from '@/lib/finance/calculations';
import type { Investment, EmergencyFundSettings } from '@/types';
import Link from 'next/link';

export default function FondoEmergenzaPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [targetMonths, setTargetMonths] = useState(6);
  const [avgMonthlyExpenses, setAvgMonthlyExpenses] = useState(0);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from('couple_members').select('couple_id').eq('user_id', user.id).single();
    if (!member) return;
    const cid = member.couple_id;
    setCoupleId(cid);

    // Recupera spese degli ultimi 90 giorni per media mensile
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateStr = ninetyDaysAgo.toISOString().split('T')[0];

    const [
      { data: efSettings },
      { data: expenses },
      { data: invs },
    ] = await Promise.all([
      supabase.from('emergency_fund_settings').select('*').eq('couple_id', cid).single(),
      supabase.from('expenses').select('amount').eq('couple_id', cid).eq('is_draft', false).gte('date', dateStr),
      supabase.from('investments').select('*').eq('couple_id', cid).eq('is_emergency_fund', true),
    ]);

    if (efSettings) {
      setTargetMonths(efSettings.target_months);
    }

    // Calcolo media mensile su 3 mesi (spese totali / 3)
    const total3Months = (expenses ?? []).reduce((acc, curr) => acc + Number(curr.amount), 0);
    const calculatedMonthly = total3Months > 0 ? total3Months / 3 : 1800; // default prudenziale
    setAvgMonthlyExpenses(calculatedMonthly);

    // Arricchisci con prezzi attuali
    const invList = (invs ?? []) as Investment[];
    const enriched: Investment[] = await Promise.all(
      invList.map(async (inv) => {
        const { data: prices } = await supabase
          .from('investment_prices')
          .select('price')
          .eq('investment_id', inv.id)
          .order('date', { ascending: false })
          .limit(1);

        const currentPrice = prices?.[0]?.price ? Number(prices[0].price) : inv.avg_buy_price;
        return {
          ...inv,
          current_price: currentPrice,
          current_value: currentPrice * inv.quantity,
          pnl_abs: (currentPrice - inv.avg_buy_price) * inv.quantity,
          pnl_pct: inv.avg_buy_price > 0 ? ((currentPrice - inv.avg_buy_price) / inv.avg_buy_price) * 100 : 0,
        };
      })
    );

    setInvestments(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId) return;
    setSavingSettings(true);
    setSavedSuccess(false);

    await supabase.from('emergency_fund_settings').upsert({
      couple_id: coupleId,
      target_months: targetMonths,
    }, { onConflict: 'couple_id' });

    setSavingSettings(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  const status = calculateEmergencyFundStatus(investments, avgMonthlyExpenses, targetMonths);
  const isTargetAchieved = status.coverage_months >= targetMonths;
  const missingAmount = Math.max(0, status.target_amount - status.current_amount);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-6 lg:p-8 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" /> Fondo di Emergenza Dinamico
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              {status.coverage_months.toFixed(1)} Mesi di Autonomia
            </h2>
            <p className="text-blue-100 text-sm">
              Calcolato automaticamente sulle uscite medie storiche ({formatCurrency(avgMonthlyExpenses)}/mese).
              Il tuo obiettivo impostato è di <strong>{targetMonths} mesi</strong> di serenità.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center min-w-[200px]">
            <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold mb-1">Stato Copertura</p>
            <p className="text-3xl font-bold">{status.progress_pct.toFixed(0)}%</p>
            <div className="w-full bg-white/20 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, status.progress_pct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Fabbisogno Totale Target</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(status.target_amount)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {targetMonths} mesi &times; {formatCurrency(avgMonthlyExpenses)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Capitale Attualmente Assegnato</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(status.current_amount)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {investments.length} strumenti a basso rischio vincolati
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Differenza per Raggiungimento</p>
          <p className={`text-2xl font-bold ${isTargetAchieved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
            {isTargetAchieved ? 'Completato 🎉' : formatCurrency(missingAmount)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isTargetAchieved ? 'Traguardo superato con successo!' : 'Da accantonare/allocare'}
          </p>
        </div>
      </div>

      {/* Sezione Configurazione Parametri */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Parametri Fondo di Emergenza</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Personalizza il periodo di sicurezza della coppia</p>
          </div>
        </div>

        <form onSubmit={handleUpdateSettings} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mesi di Copertura Desiderati: <span className="font-bold text-indigo-600 dark:text-indigo-400">{targetMonths} mesi</span>
              </label>
              <div className="flex gap-2">
                {[3, 6, 9, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTargetMonths(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      targetMonths === m
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              value={targetMonths}
              onChange={(e) => setTargetMonths(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>1 mese (Minimo)</span>
              <span>6 mesi (Consigliato)</span>
              <span>12 mesi (Alta sicurezza)</span>
              <span>24 mesi</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-60 shadow-sm"
            >
              {savingSettings ? 'Salvataggio...' : 'Salva Impostazioni'}
            </button>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Salvato con successo!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Strumenti Assegnati al Fondo di Emergenza */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Strumenti Assegnati al Fondo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ETF monetari (es. XEON.DE), Titoli di Stato a breve termine, Conti Deposito o Liquidità
            </p>
          </div>
          <Link
            href="/investimenti"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Gestisci in Investimenti <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {investments.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Nessun asset contrassegnato per il Fondo di Emergenza
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Vai nella pagina Investimenti e spunta l&apos;opzione &quot;Parte del Fondo di Emergenza&quot; per gli strumenti monetari e sicuri.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {investments.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{inv.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {inv.ticker || inv.isin || 'Asset'} &bull; {Number(inv.quantity).toFixed(2)} quote
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {formatCurrency(inv.current_value ?? 0)}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatPercent(inv.pnl_pct ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

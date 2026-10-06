'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, RefreshCw, Shield, Trash2, PieChart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { calculatePortfolioSummary, calculateAllocation } from '@/lib/finance/calculations';
import type { Investment, AssetType } from '@/types';

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  etf: 'ETF',
  stock: 'Azione',
  bond: 'Obbligazione/BOT',
  crypto: 'Crypto',
  cash: 'Liquidità/Conto Deposito',
  other: 'Altro',
};

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  etf: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
  stock: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  bond: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  crypto: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  cash: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  other: 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400',
};

export default function InvestimentiPage() {
  const supabase = createClient();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form
  const [ticker, setTicker] = useState('');
  const [isin, setIsin] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('etf');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [isEmergencyFund, setIsEmergencyFund] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from('couple_members').select('couple_id').eq('user_id', user.id).single();
    if (!member) return;
    const cid = member.couple_id;
    setCoupleId(cid);

    const { data: invs } = await supabase.from('investments').select('*').eq('couple_id', cid).order('name');
    const invList = (invs ?? []) as Investment[];

    const enriched: Investment[] = await Promise.all(
      invList.map(async (inv) => {
        const { data: prices } = await supabase
          .from('investment_prices')
          .select('date, price')
          .eq('investment_id', inv.id)
          .order('date', { ascending: false })
          .limit(1);

        const currentPrice = prices?.[0]?.price ? Number(prices[0].price) : inv.avg_buy_price;
        const pnlAbs = (currentPrice - inv.avg_buy_price) * inv.quantity;
        const pnlPct = inv.avg_buy_price > 0 ? ((currentPrice - inv.avg_buy_price) / inv.avg_buy_price) * 100 : 0;

        return {
          ...inv,
          current_price: currentPrice,
          current_value: currentPrice * inv.quantity,
          pnl_abs: pnlAbs,
          pnl_pct: pnlPct,
          price_date: prices?.[0]?.date,
        };
      })
    );

    setInvestments(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId) return;
    setSaving(true);

    const { error } = await supabase.from('investments').insert({
      couple_id: coupleId,
      ticker: ticker.trim().toUpperCase() || null,
      isin: isin.trim().toUpperCase() || null,
      name: name.trim(),
      asset_type: assetType,
      quantity: parseFloat(quantity),
      avg_buy_price: parseFloat(avgPrice),
      currency,
      is_emergency_fund: isEmergencyFund,
    });

    if (!error) {
      setTicker('');
      setIsin('');
      setName('');
      setQuantity('');
      setAvgPrice('');
      setIsEmergencyFund(false);
      setShowForm(false);
      loadData();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo asset dal portafoglio?')) return;
    await supabase.from('investments').delete().eq('id', id);
    setInvestments((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleToggleEF(inv: Investment) {
    await supabase.from('investments').update({ is_emergency_fund: !inv.is_emergency_fund }).eq('id', inv.id);
    setInvestments((prev) =>
      prev.map((i) => (i.id === inv.id ? { ...i, is_emergency_fund: !i.is_emergency_fund } : i))
    );
  }

  async function handleRefreshPrices() {
    setRefreshing(true);
    try {
      await fetch('/api/cron/daily?token=' + (process.env.NEXT_PUBLIC_CRON_SECRET || ''));
      await loadData();
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  }

  const portfolio = calculatePortfolioSummary(investments);
  const allocation = calculateAllocation(investments);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Valore Totale Portafoglio</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(portfolio.total_value)}</p>
          <p className="text-xs text-slate-400 mt-1">Investito: {formatCurrency(portfolio.total_invested)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Profitto / Perdita (P&amp;L)</p>
          <p
            className={`text-2xl font-bold ${
              portfolio.pnl_abs >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}
          >
            {formatCurrency(portfolio.pnl_abs)}
          </p>
          <p
            className={`text-xs font-medium mt-1 ${
              portfolio.pnl_abs >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}
          >
            {formatPercent(portfolio.pnl_pct)} complessivo
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Capitale Crescita</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(portfolio.growth_value)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Non vincolato ad emergenze</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Fondo Emergenza Investito</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(portfolio.emergency_fund_value)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Contrassegnato a basso rischio</p>
        </div>
      </div>

      {/* Barra Azioni */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuovo Strumento (ISIN/Ticker)
          </button>
          <button
            onClick={handleRefreshPrices}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Aggiornamento...' : 'Aggiorna Prezzi'}
          </button>
        </div>
        <div className="text-xs text-slate-400">
          Monitoraggio automatico giornaliero Yahoo Finance &amp; OpenFIGI
        </div>
      </div>

      {/* Form di aggiunta */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 animate-fade-in"
        >
          <h3 className="font-semibold text-slate-900 dark:text-white">Aggiungi Strumento Finanziario</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Nome Strumento *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. iShares Core MSCI World"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Codice ISIN
              </label>
              <input
                value={isin}
                onChange={(e) => setIsin(e.target.value)}
                placeholder="es. IE00B4L5Y983"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Ticker di Mercato
              </label>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="es. SWDA.MI o XEON.DE"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Tipologia Asset
              </label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Quantità / Quote *
              </label>
              <input
                required
                type="number"
                step="0.000001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="es. 25.5"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Prezzo Medio Carico (€) *
              </label>
              <input
                required
                type="number"
                step="0.0001"
                min="0"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                placeholder="es. 85.20"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="ef"
              checked={isEmergencyFund}
              onChange={(e) => setIsEmergencyFund(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="ef" className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <Shield className="w-4 h-4 text-blue-500" />
              Assegna questo asset al <strong>Fondo di Emergenza</strong> (es. ETF Monetario XEON, BOT, Deposito)
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-60"
            >
              {saving ? 'Salvataggio...' : 'Salva nel Portafoglio'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {/* Asset Allocation Pills */}
      {allocation.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">
            <PieChart className="w-4 h-4 text-indigo-500" /> Allocazione:
          </div>
          {allocation.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-xs"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
              <span className="font-bold text-slate-600 dark:text-slate-400">{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabella Portafoglio */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Strumento</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Quote</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Prezzo Attuale</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">PMC</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Valore</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">P&amp;L</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500 dark:text-slate-400">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {investments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Nessun investimento inserito. Clicca su &quot;Nuovo Strumento&quot; per iniziare.
                  </td>
                </tr>
              ) : (
                investments.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {inv.is_emergency_fund ? (
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0" title="Parte del Fondo Emergenza">
                            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{inv.name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ASSET_TYPE_COLORS[inv.asset_type]}`}>
                              {ASSET_TYPE_LABELS[inv.asset_type]}
                            </span>
                            {inv.ticker && <span className="text-xs font-mono text-slate-400">{inv.ticker}</span>}
                            {inv.isin && <span className="text-xs font-mono text-slate-400">{inv.isin}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 font-mono">
                      {Number(inv.quantity).toLocaleString('it-IT', { maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white font-mono">
                      {formatCurrency(inv.current_price ?? inv.avg_buy_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                      {formatCurrency(inv.avg_buy_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                      {formatCurrency(inv.current_value ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`flex items-center justify-end gap-1 font-semibold ${(inv.pnl_abs ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {(inv.pnl_abs ?? 0) >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{formatPercent(inv.pnl_pct ?? 0)}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">{formatCurrency(inv.pnl_abs ?? 0)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleEF(inv)}
                          className={`p-1.5 rounded-lg transition ${
                            inv.is_emergency_fund
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={inv.is_emergency_fund ? 'Rimuovi dal Fondo Emergenza' : 'Assegna al Fondo Emergenza'}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

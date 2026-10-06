'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Key, Copy, Check, Smartphone, Users, Plus, Trash2, Wallet, RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, generateApiKey } from '@/lib/utils';
import type { Couple, CoupleMember, IncomeSetting } from '@/types';

export default function ImpostazioniPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [members, setMembers] = useState<CoupleMember[]>([]);
  const [incomes, setIncomes] = useState<IncomeSetting[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Form Nuovo Reddito
  const [incomeLabel, setIncomeLabel] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeFrequency, setIncomeFrequency] = useState<'monthly' | 'annual'>('monthly');

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from('couple_members').select('couple_id').eq('user_id', user.id).single();
    if (!member) return;
    const cid = member.couple_id;

    const [
      { data: coupleData },
      { data: membersData },
      { data: incomesData },
    ] = await Promise.all([
      supabase.from('couples').select('*').eq('id', cid).single(),
      supabase.from('couple_members').select('*').eq('couple_id', cid),
      supabase.from('income_settings').select('*').eq('couple_id', cid),
    ]);

    setCouple(coupleData as Couple);
    setMembers((membersData ?? []) as CoupleMember[]);
    setIncomes((incomesData ?? []) as IncomeSetting[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copia API Key Webhook
  function handleCopyApiKey() {
    if (!couple?.api_key_webhook) return;
    navigator.clipboard.writeText(couple.api_key_webhook);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  // Rigenera API Key
  async function handleRegenerateKey() {
    if (!couple || !confirm('Sei sicuro di voler rigenerare la chiave API del Webhook? Le vecchie automazioni smetteranno di funzionare finché non aggiorni il codice.')) return;
    const newKey = generateApiKey();
    await supabase.from('couples').update({ api_key_webhook: newKey }).eq('id', couple.id);
    setCouple({ ...couple, api_key_webhook: newKey });
  }

  // Aggiungi Entrata
  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!couple) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('income_settings').insert({
      couple_id: couple.id,
      user_id: user.id,
      label: incomeLabel.trim(),
      amount: parseFloat(incomeAmount),
      frequency: incomeFrequency,
      active: true,
    });

    setIncomeLabel('');
    setIncomeAmount('');
    loadData();
  }

  async function handleDeleteIncome(id: string) {
    await supabase.from('income_settings').delete().eq('id', id);
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  }

  const webhookCurlExample = couple
    ? `curl -X POST "https://il-tuo-dominio.vercel.app/api/webhooks/transaction" \\
  -H "Authorization: Bearer ${couple.api_key_webhook}" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 18.50, "merchant": "Esselunga", "description": "Spesa settimanale"}'`
    : '';

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Impostazioni e Automazioni</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configurazione coppia, token webhook e gestione entrate
        </p>
      </div>

      {/* WEBHOOK AUTOMAZIONE MOBILE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Webhook Notifiche Bancarie (iOS / Tasker)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Invia automaticamente le spese rilevate dalle notifiche push della carta di credito
            </p>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-500" /> API Key Webhook Personale
            </span>
            <button
              onClick={handleRegenerateKey}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 text-[11px]"
            >
              <RefreshCw className="w-3 h-3" /> Rigenera
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={couple?.api_key_webhook ?? ''}
              className="flex-1 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 select-all"
            />
            <button
              onClick={handleCopyApiKey}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
            >
              {copiedKey ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copiedKey ? 'Copiata!' : 'Copia'}
            </button>
          </div>
        </div>

        {/* Istruzioni Rapide */}
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Come configurare Comandi Rapidi (iOS Shortcuts):</p>
          <ol className="list-decimal pl-5 space-y-1 text-slate-500 dark:text-slate-400">
            <li>Crea un&apos;automazione con trigger: <em>&quot;Quando ricevo una notifica dall&apos;app della banca (es. Intesa, Revolut, BBVA)&quot;</em></li>
            <li>Estrai l&apos;importo (€) e l&apos;esercente dal testo della notifica</li>
            <li>Aggiungi l&apos;azione <strong>&quot;Ottieni contenuti dall&apos;URL&quot;</strong> in POST verso <code>/api/webhooks/transaction</code></li>
            <li>Includi l&apos;header <code>Authorization: Bearer [LA_TUA_API_KEY]</code> e payload JSON con <code>amount</code> e <code>merchant</code></li>
          </ol>
        </div>

        {/* Codice Curl per Test Rapido */}
        <div className="relative bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto">
          <button
            onClick={() => {
              navigator.clipboard.writeText(webhookCurlExample);
              setCopiedCurl(true);
              setTimeout(() => setCopiedCurl(false), 2000);
            }}
            className="absolute top-2.5 right-2.5 bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded text-[10px] flex items-center gap-1"
          >
            {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedCurl ? 'Copiato' : 'Copia Curl'}
          </button>
          <pre>{webhookCurlExample}</pre>
        </div>
      </div>

      {/* ENTRATE MENSILI (STIPENDI) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Entrate della Coppia (Stipendi)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Necessarie per calcolare automaticamente il tasso di risparmio mensile
            </p>
          </div>
        </div>

        {/* Form Aggiunta Stipendio */}
        <form onSubmit={handleAddIncome} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            required
            placeholder="Descrizione (es. Stipendio Mario)"
            value={incomeLabel}
            onChange={(e) => setIncomeLabel(e.target.value)}
            className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
          />
          <input
            required
            type="number"
            step="10"
            min="0"
            placeholder="Importo netto (€)"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Aggiungi Entrata
          </button>
        </form>

        {/* Lista Entrate */}
        <div className="space-y-2">
          {incomes.map((inc) => (
            <div
              key={inc.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-sm"
            >
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">{inc.label}</span>
                <span className="text-xs text-slate-400 ml-2">({inc.frequency === 'annual' ? 'Annuale' : 'Mensile'})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(inc.amount)}
                </span>
                <button
                  onClick={() => handleDeleteIncome(inc.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MEMBRI DELLA COPPIA */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Membri della Coppia</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Partner registrati con accesso condiviso
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {m.display_name?.[0] || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-xs">{m.display_name || 'Partner'}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">{m.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

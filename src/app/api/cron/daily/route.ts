import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchTickerPrices, resolveISINtoTicker } from '@/lib/finance/yahoo-finance';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const supabase = getAdminClient();
  const token =
    request.nextUrl.searchParams.get('token') ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const results: { ticker: string; status: string; price?: number }[] = [];

  try {
    const { data: investments, error } = await supabase
      .from('investments')
      .select('id, ticker, isin, name, currency');

    if (error) throw error;
    if (!investments || investments.length === 0) {
      return NextResponse.json({ message: 'No investments to update', date: today });
    }

    const tickerMap: Record<string, string> = {};
    for (const inv of investments) {
      if (inv.ticker) {
        tickerMap[inv.id] = inv.ticker;
      } else if (inv.isin) {
        const resolved = await resolveISINtoTicker(inv.isin);
        if (resolved) {
          tickerMap[inv.id] = resolved;
          await supabase.from('investments').update({ ticker: resolved }).eq('id', inv.id);
        }
      }
    }

    const uniqueTickers = [...new Set(Object.values(tickerMap))];
    const quotes = await fetchTickerPrices(uniqueTickers);
    const priceByTicker: Record<string, number> = {};
    quotes.forEach((q) => { priceByTicker[q.ticker] = q.price; });

    for (const inv of investments) {
      const ticker = tickerMap[inv.id];
      if (!ticker) {
        results.push({ ticker: inv.isin ?? inv.name, status: 'no_ticker' });
        continue;
      }

      const price = priceByTicker[ticker];
      if (!price || price <= 0) {
        results.push({ ticker, status: 'no_price' });
        continue;
      }

      const { error: insertError } = await supabase
        .from('investment_prices')
        .upsert(
          { investment_id: inv.id, date: today, price, currency: inv.currency, source: 'yahoo' },
          { onConflict: 'investment_id,date' }
        );

      results.push({ ticker, status: insertError ? 'error' : 'updated', price });
    }

    return NextResponse.json({
      success: true,
      date: today,
      updated: results.filter((r) => r.status === 'updated').length,
      failed: results.filter((r) => r.status !== 'updated').length,
      results,
    });
  } catch (err) {
    console.error('Cron job error:', err);
    return NextResponse.json({ error: 'Cron job failed', details: String(err) }, { status: 500 });
  }
}

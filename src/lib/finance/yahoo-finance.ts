'use server';

export interface TickerQuote {
  ticker: string;
  price: number;
  currency: string;
  shortName: string;
  change: number;
  changePercent: number;
  marketTime: number;
}

export async function fetchTickerPrices(tickers: string[]): Promise<TickerQuote[]> {
  if (tickers.length === 0) return [];

  const results: TickerQuote[] = [];

  for (const ticker of tickers) {
    try {
      // Use Yahoo Finance v8 API (unofficial, no key required)
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;

      const meta = result.meta;
      const price = meta?.regularMarketPrice ?? meta?.chartPreviousClose ?? 0;
      const prevClose = meta?.chartPreviousClose ?? price;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      results.push({
        ticker,
        price,
        currency: meta?.currency ?? 'EUR',
        shortName: meta?.shortName ?? ticker,
        change,
        changePercent,
        marketTime: meta?.regularMarketTime ?? Date.now() / 1000,
      });

      // Rate limiting: attendi 200ms tra le chiamate
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`Error fetching price for ${ticker}:`, err);
    }
  }

  return results;
}

export async function resolveISINtoTicker(isin: string): Promise<string | null> {
  try {
    // OpenFIGI API: gratuita, no key richiesta per uso base
    const res = await fetch('https://api.openfigi.com/v3/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ idType: 'ID_ISIN', idValue: isin }]),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const figi = data?.[0]?.data?.[0];
    if (!figi) return null;

    // Prova a costruire il ticker Yahoo da exchCode + ticker
    const ticker = figi.ticker;
    const exchCode = figi.exchCode;

    // Mappa exchange code -> Yahoo suffix
    const EXCHANGE_MAP: Record<string, string> = {
      'MI': '.MI',   // Milano Borsa Italiana
      'ETR': '.DE',  // XETRA Francoforte
      'EPA': '.PA',  // Euronext Parigi
      'AMS': '.AS',  // Euronext Amsterdam
      'LSE': '.L',   // London Stock Exchange
      'NYQ': '',     // NYSE
      'NAS': '',     // NASDAQ
    };

    const suffix = EXCHANGE_MAP[exchCode] ?? '';
    return ticker ? `${ticker}${suffix}` : null;
  } catch (err) {
    console.error(`Error resolving ISIN ${isin}:`, err);
    return null;
  }
}

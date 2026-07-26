export interface MarketItem {
  symbol: string;
  label: string;
  price: string;
  changePercent: number;
  up: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TradeSignal {
  index: number;
  type: "buy" | "sell";
  price: number;
  stopLoss: number;
  target: number;
}

export interface AnalysisResult {
  symbol: string;
  label: string;
  candles: Candle[];
  currentPrice: number;
  support: number;
  resistance: number;
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  signal: "Bullish" | "Bearish" | "Neutral";
  tradeSignals: TradeSignal[];
}

// The 5 assets shown on the Analysis page, mapped to Yahoo Finance tickers.
export const ANALYSIS_SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: "^NSEI", label: "Nifty 50" },
  { symbol: "^BSESN", label: "Sensex" },
  { symbol: "^NSEBANK", label: "Bank Nifty" },
  { symbol: "BTC-USD", label: "Bitcoin" },
  { symbol: "GC=F", label: "Gold" }
];

async function fetchYahooQuote(symbol: string, label: string): Promise<MarketItem | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose;
    const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    return {
      symbol,
      label,
      price: price?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—",
      changePercent: Math.round(changePercent * 100) / 100,
      up: changePercent >= 0
    };
  } catch {
    return null;
  }
}

async function fetchCoinGecko(): Promise<MarketItem[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
    );
    if (!res.ok) return [];

    const data = await res.json();
    const items: MarketItem[] = [];

    if (data.bitcoin) {
      items.push({
        symbol: "BTC",
        label: "Bitcoin",
        price: `$${data.bitcoin.usd.toLocaleString("en-US")}`,
        changePercent: Math.round((data.bitcoin.usd_24h_change ?? 0) * 100) / 100,
        up: (data.bitcoin.usd_24h_change ?? 0) >= 0
      });
    }

    if (data.ethereum) {
      items.push({
        symbol: "ETH",
        label: "Ethereum",
        price: `$${data.ethereum.usd.toLocaleString("en-US")}`,
        changePercent: Math.round((data.ethereum.usd_24h_change ?? 0) * 100) / 100,
        up: (data.ethereum.usd_24h_change ?? 0) >= 0
      });
    }

    return items;
  } catch {
    return [];
  }
}

export async function getMarketFeed(): Promise<MarketItem[]> {
  const [nifty, sensex, crypto] = await Promise.all([
    fetchYahooQuote("^NSEI", "Nifty 50"),
    fetchYahooQuote("^BSESN", "Sensex"),
    fetchCoinGecko()
  ]);

  return [nifty, sensex, ...crypto].filter((x): x is MarketItem => x !== null);
}

/** Summary cards for the Analysis page — Nifty 50, Sensex, Bank Nifty, Bitcoin, Gold. */
export async function getAnalysisFeed(): Promise<MarketItem[]> {
  const results = await Promise.all(
    ANALYSIS_SYMBOLS.map(s => fetchYahooQuote(s.symbol, s.label))
  );
  return results.filter((x): x is MarketItem => x !== null);
}

function calcSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Finds the most significant recent swing highs/lows and turns them into
 * buy/sell markers with a simple stop-loss and target — NOT a prediction,
 * just where price has recently reversed, with a basic risk/reward level.
 */
function findTradeSignals(candles: Candle[], maxSignals = 3): TradeSignal[] {
  const window = 4;
  const minGap = 6;
  const raw: { index: number; type: "buy" | "sell"; price: number }[] = [];
  let lastIndex = -minGap;

  for (let i = window; i < candles.length - window; i++) {
    if (i - lastIndex < minGap) continue;

    const slice = candles.slice(i - window, i + window + 1);
    const lows = slice.map(c => c.low);
    const highs = slice.map(c => c.high);

    if (candles[i].low === Math.min(...lows)) {
      raw.push({ index: i, type: "buy", price: candles[i].low });
      lastIndex = i;
    } else if (candles[i].high === Math.max(...highs)) {
      raw.push({ index: i, type: "sell", price: candles[i].high });
      lastIndex = i;
    }
  }

  // Keep only the most recent few, so the chart doesn't get cluttered.
  const recent = raw.slice(-maxSignals);

  return recent.map(r => {
    const buffer = r.price * 0.003; // ~0.3% buffer for stop-loss
    if (r.type === "buy") {
      const stopLoss = r.price - buffer;
      const risk = r.price - stopLoss;
      return { index: r.index, type: "buy", price: r.price, stopLoss, target: r.price + risk * 2 };
    } else {
      const stopLoss = r.price + buffer;
      const risk = stopLoss - r.price;
      return { index: r.index, type: "sell", price: r.price, stopLoss, target: r.price - risk * 2 };
    }
  });
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";

const TIMEFRAME_MAP: Record<Timeframe, { interval: string; range: string }> = {
  "1m": { interval: "1m", range: "1d" },
  "5m": { interval: "5m", range: "5d" },
  "15m": { interval: "15m", range: "5d" },
  "30m": { interval: "30m", range: "1mo" },
  "1h": { interval: "60m", range: "1mo" },
  "1d": { interval: "1d", range: "6mo" }
};

/**
 * Candle history + basic technical indicators (SMA20/50, RSI14) for one symbol,
 * with simple rule-based buy/sell markers and stop-loss/target levels. This is
 * NOT financial advice and is NOT guaranteed to be accurate — it's a basic
 * technical-indicator summary only. Always do your own research.
 */
export async function getChartAnalysis(
  symbol: string,
  label: string,
  timeframe: Timeframe = "15m"
): Promise<AnalysisResult | null> {
  try {
    const { interval, range } = TIMEFRAME_MAP[timeframe] ?? TIMEFRAME_MAP["15m"];

    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens: number[] = quote.open ?? [];
    const highs: number[] = quote.high ?? [];
    const lows: number[] = quote.low ?? [];
    const closes: number[] = quote.close ?? [];

    const candles: Candle[] = timestamps
      .map((t, i) => ({ time: t, open: opens[i], high: highs[i], low: lows[i], close: closes[i] }))
      .filter((c): c is Candle =>
        typeof c.open === "number" && typeof c.high === "number" &&
        typeof c.low === "number" && typeof c.close === "number"
      );

    if (candles.length === 0) return null;

    const closeValues = candles.map(c => c.close);
    const sma20 = calcSMA(closeValues, 20);
    const sma50 = calcSMA(closeValues, 50);
    const rsi14 = calcRSI(closeValues, 14);

    let signal: AnalysisResult["signal"] = "Neutral";
    if (sma20 !== null && sma50 !== null && rsi14 !== null) {
      if (sma20 > sma50 && rsi14 < 70) signal = "Bullish";
      else if (sma20 < sma50 && rsi14 > 30) signal = "Bearish";
    }

    const currentPrice = closeValues[closeValues.length - 1];
    const resistance = Math.max(...candles.map(c => c.high));
    const support = Math.min(...candles.map(c => c.low));
    const tradeSignals = findTradeSignals(candles);

    return {
      symbol, label, candles, currentPrice, support, resistance,
      sma20, sma50, rsi14, signal, tradeSignals
    };
  } catch {
    return null;
  }
}
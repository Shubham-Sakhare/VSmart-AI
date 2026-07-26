import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, LineChart, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import "./AnalysisPage.css";

interface MarketItem {
  symbol: string;
  label: string;
  price: string;
  changePercent: number;
  up: boolean;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TradeSignal {
  index: number;
  type: "buy" | "sell";
  price: number;
  stopLoss: number;
  target: number;
}

interface ChartAnalysis {
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

const CHART_W = 900;
const CHART_H = 320;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const MARGIN_LEFT = 8;
const MARGIN_RIGHT = 64; // room for price labels on the right
const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1m", label: "1 min" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1h" },
  { value: "1d", label: "1d" }
];

function fmtPrice(p: number): string {
  return p.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function CandleChart({ data }: { data: ChartAnalysis }) {
  const { candles, tradeSignals, support, resistance, currentPrice } = data;
  if (candles.length < 5) return <p className="analysis-loading">Not enough data for a chart yet.</p>;

  const lows = candles.map(c => c.low);
  const highs = candles.map(c => c.high);
  const min = Math.min(...lows, support);
  const max = Math.max(...highs, resistance);
  const range = max - min || 1;

  const innerW = CHART_W - MARGIN_LEFT - MARGIN_RIGHT;
  const innerH = CHART_H - MARGIN_TOP - MARGIN_BOTTOM;
  const candleW = innerW / candles.length;

  const yFor = (price: number) => MARGIN_TOP + innerH - ((price - min) / range) * innerH;
  const xFor = (i: number) => MARGIN_LEFT + i * candleW + candleW / 2;

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="candle-chart" preserveAspectRatio="none">

      {/* Support / Resistance lines */}
      <line x1={MARGIN_LEFT} x2={CHART_W - MARGIN_RIGHT} y1={yFor(resistance)} y2={yFor(resistance)} className="line-resistance" />
      <text x={CHART_W - MARGIN_RIGHT + 6} y={yFor(resistance)} className="price-tag tag-resistance" dominantBaseline="central">
        {fmtPrice(resistance)}
      </text>

      <line x1={MARGIN_LEFT} x2={CHART_W - MARGIN_RIGHT} y1={yFor(support)} y2={yFor(support)} className="line-support" />
      <text x={CHART_W - MARGIN_RIGHT + 6} y={yFor(support)} className="price-tag tag-support" dominantBaseline="central">
        {fmtPrice(support)}
      </text>

      {/* Candlesticks */}
      {candles.map((c, i) => {
        const isUp = c.close >= c.open;
        const x = xFor(i);
        const bodyTop = yFor(Math.max(c.open, c.close));
        const bodyBottom = yFor(Math.min(c.open, c.close));
        const bodyH = Math.max(bodyBottom - bodyTop, 1);

        return (
          <g key={i}>
            <line x1={x} x2={x} y1={yFor(c.high)} y2={yFor(c.low)} className={isUp ? "wick-up" : "wick-down"} />
            <rect
              x={x - candleW * 0.32}
              y={bodyTop}
              width={candleW * 0.64}
              height={bodyH}
              className={isUp ? "body-up" : "body-down"}
            />
          </g>
        );
      })}

      {/* Current price line + tag on the right */}
      <line x1={MARGIN_LEFT} x2={CHART_W - MARGIN_RIGHT} y1={yFor(currentPrice)} y2={yFor(currentPrice)} className="line-current" />
      <rect x={CHART_W - MARGIN_RIGHT} y={yFor(currentPrice) - 10} width={MARGIN_RIGHT} height={20} rx={4} className="current-price-box" />
      <text x={CHART_W - MARGIN_RIGHT + MARGIN_RIGHT / 2} y={yFor(currentPrice)} className="current-price-text" textAnchor="middle" dominantBaseline="central">
        {fmtPrice(currentPrice)}
      </text>

      {/* Buy/Sell signal circles */}
      {tradeSignals.map((s, idx) => {
        const x = xFor(s.index);
        const isBuy = s.type === "buy";
        const y = isBuy ? yFor(s.price) + 34 : yFor(s.price) - 34;

        return (
          <g key={idx} transform={`translate(${x}, ${y})`}>
            <circle r={15} className={isBuy ? "signal-circle-buy" : "signal-circle-sell"} />
            <text textAnchor="middle" dominantBaseline="central" fontSize="16" fill="#fff">
              {isBuy ? "▲" : "▼"}
            </text>
          </g>
        );
      })}

    </svg>
  );
}

export default function AnalysisPage() {

  const [items, setItems] = useState<MarketItem[]>([]);
  const [selected, setSelected] = useState<{ symbol: string; label: string } | null>(null);
  const [chart, setChart] = useState<ChartAnalysis | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await window.vsmart.getAnalysisFeed();
        if (!cancelled) setItems(data);
      } catch {
        // keep last known data
      }
    };

    load();
    const interval = setInterval(load, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Load the selected chart, then keep refreshing it every 5 minutes.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    const load = async (showSpinner: boolean) => {
      if (showSpinner) setChartLoading(true);
      try {
        const result = await window.vsmart.getChartAnalysis(selected.symbol, selected.label, timeframe);
        if (!cancelled) setChart(result);
      } finally {
        if (showSpinner) setChartLoading(false);
      }
    };

    setChart(null);
    load(true);
    const interval = setInterval(() => load(false), REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selected, timeframe]);

  const signalClass = (signal?: string) => {
    if (signal === "Bullish") return "signal-bullish";
    if (signal === "Bearish") return "signal-bearish";
    return "signal-neutral";
  };

  const latestSignal = chart?.tradeSignals[chart.tradeSignals.length - 1];

  return (
    <div className="analysis-page">

      <div className="analysis-disclaimer">
        <AlertTriangle size={14} />
        <span>
          Informational only — basic technical indicators, support/resistance, and pivot-based
          signals. Not financial advice. Not guaranteed to be accurate. Trade at your own risk.
        </span>
      </div>

      <div className="analysis-grid">
        {items.map(item => (
          <button
            className={"analysis-card" + (selected?.symbol === item.symbol ? " active" : "")}
            key={item.symbol}
            onClick={() => setSelected({ symbol: item.symbol, label: item.label })}
          >
            <div className="analysis-card-top">
              <span className="analysis-label">{item.label}</span>
              {item.up ? <TrendingUp size={16} className="trend-up" /> : <TrendingDown size={16} className="trend-down" />}
            </div>
            <div className="analysis-price">{item.price}</div>
            <div className={item.up ? "analysis-change up" : "analysis-change down"}>
              {item.up ? "+" : ""}{item.changePercent}%
            </div>
          </button>
        ))}

        {items.length === 0 && (
          <p className="analysis-loading">Loading market data...</p>
        )}
      </div>

      {selected && (
        <div className="analysis-inline-panel">

          <div className="analysis-panel-header">
            <div className="analysis-modal-title">
              <LineChart size={16} />
              <span>{selected.label}</span>
              <span className="refresh-note">auto-updates every 5 min</span>
            </div>

            <div className="timeframe-selector">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  className={timeframe === tf.value ? "tf-btn active" : "tf-btn"}
                  onClick={() => setTimeframe(tf.value)}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="chart-legend">
              <span><ArrowUp size={12} className="trend-up" /> Buy zone</span>
              <span><ArrowDown size={12} className="trend-down" /> Sell zone</span>
            </div>
          </div>

          {chartLoading && <p className="analysis-loading">Loading chart...</p>}

          {!chartLoading && chart && (
            <>
              <CandleChart data={chart} />

              {latestSignal && (
                <div className={`latest-signal-card ${latestSignal.type === "buy" ? "buy" : "sell"}`}>
                  <div className="latest-signal-type">
                    {latestSignal.type === "buy" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    {latestSignal.type.toUpperCase()} zone
                  </div>
                  <div className="latest-signal-levels">
                    <div><span>Entry</span><strong>{fmtPrice(latestSignal.price)}</strong></div>
                    <div><span>Stop-loss</span><strong>{fmtPrice(latestSignal.stopLoss)}</strong></div>
                    <div><span>Target</span><strong>{fmtPrice(latestSignal.target)}</strong></div>
                  </div>
                </div>
              )}

              <div className="analysis-indicators">
                <div className="indicator">
                  <span>SMA 20</span>
                  <strong>{chart.sma20 ? chart.sma20.toFixed(2) : "—"}</strong>
                </div>
                <div className="indicator">
                  <span>SMA 50</span>
                  <strong>{chart.sma50 ? chart.sma50.toFixed(2) : "—"}</strong>
                </div>
                <div className="indicator">
                  <span>RSI (14)</span>
                  <strong>{chart.rsi14 ? chart.rsi14.toFixed(1) : "—"}</strong>
                </div>
                <div className={`indicator signal-box ${signalClass(chart.signal)}`}>
                  <span>Bias</span>
                  <strong>{chart.signal}</strong>
                </div>
              </div>

              <p className="analysis-modal-note">
                {TIMEFRAMES.find(t => t.value === timeframe)?.label} candles. Signal circles mark
                recent swing highs/lows with a simple 1:2 risk/reward stop-loss and target — not
                predictions. Always confirm with your own analysis before trading.
              </p>
            </>
          )}

          {!chartLoading && !chart && (
            <p className="analysis-loading">Couldn't load chart data. Try again shortly.</p>
          )}

        </div>
      )}

    </div>
  );
}
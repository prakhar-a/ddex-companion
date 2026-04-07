import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { fetchPriceHistory, fetchCoinDetails, fetchFearGreed } from '../hooks/useCoinGecko'
import { sendMessage } from '../utils/openrouter'
import { PRODUCTS } from '../data/products'

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) gains += diff
    else losses -= diff
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  const rsiArr = []
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
    const rs = avgGain / (avgLoss || 0.001)
    rsiArr.push(100 - 100 / (1 + rs))
  }
  return rsiArr[rsiArr.length - 1]
}

function computeMA(prices, period) {
  if (prices.length < period) return null
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period
}

function computeMACD(prices) {
  if (prices.length < 26) return null
  const ema = (arr, period) => {
    const k = 2 / (period + 1)
    let emaVal = arr[0]
    for (let i = 1; i < arr.length; i++) emaVal = arr[i] * k + emaVal * (1 - k)
    return emaVal
  }
  const ema12 = ema(prices.slice(-26), 12)
  const ema26 = ema(prices.slice(-26), 26)
  return ema12 - ema26
}

const FearGreedMeter = ({ value, label }) => {
  const color = value < 25 ? '#DA291C' : value < 45 ? '#f97316' : value < 55 ? '#f59e0b' : value < 75 ? '#16a34a' : '#15803d'
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="30" fill="none" stroke="#DCDCDC" strokeWidth="8" />
          <circle
            cx="40" cy="40" r="30" fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${(value / 100) * 188.5} 188.5`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-xs text-dbs-text font-medium mt-1">{label}</span>
      <span className="text-[10px] text-dbs-muted">Fear & Greed</span>
    </div>
  )
}

export default function AnalysisPanel({ coin, priceData }) {
  const product = PRODUCTS[coin]
  const [range, setRange] = useState(30)
  const [history, setHistory] = useState([])
  const [details, setDetails] = useState(null)
  const [fearGreed, setFearGreed] = useState(null)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [loading, setLoading] = useState(true)

  const livePrice = priceData?.[product?.coingeckoId]
  const price = livePrice?.usd
  const change24h = livePrice?.usd_24h_change

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchPriceHistory(product.coingeckoId, range),
      fetchCoinDetails(product.coingeckoId),
      fetchFearGreed(),
    ]).then(([hist, det, fg]) => {
      setHistory(hist)
      setDetails(det)
      setFearGreed(fg)
      setLoading(false)
    })
  }, [coin, range])

  useEffect(() => {
    if (!history.length || !details || !fearGreed) return
    generateAIAnalysis()
  }, [history.length, coin])

  const generateAIAnalysis = async () => {
    setLoadingAI(true)
    const prices = history.map(h => h.price)
    const rsi = computeRSI(prices)
    const ma50 = computeMA(prices, Math.min(50, prices.length))
    const macd = computeMACD(prices)
    const current = prices[prices.length - 1]

    try {
      const prompt = `Provide a concise professional technical and fundamental analysis of ${product.name} (${product.symbol}) for a DBS Private Bank client.

Current data:
- Price: $${current?.toLocaleString()}
- 24h change: ${change24h?.toFixed(2)}%
- RSI (14): ${rsi?.toFixed(1)}
- MA50: $${ma50?.toLocaleString()}
- MACD: ${macd?.toFixed(2)}
- Fear & Greed Index: ${fearGreed?.value} (${fearGreed?.label})
- Market Cap: $${(details?.marketCap / 1e9)?.toFixed(1)}B
- 24h Volume: $${(details?.volume24h / 1e9)?.toFixed(2)}B

Write 3 short paragraphs: (1) Technical outlook, (2) Fundamental context, (3) Key risks. Be specific, data-driven, and professional. No bullet points. No financial advice disclaimer needed — that's handled separately.`

      const response = await sendMessage([{ role: 'user', content: prompt }])
      setAiAnalysis(response)
    } catch (e) {
      setAiAnalysis('Analysis unavailable at this time.')
    }
    setLoadingAI(false)
  }

  const prices = history.map(h => h.price)
  const rsi = computeRSI(prices)
  const ma50 = computeMA(prices, Math.min(50, prices.length))
  const ma200 = computeMA(prices, Math.min(200, prices.length))
  const macd = computeMACD(prices)
  const current = prices[prices.length - 1]
  const isAboveMA50 = current > ma50
  const isUp = change24h >= 0
  const displayData = history.length > 60 ? history.filter((_, i) => i % Math.ceil(history.length / 60) === 0) : history

  return (
    <div className="bg-white border border-dbs-border rounded shadow-dbs overflow-hidden w-full max-w-lg">
      {/* Header */}
      <div className="p-4 border-b border-dbs-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-dbs-text">{product.name} Analysis</div>
            <div className="text-xs text-dbs-muted">Technical & Fundamental · Live Data</div>
          </div>
          <div className="text-right">
            <div className="text-base font-mono font-bold text-dbs-text">
              ${price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-medium ${isUp ? 'text-green-600' : 'text-dbs-red'}`}>
              {isUp ? '+' : ''}{change24h?.toFixed(2)}% 24h
            </div>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="p-4 border-b border-dbs-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-dbs-muted uppercase tracking-wide font-semibold">Price Chart</span>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setRange(r.days)}
                className={`px-2 py-0.5 text-xs rounded transition-colors font-medium ${range === r.days ? 'bg-dbs-red text-white' : 'text-dbs-muted hover:text-dbs-text'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-dbs-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={displayData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#909090' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 9, fill: '#909090' }} tickLine={false} axisLine={false} width={50}
                tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0)}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="bg-white border border-dbs-border rounded px-2 py-1.5 text-xs shadow-dbs">
                    <div className="text-dbs-muted">{label}</div>
                    <div className="text-dbs-text font-mono font-semibold">${payload[0].value.toLocaleString()}</div>
                  </div>
                ) : null}
              />
              <Line type="monotone" dataKey="price" stroke={isUp ? '#16a34a' : '#DA291C'} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Technical Indicators */}
      <div className="p-4 border-b border-dbs-border">
        <div className="text-[10px] text-dbs-muted uppercase tracking-wide font-semibold mb-3">Technical Indicators</div>
        <div className="grid grid-cols-2 gap-3">
          <Indicator
            label="RSI (14)"
            value={rsi ? rsi.toFixed(1) : '—'}
            signal={rsi ? (rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral') : '—'}
            signalColor={rsi ? (rsi > 70 ? '#DA291C' : rsi < 30 ? '#16a34a' : '#f59e0b') : '#909090'}
          />
          <Indicator
            label="MACD"
            value={macd ? macd.toFixed(2) : '—'}
            signal={macd ? (macd > 0 ? 'Bullish' : 'Bearish') : '—'}
            signalColor={macd ? (macd > 0 ? '#16a34a' : '#DA291C') : '#909090'}
          />
          <Indicator
            label="vs MA50"
            value={ma50 ? `$${ma50.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
            signal={isAboveMA50 ? 'Above' : 'Below'}
            signalColor={isAboveMA50 ? '#16a34a' : '#DA291C'}
          />
          <Indicator
            label="vs MA200"
            value={ma200 ? `$${ma200.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
            signal={current > ma200 ? 'Above' : 'Below'}
            signalColor={current > ma200 ? '#16a34a' : '#DA291C'}
          />
        </div>
      </div>

      {/* Fundamentals + Fear & Greed */}
      <div className="p-4 border-b border-dbs-border">
        <div className="text-[10px] text-dbs-muted uppercase tracking-wide font-semibold mb-3">Fundamentals</div>
        <div className="flex items-center gap-4">
          {fearGreed && <FearGreedMeter value={fearGreed.value} label={fearGreed.label} />}
          <div className="flex-1 space-y-2">
            {details && (
              <>
                <FundRow label="Market Cap" value={`$${(details.marketCap / 1e9).toFixed(1)}B`} />
                <FundRow label="24h Volume" value={`$${(details.volume24h / 1e9).toFixed(2)}B`} />
                {details.circulatingSupply && (
                  <FundRow
                    label="Circ. Supply"
                    value={`${(details.circulatingSupply / 1e6).toFixed(2)}M ${product.symbol}`}
                  />
                )}
                {details.maxSupply && (
                  <FundRow label="Max Supply" value={`${(details.maxSupply / 1e6).toFixed(0)}M`} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="p-4">
        <div className="text-[10px] text-dbs-muted uppercase tracking-wide font-semibold mb-2">AI Analysis</div>
        {loadingAI ? (
          <div className="space-y-2">
            <div className="h-3 bg-dbs-bg rounded animate-pulse" />
            <div className="h-3 bg-dbs-bg rounded animate-pulse w-4/5" />
            <div className="h-3 bg-dbs-bg rounded animate-pulse w-3/5" />
          </div>
        ) : (
          <p className="text-xs text-dbs-text leading-relaxed">{aiAnalysis}</p>
        )}
        <div className="mt-3 p-2.5 bg-dbs-bg border border-dbs-border rounded text-[10px] text-dbs-muted leading-relaxed">
          ⚠ For informational purposes only. Not financial advice. Digital assets are highly volatile. Capital at risk. Speak to your DBS Relationship Manager before investing.
        </div>
      </div>
    </div>
  )
}

function Indicator({ label, value, signal, signalColor }) {
  return (
    <div className="bg-dbs-bg border border-dbs-border rounded p-2.5">
      <div className="text-[10px] text-dbs-muted mb-1">{label}</div>
      <div className="text-sm font-mono font-semibold text-dbs-text">{value}</div>
      <div className="text-[10px] font-semibold mt-0.5" style={{ color: signalColor }}>{signal}</div>
    </div>
  )
}

function FundRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] text-dbs-muted">{label}</span>
      <span className="text-[10px] font-mono font-semibold text-dbs-text">{value}</span>
    </div>
  )
}

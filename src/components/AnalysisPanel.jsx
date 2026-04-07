import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { fetchPriceHistory, fetchCoinDetails, fetchFearGreed, fetchCoinSocialData, getETFFlows } from '../hooks/useCoinGecko'
import { sendMessage } from '../utils/openrouter'
import { PRODUCTS } from '../data/products'

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

const TABS = [
  { id: 'overview', label: 'Price & Signal' },
  { id: 'technical', label: 'Indicators' },
  { id: 'flows', label: 'ETF Flows' },
]

function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) gains += diff; else losses -= diff
  }
  let avgGain = gains / period, avgLoss = losses / period
  const rsiArr = []
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
    rsiArr.push(100 - 100 / (1 + avgGain / (avgLoss || 0.001)))
  }
  return rsiArr[rsiArr.length - 1]
}

function computeMA(prices, period) {
  if (prices.length < period) return null
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period
}

function computeMACD(prices) {
  if (prices.length < 26) return null
  const ema = (arr, p) => { const k = 2 / (p + 1); let v = arr[0]; for (let i = 1; i < arr.length; i++) v = arr[i] * k + v * (1 - k); return v }
  return ema(prices.slice(-26), 12) - ema(prices.slice(-26), 26)
}

function parseAIResponse(text) {
  const out = { signal: 'NEUTRAL', strength: 'MODERATE', technical: '', fundamental: '', risks: '' }
  const sigMatch = text.match(/SIGNAL:\s*(BULLISH|BEARISH|NEUTRAL)/i)
  if (sigMatch) out.signal = sigMatch[1].toUpperCase()
  const strMatch = text.match(/STRENGTH:\s*(STRONG|MODERATE|WEAK)/i)
  if (strMatch) out.strength = strMatch[1].toUpperCase()
  const techMatch = text.match(/TECHNICAL[:\s]+([\s\S]*?)(?=FUNDAMENTAL|RISKS|$)/i)
  if (techMatch) out.technical = techMatch[1].trim()
  const fundMatch = text.match(/FUNDAMENTAL[:\s]+([\s\S]*?)(?=RISKS|$)/i)
  if (fundMatch) out.fundamental = fundMatch[1].trim()
  const riskMatch = text.match(/RISKS[:\s]+([\s\S]*?)$/i)
  if (riskMatch) out.risks = riskMatch[1].trim()
  if (!out.technical && !out.fundamental && !out.risks) {
    const paras = text.split(/\n\n+/).filter(Boolean)
    out.technical = paras[0] || text
    out.fundamental = paras[1] || ''
    out.risks = paras[2] || ''
  }
  return out
}

const SIGNAL_CFG = {
  BULLISH: { label: 'Bullish', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  BEARISH: { label: 'Bearish', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  NEUTRAL: { label: 'Neutral', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
}
const STRENGTH = { STRONG: 'Strong', MODERATE: 'Moderate', WEAK: 'Weak' }

export default function AnalysisPanel({ coin, priceData }) {
  const product = PRODUCTS[coin]
  const [tab, setTab] = useState('overview')
  const [range, setRange] = useState(30)
  const [history, setHistory] = useState([])
  const [details, setDetails] = useState(null)
  const [fearGreed, setFearGreed] = useState(null)
  const [socialData, setSocialData] = useState(null)
  const [aiSections, setAiSections] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [loading, setLoading] = useState(true)

  const etfFlows = getETFFlows(product?.coingeckoId)
  const livePrice = priceData?.[product?.coingeckoId]
  const price = livePrice?.usd
  const change24h = livePrice?.usd_24h_change
  const isUp = (change24h ?? 0) >= 0

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchPriceHistory(product.coingeckoId, range),
      fetchCoinDetails(product.coingeckoId),
      fetchFearGreed(),
      fetchCoinSocialData(product.coingeckoId),
    ]).then(([hist, det, fg, social]) => {
      setHistory(hist); setDetails(det); setFearGreed(fg); setSocialData(social); setLoading(false)
    })
  }, [coin, range])

  useEffect(() => {
    if (!history.length || !details || !fearGreed) return
    runAI()
  }, [history.length, coin])

  const runAI = async () => {
    setLoadingAI(true)
    const prices = history.map(h => h.price)
    const rsi = computeRSI(prices)
    const ma50 = computeMA(prices, Math.min(50, prices.length))
    const macd = computeMACD(prices)
    const current = prices[prices.length - 1]
    const etfLine = etfFlows
      ? `Spot ETF AUM: $${etfFlows.reduce((s, e) => s + e.aum, 0).toFixed(1)}B, Net 24h Flow: $${etfFlows.reduce((s, e) => s + e.flow24h, 0).toFixed(3)}B`
      : ''
    try {
      const response = await sendMessage([{ role: 'user', content: `You are a DBS Private Bank analyst. Analyse ${product.name} (${product.symbol}) for an accredited investor.

Data: Price $${current?.toLocaleString()}, 24h ${change24h?.toFixed(2)}%, RSI ${rsi?.toFixed(1)}, MA50 $${ma50?.toLocaleString()}, MACD ${macd?.toFixed(2)}, Fear&Greed ${fearGreed?.value} (${fearGreed?.label}), MCap $${(details?.marketCap / 1e9)?.toFixed(1)}B, Vol $${(details?.volume24h / 1e9)?.toFixed(2)}B${etfLine ? ', ' + etfLine : ''}.

Reply in EXACTLY this format:

SIGNAL: [BULLISH or BEARISH or NEUTRAL] | STRENGTH: [STRONG or MODERATE or WEAK]

TECHNICAL:
[One concise sentence on price action and indicator signals]

FUNDAMENTAL:
[One concise sentence on macro/on-chain fundamentals]

RISKS:
[One concise sentence on the key risk to watch]` }])
      setAiSections(parseAIResponse(response))
    } catch {
      setAiSections({ signal: 'NEUTRAL', strength: 'MODERATE', technical: 'Analysis unavailable.', fundamental: '', risks: '' })
    }
    setLoadingAI(false)
  }

  const prices = history.map(h => h.price)
  const rsi = computeRSI(prices)
  const ma50 = computeMA(prices, Math.min(50, prices.length))
  const ma200 = computeMA(prices, Math.min(200, prices.length))
  const macd = computeMACD(prices)
  const current = prices[prices.length - 1]
  const displayData = history.length > 60 ? history.filter((_, i) => i % Math.ceil(history.length / 60) === 0) : history

  const sigCfg = SIGNAL_CFG[aiSections?.signal ?? 'NEUTRAL']
  const etfTotalAum = etfFlows?.reduce((s, e) => s + e.aum, 0) ?? 0
  const etfNetFlow = etfFlows?.reduce((s, e) => s + e.flow24h, 0) ?? 0
  const etfMaxAum = etfFlows ? Math.max(...etfFlows.map(e => e.aum)) : 1

  const sentimentScore = socialData?.sentimentVotesUp != null
    ? Math.round(socialData.sentimentVotesUp * 0.6 + (fearGreed?.value ?? 50) * 0.4)
    : (fearGreed?.value ?? 50)
  const sentimentLabel = sentimentScore >= 70 ? 'Very Bullish' : sentimentScore >= 55 ? 'Bullish' : sentimentScore >= 45 ? 'Neutral' : sentimentScore >= 30 ? 'Bearish' : 'Very Bearish'
  const sentimentColor = sentimentScore >= 70 ? '#15803d' : sentimentScore >= 55 ? '#16a34a' : sentimentScore >= 45 ? '#f59e0b' : sentimentScore >= 30 ? '#f97316' : '#DA291C'

  return (
    <div className="bg-white border border-dbs-border rounded shadow-dbs overflow-hidden w-full">
      {/* Header */}
      <div className="p-4 border-b border-dbs-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-dbs-text">{product.name}</div>
            {aiSections ? (
              <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-bold ${sigCfg.bg} ${sigCfg.border} ${sigCfg.text}`}>
                <span className={`w-2 h-2 rounded-full ${sigCfg.dot}`} />
                {sigCfg.label}
                <span className="font-normal opacity-70">·</span>
                {STRENGTH[aiSections.strength]}
              </div>
            ) : (
              <div className="text-[10px] text-dbs-muted mt-1">Loading signal…</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-base font-mono font-bold text-dbs-text">
              ${price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-semibold ${isUp ? 'text-green-600' : 'text-dbs-red'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(change24h ?? 0).toFixed(2)}% 24h
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-dbs-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors ${tab === t.id ? 'text-dbs-red border-b-2 border-dbs-red -mb-px bg-white' : 'text-dbs-muted hover:text-dbs-text'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {tab === 'overview' && (
        <div>
          {/* Chart */}
          <div className="p-4 border-b border-dbs-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-dbs-muted font-semibold uppercase tracking-wide">Price Chart</span>
              <div className="flex gap-1">
                {RANGES.map(r => (
                  <button key={r.label} onClick={() => setRange(r.days)}
                    className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${range === r.days ? 'bg-dbs-red text-white' : 'text-dbs-muted hover:text-dbs-text'}`}>
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
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={displayData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#909090' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#909090' }} tickLine={false} axisLine={false} width={50}
                    tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0)}`} domain={['auto', 'auto']} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="bg-white border border-dbs-border rounded px-2 py-1.5 text-xs shadow-dbs">
                      <div className="text-dbs-muted">{label}</div>
                      <div className="text-dbs-text font-mono font-semibold">${payload[0].value.toLocaleString()}</div>
                    </div>
                  ) : null} />
                  <Line type="monotone" dataKey="price" stroke={isUp ? '#16a34a' : '#DA291C'} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI Analysis */}
          <div className="p-4">
            <div className="text-[10px] text-dbs-muted font-semibold uppercase tracking-wide mb-3">AI Analysis</div>
            {loadingAI || !aiSections ? (
              <div className="space-y-2">
                {[1, 0.85, 0.7, 1, 0.9, 0.6].map((w, i) => (
                  <div key={i} className="h-2.5 bg-dbs-bg rounded animate-pulse" style={{ width: `${w * 100}%` }} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {aiSections.technical && <AISectionRow icon="📈" label="Technical" text={aiSections.technical} />}
                {aiSections.fundamental && <AISectionRow icon="🏛" label="Fundamental" text={aiSections.fundamental} />}
                {aiSections.risks && <AISectionRow icon="⚠️" label="Key Risk" text={aiSections.risks} isRisk />}
              </div>
            )}
            <p className="text-[9px] text-dbs-muted mt-3 leading-relaxed border-t border-dbs-border pt-3">
              For informational purposes only · Not financial advice · Capital at risk
            </p>
          </div>
        </div>
      )}

      {/* ══ TECHNICAL TAB ══ */}
      {tab === 'technical' && (
        <div className="p-4 space-y-4">
          {/* Indicator grid */}
          <div>
            <div className="text-[10px] text-dbs-muted font-semibold uppercase tracking-wide mb-2">Indicators</div>
            <div className="grid grid-cols-2 gap-2">
              <IndicatorCard label="RSI (14)"
                value={rsi ? rsi.toFixed(1) : '—'}
                signal={rsi ? (rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral') : '—'}
                color={rsi ? (rsi > 70 ? '#DA291C' : rsi < 30 ? '#16a34a' : '#f59e0b') : '#909090'} />
              <IndicatorCard label="MACD"
                value={macd ? (macd > 0 ? '+' : '') + macd.toFixed(0) : '—'}
                signal={macd ? (macd > 0 ? 'Bullish' : 'Bearish') : '—'}
                color={macd ? (macd > 0 ? '#16a34a' : '#DA291C') : '#909090'} />
              <IndicatorCard label="vs MA50"
                value={ma50 ? `$${(ma50 / 1000).toFixed(1)}k` : '—'}
                signal={current > ma50 ? 'Above' : 'Below'}
                color={current > ma50 ? '#16a34a' : '#DA291C'} />
              <IndicatorCard label="vs MA200"
                value={ma200 ? `$${(ma200 / 1000).toFixed(1)}k` : '—'}
                signal={current > ma200 ? 'Above' : 'Below'}
                color={current > ma200 ? '#16a34a' : '#DA291C'} />
            </div>
          </div>

          {/* Fundamentals */}
          {details && (
            <div>
              <div className="text-[10px] text-dbs-muted font-semibold uppercase tracking-wide mb-2">Fundamentals</div>
              <div className="bg-dbs-bg border border-dbs-border rounded divide-y divide-dbs-border">
                <FundRow label="Market Cap" value={`$${(details.marketCap / 1e9).toFixed(1)}B`} />
                <FundRow label="24h Volume" value={`$${(details.volume24h / 1e9).toFixed(2)}B`} />
                {details.circulatingSupply && <FundRow label="Circ. Supply" value={`${(details.circulatingSupply / 1e6).toFixed(2)}M ${product.symbol}`} />}
                {details.maxSupply && <FundRow label="Max Supply" value={`${(details.maxSupply / 1e6).toFixed(0)}M`} />}
                {details.ath && <FundRow label="All-Time High" value={`$${details.ath.toLocaleString()}`} />}
              </div>
            </div>
          )}

          {/* Fear & Greed */}
          {fearGreed && (
            <div>
              <div className="text-[10px] text-dbs-muted font-semibold uppercase tracking-wide mb-2">Market Sentiment</div>
              <FearGreedBar value={fearGreed.value} label={fearGreed.label} />
            </div>
          )}
        </div>
      )}

      {/* ══ FLOWS & SENTIMENT TAB ══ */}
      {tab === 'flows' && (
        <div className="p-4 space-y-4">
          {/* ETF Flows */}
          {etfFlows && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-dbs-muted font-semibold uppercase tracking-wide">Spot ETF Flows</div>
                <span className="text-[9px] text-dbs-muted">Indicative</span>
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-dbs-bg border border-dbs-border rounded p-2.5">
                  <div className="text-[9px] text-dbs-muted">Total AUM</div>
                  <div className="text-sm font-bold font-mono text-dbs-text">${etfTotalAum.toFixed(1)}B</div>
                </div>
                <div className={`flex-1 border rounded p-2.5 ${etfNetFlow >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-[9px] text-dbs-muted">Net 24h Flow</div>
                  <div className={`text-sm font-bold font-mono ${etfNetFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {etfNetFlow >= 0 ? '+' : ''}${etfNetFlow.toFixed(3)}B
                  </div>
                </div>
              </div>
              <div className="bg-dbs-bg border border-dbs-border rounded divide-y divide-dbs-border overflow-hidden">
                {etfFlows.map(etf => (
                  <ETFRow key={etf.ticker} {...etf} maxAum={etfMaxAum} />
                ))}
              </div>
            </div>
          )}

          {/* Social Sentiment */}
          <div>
            <div className="text-[10px] text-dbs-muted font-semibold uppercase tracking-wide mb-2">Social Sentiment</div>
            <div className="bg-dbs-bg border border-dbs-border rounded p-3 mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-dbs-text">{sentimentLabel}</span>
                <span className="text-xs font-mono font-bold" style={{ color: sentimentColor }}>{sentimentScore}/100</span>
              </div>
              <div className="h-2 bg-dbs-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${sentimentScore}%`, backgroundColor: sentimentColor }} />
              </div>
              <div className="text-[9px] text-dbs-muted mt-1.5">Blended score: community votes + Fear & Greed index</div>
            </div>
            {socialData && (
              <div className="bg-dbs-bg border border-dbs-border rounded divide-y divide-dbs-border overflow-hidden">
                {socialData.sentimentVotesUp != null && (
                  <FundRow label="Community Bullish" value={`${socialData.sentimentVotesUp?.toFixed(1)}%`} />
                )}
                {fearGreed && (
                  <FundRow label="Fear & Greed" value={`${fearGreed.value} · ${fearGreed.label}`} />
                )}
                {socialData.redditSubscribers && (
                  <FundRow label="Reddit Subscribers" value={`${(socialData.redditSubscribers / 1e6).toFixed(1)}M`} />
                )}
                {socialData.twitterFollowers && (
                  <FundRow label="X (Twitter) Followers" value={`${(socialData.twitterFollowers / 1e6).toFixed(1)}M`} />
                )}
                {socialData.redditAccountsActive48h != null && (
                  <FundRow label="Reddit Active (48h)" value={socialData.redditAccountsActive48h.toLocaleString()} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

function AISectionRow({ icon, label, text, isRisk }) {
  return (
    <div className={`flex gap-2.5 p-2.5 rounded border ${isRisk ? 'bg-red-50/50 border-red-100' : 'bg-dbs-bg border-dbs-border'}`}>
      <span className="text-base shrink-0 mt-px">{icon}</span>
      <div>
        <div className={`text-[9px] font-bold uppercase tracking-wide mb-0.5 ${isRisk ? 'text-red-600' : 'text-dbs-muted'}`}>{label}</div>
        <p className="text-[11px] text-dbs-text leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

function IndicatorCard({ label, value, signal, color }) {
  return (
    <div className="bg-dbs-bg border border-dbs-border rounded p-3 flex items-center justify-between">
      <div>
        <div className="text-[10px] text-dbs-muted font-semibold">{label}</div>
        <div className="text-sm font-mono font-bold text-dbs-text mt-0.5">{value}</div>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold" style={{ color }}>{signal}</div>
      </div>
    </div>
  )
}

function FearGreedBar({ value, label }) {
  const color = value < 25 ? '#DA291C' : value < 45 ? '#f97316' : value < 55 ? '#f59e0b' : value < 75 ? '#16a34a' : '#15803d'
  return (
    <div className="bg-dbs-bg border border-dbs-border rounded p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-dbs-text">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}/100</span>
      </div>
      <div className="h-2 bg-dbs-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-dbs-muted">Fear</span>
        <span className="text-[9px] text-dbs-muted">Neutral</span>
        <span className="text-[9px] text-dbs-muted">Greed</span>
      </div>
    </div>
  )
}

function ETFRow({ name, ticker, aum, flow24h, maxAum }) {
  const barPct = Math.round((aum / maxAum) * 100)
  const isPos = flow24h >= 0
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="w-12 shrink-0">
        <div className="text-[10px] font-bold text-dbs-text">{ticker}</div>
        <div className="text-[9px] text-dbs-muted">${aum.toFixed(1)}B</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 bg-dbs-border/50 rounded-full overflow-hidden">
          <div className="h-full bg-dbs-red/60 rounded-full" style={{ width: `${barPct}%` }} />
        </div>
      </div>
      <div className={`text-[10px] font-mono font-bold shrink-0 w-16 text-right ${isPos ? 'text-green-600' : 'text-red-600'}`}>
        {isPos ? '+' : ''}{flow24h.toFixed(3)}B
      </div>
    </div>
  )
}

function FundRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[10px] text-dbs-muted">{label}</span>
      <span className="text-[10px] font-mono font-semibold text-dbs-text">{value}</span>
    </div>
  )
}

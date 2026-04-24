import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { fetchPriceHistory, generateMockHistory } from '../hooks/useCoinGecko'

const RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

const CustomTooltip = ({ active, payload, label, currency = 'USD' }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-apa-border rounded px-3 py-2 text-xs shadow-apa">
        <p className="text-apa-muted mb-1">{label}</p>
        <p className="text-apa-text font-semibold font-mono">
          {currency === 'SGD' ? 'SGD ' : '$ '}
          {payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: payload[0].value < 10 ? 4 : 2 })}
        </p>
      </div>
    )
  }
  return null
}

export default function PriceChart({ product, height = 160, showRangeSelector = true }) {
  const [range, setRange] = useState(30)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const load = async () => {
      let points = []
      if (product.isCrypto && product.coingeckoId) {
        points = await fetchPriceHistory(product.coingeckoId, range)
      } else {
        const configs = {
          sgbenji:  { base: 1.0,  volatility: 0.0002, trend: 0.00014 },
          btcnote:  { base: 100,  volatility: 0.008,  trend: 0.0002  },
          dbsbond:  { base: 100,  volatility: 0.0005, trend: 0.0001  },
          apacpe:   { base: 100,  volatility: 0.003,  trend: 0.0003  },
        }
        const cfg = configs[product.id] || { base: 100, volatility: 0.002, trend: 0.0001 }
        points = generateMockHistory(cfg.base, range, cfg.volatility, cfg.trend)
      }
      setData(points)
      setLoading(false)
    }
    load()
  }, [product.id, range])

  const first = data[0]?.price
  const last = data[data.length - 1]?.price
  const change = first ? ((last - first) / first) * 100 : 0
  const isUp = change >= 0

  const displayData = data.length > 60 ? data.filter((_, i) => i % Math.ceil(data.length / 60) === 0) : data

  const domainMin = Math.min(...displayData.map(d => d.price)) * 0.998
  const domainMax = Math.max(...displayData.map(d => d.price)) * 1.002

  return (
    <div className="w-full">
      {showRangeSelector && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isUp ? 'text-green-600' : 'text-apa-red'}`}>
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </span>
            <span className="text-xs text-apa-muted">{RANGES.find(r => r.days === range)?.label}</span>
          </div>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setRange(r.days)}
                className={`px-2 py-0.5 text-xs rounded transition-colors font-medium ${
                  range === r.days
                    ? 'bg-apa-red text-white'
                    : 'text-apa-muted hover:text-apa-text'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ height }} className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-apa-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={displayData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#909090' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[domainMin, domainMax]}
              tick={{ fontSize: 10, fill: '#909090' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => {
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
                if (v >= 1) return v.toFixed(2)
                return v.toFixed(4)
              }}
              width={45}
            />
            <Tooltip content={<CustomTooltip currency={product.currency} />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isUp ? '#16a34a' : '#DA291C'}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: isUp ? '#16a34a' : '#DA291C' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

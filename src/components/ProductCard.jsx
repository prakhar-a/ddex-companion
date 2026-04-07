import { useState } from 'react'
import { TrendingUp, TrendingDown, Lock, Info, ChevronDown, ChevronUp } from 'lucide-react'
import PriceChart from './PriceChart'
import { RISK_COLORS, CATEGORY_COLORS } from '../data/products'

const BADGE_STYLES = {
  LIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
  NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  STO: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

function formatPrice(price, currency = 'USD', coingeckoId) {
  if (!price) return '—'
  if (currency === 'SGD') return `SGD ${price.toLocaleString('en-SG', { minimumFractionDigits: 2 })}`
  if (coingeckoId === 'ripple-usd') return `$${price.toFixed(4)}`
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  if (price >= 1) return `$${price.toFixed(4)}`
  return `$${price.toFixed(6)}`
}

export default function ProductCard({ product, priceData, compact = false }) {
  const [expanded, setExpanded] = useState(false)

  const livePrice = priceData?.[product.coingeckoId]
  const price = livePrice?.usd
  const change24h = livePrice?.usd_24h_change
  const isUp = change24h >= 0
  const categoryColor = CATEGORY_COLORS[product.category] || '#6366f1'
  const riskColor = RISK_COLORS[product.risk] || '#f59e0b'

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#333] transition-colors">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
              style={{ background: `${categoryColor}15`, color: categoryColor }}
            >
              {product.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{product.name}</span>
                {product.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${BADGE_STYLES[product.badge]}`}>
                    {product.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">{product.category}</span>
            </div>
          </div>

          {/* Price or yield */}
          <div className="text-right">
            {product.isCrypto ? (
              <>
                <div className="text-sm font-mono font-medium text-white">
                  {formatPrice(price, product.currency, product.coingeckoId)}
                </div>
                {change24h !== undefined && (
                  <div className={`flex items-center justify-end gap-0.5 text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {isUp ? '+' : ''}{change24h?.toFixed(2)}%
                  </div>
                )}
              </>
            ) : product.yield ? (
              <div>
                <div className="text-sm font-mono font-medium text-green-400">{product.yield}</div>
                <div className="text-xs text-gray-500">Current yield</div>
              </div>
            ) : product.coupon ? (
              <div>
                <div className="text-sm font-mono font-medium text-amber-400">{product.coupon}</div>
                <div className="text-xs text-gray-500">Coupon p.a.</div>
              </div>
            ) : product.targetReturn ? (
              <div>
                <div className="text-sm font-mono font-medium text-purple-400">{product.targetReturn}</div>
                <div className="text-xs text-gray-500">Target IRR</div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mini chart */}
        {!compact && (
          <PriceChart product={product} height={100} showRangeSelector={false} />
        )}

        {/* Key stats row */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#1e1e1e]">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Min</span>
            <span className="text-xs font-mono text-gray-300">
              {product.currency === 'SGD' ? 'SGD' : '$'}{product.minInvestment.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor }} />
            <span className="text-xs text-gray-500">{product.risk} risk</span>
          </div>
          {product.liquidity === 'Low' && (
            <div className="flex items-center gap-1">
              <Lock size={10} className="text-gray-500" />
              <span className="text-xs text-gray-500">Illiquid</span>
            </div>
          )}
          <div className="ml-auto">
            <span className="text-[10px] text-gray-600 font-mono">{product.blockchain}</span>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 border-t border-[#1a1a1a] hover:bg-[#161616] transition-colors"
      >
        <span>{expanded ? 'Less detail' : 'More detail'}</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#1a1a1a] pt-3">
          <p className="text-xs text-gray-400 leading-relaxed">{product.description}</p>

          <div className="grid grid-cols-2 gap-2">
            {product.tenor && (
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Tenor</div>
                <div className="text-xs text-gray-300">{product.tenor}</div>
              </div>
            )}
            {product.rating && (
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Rating</div>
                <div className="text-xs text-green-400 font-mono">{product.rating}</div>
              </div>
            )}
            {product.issuedBy && (
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Issuer</div>
                <div className="text-xs text-gray-300">{product.issuedBy}</div>
              </div>
            )}
            {product.settlementCycle && (
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Settlement</div>
                <div className="text-xs text-gray-300">{product.settlementCycle}</div>
              </div>
            )}
            {product.geography && (
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Geography</div>
                <div className="text-xs text-gray-300">{product.geography}</div>
              </div>
            )}
            {product.underlyingFund && (
              <div className="col-span-2">
                <div className="text-[10px] text-gray-600 uppercase tracking-wide">Underlying Fund</div>
                <div className="text-xs text-gray-300">{product.underlyingFund}</div>
              </div>
            )}
          </div>

          {product.structure && (
            <div className="bg-[#0d0d0d] rounded-lg p-2.5">
              <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Structure</div>
              <div className="text-xs text-gray-400">{product.structure}</div>
            </div>
          )}

          <button className="w-full py-2 bg-[#DA291C] hover:bg-[#c02218] text-white text-xs font-medium rounded-lg transition-colors">
            Speak to your RM →
          </button>
        </div>
      )}
    </div>
  )
}

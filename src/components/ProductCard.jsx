import { useState } from 'react'
import { TrendingUp, TrendingDown, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import PriceChart from './PriceChart'
import { RISK_COLORS, CATEGORY_COLORS } from '../data/products'

const BADGE_STYLES = {
  LIVE: 'bg-green-50 text-green-700 border-green-200',
  NEW:  'bg-blue-50 text-blue-700 border-blue-200',
  STO:  'bg-amber-50 text-amber-700 border-amber-200',
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
    <div className="bg-white border border-dbs-border rounded shadow-dbs overflow-hidden hover:border-dbs-border-md transition-colors">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center text-xs font-bold font-mono"
              style={{ background: `${categoryColor}15`, color: categoryColor }}
            >
              {product.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-dbs-text">{product.name}</span>
                {product.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold ${BADGE_STYLES[product.badge]}`}>
                    {product.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-dbs-muted">{product.category}</span>
            </div>
          </div>

          {/* Price or yield */}
          <div className="text-right">
            {product.isCrypto ? (
              <>
                <div className="text-sm font-mono font-semibold text-dbs-text">
                  {formatPrice(price, product.currency, product.coingeckoId)}
                </div>
                {change24h !== undefined && (
                  <div className={`flex items-center justify-end gap-0.5 text-xs font-medium ${isUp ? 'text-green-600' : 'text-dbs-red'}`}>
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {isUp ? '+' : ''}{change24h?.toFixed(2)}%
                  </div>
                )}
              </>
            ) : product.yield ? (
              <div>
                <div className="text-sm font-mono font-semibold text-green-600">{product.yield}</div>
                <div className="text-xs text-dbs-muted">Current yield</div>
              </div>
            ) : product.coupon ? (
              <div>
                <div className="text-sm font-mono font-semibold text-amber-600">{product.coupon}</div>
                <div className="text-xs text-dbs-muted">Coupon p.a.</div>
              </div>
            ) : product.targetReturn ? (
              <div>
                <div className="text-sm font-mono font-semibold text-purple-600">{product.targetReturn}</div>
                <div className="text-xs text-dbs-muted">Target IRR</div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mini chart */}
        {!compact && (
          <PriceChart product={product} height={100} showRangeSelector={false} />
        )}

        {/* Key stats row */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-dbs-border">
          <div className="flex items-center gap-1">
            <span className="text-xs text-dbs-muted">Min</span>
            <span className="text-xs font-mono font-semibold text-dbs-text">
              {product.currency === 'SGD' ? 'SGD' : '$'}{product.minInvestment.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor }} />
            <span className="text-xs text-dbs-muted">{product.risk} risk</span>
          </div>
          {product.liquidity === 'Low' && (
            <div className="flex items-center gap-1">
              <Lock size={10} className="text-dbs-muted" />
              <span className="text-xs text-dbs-muted">Illiquid</span>
            </div>
          )}
          <div className="ml-auto">
            <span className="text-[10px] text-dbs-faint font-mono">{product.blockchain}</span>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-xs text-dbs-muted hover:text-dbs-text border-t border-dbs-border hover:bg-dbs-bg transition-colors"
      >
        <span>{expanded ? 'Less detail' : 'More detail'}</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-dbs-border pt-3">
          <p className="text-xs text-dbs-muted leading-relaxed">{product.description}</p>

          <div className="grid grid-cols-2 gap-2">
            {product.tenor && (
              <div>
                <div className="text-[10px] text-dbs-muted uppercase tracking-wide mb-0.5">Tenor</div>
                <div className="text-xs text-dbs-text font-medium">{product.tenor}</div>
              </div>
            )}
            {product.rating && (
              <div>
                <div className="text-[10px] text-dbs-muted uppercase tracking-wide mb-0.5">Rating</div>
                <div className="text-xs text-green-700 font-mono font-semibold">{product.rating}</div>
              </div>
            )}
            {product.issuedBy && (
              <div>
                <div className="text-[10px] text-dbs-muted uppercase tracking-wide mb-0.5">Issuer</div>
                <div className="text-xs text-dbs-text font-medium">{product.issuedBy}</div>
              </div>
            )}
            {product.settlementCycle && (
              <div>
                <div className="text-[10px] text-dbs-muted uppercase tracking-wide mb-0.5">Settlement</div>
                <div className="text-xs text-dbs-text font-medium">{product.settlementCycle}</div>
              </div>
            )}
            {product.geography && (
              <div>
                <div className="text-[10px] text-dbs-muted uppercase tracking-wide mb-0.5">Geography</div>
                <div className="text-xs text-dbs-text font-medium">{product.geography}</div>
              </div>
            )}
            {product.underlyingFund && (
              <div className="col-span-2">
                <div className="text-[10px] text-dbs-muted uppercase tracking-wide mb-0.5">Underlying Fund</div>
                <div className="text-xs text-dbs-text font-medium">{product.underlyingFund}</div>
              </div>
            )}
          </div>

          {product.structure && (
            <div className="bg-dbs-bg border border-dbs-border rounded p-2.5">
              <div className="text-[10px] text-dbs-muted uppercase tracking-wide mb-1">Structure</div>
              <div className="text-xs text-dbs-text">{product.structure}</div>
            </div>
          )}

          <button className="w-full py-2 bg-dbs-red hover:bg-dbs-red-dark text-white text-xs font-semibold rounded transition-colors">
            Speak to your RM →
          </button>
        </div>
      )}
    </div>
  )
}

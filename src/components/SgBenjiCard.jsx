import { useState, useEffect } from 'react'
import PriceChart from './PriceChart'
import { PRODUCTS } from '../data/products'

const CHAIN_DATA = [
  { name: 'Stellar', value: 651.6, share: 64.4, change: -3.99 },
  { name: 'BNB Chain', value: 113.6, share: 11.22, change: 0.24 },
  { name: 'Base', value: 58.7, share: 5.80, change: 0.27 },
  { name: 'Arbitrum', value: 50.8, share: 5.02, change: 0.26 },
  { name: 'Ethereum', value: 47.4, share: 4.68, change: 0.25 },
  { name: 'Avalanche', value: 36.2, share: 3.58, change: 0.27 },
  { name: 'Polygon', value: 31.7, share: 3.13, change: 0.25 },
  { name: 'XRP Ledger', value: 5.2, share: 0.51, change: 0.31 },
]

export default function SgBenjiCard() {
  const product = PRODUCTS.sgbenji
  const [stats] = useState({
    aum: '$1.01B',
    aum30dChange: -2.53,
    holders: 1094,
    holders30dChange: 0.83,
    monthlyVolume: '$1.62M',
    monthlyVolume30dChange: -97.92,
    activeAddresses: 17,
    yield: '5.12%',
    lastUpdated: new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }),
  })

  return (
    <div className="bg-white border border-apa-border rounded shadow-apa overflow-hidden w-full max-w-lg">
      {/* Header */}
      <div className="p-4 border-b border-apa-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center">
              <span className="text-blue-600 text-xs font-bold">FT</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-apa-text">Franklin Templeton sgBENJI</div>
              <div className="text-xs text-apa-muted">Tokenised Money Market Fund · XRP Ledger</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-mono font-bold text-green-600">{stats.yield}</div>
            <div className="text-[10px] text-apa-muted">7-day yield</div>
          </div>
        </div>
        <div className="text-[10px] text-apa-muted mt-1">
          DBS × Franklin Templeton × Ripple · Listed on DDEx Sept 2025
        </div>
      </div>

      {/* AUM Chart */}
      <div className="px-4 pt-3 pb-1">
        <div className="text-[10px] text-apa-muted uppercase tracking-wide font-semibold mb-2">NAV Performance (30D)</div>
        <PriceChart product={product} height={100} showRangeSelector={false} />
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-px bg-apa-border border-t border-apa-border">
        <StatBox
          label="Total AUM"
          value={stats.aum}
          change={stats.aum30dChange}
          sub="vs 30d ago"
        />
        <StatBox
          label="Token Holders"
          value={stats.holders.toLocaleString()}
          change={stats.holders30dChange}
          sub="vs 30d ago"
        />
        <StatBox
          label="Monthly Volume"
          value={stats.monthlyVolume}
          change={stats.monthlyVolume30dChange}
          sub="transfer vol"
        />
        <StatBox
          label="Active Addresses"
          value={stats.activeAddresses}
          sub="last 30 days"
        />
      </div>

      {/* Chain breakdown */}
      <div className="p-4 border-t border-apa-border">
        <div className="text-[10px] text-apa-muted uppercase tracking-wide font-semibold mb-3">AUM by Chain</div>
        <div className="space-y-2">
          {CHAIN_DATA.slice(0, 4).map(chain => (
            <div key={chain.name} className="flex items-center gap-2">
              <div className="text-xs text-apa-text w-20 flex-shrink-0 font-medium">{chain.name}</div>
              <div className="flex-1 bg-apa-bg border border-apa-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-apa-red"
                  style={{ width: `${chain.share}%` }}
                />
              </div>
              <div className="text-xs font-mono font-semibold text-apa-text w-10 text-right">{chain.share}%</div>
              <div className={`text-[10px] w-12 text-right font-medium ${chain.change >= 0 ? 'text-green-600' : 'text-apa-red'}`}>
                {chain.change >= 0 ? '+' : ''}{chain.change}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="px-4 pb-4 space-y-2">
        <div className="bg-apa-bg border border-apa-border rounded p-3 space-y-1.5">
          <Row label="Underlying Fund" value="Franklin OnChain U.S. Govt Money Fund (FOBXX)" />
          <Row label="Min Investment" value="USD 1,000" />
          <Row label="Settlement" value="Minutes (on-chain)" />
          <Row label="Collateral Use" value="Eligible for DBS repo transactions" />
          <Row label="Settlement Asset" value="RLUSD (swap pair on DDEx)" />
        </div>
        <div className="text-[10px] text-apa-faint text-right">
          Data via rwa.xyz · Updated {stats.lastUpdated}
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, change, sub }) {
  const isUp = change >= 0
  return (
    <div className="bg-white p-3">
      <div className="text-[10px] text-apa-muted uppercase tracking-wide mb-1">{label}</div>
      <div className="text-base font-mono font-semibold text-apa-text">{value}</div>
      {change !== undefined ? (
        <div className={`text-[10px] font-medium ${isUp ? 'text-green-600' : 'text-apa-red'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(change)}% {sub}
        </div>
      ) : (
        <div className="text-[10px] text-apa-muted">{sub}</div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[10px] text-apa-muted flex-shrink-0">{label}</span>
      <span className="text-[10px] text-apa-text font-medium text-right">{value}</span>
    </div>
  )
}

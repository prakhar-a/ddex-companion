import { useState, useEffect, useRef } from 'react'
import { checkSuitability } from '../utils/openrouter'

function FormattedText({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="text-dbs-red font-semibold">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}

const PRODUCT_LABELS = {
  btc: 'Bitcoin (BTC)',
  eth: 'Ethereum (ETH)',
  rlusd: 'RLUSD',
  sgbenji: 'sgBENJI',
  btcnote: 'BTC Participation Note',
  dbsbond: 'DBS Digital Bond 2026',
  apacpe: 'APAC Private Equity Token',
}

export default function SuitabilityReasoner({ user, productId, onResult }) {
  const [assessment, setAssessment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    checkSuitability(user, productId)
      .then(text => {
        setAssessment(text)
        setLoading(false)
        onResult?.(text)
      })
      .catch(err => {
        const msg = err.message || 'Unknown error'
        setError(msg)
        setLoading(false)
        onResult?.(`Suitability assessment failed: ${msg}`)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const productLabel = productId ? PRODUCT_LABELS[productId] : null

  return (
    <div className="mt-3 border border-dbs-border rounded shadow-dbs bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dbs-border bg-dbs-red-light">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-dbs-red flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[9px] font-bold">SR</span>
          </div>
          <span className="text-xs font-semibold text-dbs-text">Suitability Assessment</span>
          {productLabel && (
            <span className="text-[10px] px-2 py-0.5 bg-white border border-dbs-border rounded text-dbs-muted font-medium">
              {productLabel}
            </span>
          )}
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ backgroundColor: user.color + '22', color: user.color }}
        >
          {user.name}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {loading && (
          <div className="flex items-center gap-3 py-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-dbs-red animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-dbs-red animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-dbs-red animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-dbs-muted">Assessing suitability…</span>
          </div>
        )}

        {error && (
          <p className="text-xs text-dbs-red py-2">{error}</p>
        )}

        {assessment && (
          <div className="text-sm text-dbs-text leading-relaxed space-y-2">
            {assessment.split('\n').map((line, i) => {
              if (!line.trim()) return null
              const isHeading = line.trim().startsWith('##') || /^\d+\.\s+\*\*/.test(line.trim())
              return (
                <p key={i} className={isHeading ? 'mt-3 first:mt-0' : ''}>
                  <FormattedText text={line.replace(/^#+\s*/, '')} />
                </p>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-dbs-border bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-dbs-faint">Indicative only · Not personalised financial advice</span>
          <button
            onClick={() => window.alert('Contact your DBS Relationship Manager for personalised suitability advice.')}
            className="text-[10px] text-dbs-red hover:underline font-medium"
          >
            Speak to RM →
          </button>
        </div>
      </div>
    </div>
  )
}

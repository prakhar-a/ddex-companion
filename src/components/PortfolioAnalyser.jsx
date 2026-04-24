import { useState, useEffect, useRef } from 'react'
import { analysePortfolio } from '../utils/openrouter'

function FormattedText({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="text-apa-red font-semibold">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}

export default function PortfolioAnalyser({ user, question, onResult }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Guard against double-firing in Strict Mode / re-renders
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    analysePortfolio(user, question)
      .then(text => {
        setAnalysis(text)
        setLoading(false)
        onResult?.(text)
      })
      .catch(err => {
        const msg = err.message || 'Unknown error'
        setError(msg)
        setLoading(false)
        onResult?.(`Portfolio analysis failed: ${msg}`)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const txCount = user.transactions.length

  return (
    <div className="mt-3 border border-apa-border rounded shadow-apa bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-apa-border bg-apa-red-light">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-apa-red flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[9px] font-bold">PA</span>
          </div>
          <span className="text-xs font-semibold text-apa-text">Portfolio Analysis</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: user.color + '22', color: user.color }}
          >
            {user.name}
          </span>
        </div>
        <span className="text-[10px] text-apa-muted">{txCount} transaction{txCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {loading && (
          <div className="flex items-center gap-3 py-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-apa-red animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-apa-red animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-apa-red animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-apa-muted">Analysing portfolio…</span>
          </div>
        )}

        {error && (
          <p className="text-xs text-apa-red py-2">{error}</p>
        )}

        {analysis && (
          <div className="text-sm text-apa-text leading-relaxed space-y-2">
            {analysis.split('\n').map((line, i) => {
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
      <div className="px-4 py-2.5 border-t border-apa-border bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-apa-faint">AI-powered · Educational only · Not financial advice</span>
          <button
            onClick={() => window.alert('Contact your DBS Relationship Manager for personalised advice.')}
            className="text-[10px] text-apa-red hover:underline font-medium"
          >
            Speak to RM →
          </button>
        </div>
      </div>
    </div>
  )
}

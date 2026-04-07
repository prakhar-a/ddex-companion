import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RotateCcw, History, X, Trash2 } from 'lucide-react'
import { sendMessage, parseDirectives } from './utils/openrouter'
import { useLivePrices } from './hooks/useCoinGecko'
import { PRODUCTS, PRODUCT_LIST, SUGGESTED_PROMPTS } from './data/products'
import ProductCard from './components/ProductCard'
import AnalysisPanel from './components/AnalysisPanel'
import SgBenjiCard from './components/SgBenjiCard'

const CRYPTO_IDS = ['bitcoin', 'ethereum', 'ripple-usd']
const SESSIONS_KEY = 'ddex_chat_sessions'
const MAX_SESSIONS = 30

// ── Session helpers ──────────────────────────────────────────────────────────

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
  } catch {
    return []
  }
}

function persistSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch { /* storage full — silently skip */ }
}

function upsertSession(session) {
  const sessions = loadSessions()
  const idx = sessions.findIndex(s => s.id === session.id)
  if (idx >= 0) {
    sessions[idx] = session
  } else {
    sessions.unshift(session)
    if (sessions.length > MAX_SESSIONS) sessions.pop()
  }
  persistSessions(sessions)
}

function removeSession(id) {
  persistSessions(loadSessions().filter(s => s.id !== id))
}

function sessionTitle(messages) {
  const first = messages.find(m => m.role === 'user')
  if (!first) return 'Untitled'
  return first.content.length > 55 ? first.content.slice(0, 52) + '…' : first.content
}

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

// ── Product helpers ──────────────────────────────────────────────────────────

function filterProducts(filter) {
  switch (filter?.toLowerCase()) {
    case 'yield':
      return PRODUCT_LIST.filter(p => p.yield || p.coupon || p.targetReturn)
    case 'crypto':
      return PRODUCT_LIST.filter(p => p.isCrypto)
    case 'sto':
      return PRODUCT_LIST.filter(p => p.category.includes('Security Token'))
    case 'stable':
    case 'stablecoin':
      return PRODUCT_LIST.filter(p => p.category === 'Stablecoin' || p.id === 'sgbenji')
    default:
      return PRODUCT_LIST
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RichContent({ directives, priceData }) {
  if (!directives?.length) return null
  return (
    <div className="space-y-3 mt-3">
      {directives.map((d, i) => {
        if (d.type === 'SHOW_PRODUCTS') {
          const products = filterProducts(d.filter)
          return (
            <div key={i} className="space-y-3">
              {products.map(p => (
                <ProductCard key={p.id} product={p} priceData={priceData} />
              ))}
            </div>
          )
        }
        if (d.type === 'SHOW_PRODUCT') {
          const p = PRODUCTS[d.id]
          if (!p) return null
          return <ProductCard key={i} product={p} priceData={priceData} />
        }
        if (d.type === 'SHOW_ANALYSIS') {
          const coin = d.coin?.toLowerCase()
          if (!['btc', 'eth'].includes(coin)) return null
          return <AnalysisPanel key={i} coin={coin} priceData={priceData} />
        }
        if (d.type === 'SHOW_SGBENJI') {
          return <SgBenjiCard key={i} />
        }
        return null
      })}
    </div>
  )
}

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

function MessageBubble({ msg, priceData }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg-enter flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5 bg-dbs-red">
          <span className="text-white text-[10px] font-bold">AI</span>
        </div>
      )}
      <div className={`${isUser ? 'max-w-[75%]' : 'max-w-full flex-1'}`}>
        <div
          className={`rounded px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-dbs-red text-white rounded-tr-sm ml-auto w-fit'
              : 'bg-white text-dbs-text rounded-tl-sm border border-dbs-border shadow-dbs'
          }`}
        >
          {msg.content.split('\n').map((line, i, arr) => (
            <p key={i} className={i < arr.length - 1 && line === '' ? 'mt-2' : undefined}>
              <FormattedText text={line} />
            </p>
          ))}
        </div>
        {msg.directives?.length > 0 && (
          <RichContent directives={msg.directives} priceData={priceData} />
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="msg-enter flex justify-start mb-4">
      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mr-2.5 bg-dbs-red">
        <span className="text-white text-[10px] font-bold">AI</span>
      </div>
      <div className="bg-white border border-dbs-border rounded rounded-tl-sm px-4 py-3.5 shadow-dbs">
        <div className="flex gap-1 items-center h-4">
          <div className="dot w-1.5 h-1.5 rounded-full bg-dbs-muted" />
          <div className="dot w-1.5 h-1.5 rounded-full bg-dbs-muted" />
          <div className="dot w-1.5 h-1.5 rounded-full bg-dbs-muted" />
        </div>
      </div>
    </div>
  )
}

function LiveTicker({ prices }) {
  const coins = [
    { id: 'bitcoin', sym: 'BTC' },
    { id: 'ethereum', sym: 'ETH' },
    { id: 'ripple-usd', sym: 'RLUSD' },
  ]
  return (
    <div className="hidden sm:flex items-center gap-5">
      {coins.map(({ id, sym }) => {
        const p = prices[id]
        if (!p) return null
        const isUp = p.usd_24h_change >= 0
        return (
          <div key={id} className="flex items-center gap-1.5">
            <span className="text-[10px] text-dbs-muted font-mono uppercase tracking-wide">{sym}</span>
            <span className="text-xs font-mono text-dbs-text font-semibold">
              ${p.usd >= 1
                ? p.usd.toLocaleString('en-US', { maximumFractionDigits: p.usd < 10 ? 4 : 0 })
                : p.usd.toFixed(4)}
            </span>
            <span className={`text-[10px] font-mono font-medium ${isUp ? 'text-green-600' : 'text-dbs-red'}`}>
              {isUp ? '+' : ''}{p.usd_24h_change.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function DbsLogo() {
  return (
    <div className="flex items-center gap-2.5">
      {/* DBS Spark icon */}
      <svg width="38" height="38" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Pincushion spark shape: 4 rounded lobes at N/E/S/W, concave pinch at NE/SE/SW/NW */}
        <path
          d="M50 5 C63 5,79 18,79 29 C79 38,95 38,95 50 C95 62,79 62,79 71 C79 82,63 95,50 95 C37 95,21 82,21 71 C21 62,5 62,5 50 C5 38,21 38,21 29 C21 18,37 5,50 5 Z"
          fill="#EF3340"
        />
        {/* White tapered X — 4 arms pointing to diagonal corners */}
        <path
          d="M50 45 L77 18 L82 23 L55 50 L82 77 L77 82 L50 55 L23 82 L18 77 L45 50 L18 23 L23 18 Z"
          fill="white"
        />
      </svg>
      {/* DBS wordmark */}
      <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '22px', fontWeight: '900', color: '#0d0d0d', letterSpacing: '-0.5px', lineHeight: 1 }}>DBS</span>
    </div>
  )
}

// ── History Sidebar ──────────────────────────────────────────────────────────

function HistorySidebar({ sessions, currentId, onLoad, onDelete, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed top-0 left-0 h-full w-72 bg-white border-r border-dbs-border shadow-lg z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-dbs-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <History size={14} className="text-dbs-red" />
            <span className="text-sm font-semibold text-dbs-text">Chat History</span>
          </div>
          <button
            onClick={onClose}
            className="text-dbs-muted hover:text-dbs-text transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <History size={28} className="text-dbs-faint mx-auto mb-2" />
              <p className="text-xs text-dbs-faint">No past conversations yet.</p>
              <p className="text-[10px] text-dbs-faint mt-1">Start chatting and they'll appear here.</p>
            </div>
          ) : (
            sessions.map(s => {
              const isActive = s.id === currentId
              return (
                <div
                  key={s.id}
                  className={`group flex items-start gap-2 px-3 py-2.5 mx-1 rounded cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-dbs-red-light border border-dbs-red/20'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => { onLoad(s); onClose() }}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate leading-snug ${isActive ? 'text-dbs-red' : 'text-dbs-text'}`}>
                      {sessionTitle(s.messages)}
                    </p>
                    <p className="text-[10px] text-dbs-faint mt-0.5">
                      {formatDate(s.updatedAt)} · {s.messages.length} msg{s.messages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(s.id) }}
                    className="flex-shrink-0 mt-0.5 text-dbs-faint hover:text-dbs-red opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-dbs-border text-[10px] text-dbs-faint text-center">
          Stored locally · Up to {MAX_SESSIONS} conversations
        </div>
      </div>
    </>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [sessions, setSessions] = useState(() => loadSessions())
  const [showHistory, setShowHistory] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const { prices, loading: pricesLoading } = useLivePrices(CRYPTO_IDS)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-save current session whenever messages change
  useEffect(() => {
    if (messages.length === 0) return
    const id = currentSessionId
    if (!id) return
    const session = {
      id,
      messages,
      createdAt: sessions.find(s => s.id === id)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    upsertSession(session)
    setSessions(loadSessions())
  }, [messages]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')

    // Create a session ID on the first message of a new chat
    const sessionId = currentSessionId || genId()
    if (!currentSessionId) setCurrentSessionId(sessionId)

    const userMsg = { role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }))
      const raw = await sendMessage(history)
      const { text: cleanText, directives } = parseDirectives(raw)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanText,
        directives,
      }])
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${e.message}`,
        directives: [],
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, messages, loading, currentSessionId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const reset = () => {
    setMessages([])
    setInput('')
    setCurrentSessionId(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleLoadSession = (session) => {
    setMessages(session.messages)
    setCurrentSessionId(session.id)
    setInput('')
  }

  const handleDeleteSession = (id) => {
    removeSession(id)
    setSessions(loadSessions())
    if (id === currentSessionId) reset()
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-screen bg-dbs-bg overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white border-b border-dbs-border px-5 py-3 flex items-center justify-between shadow-dbs">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <DbsLogo />
          <div className="w-px h-6 bg-dbs-border" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-dbs-text">DDEx</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-dbs-red-light text-dbs-red rounded font-mono border border-dbs-red/20 font-semibold">
                AI
              </span>
            </div>
            <div className="text-[10px] text-dbs-muted -mt-0.5">Digital Exchange Companion</div>
          </div>

          <div className="w-px h-5 bg-dbs-border" />

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${pricesLoading ? 'bg-yellow-500' : 'bg-green-500 live-dot'}`} />
            <span className="text-[10px] text-dbs-muted">
              {pricesLoading ? 'Connecting…' : 'Live'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LiveTicker prices={prices} />

          {/* History button */}
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 text-[11px] text-dbs-muted hover:text-dbs-text transition-colors"
            title="Chat history"
          >
            <History size={13} />
            <span className="hidden sm:inline">History</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-[11px] text-dbs-muted hover:text-dbs-text transition-colors"
            >
              <RotateCcw size={11} />
              <span>New chat</span>
            </button>
          )}
        </div>
      </header>

      {/* ── History Sidebar ── */}
      {showHistory && (
        <HistorySidebar
          sessions={sessions}
          currentId={currentSessionId}
          onLoad={handleLoadSession}
          onDelete={handleDeleteSession}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (

          /* Landing */
          <div className="max-w-5xl mx-auto px-4 py-10">
            {/* Hero */}
            <div className="flex items-start gap-6 mb-8">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-dbs-red rounded flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">D</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-dbs-text mb-1">DDEx AI Companion</h1>
                <div className="w-8 h-0.5 bg-dbs-red mb-2" />
                <p className="text-sm text-dbs-muted leading-relaxed">
                  Your intelligent guide to DBS Digital Exchange — Asia's first bank-backed digital asset ecosystem. Ask about products, get live prices, run technical analysis, or explore the full tokenised asset universe.
                </p>
              </div>
            </div>

            {/* About DDEx */}
            <div className="bg-white border border-dbs-border rounded shadow-dbs p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-dbs-red rounded-full" />
                <span className="text-xs font-semibold text-dbs-text uppercase tracking-wider">About DBS Digital Exchange</span>
              </div>
              <p className="text-sm text-dbs-muted leading-relaxed mb-4">
                DBS Digital Exchange (DDEx) is an institutional-grade platform to <strong className="text-dbs-text">tokenise, trade and custody digital assets</strong>. Built on the trust and infrastructure of DBS Bank, DDEx enables accredited and institutional investors to access fully regulated digital asset services — from cryptocurrency trading to security token offerings.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { stat: '23/7', label: 'Crypto Trading' },
                  { stat: '8', label: 'Cryptocurrencies' },
                  { stat: '2', label: 'Fiat Currencies' },
                ].map(({ stat, label }) => (
                  <div key={label} className="bg-dbs-red-light border border-dbs-red/20 rounded p-3 text-center">
                    <div className="text-lg font-bold text-dbs-red">{stat}</div>
                    <div className="text-[10px] text-dbs-muted mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { icon: '⚡', title: 'Crypto Trading', desc: 'BTC, ETH, BCH, DOT, ADA, XRP, USDC, RLUSD — with SGD & USD pairs' },
                { icon: '📋', title: 'Request for Quote', desc: 'Execute large block trades with minimal price slippage via RFQ' },
                { icon: '🔐', title: 'Security Tokens', desc: 'Tokenised traditional securities with blockchain-based settlement' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-white border border-dbs-border rounded shadow-dbs p-4">
                  <div className="text-xl mb-2">{icon}</div>
                  <div className="text-xs font-semibold text-dbs-text mb-1">{title}</div>
                  <div className="text-[11px] text-dbs-muted leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>

            {/* Eligibility */}
            <div className="bg-white border border-dbs-border rounded shadow-dbs p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-dbs-red/50 rounded-full" />
                <span className="text-xs font-semibold text-dbs-muted uppercase tracking-wider">Eligibility</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Financial Institutions', 'Corporate Accredited Investors', 'Family Offices', 'Professional Market Makers', 'DBS Private Bank Clients'].map(label => (
                  <span key={label} className="text-[11px] px-2.5 py-1 bg-dbs-red-light border border-dbs-red/20 rounded text-dbs-muted">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Suggested prompts */}
            <div className="space-y-2 mb-5">
              <div className="text-[10px] text-dbs-faint uppercase tracking-wider mb-2">Suggested questions</div>
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 bg-white hover:bg-dbs-red-light border border-dbs-border hover:border-dbs-red/30 rounded text-sm text-dbs-muted hover:text-dbs-text transition-all disabled:opacity-50 shadow-dbs"
                >
                  <span className="text-dbs-red mr-2 font-semibold">→</span>
                  {prompt}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-dbs-faint text-center leading-relaxed">
              For accredited and institutional investors only · Not financial advice · Capital at risk · MAS-regulated · Not available to U.S. persons
            </div>
          </div>

        ) : (

          /* Chat messages */
          <div className="max-w-5xl mx-auto px-4 py-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} priceData={prices} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

        )}
      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0 bg-white border-t border-dbs-border px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end gap-3 bg-white border border-dbs-border rounded px-4 py-3 focus-within:border-dbs-border-md transition-colors shadow-dbs">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products, prices, analysis…"
              rows={1}
              className="flex-1 bg-transparent text-sm text-dbs-text placeholder-dbs-faint resize-none outline-none leading-relaxed"
              style={{ scrollbarWidth: 'none', minHeight: '22px' }}
              autoFocus
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 bg-dbs-red hover:bg-dbs-red-dark disabled:bg-dbs-border disabled:text-dbs-muted text-white rounded flex items-center justify-center transition-colors disabled:cursor-not-allowed"
            >
              {loading
                ? <div className="w-3 h-3 border border-dbs-muted border-t-transparent rounded-full animate-spin" />
                : <Send size={13} />
              }
            </button>
          </div>
          <p className="text-[10px] text-dbs-faint text-center mt-2">
            DDEx · Accredited & Institutional Investors Only · Not financial advice
          </p>
        </div>
      </div>

    </div>
  )
}

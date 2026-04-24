import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RotateCcw, History, X, Trash2, Info } from 'lucide-react'
import { processMessage } from './utils/openrouter'
import { useLivePrices } from './hooks/useCoinGecko'
import { PRODUCTS, PRODUCT_LIST } from './data/products'
import { USERS, DEFAULT_USER } from './data/users'
import ProductCard from './components/ProductCard'
import AnalysisPanel from './components/AnalysisPanel'
import SgBenjiCard from './components/SgBenjiCard'
import UserSwitcher from './components/UserSwitcher'
import PortfolioAnalyser from './components/PortfolioAnalyser'
import SuitabilityReasoner from './components/SuitabilityReasoner'

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
    case 'btc':
    case 'bitcoin':
      return PRODUCT_LIST.filter(p => p.id === 'btc' || p.id === 'btcnote')
    case 'eth':
    case 'ethereum':
      return PRODUCT_LIST.filter(p => p.id === 'eth')
    default:
      return PRODUCT_LIST
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RichContent({ intent, priceData, currentUser, onAppendMessage }) {
  if (!intent || intent.type === 'general') return null

  if (intent.type === 'show_products') {
    const products = filterProducts(intent.filter)
    return (
      <div className="space-y-3 mt-3">
        {products.map(p => (
          <ProductCard key={p.id} product={p} priceData={priceData} />
        ))}
      </div>
    )
  }

  if (intent.type === 'show_product') {
    const p = PRODUCTS[intent.id]
    if (!p) return null
    return (
      <div className="mt-3">
        <ProductCard product={p} priceData={priceData} />
      </div>
    )
  }

  if (intent.type === 'show_analysis') {
    const coin = intent.coin?.toLowerCase()
    if (!['btc', 'eth'].includes(coin)) return null
    return (
      <div className="mt-3">
        <AnalysisPanel coin={coin} priceData={priceData} />
      </div>
    )
  }

  if (intent.type === 'show_sgbenji') {
    return (
      <div className="mt-3">
        <SgBenjiCard />
      </div>
    )
  }

  if (intent.type === 'portfolio_analysis') {
    return (
      <PortfolioAnalyser
        user={currentUser}
        question={intent.question}
      />
    )
  }

  if (intent.type === 'suitability_check') {
    return (
      <SuitabilityReasoner
        user={currentUser}
        productId={intent.productId}
      />
    )
  }

  return null
}

function FormattedText({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="font-semibold text-apa-text">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}

function MessageBubble({ msg, priceData, currentUser, onAppendMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg-enter flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5 bg-apa-red">
          <span className="text-white text-[10px] font-bold">AI</span>
        </div>
      )}
      <div className={`${isUser ? 'max-w-[75%]' : 'max-w-full flex-1'}`}>
        <div
          className={`rounded px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-apa-red text-white rounded-tr-sm ml-auto w-fit'
              : 'bg-white text-apa-text rounded-tl-sm border border-apa-border border-l-2 border-l-apa-red shadow-apa'
          }`}
        >
          {msg.content.split('\n').map((line, i, arr) => (
            <p key={i} className={i < arr.length - 1 && line === '' ? 'mt-2' : undefined}>
              <FormattedText text={line} />
            </p>
          ))}
        </div>
        {!isUser && msg.intent && (
          <RichContent
            intent={msg.intent}
            priceData={priceData}
            currentUser={currentUser}
            onAppendMessage={onAppendMessage}
          />
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="msg-enter flex justify-start mb-4">
      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mr-2.5 bg-apa-red">
        <span className="text-white text-[10px] font-bold">AI</span>
      </div>
      <div className="bg-white border border-apa-border rounded rounded-tl-sm px-4 py-3.5 shadow-apa">
        <div className="flex gap-1 items-center h-4">
          <div className="dot w-1.5 h-1.5 rounded-full bg-apa-muted" />
          <div className="dot w-1.5 h-1.5 rounded-full bg-apa-muted" />
          <div className="dot w-1.5 h-1.5 rounded-full bg-apa-muted" />
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
            <span className="text-[10px] text-apa-muted font-mono uppercase tracking-wide">{sym}</span>
            <span className="text-xs font-mono text-apa-text font-semibold">
              ${p.usd >= 1
                ? p.usd.toLocaleString('en-US', { maximumFractionDigits: p.usd < 10 ? 4 : 0 })
                : p.usd.toFixed(4)}
            </span>
            <span className={`text-[10px] font-mono font-medium ${isUp ? 'text-green-600' : 'text-apa-red'}`}>
              {isUp ? '+' : ''}{p.usd_24h_change.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ApaLogo() {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* APA monogram on steel-blue tile */}
      <div
        style={{ width: 40, height: 40, background: '#6B8B9A', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <svg width="36" height="28" viewBox="0 0 90 70" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 62 L14 8 L20 8 L34 62 L28 62 L24 46 L10 46 L6 62 Z M12 40 L22 40 L17 18 Z" fill="white" />
          <path d="M38 8 L38 62 L44 62 L44 38 L54 38 C62 38 67 33 67 25 C67 16 62 8 54 8 Z M44 14 L53 14 C58 14 61 18 61 25 C61 32 58 32 53 32 L44 32 Z" fill="white" />
          <path d="M56 62 L70 8 L76 8 L90 62 L84 62 L80 46 L66 46 L62 62 Z M68 40 L78 40 L73 18 Z" fill="white" />
          <path d="M44 50 Q56 56 67 50" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
        </svg>
      </div>
      {/* APA wordmark — hidden on small screens */}
      <div className="hidden sm:block">
        <div style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '18px', fontWeight: '700', color: '#1C2B33', letterSpacing: '0.5px', lineHeight: 1.1 }}>
          Atlantic Partners Asia
        </div>
        <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: '9px', fontWeight: '500', color: '#718794', letterSpacing: '1.5px', textTransform: 'uppercase', lineHeight: 1, marginTop: '1px' }}>
          Digital Exchange
        </div>
      </div>
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
      <div className="fixed top-0 left-0 h-full w-72 bg-white border-r border-apa-border shadow-lg z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-apa-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <History size={14} className="text-apa-red" />
            <span className="text-sm font-semibold text-apa-text">Chat History</span>
          </div>
          <button
            onClick={onClose}
            className="text-apa-muted hover:text-apa-text transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <History size={28} className="text-apa-faint mx-auto mb-2" />
              <p className="text-xs text-apa-faint">No past conversations yet.</p>
              <p className="text-[10px] text-apa-faint mt-1">Start chatting and they'll appear here.</p>
            </div>
          ) : (
            sessions.map(s => {
              const isActive = s.id === currentId
              return (
                <div
                  key={s.id}
                  className={`group flex items-start gap-2 px-3 py-2.5 mx-1 rounded cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-apa-red-light border border-apa-red/20'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => { onLoad(s); onClose() }}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate leading-snug ${isActive ? 'text-apa-red' : 'text-apa-text'}`}>
                      {sessionTitle(s.messages)}
                    </p>
                    <p className="text-[10px] text-apa-faint mt-0.5">
                      {formatDate(s.updatedAt)} · {s.messages.length} msg{s.messages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(s.id) }}
                    className="flex-shrink-0 mt-0.5 text-apa-faint hover:text-apa-red opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-apa-border text-[10px] text-apa-faint text-center">
          Stored locally · Up to {MAX_SESSIONS} conversations
        </div>
      </div>
    </>
  )
}

// ── Portfolio Sidebar Content ─────────────────────────────────────────────────

const TX_STYLE = {
  BUY:    { bg: '#dcfce7', color: '#16a34a' },
  SELL:   { bg: '#fee2e2', color: '#dc2626' },
  SWAP:   { bg: '#dbeafe', color: '#2563eb' },
  YIELD:  { bg: '#fef9c3', color: '#a16207' },
  COUPON: { bg: '#fef9c3', color: '#a16207' },
}

function PortfolioSidebar({ currentUser, onClose }) {
  const totals = {}
  for (const tx of currentUser.transactions) {
    const m = tx.valueFmt.match(/^([A-Z]+)\s+([\d,]+)/)
    if (!m) continue
    const ccy = m[1]
    const val = parseInt(m[2].replace(/,/g, ''), 10)
    if (!totals[ccy]) totals[ccy] = 0
    if (tx.type === 'BUY' || tx.type === 'SWAP') totals[ccy] += val
    else if (tx.type === 'SELL') totals[ccy] -= val
  }

  return (
    <>
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-apa-border flex items-center justify-between flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${currentUser.color}20 0%, ${currentUser.color}08 100%)` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: currentUser.color }} />
          <span className="text-xs font-semibold text-apa-text uppercase tracking-wider">Transaction History</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: currentUser.color + '22', color: currentUser.color }}
          >
            {currentUser.transactions.length} total
          </span>
          {onClose && (
            <button onClick={onClose} className="text-apa-muted hover:text-apa-text transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Total Assets */}
      <div className="px-4 py-3 border-b border-apa-border flex-shrink-0">
        <div className="text-[10px] text-apa-faint uppercase tracking-wider mb-1">Total Assets</div>
        {Object.entries(totals).map(([ccy, val]) => (
          <div key={ccy} className="text-sm font-semibold font-mono text-apa-text">{ccy} {val.toLocaleString()}</div>
        ))}
      </div>

      {/* Transactions */}
      <div className="flex-1 divide-y divide-apa-border/40 overflow-y-auto">
        {currentUser.transactions.slice().reverse().map((tx, i) => {
          const typeStyle = TX_STYLE[tx.type] || { bg: '#f3f4f6', color: '#6b7280' }
          return (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}
                  >
                    {tx.type}
                  </span>
                  <span className="text-xs font-semibold text-apa-text">{tx.asset}</span>
                </div>
                <span className="text-xs font-mono text-apa-text">{tx.valueFmt}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tx.amount > 0 && (
                    <span className="text-[10px] text-apa-muted font-mono">
                      {tx.amount.toLocaleString()} {tx.asset.split('-')[0]}
                    </span>
                  )}
                  {tx.note && (
                    <span className="text-[10px] text-apa-faint">{tx.note}</span>
                  )}
                </div>
                <span className="text-[10px] text-apa-faint">{tx.date}</span>
              </div>
            </div>
          )
        })}
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
  const [showInfo, setShowInfo] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER)
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

  const handleAppendMessage = useCallback((text) => {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: text,
      intent: { type: 'general' },
    }])
  }, [])

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
      const { text: responseText, intent } = await processMessage(history)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        intent,
      }])
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${e.message}`,
        intent: { type: 'general' },
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

  const handleUserSwitch = (user) => {
    setCurrentUser(user)
    setMessages([])
    setInput('')
    setCurrentSessionId(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-screen bg-apa-bg overflow-hidden">

      {/* ── Top accent bar ── */}
      <div className="flex-shrink-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #6B8B9A 0%, #8AAAB8 50%, #6B8B9A 100%)' }} />

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white border-b border-apa-border px-3 sm:px-5 py-3 flex items-center justify-between shadow-apa-md">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Logo */}
          <ApaLogo />
          <div className="hidden sm:block w-px h-6 bg-apa-border" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-apa-text" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '15px', letterSpacing: '0.3px' }}>APA</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-apa-red-light text-apa-red rounded font-mono border border-apa-red/20 font-semibold">
                AI
              </span>
            </div>
            <div className="hidden sm:block text-[10px] text-apa-muted -mt-0.5" style={{ letterSpacing: '0.5px' }}>AI Companion</div>
          </div>

          <div className="hidden sm:block w-px h-5 bg-apa-border" />

          {/* Live indicator — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${pricesLoading ? 'bg-yellow-500' : 'bg-green-500 live-dot'}`} />
            <span className="text-[10px] text-apa-muted">
              {pricesLoading ? 'Connecting…' : 'Live'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LiveTicker prices={prices} />

          {/* Portfolio toggle — mobile only, shown when user has transactions */}
          {currentUser.transactions.length > 0 && (
            <button
              onClick={() => setShowPortfolio(true)}
              className="md:hidden flex items-center gap-1.5 text-[11px] text-apa-muted hover:text-apa-text transition-colors"
              title="View portfolio"
            >
              <span>Portfolio</span>
            </button>
          )}

          {/* About button */}
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-1.5 text-[11px] text-apa-muted hover:text-apa-text transition-colors"
            title="About DDEx"
          >
            <Info size={13} />
            <span className="hidden sm:inline">About</span>
          </button>

          {/* History button */}
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 text-[11px] text-apa-muted hover:text-apa-text transition-colors"
            title="Chat history"
          >
            <History size={13} />
            <span className="hidden sm:inline">History</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-[11px] text-apa-muted hover:text-apa-text transition-colors"
            >
              <RotateCcw size={11} />
              <span className="hidden sm:inline">New chat</span>
            </button>
          )}

          <div className="w-px h-5 bg-apa-border" />

          {/* User switcher */}
          <UserSwitcher currentUser={currentUser} onSwitch={handleUserSwitch} />
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

      {/* ── Info Panel ── */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowInfo(false)} />
          <div className="relative mr-auto w-full max-w-sm bg-white h-full shadow-xl flex flex-col overflow-y-auto" style={{ maxWidth: 'min(384px, 100vw)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-apa-border">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-apa-red rounded-full" />
                <span className="text-sm font-semibold text-apa-text">About Atlantic Partners Asia</span>
              </div>
              <button onClick={() => setShowInfo(false)} className="text-apa-muted hover:text-apa-text">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-5 flex-1">
              <p className="text-sm text-apa-muted leading-relaxed">
                Atlantic Partners Asia (APA) is a leading cross-border financial services firm specialising in <strong className="text-apa-text">digital assets, structured products and capital markets</strong>. APA connects institutional investors across Asia with world-class investment opportunities — from digital asset strategies to tokenised securities and structured notes.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { stat: '23/7', label: 'Crypto Trading' },
                  { stat: '8', label: 'Cryptocurrencies' },
                  { stat: '2', label: 'Fiat Currencies' },
                ].map(({ stat, label }) => (
                  <div key={label} className="bg-apa-red-light border border-apa-red/20 rounded p-3 text-center">
                    <div className="text-lg font-bold text-apa-red">{stat}</div>
                    <div className="text-[10px] text-apa-muted mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-apa-red/50 rounded-full" />
                  <span className="text-xs font-semibold text-apa-text uppercase tracking-wider">Services</span>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: '⚡', title: 'Crypto Trading', desc: 'BTC, ETH, BCH, DOT, ADA, XRP, USDC, RLUSD — with SGD & USD pairs' },
                    { icon: '📋', title: 'Request for Quote', desc: 'Execute large block trades with minimal price slippage via RFQ' },
                    { icon: '🔐', title: 'Security Tokens', desc: 'Tokenised traditional securities with blockchain-based settlement' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="bg-white border border-apa-border rounded p-4">
                      <div className="text-xl mb-2">{icon}</div>
                      <div className="text-xs font-semibold text-apa-text mb-1">{title}</div>
                      <div className="text-[11px] text-apa-muted leading-relaxed">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-apa-red/50 rounded-full" />
                  <span className="text-xs font-semibold text-apa-muted uppercase tracking-wider">Eligibility</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Financial Institutions', 'Corporate Accredited Investors', 'Family Offices', 'Professional Market Makers', 'DBS Private Bank Clients'].map(label => (
                    <span key={label} className="text-[11px] px-2.5 py-1 bg-apa-red-light border border-apa-red/20 rounded text-apa-muted">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-apa-faint leading-relaxed text-center">
                For accredited and institutional investors only · Not financial advice · Capital at risk · MAS-regulated · Not available to U.S. persons
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main body: chat + portfolio sidebar ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto apa-dot-grid">
          {isEmpty ? (

            /* Landing */
            <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-14">
              {/* Radial gradient overlay */}
              <div className="absolute inset-x-0 top-0 h-80 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(107,139,154,0.08) 0%, transparent 65%)' }} />

              {/* Hero — centered */}
              <div className="relative text-center mb-7 sm:mb-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-apa-md" style={{ background: '#6B8B9A' }}>
                  <svg width="48" height="36" viewBox="0 0 90 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 62 L14 8 L20 8 L34 62 L28 62 L24 46 L10 46 L6 62 Z M12 40 L22 40 L17 18 Z" fill="white" />
                    <path d="M38 8 L38 62 L44 62 L44 38 L54 38 C62 38 67 33 67 25 C67 16 62 8 54 8 Z M44 14 L53 14 C58 14 61 18 61 25 C61 32 58 32 53 32 L44 32 Z" fill="white" />
                    <path d="M56 62 L70 8 L76 8 L90 62 L84 62 L80 46 L66 46 L62 62 Z M68 40 L78 40 L73 18 Z" fill="white" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-apa-text mb-2 tracking-tight" style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 600 }}>
                  {currentUser.id === 'new'
                    ? 'Welcome to APA AI Companion'
                    : `Welcome back, ${currentUser.name.split(' ')[0]}`}
                </h1>
                <div className="w-12 h-0.5 bg-apa-red mx-auto mb-3" />
                <p className="text-sm text-apa-muted leading-relaxed max-w-md mx-auto">
                  {currentUser.id === 'new'
                    ? 'Your intelligent guide to DBS Digital Exchange — Asia\'s first bank-backed digital asset ecosystem. Ask about products, get live prices, run technical analysis, or explore the full tokenised asset universe.'
                    : currentUser.id === 'alex'
                    ? 'Your family office holds BTC and ETH across multiple tranches. Get live prices, technical analysis, or explore structured product alternatives.'
                    : currentUser.id === 'priya'
                    ? 'Your USD 12M sgBENJI position is accruing daily yield in a tokenised money market fund. Ask about performance, collateral use, or yield optimisation.'
                    : 'Your SGD 1M DBS Digital Bond 2026 position is generating semi-annual coupons. Ask about upcoming payments, credit analysis, or explore other fixed-income products.'
                  }
                </p>
              </div>

              {/* Suggested prompts */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="text-[10px] text-apa-faint uppercase tracking-wider">Suggested for you</div>
                  {currentUser.id !== 'new' && (
                    <div
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: currentUser.color + '22', color: currentUser.color }}
                    >
                      {currentUser.role}
                    </div>
                  )}
                </div>
                {currentUser.suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    disabled={loading}
                    className="group w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 bg-white hover:bg-apa-red-light border border-apa-border hover:border-apa-red/40 rounded-lg text-sm text-apa-muted hover:text-apa-text transition-all disabled:opacity-50 shadow-apa"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-apa-red/10 flex items-center justify-center flex-shrink-0 group-hover:bg-apa-red/20 transition-colors">
                        <span className="text-apa-red text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <span>{prompt}</span>
                    </div>
                    <span className="text-apa-faint group-hover:text-apa-red transition-colors flex-shrink-0 text-xs">→</span>
                  </button>
                ))}
              </div>
            </div>

          ) : (

            /* Chat messages */
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  msg={msg}
                  priceData={prices}
                  currentUser={currentUser}
                  onAppendMessage={handleAppendMessage}
                />
              ))}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

          )}
        </div>

        {/* ── Portfolio Sidebar ── */}
        {currentUser.transactions.length > 0 && (
          <>
            {/* Mobile overlay */}
            {showPortfolio && (
              <div className="md:hidden fixed inset-0 z-40 flex justify-end">
                <div className="absolute inset-0 bg-black/20" onClick={() => setShowPortfolio(false)} />
                <div className="relative w-72 bg-white border-l border-apa-border shadow-lg flex flex-col">
                  <PortfolioSidebar currentUser={currentUser} onClose={() => setShowPortfolio(false)} />
                </div>
              </div>
            )}
            {/* Desktop permanent sidebar */}
            <div className="hidden md:flex flex-col w-72 flex-shrink-0 border-l border-apa-border bg-white overflow-y-auto">
              <PortfolioSidebar currentUser={currentUser} onClose={null} />
            </div>
          </>
        )}

      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0 bg-white border-t border-apa-border px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-white border border-apa-border rounded-2xl px-5 py-3 focus-within:border-apa-red focus-within:ring-2 focus-within:ring-apa-red/20 transition-colors shadow-apa">
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
              className="flex-1 bg-transparent text-sm text-apa-text placeholder-apa-faint resize-none outline-none leading-relaxed"
              style={{ scrollbarWidth: 'none', minHeight: '22px' }}
              autoFocus
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 bg-apa-red hover:bg-apa-red-dark disabled:bg-apa-border disabled:text-apa-muted text-white rounded flex items-center justify-center transition-colors disabled:cursor-not-allowed"
            >
              {loading
                ? <div className="w-3 h-3 border border-apa-muted border-t-transparent rounded-full animate-spin" />
                : <Send size={13} />
              }
            </button>
          </div>
          <div className="flex justify-end mt-1.5">
            <div className="group relative">
              <button className="flex items-center gap-1 text-apa-faint hover:text-apa-muted transition-colors">
                <Info size={11} />
                <span className="text-[10px]">Disclaimer</span>
              </button>
              <div className="absolute bottom-full right-0 mb-2 w-72 bg-apa-text text-white text-[10px] leading-relaxed px-3 py-2 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                For accredited and institutional investors only · Not financial advice · Capital at risk · MAS-regulated · Not available to U.S. persons
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

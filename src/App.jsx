import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RotateCcw } from 'lucide-react'
import { sendMessage, parseDirectives } from './utils/openrouter'
import { useLivePrices } from './hooks/useCoinGecko'
import { PRODUCTS, PRODUCT_LIST, SUGGESTED_PROMPTS } from './data/products'
import ProductCard from './components/ProductCard'
import AnalysisPanel from './components/AnalysisPanel'
import SgBenjiCard from './components/SgBenjiCard'

const CRYPTO_IDS = ['bitcoin', 'ethereum', 'ripple-usd']

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
          ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}

function MessageBubble({ msg, priceData }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg-enter flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-[#DA291C] flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5">
          <span className="text-white text-[10px] font-bold">AI</span>
        </div>
      )}
      <div className={`${isUser ? 'max-w-[75%]' : 'max-w-full flex-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-[#DA291C] text-white rounded-tr-sm ml-auto w-fit'
              : 'bg-[#161616] text-gray-300 rounded-tl-sm border border-[#222]'
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
    <div className="msg-enter flex justify-start mb-5">
      <div className="w-7 h-7 rounded-lg bg-[#DA291C] flex items-center justify-center flex-shrink-0 mr-2.5">
        <span className="text-white text-[10px] font-bold">AI</span>
      </div>
      <div className="bg-[#161616] border border-[#222] rounded-2xl rounded-tl-sm px-4 py-3.5">
        <div className="flex gap-1 items-center h-4">
          <div className="dot w-1.5 h-1.5 rounded-full bg-gray-500" />
          <div className="dot w-1.5 h-1.5 rounded-full bg-gray-500" />
          <div className="dot w-1.5 h-1.5 rounded-full bg-gray-500" />
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
            <span className="text-[10px] text-gray-600 font-mono">{sym}</span>
            <span className="text-xs font-mono text-white">
              ${p.usd >= 1
                ? p.usd.toLocaleString('en-US', { maximumFractionDigits: p.usd < 10 ? 4 : 0 })
                : p.usd.toFixed(4)}
            </span>
            <span className={`text-[10px] font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? '+' : ''}{p.usd_24h_change.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const { prices, loading: pricesLoading } = useLivePrices(CRYPTO_IDS)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = useCallback(async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')

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
        content: 'Sorry, I encountered an error connecting to the AI. Please try again.',
        directives: [],
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, messages, loading])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const reset = () => {
    setMessages([])
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-[#1a1a1a] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#DA291C] rounded-xl flex items-center justify-center">
              <span className="text-white text-[11px] font-bold tracking-tight">DBS</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">DDEx</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#DA291C]/10 text-[#DA291C] rounded font-mono border border-[#DA291C]/20">
                  AI
                </span>
              </div>
              <div className="text-[10px] text-gray-600 -mt-0.5">Digital Exchange Companion</div>
            </div>
          </div>

          <div className="w-px h-5 bg-[#222]" />

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${pricesLoading ? 'bg-yellow-500' : 'bg-green-500 live-dot'}`} />
            <span className="text-[10px] text-gray-600">
              {pricesLoading ? 'Connecting…' : 'Live'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <LiveTicker prices={prices} />
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-gray-300 transition-colors"
            >
              <RotateCcw size={11} />
              <span>New chat</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (

          /* Landing */
          <div className="max-w-lg mx-auto flex flex-col items-center justify-center h-full px-4 py-12">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#DA291C] rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#DA291C]/20">
                <span className="text-white text-2xl font-bold">D</span>
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2 gradient-text">
                DDEx AI Companion
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                Your intelligent guide to DBS Digital Exchange. Ask about products, get live prices, run technical analysis, or explore the full tokenised asset universe.
              </p>
            </div>

            {/* Suggested prompts */}
            <div className="w-full space-y-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 bg-[#111] hover:bg-[#161616] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl text-sm text-gray-500 hover:text-gray-200 transition-all disabled:opacity-50"
                >
                  <span className="text-[#DA291C] mr-2">→</span>
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-8 text-[10px] text-gray-700 text-center max-w-xs leading-relaxed">
              For accredited and institutional investors only · Not financial advice · Capital at risk · MAS-regulated
            </div>
          </div>

        ) : (

          /* Chat messages */
          <div className="max-w-lg mx-auto px-4 py-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} priceData={prices} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

        )}
      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0 border-t border-[#1a1a1a] px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-end gap-3 bg-[#111] border border-[#222] rounded-2xl px-4 py-3 focus-within:border-[#333] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                // Auto-resize
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products, prices, analysis…"
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-700 resize-none outline-none leading-relaxed"
              style={{ scrollbarWidth: 'none', minHeight: '22px' }}
              autoFocus
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 bg-[#DA291C] hover:bg-[#c02218] disabled:bg-[#222] disabled:text-gray-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:cursor-not-allowed"
            >
              {loading
                ? <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin" />
                : <Send size={13} />
              }
            </button>
          </div>
          <p className="text-[10px] text-gray-800 text-center mt-2">
            DDEx · Accredited & Institutional Investors Only · Not financial advice
          </p>
        </div>
      </div>

    </div>
  )
}

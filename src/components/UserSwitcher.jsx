import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { USERS } from '../data/users'

const TYPE_COLORS = {
  BUY:    { bg: '#dcfce7', text: '#16a34a' },
  SELL:   { bg: '#fee2e2', text: '#dc2626' },
  SWAP:   { bg: '#dbeafe', text: '#2563eb' },
  YIELD:  { bg: '#fef9c3', text: '#a16207' },
  COUPON: { bg: '#fef9c3', text: '#a16207' },
}

export default function UserSwitcher({ currentUser, onSwitch }) {
  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(user) {
    if (user.id !== currentUser.id) {
      onSwitch(user)
    }
    setOpen(false)
    setShowHistory(false)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 pl-1 pr-2.5 py-1 bg-white border rounded-full shadow-apa transition-all hover:shadow-md ${
          open ? 'border-apa-red' : 'border-apa-border'
        }`}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
          style={{ backgroundColor: currentUser.color }}
        >
          {currentUser.initials}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-[11px] font-semibold text-apa-text leading-none">{currentUser.name}</div>
          <div className="text-[10px] text-apa-muted leading-none mt-0.5">{currentUser.role}</div>
        </div>
        <ChevronDown size={11} className={`text-apa-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel — opens downward from header */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-apa-border rounded shadow-lg overflow-hidden z-50">

          {/* Header */}
          <div className="px-4 py-3 border-b border-apa-border bg-apa-bg">
            <div className="text-[10px] text-apa-muted uppercase tracking-wider font-semibold">Switch User</div>
          </div>

          {/* User list */}
          <div className="py-1">
            {USERS.map(user => {
              const isActive = user.id === currentUser.id
              return (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive ? 'bg-apa-red-light' : 'hover:bg-apa-bg'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isActive ? 'text-apa-red' : 'text-apa-text'}`}>
                        {user.name}
                      </span>
                      {isActive && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-apa-red text-white rounded font-semibold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-apa-muted">{user.role}</div>
                  </div>

                  {user.transactions.length > 0 ? (
                    <span className="text-[10px] text-apa-muted bg-apa-bg px-2 py-0.5 rounded font-mono">
                      {user.transactions.length} tx
                    </span>
                  ) : (
                    <span className="text-[10px] text-apa-faint italic">New</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Transaction history for active user */}
          {currentUser.transactions.length > 0 && (
            <>
              <div className="border-t border-apa-border">
                <button
                  onClick={() => setShowHistory(h => !h)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] text-apa-muted hover:bg-apa-bg transition-colors"
                >
                  <span className="font-semibold uppercase tracking-wider">
                    {currentUser.name.split(' ')[0]}'s Transaction History
                  </span>
                  <span className="text-apa-faint">{showHistory ? '▲' : '▼'}</span>
                </button>
              </div>

              {showHistory && (
                <div className="border-t border-apa-border max-h-52 overflow-y-auto">
                  {currentUser.transactions.map((tx, i) => {
                    const style = TYPE_COLORS[tx.type] || { bg: '#f3f4f6', text: '#6b7280' }
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-apa-border/50 last:border-0">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ backgroundColor: style.bg, color: style.text }}
                        >
                          {tx.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-apa-text">
                            {tx.asset}
                            {tx.amount > 0 && (
                              <span className="text-apa-muted font-normal"> · {tx.amount.toLocaleString()}</span>
                            )}
                          </div>
                          {tx.note && (
                            <div className="text-[10px] text-apa-faint">{tx.note}</div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[11px] font-mono text-apa-text">{tx.valueFmt}</div>
                          <div className="text-[10px] text-apa-faint">{tx.date}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

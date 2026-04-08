export const USERS = [
  {
    id: 'alex',
    name: 'Wei Chen',
    initials: 'WC',
    role: 'Family Office CIO',
    color: '#6366f1',
    transactions: [
      { date: '2024-11-08', type: 'BUY',  asset: 'BTC', amount: 8.0,  valueFmt: 'USD 760,000' },
      { date: '2024-12-02', type: 'BUY',  asset: 'ETH', amount: 200,  valueFmt: 'USD 756,000' },
      { date: '2025-01-14', type: 'BUY',  asset: 'BTC', amount: 5.0,  valueFmt: 'USD 530,000' },
      { date: '2025-02-18', type: 'SELL', asset: 'ETH', amount: 120,  valueFmt: 'USD 492,000' },
      { date: '2025-03-10', type: 'BUY',  asset: 'BTC', amount: 3.0,  valueFmt: 'USD 294,000' },
    ],
    suggestedPrompts: [
      'Analyse Bitcoin — how has it moved this week?',
      'What\'s the current ETH price and technical outlook?',
      'Should I increase my BTC allocation at current levels?',
    ],
  },
  {
    id: 'priya',
    name: 'Priya Kapoor',
    initials: 'PK',
    role: 'Treasury Manager',
    color: '#0ea5e9',
    transactions: [
      { date: '2024-09-15', type: 'SWAP',  asset: 'sgBENJI', amount: 5000000,  valueFmt: 'USD 5,000,000', note: 'From RLUSD' },
      { date: '2024-11-20', type: 'SWAP',  asset: 'sgBENJI', amount: 3000000,  valueFmt: 'USD 3,000,000', note: 'From RLUSD' },
      { date: '2025-01-08', type: 'SWAP',  asset: 'sgBENJI', amount: 4000000,  valueFmt: 'USD 4,000,000', note: 'From RLUSD' },
      { date: '2025-03-31', type: 'YIELD', asset: 'sgBENJI', amount: 0,        valueFmt: 'USD 307,200',   note: 'Yield accrued YTD' },
    ],
    suggestedPrompts: [
      'Show me the latest sgBENJI stats and current yield',
      'How does sgBENJI compare to a traditional money market fund?',
      'Can I use sgBENJI as repo collateral with DBS?',
    ],
  },
  {
    id: 'james',
    name: 'Jonathan Lim',
    initials: 'JL',
    role: 'Private Banking Client',
    color: '#f59e0b',
    transactions: [
      { date: '2024-08-20', type: 'BUY',    asset: 'DBS-BOND-26', amount: 60,  valueFmt: 'SGD 600,000' },
      { date: '2024-12-01', type: 'COUPON', asset: 'DBS-BOND-26', amount: 0,   valueFmt: 'SGD 11,550',   note: 'Semi-annual coupon' },
      { date: '2025-01-12', type: 'BUY',    asset: 'DBS-BOND-26', amount: 40,  valueFmt: 'SGD 400,000'  },
      { date: '2025-06-01', type: 'COUPON', asset: 'DBS-BOND-26', amount: 0,   valueFmt: 'SGD 19,250',   note: 'Semi-annual coupon (projected)' },
    ],
    suggestedPrompts: [
      'Tell me about the DBS Digital Bond 2026',
      'When is my next coupon payment for DBS-BOND-26?',
      'How does the tokenised bond compare to traditional SGD corporate bonds?',
    ],
  },
  {
    id: 'new',
    name: 'Dana Park',
    initials: 'DP',
    role: 'New to DDEx',
    color: '#22c55e',
    transactions: [],
    suggestedPrompts: [
      'What products are available on DDEx?',
      'I have USD 5,000,000 — what should I consider?',
      'Explain sgBENJI and show me the latest stats',
    ],
  },
]

export const DEFAULT_USER = USERS[0]

import { KNOWLEDGE } from '../data/knowledge'

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY

// ── Prompts ───────────────────────────────────────────────────────────────────

// Call 1: intent detection — returns deterministic JSON, not parsed from prose
const INTENT_SYSTEM = `You are an intent classifier for a digital asset investment app (DDEx).
Analyse the user's latest message and return a single JSON object. No markdown, no prose — raw JSON only.

JSON shape:
{
  "type": "<one of the types below>",
  ...extra fields
}

Types and their extra fields:
- "show_products"      → { "filter": "all" | "yield" | "crypto" | "sto" | "stable" | "btc" | "eth" }
- "show_product"       → { "id": "btc" | "eth" | "rlusd" | "sgbenji" | "btcnote" | "dbsbond" | "apacpe" }
- "show_analysis"      → { "coin": "btc" | "eth" }
- "show_sgbenji"       → {}
- "portfolio_analysis" → { "question": "<user's specific portfolio question>" }
- "suitability_check"  → { "productId": "<id if a specific product is named, else null>" }
- "general"            → {}

Classification rules:
- "show_products": user wants to browse/see/compare multiple products or asks what DDEx offers. Use "btc" filter when asking about BTC exposure/products, "eth" for ETH exposure/products.
- "show_product": user asks about exactly one named product (not sgBENJI AUM/stats — that is show_sgbenji)
- "show_analysis": user asks for chart, price analysis, or technical analysis of BTC or ETH
- "show_sgbenji": user asks specifically about sgBENJI AUM, holders, chain distribution, or fund stats
- "portfolio_analysis": user asks about THEIR holdings, performance, allocation, or returns ("my portfolio", "my BTC position", "how am I doing")
- "suitability_check": user asks whether a product suits them, whether they should invest, or for a recommendation based on their profile
- "general": everything else (education, platform questions, process, disclaimers, small talk)

When in doubt, use "general".`

// Call 2: grounded response — always backed by the Knowledge Base
const RESPONSE_SYSTEM = `You are an AI investment companion for DBS Digital Exchange (DDEx) — Singapore's premier institutional digital asset exchange, backed by DBS Bank (AA-/Aa1, World's Best Bank 2024).

You assist accredited investors and institutional clients with:
- Understanding DDEx products and the platform
- Live market data interpretation
- Product discovery, comparison, and education
- Platform processes and eligibility

## Critical instruction
Ground ALL factual claims strictly in the Knowledge Base below. Do not invent figures, yields, ratings, or features not stated there. If information is not in the Knowledge Base, say so clearly.

## Response style
- Concise, professional, private-banking register
- Maximum 4 short paragraphs unless the user explicitly requests more detail
- Use **bold** for key figures and product names
- Acknowledge when figures are indicative vs live
- Never give personal financial advice — frame everything as educational/informational
- Always close responses about investment products with a one-sentence risk disclaimer

## Knowledge Base
${KNOWLEDGE}`

// ── Low-level fetch ───────────────────────────────────────────────────────────

async function callOpenRouter(messages, { temperature = 0.3, maxTokens = 512 } = {}) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ddex-companion.vercel.app',
      'X-Title': 'DDEx AI Companion',
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter error: ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

// ── Intent detection ──────────────────────────────────────────────────────────

const VALID_INTENTS = [
  'show_products', 'show_product', 'show_analysis', 'show_sgbenji',
  'portfolio_analysis', 'suitability_check', 'general',
]

async function detectIntent(messages) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  if (!lastUser) return { type: 'general' }

  try {
    const raw = await callOpenRouter(
      [
        { role: 'system', content: INTENT_SYSTEM },
        { role: 'user', content: lastUser.content },
      ],
      { temperature: 0.1, maxTokens: 200 },
    )
    // Strip optional markdown code fences
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    const intent = JSON.parse(cleaned)
    if (!VALID_INTENTS.includes(intent.type)) return { type: 'general' }
    return intent
  } catch {
    return { type: 'general' }
  }
}

// ── Response generation ───────────────────────────────────────────────────────

// Hint appended to system prompt so the model knows a UI widget is being shown
const INTENT_HINTS = {
  show_products:
    'The UI will render product cards automatically. Give a 1–2 sentence introduction to the listed products without repeating all card stats.',
  show_product:
    'The UI will render a detailed product card. Give a brief narrative overview — 2–3 sentences — without duplicating card figures.',
  show_analysis:
    'The UI will render a live technical analysis panel. Briefly describe what the analysis covers in one sentence.',
  show_sgbenji:
    'The UI will render the sgBENJI stats card (AUM, holders, chain breakdown). Introduce it in one sentence.',
  portfolio_analysis:
    'A Portfolio Analyser component will appear with a full AI-powered analysis. Write only a one-sentence intro, then let the component show the details.',
  suitability_check:
    'A Suitability Reasoner component will appear with a full assessment. Write only a one-sentence intro.',
}

async function generateResponse(messages, intent) {
  const hint = INTENT_HINTS[intent.type]
  const system = hint
    ? `${RESPONSE_SYSTEM}\n\n[UI context: ${hint}]`
    : RESPONSE_SYSTEM

  return callOpenRouter(
    [
      { role: 'system', content: system },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    { temperature: 0.4, maxTokens: 1024 },
  )
}

// ── Main export: two-call pipeline ───────────────────────────────────────────

export async function processMessage(messages) {
  // Call 1: deterministic intent JSON (fast, low-temp)
  const intent = await detectIntent(messages)
  // Call 2: grounded prose response informed by intent
  const text = await generateResponse(messages, intent)
  return { text, intent }
}

// ── Feature-specific AI calls (used by PortfolioAnalyser / SuitabilityReasoner) ──

export async function analysePortfolio(user, question = '') {
  const txSummary = user.transactions.length > 0
    ? user.transactions.map(tx =>
        `${tx.date}: ${tx.type} ${tx.asset} — ${tx.valueFmt}${tx.note ? ` (${tx.note})` : ''}`
      ).join('\n')
    : 'No transactions on record.'

  const prompt = `You are analysing the portfolio of ${user.name} (${user.role}) on DBS Digital Exchange.

Transaction history:
${txSummary}

${question ? `Their specific question: "${question}"` : 'Provide a comprehensive portfolio review.'}

Deliver a structured analysis covering:
1. **Current Holdings** — summarise what they hold and approximate composition
2. **Performance Observations** — notable gains/losses/income based on transaction history
3. **Concentration & Risk** — any concentration risks or diversification observations
4. **Considerations** — 2–3 actionable considerations relevant to their role and portfolio (educational, not advice)

Ground all factual claims about DDEx products in the Knowledge Base. Be concise — max 5 short paragraphs.
Close with: *This analysis is educational only and does not constitute financial advice. Capital at risk.*`

  return callOpenRouter(
    [
      { role: 'system', content: RESPONSE_SYSTEM },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.3, maxTokens: 800 },
  )
}

export async function checkSuitability(user, productId = null) {
  const txSummary = user.transactions.length > 0
    ? user.transactions.map(tx => `${tx.type} ${tx.asset}`).join(', ')
    : 'no prior transactions'

  const productClause = productId
    ? `Focus the assessment specifically on the product: "${productId}".`
    : 'Assess overall product suitability across the DDEx product range.'

  const prompt = `You are assessing product suitability for ${user.name} (${user.role}).

Investor profile:
- Role: ${user.role}
- Prior activity on DDEx: ${txSummary}

${productClause}

Deliver a structured suitability assessment:
1. **Suitable Products** — list DDEx products well-matched to this profile with a brief rationale for each
2. **Products Requiring Caution** — list products that may be less suitable and explain why
3. **Key Considerations** — 2–3 factors this investor should weigh before investing

Base all product facts strictly on the Knowledge Base. Be objective — note both opportunities and risks.
Close with: *Suitability assessments are indicative and educational only. Please speak to your DBS Relationship Manager for personalised advice.*`

  return callOpenRouter(
    [
      { role: 'system', content: RESPONSE_SYSTEM },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.3, maxTokens: 800 },
  )
}

// ── Compatibility shim for AnalysisPanel (calls AI with its own curated prompt) ─
export async function sendMessage(messages) {
  return callOpenRouter(messages, { temperature: 0.4, maxTokens: 1024 })
}

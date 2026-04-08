export const KNOWLEDGE = `
# DDEx Product Knowledge Base
# Source of truth for all product facts. Do not deviate from these details.

## PLATFORM
- Name: DBS Digital Exchange (DDEx)
- Operator: DBS Bank Ltd, Singapore
- Launched: December 2020
- Regulatory status: MAS-regulated Recognised Market Operator under Securities and Futures Act
- Access: Members-only. Accredited Investors and Institutional Investors only.
- Custody: Institutional-grade cold wallets, held separately from the exchange
- DBS credit rating: AA- (S&P) / Aa1 (Moody's)
- DBS accolades: World's Best Bank (Global Finance, Euromoney), Safest Bank in Asia 17 consecutive years, World's Best AI Bank 2025

## PRODUCT: BTC — Bitcoin
- Category: Spot Crypto
- Trading: 24/7 spot trading on DDEx
- Fiat pairs: USD, SGD
- Custody: Institutional cold wallet with DBS
- Min investment: USD 1
- Risk: High
- Liquidity: High
- Blockchain: Bitcoin Network
- Additional products: OTC options (BTC puts/calls) available via DBS GFM desk for eligible clients — NOT on DDEx exchange

## PRODUCT: ETH — Ethereum
- Category: Spot Crypto
- Trading: 24/7 spot trading on DDEx
- Fiat pairs: USD, SGD
- Custody: Institutional cold wallet with DBS
- Min investment: USD 1
- Risk: High
- Liquidity: High
- Blockchain: Ethereum
- Additional products: OTC options available via DBS GFM desk — NOT on DDEx exchange

## PRODUCT: RLUSD — Ripple USD
- Category: Stablecoin
- Issuer: Ripple Labs
- Peg: 1:1 USD
- Blockchain: XRP Ledger and Ethereum
- Min investment: USD 1
- Risk: Very Low
- Liquidity: High
- Primary use on DDEx: Settlement asset for sgBENJI swaps. Investors swap RLUSD → sgBENJI to earn yield.
- Listed on DDEx: September 2025 as part of DBS-Franklin Templeton-Ripple partnership

## PRODUCT: sgBENJI — Franklin Templeton Tokenised Money Market Fund
- Category: Tokenised Fund
- Full name: Franklin Templeton sgBENJI
- Underlying fund: Franklin OnChain U.S. Government Money Fund (FOBXX)
- Underlying assets: Short-term U.S. government securities
- Blockchain: XRP Ledger (public)
- Token issuer: Franklin Templeton
- Partnership: DBS × Franklin Templeton × Ripple (MOU signed September 2025)
- Listed on DDEx: September 2025
- Current yield: ~5.12% (7-day annualised, subject to change)
- AUM: ~$1.01B total across all chains (as of April 2026)
- Holders: ~1,094
- Min investment: USD 1,000
- Settlement: Minutes (on-chain, 24/7)
- Risk: Very Low (backed by US government securities)
- Liquidity: High (24/7 redemption)
- Trading pair on DDEx: RLUSD ↔ sgBENJI
- Use case 1: Yield-bearing stable asset during crypto market volatility
- Use case 2: Portfolio rebalancing — swap volatile crypto into sgBENJI 24/7
- Use case 3 (Phase 2, upcoming): sgBENJI eligible as collateral for repo transactions with DBS
- Key differentiator: Settle in minutes vs T+2 for traditional MMFs. Earn yield while holding stable assets.
- Chain breakdown: Stellar 64.4%, BNB Chain 11.2%, Base 5.8%, Arbitrum 5.0%, Ethereum 4.7%, Avalanche 3.6%, Polygon 3.1%, XRP Ledger 0.5%
- Eligibility: Accredited and institutional investors only

## PRODUCT: BTC-NOTE — BTC Participation Note
- Category: Tokenised Structured Note
- Full name: DBS BTC Participation Note
- Issuer: DBS Bank Ltd
- Blockchain: Ethereum public blockchain (first DBS issuance on public chain)
- Announced: August 2025
- Distribution: DDEx, ADDX, DigiFT, HydraX
- Min investment: USD 1,000 (traditional equivalent: USD 100,000 — tokenisation democratises access)
- Denomination: USD 1,000 units (fungible, tradeable)
- Tenor: 6 months
- Settlement: Cash-settled in USD at maturity
- Structure: 80% participation in BTC upside. 15% downside buffer protection.
  - If BTC rises 20%: investor receives 16% return (80% × 20%)
  - If BTC falls 10%: investor is protected (within 15% buffer), receives principal back
  - If BTC falls 20%: investor loses 5% (the 5% beyond the buffer)
  - If BTC falls 30%: investor loses 15%
- Risk: Medium-High (crypto-linked but with downside protection)
- Liquidity: Medium (secondary trading on DDEx and partner platforms)
- Key differentiator: Crypto exposure without holding crypto. Cash settled. Regulated DBS instrument.
- Trading volume: DBS clients executed >USD 1B in crypto-linked structured notes in H1 2025, up 60% QoQ
- Beyond crypto: DBS also tokenising equity-linked notes and credit-linked notes on Ethereum

## PRODUCT: DBS-BOND-26 — DBS Digital Bond 2026
- Category: Security Token Offering (STO) — Corporate Bond
- Issuer: DBS Bank Ltd
- Currency: SGD
- Coupon: 3.85% per annum, paid semi-annually
- Tenor: 2 years (matures December 2026)
- Min investment: SGD 10,000 (traditional wholesale bonds: SGD 250,000 minimum — 25x smaller)
- Credit rating: AA- (S&P) / Aa1 (Moody's) — same as DBS Bank
- Blockchain: DDEx permissioned chain
- Settlement: T+1
- Liquidity: Medium (secondary trading on DDEx)
- Risk: Low
- Legal framework: Adheres to standard bond legal framework — investors have same legal rights as traditional bondholders
- Historical context: DDEx first STO was a SGD 15M DBS Digital Bond in May 2021 (6-month tenor, 0.60% coupon)
- Key differentiator: Institutional-grade issuer, fractional access, on-chain settlement

## PRODUCT: APAC-PE-I — APAC Private Equity Token
- Category: Security Token Offering (STO) — Private Equity
- Full name: APAC Private Equity Fund I (Tokenised)
- Issuer: DBS Private Equity Partners
- Currency: USD
- Min investment: USD 250,000
- Tenor: 5 years
- Target return: 18–22% IRR (net of fees)
- Strategy: Growth equity and buyout
- Geography: Southeast Asia and Greater China
- Vintage: 2024
- Redemption: Quarterly windows after 2-year lock-up period
- Blockchain: DDEx permissioned chain
- Risk: High (private equity, illiquid)
- Liquidity: Low
- Key differentiator: Access to institutional PE returns at lower minimums via tokenisation. Traditional PE funds typically require USD 1M+.
- Underlying exposure: High-growth private companies in SEA and Greater China

## ELIGIBILITY (ALL PRODUCTS)
- All DDEx products: Accredited Investors and Institutional Investors only
- Accredited Investor definition (Singapore): Individual with net personal assets > SGD 2M, or income > SGD 300,000/yr, or net financial assets > SGD 1M
- Crypto options and OTC structured notes: Additional eligibility — DBS Private Bank or DBS Treasures Private Client clients only

## KEY FACTS FOR COMPARISONS
- sgBENJI vs DBS Digital Bond: sgBENJI higher yield (~5.12% vs 3.85%), USD vs SGD, on-chain settlement vs T+1, both very liquid. sgBENJI better for USD cash parking. Bond better for SGD fixed income exposure with DBS credit.
- BTC Note vs spot BTC: Note has downside buffer (15%), capped upside (80% participation), cash-settled, no custody needed. Spot BTC: full upside/downside, 24/7 trading, requires custody.
- APAC PE vs DBS Bond: PE targets 18-22% IRR but illiquid, 5yr lock, high risk. Bond is 3.85% fixed, liquid, low risk. Completely different risk profiles.
- RLUSD vs sgBENJI: RLUSD is a stablecoin (no yield, instant liquidity). sgBENJI earns ~5.12% yield. RLUSD is the on-ramp to buy sgBENJI on DDEx.
`

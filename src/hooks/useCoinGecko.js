import { useState, useEffect, useCallback } from 'react'

const BASE = 'https://api.coingecko.com/api/v3'
const cache = {}

async function fetchWithCache(url, ttl = 60000) {
  const now = Date.now()
  if (cache[url] && now - cache[url].ts < ttl) return cache[url].data
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const data = await res.json()
  cache[url] = { data, ts: now }
  return data
}

export function useLivePrices(coingeckoIds) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    if (!coingeckoIds?.length) return
    try {
      const ids = coingeckoIds.join(',')
      const data = await fetchWithCache(
        `${BASE}/simple/price?ids=${ids}&vs_currencies=usd,sgd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
        30000
      )
      setPrices(data)
    } catch (e) {
      console.warn('Price fetch failed', e)
    } finally {
      setLoading(false)
    }
  }, [coingeckoIds?.join(',')])

  useEffect(() => {
    fetch_()
    const interval = setInterval(fetch_, 30000)
    return () => clearInterval(interval)
  }, [fetch_])

  return { prices, loading }
}

export async function fetchPriceHistory(coingeckoId, days = 30) {
  try {
    const data = await fetchWithCache(
      `${BASE}/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}&interval=${days <= 1 ? 'hourly' : 'daily'}`,
      300000
    )
    return data.prices.map(([ts, price]) => ({
      date: new Date(ts).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' }),
      price: parseFloat(price.toFixed(2)),
      ts,
    }))
  } catch (e) {
    console.warn('History fetch failed', e)
    return []
  }
}

export async function fetchCoinDetails(coingeckoId) {
  try {
    const data = await fetchWithCache(
      `${BASE}/coins/${coingeckoId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      300000
    )
    return {
      marketCap: data.market_data?.market_cap?.usd,
      volume24h: data.market_data?.total_volume?.usd,
      circulatingSupply: data.market_data?.circulating_supply,
      maxSupply: data.market_data?.max_supply,
      dominance: data.market_data?.market_cap_percentage,
      ath: data.market_data?.ath?.usd,
      athDate: data.market_data?.ath_date?.usd,
      description: data.description?.en?.split('. ')[0],
    }
  } catch (e) {
    console.warn('Details fetch failed', e)
    return null
  }
}

export async function fetchFearGreed() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1')
    const data = await res.json()
    return {
      value: parseInt(data.data[0].value),
      label: data.data[0].value_classification,
    }
  } catch (e) {
    return { value: 50, label: 'Neutral' }
  }
}

export async function fetchCoinSocialData(coingeckoId) {
  try {
    const data = await fetchWithCache(
      `${BASE}/coins/${coingeckoId}?localization=false&tickers=false&community_data=true&developer_data=false`,
      300000
    )
    const c = data.community_data || {}
    return {
      twitterFollowers: c.twitter_followers,
      redditSubscribers: c.reddit_subscribers,
      redditActivePosts48h: c.reddit_average_posts_48h,
      redditActiveComments48h: c.reddit_average_comments_48h,
      redditAccountsActive48h: c.reddit_accounts_active_48h,
      sentimentVotesUp: data.sentiment_votes_up_percentage,
      sentimentVotesDown: data.sentiment_votes_down_percentage,
    }
  } catch (e) {
    console.warn('Social data fetch failed', e)
    return null
  }
}

const ETF_DATA = {
  bitcoin: [
    { name: 'BlackRock IBIT', ticker: 'IBIT', aum: 40.2, flow24h: 0.312, flow7d: 1.24 },
    { name: 'Grayscale GBTC', ticker: 'GBTC', aum: 20.1, flow24h: -0.089, flow7d: -0.34 },
    { name: 'Fidelity FBTC', ticker: 'FBTC', aum: 11.8, flow24h: 0.178, flow7d: 0.67 },
    { name: 'ARK 21Shares ARKB', ticker: 'ARKB', aum: 3.6, flow24h: 0.054, flow7d: 0.21 },
    { name: 'Bitwise BITB', ticker: 'BITB', aum: 2.4, flow24h: 0.031, flow7d: 0.12 },
  ],
  ethereum: [
    { name: 'BlackRock ETHA', ticker: 'ETHA', aum: 0.92, flow24h: 0.018, flow7d: 0.067 },
    { name: 'Fidelity FETH', ticker: 'FETH', aum: 0.58, flow24h: 0.012, flow7d: 0.043 },
    { name: 'Grayscale ETHE', ticker: 'ETHE', aum: 0.42, flow24h: -0.024, flow7d: -0.089 },
    { name: 'Bitwise ETHW', ticker: 'ETHW', aum: 0.24, flow24h: 0.006, flow7d: 0.021 },
    { name: '21Shares CETH', ticker: 'CETH', aum: 0.08, flow24h: 0.002, flow7d: 0.007 },
  ],
}

export function getETFFlows(coingeckoId) {
  return ETF_DATA[coingeckoId] ?? null
}

// Generate mock chart data for non-crypto products
export function generateMockHistory(baseValue, days, volatility = 0.002, trend = 0.0001) {
  const points = []
  let val = baseValue
  const now = Date.now()
  for (let i = days; i >= 0; i--) {
    const ts = now - i * 86400000
    val = val * (1 + trend + (Math.random() - 0.48) * volatility)
    points.push({
      date: new Date(ts).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' }),
      price: parseFloat(val.toFixed(4)),
      ts,
    })
  }
  return points
}

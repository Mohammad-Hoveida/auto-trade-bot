const newsAdapter = require('./news/newsAdapter');
/*
Fundamentals module
- Uses CoinGecko public API to fetch coin info, community_score, developer_score, market data.
- If NEWS_API_KEY is provided in env, uses NewsAPI to fetch recent news and scores titles using 'sentiment' package.
- Exposes getFundamentals(symbol) which returns an aggregated fundamentals score and details.
*/
const axios = require('axios');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();
const logger = require('./logger');

async function coinGeckoCoinId(symbol) {
  // symbol like 'BTC/USDT' -> 'bitcoin'
  const s = symbol.split('/')[0].toLowerCase();
  try {
    const r = await axios.get('https://api.coingecko.com/api/v3/coins/list');
    const list = r.data || [];
    const found = list.find(c => c.symbol === s || c.id === s || c.name.toLowerCase() === s);
    if (found) return found.id;
    // fallback: try exact match by id
    return s;
  } catch (e) {
    logger.error('CoinGecko list fetch failed: ' + e.message);
    return s;
  }
}

async function fetchCoinData(coingeckoId) {
  try {
    const r = await axios.get(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`, { params: { localization: false, tickers: false, community_data: true, developer_data: true, market_data: true }});
    return r.data;
  } catch (e) {
    logger.error('CoinGecko coin fetch failed: ' + e.message);
    return null;
  }
}

async function fetchNewsSentiment(query) {
  const apiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY || process.env.VAPID_PUBLIC;
  if (!apiKey) return { count: 0, avgSentiment: 0, items: [] };
  try {
    const resp = await axios.get('https://newsapi.org/v2/everything', {
      params: { q: query, pageSize: 20, language: 'en', sortBy: 'publishedAt', apiKey }
    });
    const articles = (resp.data && resp.data.articles) || [];
    const scores = articles.map(a => {
      const txt = (a.title || '') + ' ' + (a.description || '');
      const s = sentiment.analyze(txt || '');
      return { title: a.title, score: s.score, source: a.source.name, url: a.url, publishedAt: a.publishedAt };
    });
    const avg = scores.length ? scores.reduce((s,x)=>s+x.score,0)/scores.length : 0;
    return { count: scores.length, avgSentiment: avg, items: scores };
  } catch (e) {
    logger.error('NewsAPI fetch failed: ' + e.message);
    return { count: 0, avgSentiment: 0, items: [] };
  }
}

function normalize(v, min, max) {
  if (!isFinite(v)) return 0;
  if (v <= min) return 0;
  if (v >= max) return 1;
  return (v - min) / (max - min);
}

async function getFundamentals(symbol) {
  // returns { score: 0..100, breakdown: {...}, raw: {...} }
  const id = await coinGeckoCoinId(symbol);
  const coin = await fetchCoinData(id);
  const news = await fetchNewsSentiment(symbol.split('/')[0]);
  const breakdown = {};
  let score = 50;

  if (coin && coin.community_data) {
    const community = coin.community_data.community_score || 0;
    const dev = (coin.developer_data && coin.developer_data.forks) ? coin.developer_data.forks : 0;
    // use community_score (0..1) and developer_score if available
    const comm = coin.community_data && coin.community_data.community_score ? coin.community_data.community_score : 0;
    const devScore = coin.developer_data && coin.developer_data.developer_score ? coin.developer_data.developer_score : 0;
    breakdown.community = comm;
    breakdown.developer = devScore;
    score = score + (comm * 20) + (devScore * 15);
  }

  if (coin && coin.market_data) {
    const mc = coin.market_data.market_cap && coin.market_data.market_cap.usd ? coin.market_data.market_cap.usd : 0;
    const vol = coin.market_data.total_volume && coin.market_data.total_volume.usd ? coin.market_data.total_volume.usd : 0;
    breakdown.market_cap = mc;
    breakdown.volume = vol;
    // normalize marketcap into 0..10 scale rough
    score += normalize(Math.log10(mc+1||1), 6, 12) * 10;
    score += normalize(Math.log10(vol+1||1), 4, 10) * 5;
  }

  // news sentiment
  breakdown.news = { count: news.count, avgSentiment: news.avgSentiment };
  score += normalize(news.avgSentiment, -5, 5) * 10;

  // clamp
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return { score: Number(score.toFixed(2)), breakdown, raw: { coin, news } };
}

module.exports = { getFundamentals };

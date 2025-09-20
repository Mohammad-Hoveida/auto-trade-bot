/*
News Adapter
- If NEWS_API_KEY is set, uses NewsAPI.org to fetch news.
- Otherwise falls back to CoinGecko events endpoint (limited) and returns neutral sentiment.
- Returns { count, avgSentiment, items }
*/
const axios = require('axios');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();
const logger = require('../logger');

async function fetchNewsAPI(query) {
  const key = process.env.NEWS_API_KEY;
  if (!key) return null;
  try {
    const r = await axios.get('https://newsapi.org/v2/everything', { params: { q: query, pageSize: 30, apiKey: key, language: 'en', sortBy: 'publishedAt' }});
    const arts = (r.data && r.data.articles) || [];
    const scored = arts.map(a => ({ title: a.title, url: a.url, publishedAt: a.publishedAt, score: sentiment.analyze((a.title||'') + ' ' + (a.description||'')).score }));
    const avg = scored.length ? scored.reduce((s,x)=>s+x.score,0)/scored.length : 0;
    return { count: scored.length, avgSentiment: avg, items: scored };
  } catch (e) {
    logger.warn('NewsAPI error: ' + e.message);
    return null;
  }
}

async function fetchCoinGeckoEvents(query) {
  try {
    const r = await axios.get('https://api.coingecko.com/api/v3/events');
    const ev = (r.data && r.data.data) || [];
    const items = ev.filter(e => (e.title||'').toLowerCase().includes(query.toLowerCase())).map(e=>({ title: e.title, description: e.description, date: e.start_date }));
    return { count: items.length, avgSentiment: 0, items };
  } catch (e) {
    logger.warn('CoinGecko events fetch failed: ' + e.message);
    return { count:0, avgSentiment:0, items:[] };
  }
}

async function fetchNews(query) {
  let res = await fetchNewsAPI(query);
  if (res) return res;
  return await fetchCoinGeckoEvents(query);
}

module.exports = { fetchNews };

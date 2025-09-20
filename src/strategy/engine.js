const ti = require('technicalindicators');
const logger = require('../logger');
const fundamentals = require('../fundamentals');

async function fetchOHLCFallback(market, limit=200, timeframe='15m') {
  try {
    const exAdapter = require('../exchanges/ccxtAdapter');
    const ex = await exAdapter.create();
    const ohlc = await ex.fetchOHLCV(market, timeframe, undefined, limit);
    return ohlc;
  } catch (e) {
    logger.warn('fetchOHLCFallback failed: ' + (e && e.message));
    const now = Date.now();
    const arr = [];
    for (let i = 0; i < 200; i++) {
      const ts = now - (200 - i) * 15 * 60 * 1000;
      const price = 100 + Math.sin(i/10) * 2 + (Math.random()-0.5)*0.5;
      arr.push([ts, price, price + 0.5, price - 0.5, price, 1000]);
    }
    return arr;
  }
}

async function computeIndicatorsFromOHLC(ohlc) {
  if (!Array.isArray(ohlc) || ohlc.length === 0) {
    throw new Error('OHLC data missing or empty');
  }
  const close = ohlc.map(x => x[4]);
  const high = ohlc.map(x => x[2]);
  const low = ohlc.map(x => x[3]);
  const atr = ti.ATR.calculate({ high, low, close, period: 14 });
  const rsi = ti.RSI.calculate({ values: close, period: 14 });
  const emaFast = ti.EMA.calculate({ period: 12, values: close });
  const emaSlow = ti.EMA.calculate({ period: 26, values: close });
  const last = {
    close: close[close.length-1],
    atr: atr.length ? atr[atr.length-1] : 0,
    rsi: rsi.length ? rsi[rsi.length-1] : 50,
    emaFast: emaFast.length ? emaFast[emaFast.length-1] : close[close.length-1],
    emaSlow: emaSlow.length ? emaSlow[emaSlow.length-1] : close[close.length-1]
  };
  return last;
}

function computeStopTakeFromAtr(atr, price) {
  const mult = 1.5;
  const stopPct = (atr * mult / price) * 100;
  const tpPct = stopPct * 2.5;
  return { stopLossPct: Number(stopPct.toFixed(3)), takeProfitPct: Number(tpPct.toFixed(3)) };
}

async function evaluateMarket(market, ohlc) {
  try {
    let data = ohlc;
    if (!data || !Array.isArray(data) || data.length === 0) {
      data = await fetchOHLCFallback(market);
    }
    const indicators = await computeIndicatorsFromOHLC(data);
    const f = await fundamentals.getFundamentals(market);
    let score = 50;
    let side = null;
    const reason = [];
    if (indicators.emaFast > indicators.emaSlow) { score += 10; reason.push('EMA bullish'); }
    else { score -= 5; reason.push('EMA bearish'); }
    if (indicators.rsi < 30) { score += 8; reason.push('RSI oversold -> buy'); side = 'buy'; }
    if (indicators.rsi > 70) { score -= 8; reason.push('RSI overbought -> sell'); side = side || 'sell'; }
    const st = computeStopTakeFromAtr(indicators.atr, indicators.close);
    score += (f.score - 50) * 0.3;
    score = Math.max(0, Math.min(100, score));
    if (!side) side = (indicators.emaFast > indicators.emaSlow) ? 'buy' : 'sell';
    return {
      provider: 'EngineV1',
      symbol: market,
      side,
      score: Number(score.toFixed(2)),
      stopLossPct: st.stopLossPct,
      takeProfitPct: st.takeProfitPct,
      timeframe: '15m',
      reason: reason.join('; '),
      fundamentals: f
    };
  } catch (e) {
    logger.error('Engine evaluate error: ' + (e && e.message));
    return null;
  }
}

module.exports = { evaluateMarket };

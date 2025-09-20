/*
Strategy aggregator - now uses single engine with fundamentals and indicators.
*/
const engine = require('./engine');

async function evaluateMarket(market, ohlc) {
  // ohlc optional - provides OHLC for backtester
  const res = await engine.evaluateMarket(market, ohlc);
  return res ? [res] : [];
}

module.exports = { evaluateMarket };

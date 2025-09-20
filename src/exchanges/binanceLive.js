/*
Binance Live Execution helper (uses ccxt)
- Handles market order placement by converting USD quote amount to base amount using ticker price.
- Handles retries and polling for order status.
- NOTE: For futures/margin/leverage, user must configure exchange with proper API and mode.
*/
const exAdapter = require('./exchanges/ccxtAdapter');
const promiseRetry = require('promise-retry');
const logger = require('./logger');

async function createOrderWithRetries(ex, market, type, side, amount, params) {
  return promiseRetry(async (retry, number) => {
    try {
      const ord = await ex.createOrder(market, type, side, amount, undefined, params);
      return ord;
    } catch (e) {
      logger.warn('createOrder attempt ' + number + ' failed: ' + e.message);
      if (e instanceof Error && (e.message.includes('insufficient') || e.message.includes('Min')) ) {
        throw e; // do not retry for validation errors
      }
      retry(e);
    }
  }, { retries: 5, factor: 2 });
}

async function placeMarketOrderUSD(position, ex) {
  // position: { symbol, side, sizeUSD, type }
  // ex: ccxt exchange instance
  const market = position.symbol;
  const ticker = await ex.fetchTicker(market);
  const price = ticker.last;
  if (!price) throw new Error('Cannot determine price for ' + market);
  // amount in base = USD / price
  const amountBase = Number((position.sizeUSD / price).toFixed(8));
  if (amountBase <= 0) throw new Error('Calculated base amount is zero');
  const ord = await createOrderWithRetries(ex, market, position.type || 'market', position.side.toLowerCase(), amountBase, {});
  return ord;
}

async function waitOrderFilled(ex, id, market, timeoutMs=60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const status = await ex.fetchOrder(id, market);
      if (status && (status.status === 'closed' || status.status === 'filled' || status.remaining === 0)) return status;
    } catch (e) {
      logger.warn('fetchOrder warn: ' + e.message);
    }
    await new Promise(r=>setTimeout(r, 1000));
  }
  throw new Error('Order not filled within timeout: ' + id);
}

module.exports = { placeMarketOrderUSD, waitOrderFilled };

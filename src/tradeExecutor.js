const logger = require('./logger');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

let paperMode = true;
if (process.env.TRADE_MODE === 'AUTO' && process.env.BINANCE_API_KEY) paperMode = false;

async function placePaperOrder(position) {
  const id = uuidv4();
  const order = {
    id,
    symbol: position.symbol,
    side: position.side,
    type: position.type || config.DEFAULT_ORDER_TYPE,
    amount: position.sizeUSD,
    price: position.price || 0,
    status: 'filled',
    pnl: 0,
    reason: JSON.stringify(position.reason || {}),
    ts: Date.now()
  };
  await db.insert('orders', order);
  logger.info('Placed PAPER order', order);
  return order;
}

async function placeLiveOrder(position) {
  const exAdapter = require('./exchanges/ccxtAdapter');
  const ex = await exAdapter.createExchange();
  const market = position.symbol;
  const side = position.side.toLowerCase();
  const orderType = position.type || config.DEFAULT_ORDER_TYPE;
  const amountQuote = position.sizeUSD;
  const ticker = await ex.fetchTicker(market);
  const price = ticker.last;
  const amountBase = Number((amountQuote / price).toFixed(8));
  logger.info('Placing LIVE order', { market, side, amountBase, price });
  const res = await ex.createOrder(market, orderType, side, amountBase, undefined, { reduceOnly: false });
  const id = res.id || uuidv4();
  const orderObj = {
    id, symbol: market, side, type: orderType, amount: amountBase, price, status: 'open', pnl: 0, reason: JSON.stringify(position.reason || {}), ts: Date.now()
  };
  await db.insert('orders', orderObj);
  logger.info('Live order created and saved', orderObj);
  return orderObj;
}

module.exports = {
  async execute(position, mode) {
    if (mode === 'ALERT_ONLY') {
      logger.info('ALERT_ONLY mode - no execution', position);
      return { alerted: true, position };
    }
    if (paperMode) {
      return placePaperOrder(position);
    }
    return placeLiveOrder(position);
  },
  placePaperOrder,
  placeLiveOrder
};

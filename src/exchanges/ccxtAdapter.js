const ccxt = require('ccxt');
const logger = require('../logger');

async function createExchange() {
  const name = process.env.EXCHANGE || 'binance';
  const apiKey = process.env.BINANCE_API_KEY || process.env.API_KEY;
  const secret = process.env.BINANCE_SECRET || process.env.API_SECRET;
  if (!ccxt[name]) {
    throw new Error('Unsupported exchange: ' + name);
  }
  const ex = new ccxt[name]({ apiKey, secret, enableRateLimit: true });
  logger.info('Created ccxt exchange adapter for ' + name);
  return ex;
}

module.exports = { createExchange };

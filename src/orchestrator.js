const cron = require('node-cron');
const strategy = require('./strategy');
const logger = require('./logger');
const riskManager = require('./riskManager');
const tradeExecutor = require('./tradeExecutor');
const alerts = require('./alerts');
const config = require('./config');

const WATCHLIST = ['BTC/USDT','ETH/USDT','SOL/USDT','ARB/USDT'];

let mode = process.env.TRADE_MODE || config.TRADE_MODE;

async function processOnce() {
  logger.info('Orchestrator cycle started. Mode=' + mode);
  for (const m of WATCHLIST) {
    const candidates = await strategy.evaluateMarket(m);
    if (!candidates || candidates.length === 0) continue;
    const best = candidates[0];
    const can = await riskManager.canOpenTrade(best.stopLossPct);
    if (!can.allowed) {
      logger.info('Cannot open trade due to risk rules', can);
      await alerts.send('trade_blocked', { market: m, reason: can.reason, details: can.details });
      continue;
    }
    const positionSizeUSD = can.details.positionSizeUSD;
    const position = {
      symbol: best.symbol,
      side: best.side,
      sizeUSD: Number(positionSizeUSD.toFixed(2)),
      stopLossPct: best.stopLossPct,
      takeProfitPct: best.takeProfitPct,
      timeframe: best.timeframe,
      reason: best.reason,
      score: best.score
    };
    await alerts.send('candidate', { position, mode });
    logger.info('Candidate sent', position);

    if (mode === 'ALERT_ONLY') continue;

    if (mode === 'AUTO_WITH_CONFIRM') {
      await alerts.send('ask_confirm', { position, id: 'pending_' + Date.now() });
      continue;
    }
    if (mode === 'AUTO') {
      const res = await tradeExecutor.execute(position, mode);
      await alerts.send('executed', { res });
      logger.info('Executed position', res);
    }
  }
}

function start() {
  cron.schedule('*/15 * * * * *', async () => {
    try {
      await processOnce();
    } catch (e) {
      logger.error('Orchestrator error', e.message);
    }
  });
  logger.info('Orchestrator scheduled (every 15s for demo).');
}

module.exports = { start, processOnce, setMode: (m) => { mode = m; } };

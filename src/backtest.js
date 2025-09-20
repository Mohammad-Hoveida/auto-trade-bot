/*
Backtester: simple forward simulation on OHLCV data.
- Accepts CSV file path or asks ccxt to fetch historical OHLCV.
- Simulates market orders with stoploss/takeprofit and returns trades + stats.
This is a simple deterministic backtester for demo; in production expand for orderbook modeling.
*/
const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const strategy = require('./strategy');
const logger = require('./logger');

function simulateTradesFromOHLC(ohlc, initialBalance, riskPct) {
  // ohlc: [[ts,o,h,l,c,v], ...] chronological
  let balance = initialBalance;
  const trades = [];
  for (let i = 50; i < ohlc.length; i++) {
    const window = ohlc.slice(0, i+1);
    const candidate = strategy.evaluateMarket('SIM/USDT', window);
    if (!candidate || candidate.length === 0) continue;
    const best = candidate[0];
    // compute position size
    const maxRiskUSD = balance * (riskPct / 100);
    const positionSizeUSD = maxRiskUSD / (best.stopLossPct / 100);
    if (positionSizeUSD <= 0 || positionSizeUSD > balance) continue;
    // simulate entry at close[i]
    const entry = window[window.length-1][4];
    const stop = entry * (1 - (best.stopLossPct/100) * (best.side === 'buy' ? 1 : -1));
    const take = entry * (1 + (best.takeProfitPct/100) * (best.side === 'buy' ? 1 : -1));
    // walk forward to find hit
    let closed = false;
    for (let j = i+1; j < Math.min(i+200, ohlc.length); j++) {
      const [ts,o,h,l,c,v] = ohlc[j];
      if (best.side === 'buy') {
        if (l <= stop) { // stop hit
          const pnl = -positionSizeUSD;
          balance += pnl;
          trades.push({ entry, exit: stop, pnl, tsExit: ts, side: best.side });
          closed = true; break;
        }
        if (h >= take) {
          const pnl = positionSizeUSD * (best.takeProfitPct/100);
          balance += pnl;
          trades.push({ entry, exit: take, pnl, tsExit: ts, side: best.side });
          closed = true; break;
        }
      } else {
        if (h >= stop) {
          const pnl = -positionSizeUSD;
          balance += pnl;
          trades.push({ entry, exit: stop, pnl, tsExit: ts, side: best.side });
          closed = true; break;
        }
        if (l <= take) {
          const pnl = positionSizeUSD * (best.takeProfitPct/100);
          balance += pnl;
          trades.push({ entry, exit: take, pnl, tsExit: ts, side: best.side });
          closed = true; break;
        }
      }
    }
    if (!closed) {
      // mark-to-market using last close
      const last = ohlc[Math.min(i+200, ohlc.length-1)][4];
      const pnl = (last - entry) * (best.side === 'buy' ? 1 : -1) * (positionSizeUSD/entry);
      balance += pnl;
      trades.push({ entry, exit: last, pnl, tsExit: ohlc[ohlc.length-1][0], side: best.side, note: 'mark-to-market' });
    }
  }
  const totalPnl = trades.reduce((s,t)=>s+(t.pnl||0),0);
  return { finalBalance: balance, trades, totalPnl, roiPct: (balance - initialBalance)/initialBalance*100 };
}

function parseCSV(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const rows = parse(raw, { columns: false, skip_empty_lines: true });
  // expect csv: ts,open,high,low,close,volume
  return rows.map(r => r.map((v,i)=> i===0?Number(v):Number(v)));
}

async function run({ symbol, csvPath, from, to, strategyName }) {
  const initial = Number(process.env.INITIAL_CAPITAL_USD || 1000);
  const riskPct = Number(process.env.RISK_PCT || 3);
  let ohlc = [];
  if (csvPath && fs.existsSync(csvPath)) {
    ohlc = parseCSV(csvPath);
  } else {
    logger.info('No CSV provided for backtest. Please provide csvPath in payload.');
    throw new Error('CSV path required for backtest in current implementation.');
  }
  const res = simulateTradesFromOHLC(ohlc, initial, riskPct);
  return res;
}

module.exports = { run };

const db = require('./db');
const logger = require('./logger');
const config = require('./config');

function now() { return Date.now(); }
function todayKey() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString();
}

async function ensureAccount() {
  const row = await db.get('SELECT * FROM account LIMIT 1') ;
  if (!row) {
    const initial = config.INITIAL_CAPITAL_USD;
    await db.insert('account', { id: 1, balance: initial, initial_balance: initial, updated_at: Date.now() });
    return { id:1, balance: initial, initial_balance: initial };
  }
  return row;
}

async function getAccount() {
  await ensureAccount();
  return await db.get('SELECT * FROM account LIMIT 1');
}

async function updateBalance(newBalance) {
  await db.run('UPDATE account SET balance = ?, updated_at = ? WHERE id = 1', [newBalance, Date.now()]);
}

async function getRiskState() {
  const key = todayKey();
  let row = await db.get('SELECT * FROM risk_state WHERE date = ?', [key]);
  if (!row) {
    await db.run('INSERT INTO risk_state(date, daily_loss, consecutive_losses, blocked_until) VALUES(?,?,?,?)', [key, 0, 0, 0]);
    row = await db.get('SELECT * FROM risk_state WHERE date = ?', [key]);
  }
  return row;
}

async function recordPnL(pnlUSD) {
  const account = await getAccount();
  const balance = account.balance;
  const newBal = Number((balance + pnlUSD).toFixed(8));
  await updateBalance(newBal);

  const key = todayKey();
  let rs = await db.get('SELECT * FROM risk_state WHERE date = ?', [key]);
  if (!rs) {
    await db.run('INSERT INTO risk_state(date, daily_loss, consecutive_losses, blocked_until) VALUES(?,?,?,?)', [key, 0, 0, 0]);
    rs = await db.get('SELECT * FROM risk_state WHERE date = ?', [key]);
  }
  let daily_loss = Number(rs.daily_loss || 0);
  if (pnlUSD < 0) daily_loss += Math.abs(pnlUSD);
  const daily_loss_pct = (daily_loss / (await getAccount()).initial_balance) * 100;

  const limit_pct = config.DAILY_LOSS_LIMIT_PCT;
  let consecutive = rs.consecutive_losses || 0;
  let blocked_until = rs.blocked_until || 0;
  if (daily_loss_pct >= limit_pct) {
    consecutive = (consecutive || 0) + 1;
    if (consecutive >= config.MAX_CONSECUTIVE_DAILY_LOSS) {
      blocked_until = Date.now() + (config.BLACKOUT_DAYS_AFTER_PENALTY * 24 * 60 * 60 * 1000);
      logger.warn('Risk manager: blackout triggered until ' + new Date(blocked_until).toISOString());
    }
  }

  await db.run('UPDATE risk_state SET daily_loss = ?, consecutive_losses = ?, blocked_until = ? WHERE date = ?', [daily_loss, consecutive, blocked_until, key]);

  await db.run('INSERT OR REPLACE INTO journal(id, msg, meta, ts) VALUES(?,?,?,?)', [ 'pnl_' + Date.now(), 'PnL recorded', JSON.stringify({ pnlUSD, newBal }), Date.now() ]);

  return { newBalance: newBal, daily_loss, daily_loss_pct, consecutive, blocked_until };
}

async function canOpenTrade(estimatedStopLossPct) {
  const acct = await getAccount();
  const rs = await getRiskState();
  if (rs.blocked_until && rs.blocked_until > Date.now()) {
    return { allowed: false, reason: 'blackout', details: { blocked_until: rs.blocked_until } };
  }
  const maxRiskUSD = acct.balance * (config.RISK_PCT / 100);
  if (!estimatedStopLossPct || estimatedStopLossPct <= 0) {
    return { allowed: false, reason: 'invalid_stoploss', details: {} };
  }
  const positionSizeUSD = maxRiskUSD / (estimatedStopLossPct / 100);
  if (positionSizeUSD > acct.balance) {
    return { allowed: false, reason: 'insufficient_balance_for_stoploss', details: { positionSizeUSD, maxRiskUSD } };
  }
  const projectedDailyLoss = (rs.daily_loss || 0) + (maxRiskUSD);
  const projectedDailyLossPct = (projectedDailyLoss / acct.initial_balance) * 100;
  if (projectedDailyLossPct > config.DAILY_LOSS_LIMIT_PCT) {
    return { allowed: false, reason: 'would_exceed_daily_limit', details: { projectedDailyLossPct, daily_limit_pct: config.DAILY_LOSS_LIMIT_PCT } };
  }
  return { allowed: true, reason: 'ok', details: { positionSizeUSD, maxRiskUSD } };
}

module.exports = { getAccount, ensureAccount, recordPnL, canOpenTrade };

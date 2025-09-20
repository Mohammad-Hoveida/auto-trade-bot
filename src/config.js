const DEFAULTS = {
  INITIAL_CAPITAL_USD: Number(process.env.INITIAL_CAPITAL_USD || 1000),
  DAILY_LOSS_LIMIT_PCT: Number(process.env.DAILY_LOSS_LIMIT_PCT || 0.75),
  RISK_PCT: Number(process.env.RISK_PCT || 3),
  MONTHLY_TARGET_PCT: Number(process.env.MONTHLY_TARGET_PCT || 30),
  MAX_CONSECUTIVE_DAILY_LOSS: Number(process.env.MAX_CONSECUTIVE_DAILY_LOSS || 3),
  BLACKOUT_DAYS_AFTER_PENALTY: Number(process.env.BLACKOUT_DAYS_AFTER_PENALTY || 5),
  ALLOWED_TIMEFRAMES: ['5m','15m','1h','4h','1d','1w'],
  DEFAULT_LEVERAGE: Number(process.env.DEFAULT_LEVERAGE || 1),
  DEFAULT_ORDER_TYPE: process.env.DEFAULT_ORDER_TYPE || 'market',
  TRADE_MODE: process.env.TRADE_MODE || 'ALERT_ONLY'
};

module.exports = DEFAULTS;

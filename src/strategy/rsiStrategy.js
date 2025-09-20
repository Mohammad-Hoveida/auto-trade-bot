module.exports = {
  name: 'RSI_Oscillator',
  async evaluate(market) {
    const rand = Math.random();
    if (rand < 0.7) return null;
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    return {
      provider: 'RSI',
      symbol: market,
      side,
      score: Math.round(40 + Math.random()*40),
      stopLossPct: 0.8 + Math.random()*1.8,
      takeProfitPct: 1.5 + Math.random()*4,
      timeframe: '5m',
      reason: 'RSI signal (demo)'
    };
  }
};

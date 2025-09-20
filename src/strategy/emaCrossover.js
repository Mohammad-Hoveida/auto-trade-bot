module.exports = {
  name: 'EMA_Crossover',
  async evaluate(market) {
    const rand = Math.random();
    if (rand < 0.6) return null;
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    return {
      provider: 'EMA',
      symbol: market,
      side,
      score: Math.round(50 + Math.random()*50),
      stopLossPct: 1.5 + Math.random()*2,
      takeProfitPct: 2 + Math.random()*5,
      timeframe: '15m',
      reason: 'EMA crossover signal (demo)'
    };
  }
};

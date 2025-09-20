module.exports = {
  name: 'MeanReversion',
  async evaluate(market) {
    const rand = Math.random();
    if (rand < 0.75) return null;
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    return {
      provider: 'MeanRev',
      symbol: market,
      side,
      score: Math.round(30 + Math.random()*50),
      stopLossPct: 0.5 + Math.random()*2.5,
      takeProfitPct: 1 + Math.random()*6,
      timeframe: '1h',
      reason: 'Mean reversion (demo)'
    };
  }
};

const assert = require('assert');
const risk = require('../src/riskManager');

(async () => {
  await risk.ensureAccount();
  const acct = await risk.getAccount();
  assert(acct.balance > 0, 'balance must be positive');
  console.log('Basic smoke test passed. Balance:', acct.balance);
})();

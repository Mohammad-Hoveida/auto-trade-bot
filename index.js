require('dotenv').config();
const server = require('./src/server');
const orchestrator = require('./src/orchestrator');
const logger = require('./src/logger');

const PORT = process.env.PORT || 3000;

server.start(PORT).then(() => {
  orchestrator.start();
  logger.info('TradeBot Advanced started.');
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

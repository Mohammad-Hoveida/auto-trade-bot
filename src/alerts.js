let io;
const db = require('./db');
const logger = require('./logger');

function attach(server) {
  const socketio = require('socket.io');
  io = socketio(server, { cors: { origin: '*' }});
  io.on('connection', (socket) => {
    logger.info('Socket connected: ' + socket.id);
    socket.on('ping', (d) => socket.emit('pong', d));
    socket.on('confirm_trade', async (payload) => {
      if (payload && payload.accept && payload.position) {
        const tradeExecutor = require('./tradeExecutor');
        const res = await tradeExecutor.execute(payload.position, 'AUTO');
        io.emit('executed', res);
        await db.run('INSERT OR REPLACE INTO journal(id, msg, meta, ts) VALUES(?,?,?,?)', ['exec_' + Date.now(), 'manual_confirm_exec', JSON.stringify({ res }), Date.now()]);
      } else {
        await db.run('INSERT OR REPLACE INTO journal(id, msg, meta, ts) VALUES(?,?,?,?)', ['reject_' + Date.now(), 'manual_confirm_rejected', JSON.stringify({ payload }), Date.now()]);
      }
    });
  });
}

async function send(event, payload) {
  if (io) {
    io.emit(event, payload);
  }
  await db.run('INSERT OR REPLACE INTO journal(id, msg, meta, ts) VALUES(?,?,?,?)', ['alert_' + Date.now(), event, JSON.stringify(payload), Date.now()]);
  logger.info('Alert sent: ' + event);
}

module.exports = { attach, send };

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const alerts = require('./alerts');
const db = require('./db');
const logger = require('./logger');
const orchestrator = require('./orchestrator');
const riskManager = require('./riskManager');
const tradeExecutor = require('./tradeExecutor');
const config = require('./config');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'pug');

app.get('/', async (req, res) => {
  const acct = await riskManager.getAccount();
  res.render('index', { account: acct, config });
});
app.get('/settings', async (req, res) => {
  res.render('settings', { config });
});
app.get('/journal', async (req, res) => {
  const rows = await db.all('SELECT * FROM journal ORDER BY ts DESC LIMIT 200');
  res.render('journal', { rows });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/account', async (req, res) => {
  const acct = await riskManager.getAccount();
  res.json(acct);
});
app.post('/api/settings', async (req, res) => {
  const updates = req.body || {};
  for (const k of Object.keys(updates)) {
    await db.run('INSERT OR REPLACE INTO settings(k,v) VALUES(?,?)', [k, String(updates[k])]);
  }
  res.json({ ok: true });
});
app.post('/api/confirm', async (req, res) => {
  const { position, accept } = req.body;
  if (accept && position) {
    const out = await tradeExecutor.execute(position, 'AUTO');
    return res.json({ executed: true, out });
  }
  res.json({ executed: false });
});

app.post('/api/run-once', async (req, res) => {
  try {
    await orchestrator.processOnce();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

let server;
module.exports = {
  start: async (port) => {
    server = http.createServer(app);
    alerts.attach(server);
    server.listen(port, () => console.log('Server listening on port ' + port));
    return server;
  },
  app, server
};

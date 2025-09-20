// Client side JS for socket connection and simple UI actions
const socket = io();

socket.on('connect', () => {
  console.log('connected to socket', socket.id);
  const a = document.getElementById('alerts');
  if (a) a.innerHTML = '<p>متصل شد</p>';
});

socket.on('candidate', (payload) => {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = '<b>پوزیشن پیشنهادی:</b> ' + JSON.stringify(payload.position);
  const a = document.getElementById('alerts');
  if (a) a.prepend(el);
});

socket.on('ask_confirm', (payload) => {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = '<b>درخواست تایید:</b> ' + JSON.stringify(payload.position) + '<br><button onclick="confirmTrade(\'' + payload.id + '\', true)">تایید</button><button onclick="confirmTrade(\'' + payload.id + '\', false)">رد</button>';
  const a = document.getElementById('alerts');
  if (a) a.prepend(el);
});

socket.on('executed', (payload) => {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = '<b>اجرای پوزیشن:</b> ' + JSON.stringify(payload);
  const a = document.getElementById('alerts');
  if (a) a.prepend(el);
});

function runOnce() {
  fetch('/api/run-once', { method: 'POST' }).then(r => r.json()).then(console.log).catch(console.error);
}

function setMode(mode) {
  fetch('/api/settings', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ TRADE_MODE: mode }) }).then(r=>r.json()).then(()=>alert('Mode set: ' + mode)).catch(console.error);
}

function saveSettings() {
  const form = document.getElementById('settingsForm');
  const data = {};
  new FormData(form).forEach((v,k) => data[k]=v);
  fetch('/api/settings', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(data) }).then(r=>r.json()).then(()=>alert('Saved')).catch(console.error);
}

function confirmTrade(id, accept) {
  socket.emit('confirm_trade', { pendingId: id, accept, position: null });
}

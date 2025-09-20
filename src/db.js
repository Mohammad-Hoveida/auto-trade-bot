/*
Simple file-backed JSON DB to avoid native modules on Windows.
Provides: run (compat stub), all(query...), get, insert, and DB object.
*/
const fs = require('fs');
const path = require('path');
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '..', 'data', 'tradebot.json');
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let DB = {};
try {
  if (fs.existsSync(DB_PATH)) {
    DB = JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}');
  } else {
    DB = {};
    fs.writeFileSync(DB_PATH, JSON.stringify(DB, null, 2));
  }
} catch (e) {
  console.error('Failed to load DB', e);
  DB = {};
}

function save() {
  fs.writeFileSync(DB_PATH + '.tmp', JSON.stringify(DB, null, 2));
  fs.renameSync(DB_PATH + '.tmp', DB_PATH);
}

async function run(sql, params) {
  // compatibility stub - doesn't execute SQL
  return Promise.resolve();
}

async function all(tableOrQuery) {
  if (!tableOrQuery) return DB;
  const t = tableOrQuery.toString();
  const m = t.match(/FROM\s+(\w+)/i);
  if (m) {
    const tbl = m[1];
    return DB[tbl] || [];
  }
  return DB[tableOrQuery] || [];
}

async function get(query, params) {
  const m = query && query.toString().match(/FROM\s+(\w+)/i);
  if (m) {
    const tbl = m[1];
    const rows = DB[tbl] || [];
    if (params && params.length) {
      const key = params[0];
      const row = rows.find(r => r.id === key || r.date === key);
      return row || null;
    }
    return rows[0] || null;
  }
  return null;
}

async function insert(table, obj) {
  if (!DB[table]) DB[table] = [];
  const existingIndex = DB[table].findIndex(r => r.id && obj.id && r.id === obj.id);
  if (existingIndex >= 0) {
    DB[table][existingIndex] = obj;
  } else {
    DB[table].push(obj);
  }
  save();
  return obj;
}

module.exports = { run, all, get, insert, DB, DB_PATH };

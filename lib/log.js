const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'data', 'log.jsonl');

function appendLog(entry) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n');
}

function readLog() {
  if (!fs.existsSync(LOG_FILE)) return [];
  return fs
    .readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .reverse();
}

module.exports = { appendLog, readLog, LOG_FILE };

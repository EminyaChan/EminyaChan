require('dotenv').config();
const express = require('express');
const path = require('path');
const { listRuns, loadRun, updateItemStatus, exportApprovedItem } = require('./lib/store');
const { readLog } = require('./lib/log');
const { runDailyAgent } = require('./run-daily');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/runs', (req, res) => {
  res.json(listRuns());
});

app.get('/api/runs/:id', (req, res) => {
  const run = loadRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  res.json(run);
});

app.post('/api/runs/:id/items/:itemId/approve', (req, res) => {
  try {
    const { approver, note } = req.body || {};
    const { run, item } = updateItemStatus(req.params.id, req.params.itemId, 'approved', { approver, note });
    const filePath = exportApprovedItem(run, item);
    res.json({ item, exportedTo: path.relative(__dirname, filePath) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/runs/:id/items/:itemId/reject', (req, res) => {
  try {
    const { approver, note } = req.body || {};
    const { item } = updateItemStatus(req.params.id, req.params.itemId, 'rejected', { approver, note });
    res.json({ item });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/run-now', async (req, res) => {
  try {
    const run = await runDailyAgent();
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/log', (req, res) => {
  res.json(readLog());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Marketing Content Agent dashboard running at http://localhost:${PORT}`);
});

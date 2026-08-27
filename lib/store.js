const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RUNS_DIR = path.join(DATA_DIR, 'runs');
const APPROVED_DIR = path.join(DATA_DIR, 'approved');

for (const dir of [DATA_DIR, RUNS_DIR, APPROVED_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function saveRun(run) {
  fs.writeFileSync(path.join(RUNS_DIR, `${run.id}.json`), JSON.stringify(run, null, 2));
  return run;
}

function loadRun(id) {
  const file = path.join(RUNS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listRuns() {
  return fs
    .readdirSync(RUNS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(RUNS_DIR, f), 'utf8')))
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

function updateItemStatus(runId, itemId, status, { approver, note } = {}) {
  const run = loadRun(runId);
  if (!run) throw new Error(`run ${runId} not found`);
  const item = run.items.find((i) => i.id === itemId);
  if (!item) throw new Error(`item ${itemId} not found in run ${runId}`);
  item.status = status;
  item.reviewedAt = new Date().toISOString();
  item.reviewedBy = approver || 'unknown';
  item.reviewNote = note || '';
  saveRun(run);
  return { run, item };
}

function exportApprovedItem(run, item) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const dir = path.join(APPROVED_DIR, `${slugify(item.campaign_name)}-${dateStr}`);
  fs.mkdirSync(dir, { recursive: true });

  const lines = [];
  lines.push(`# ${item.campaign_name}`);
  lines.push('');
  lines.push('## Title options');
  item.draft.titleOptions.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  lines.push('');
  lines.push('## Summary');
  lines.push(item.draft.summary);
  lines.push('');
  lines.push('## Posts');
  item.draft.posts.forEach((p) => {
    lines.push('');
    lines.push(`### ${p.channel} (suggested: ${p.suggestedDay})`);
    lines.push(p.caption);
    lines.push('');
    lines.push(p.hashtags.join(' '));
  });
  lines.push('');
  lines.push(`Approved by ${item.reviewedBy} on ${item.reviewedAt}`);
  if (item.reviewNote) lines.push(`Note: ${item.reviewNote}`);

  const filePath = path.join(dir, 'ready-to-publish.md');
  fs.writeFileSync(filePath, lines.join('\n'));
  return filePath;
}

module.exports = { saveRun, loadRun, listRuns, updateItemStatus, exportApprovedItem, slugify, RUNS_DIR, APPROVED_DIR };

let runs = [];
let activeRunId = null;

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getApproverName() {
  let name = localStorage.getItem('approverName');
  if (!name) {
    name = prompt('Your name (used to record approvals):') || 'reviewer';
    localStorage.setItem('approverName', name);
  }
  return name;
}

async function loadRuns() {
  runs = await (await fetch('/api/runs')).json();
  renderRunList();
  if (runs.length > 0 && !activeRunId) {
    selectRun(runs[0].id);
  }
}

async function loadLog() {
  const log = await (await fetch('/api/log')).json();
  const el = document.getElementById('logList');
  if (log.length === 0) {
    el.innerHTML = '<div class="log-row">No runs yet.</div>';
    return;
  }
  el.innerHTML = log
    .slice(0, 10)
    .map((entry) => `<div class="log-row"><strong>${esc(new Date(entry.timestamp).toLocaleString())}</strong><br>${esc(entry.message || entry.status)}</div>`)
    .join('');
}

function renderRunList() {
  const el = document.getElementById('runList');
  if (runs.length === 0) {
    el.innerHTML = '<div class="empty">No runs yet. Click "Run now" or drop a file in inbox/.</div>';
    return;
  }
  el.innerHTML = runs
    .map((run) => {
      const pending = run.items.filter((i) => i.status === 'pending_review').length;
      return `<div class="run-row ${run.id === activeRunId ? 'active' : ''}" data-id="${run.id}">
        <div class="date">${new Date(run.startedAt).toLocaleDateString()}</div>
        <div class="meta">${run.items.length} campaign(s) &middot; ${pending} pending</div>
      </div>`;
    })
    .join('');
  el.querySelectorAll('.run-row').forEach((row) => {
    row.addEventListener('click', () => selectRun(row.dataset.id));
  });
}

async function selectRun(id) {
  activeRunId = id;
  renderRunList();
  const run = await (await fetch(`/api/runs/${id}`)).json();
  renderRun(run);
}

function renderPost(post) {
  return `<div class="post">
    <h4>${esc(post.channel)} <span class="day">&middot; suggested ${esc(post.suggestedDay)}</span></h4>
    <pre>${esc(post.caption)}</pre>
    <div class="hashtags">${esc((post.hashtags || []).join(' '))}</div>
  </div>`;
}

function renderItem(runId, item) {
  const warnings = item.warnings && item.warnings.length ? `<div class="warnings">Note: ${item.warnings.map(esc).join(' | ')}</div>` : '';
  const aiError = item.draft.aiError ? `<div class="warnings">AI drafting failed, used fallback template: ${esc(item.draft.aiError)}</div>` : '';
  const actions = item.status === 'pending_review'
    ? `<div class="actions">
        <input type="text" placeholder="Optional note" id="note-${item.id}" />
        <button class="btn-ok" onclick="reviewItem('${runId}','${item.id}','approve')">Approve</button>
        <button class="btn-bad" onclick="reviewItem('${runId}','${item.id}','reject')">Reject</button>
      </div>`
    : `<div class="actions"><span class="meta">${esc(item.status)} by ${esc(item.reviewedBy)} on ${new Date(item.reviewedAt).toLocaleString()}${item.reviewNote ? ' — ' + esc(item.reviewNote) : ''}</span></div>`;

  return `<div class="card">
    <div class="item-header">
      <div>
        <h3>${esc(item.campaign_name)}</h3>
        <span class="badge ${item.status === 'pending_review' ? 'pending' : item.status}">${esc(item.status.replace('_', ' '))}</span>
      </div>
    </div>
    ${warnings}
    ${aiError}
    <div class="summary">${esc(item.draft.summary)}</div>
    <strong>Title options</strong>
    <ol class="titles">${item.draft.titleOptions.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
    <strong>Posts</strong>
    ${item.draft.posts.map(renderPost).join('')}
    ${actions}
  </div>`;
}

function renderRun(run) {
  const el = document.getElementById('content');
  if (run.status === 'no_new_data') {
    el.innerHTML = '<div class="empty">No new campaign files were found in inbox/ for this run.</div>';
    return;
  }
  let skippedHtml = '';
  if (run.skippedRows && run.skippedRows.length > 0) {
    skippedHtml = `<div class="card">
      <strong>Skipped rows (missing required info — not guessed)</strong>
      <ul class="skipped">
        ${run.skippedRows.map((s) => `<li>${esc(s.file)} row ${s.rowNumber}: ${esc(s.reasons.join(', '))}</li>`).join('')}
      </ul>
    </div>`;
  }
  if (run.items.length === 0) {
    el.innerHTML = skippedHtml || '<div class="empty">No valid campaigns in this run.</div>';
    return;
  }
  el.innerHTML = run.items.map((item) => renderItem(run.id, item)).join('') + skippedHtml;
}

async function reviewItem(runId, itemId, action) {
  const approver = getApproverName();
  const note = document.getElementById(`note-${itemId}`)?.value || '';
  const res = await fetch(`/api/runs/${runId}/items/${itemId}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approver, note }),
  });
  const data = await res.json();
  if (data.exportedTo) {
    alert(`Approved. Ready-to-publish file saved to: ${data.exportedTo}`);
  }
  await loadRuns();
  await selectRun(runId);
  await loadLog();
}

document.getElementById('runNowBtn').addEventListener('click', async () => {
  document.getElementById('runNowBtn').disabled = true;
  document.getElementById('runNowBtn').textContent = 'Running…';
  try {
    await fetch('/api/run-now', { method: 'POST' });
  } finally {
    document.getElementById('runNowBtn').disabled = false;
    document.getElementById('runNowBtn').textContent = 'Run now';
  }
  activeRunId = null;
  await loadRuns();
  await loadLog();
});

loadRuns();
loadLog();

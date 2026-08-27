#!/usr/bin/env node
// The weekly Marketing Content Agent run.
// 1. Reads every .csv/.json file sitting in inbox/
// 2. Validates each campaign row (missing/messy data is skipped and logged, never guessed)
// 3. Generates draft content (title options, summary, per-channel posts) for every valid campaign
// 4. Saves the run for review in the dashboard, and archives the processed files
// 5. Appends one entry to the run log

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseCampaignFile } = require('./lib/parseInput');
const { buildDraftsForCampaign } = require('./lib/generate');
const { saveRun } = require('./lib/store');
const { appendLog } = require('./lib/log');

const INBOX_DIR = path.join(__dirname, 'inbox');
const ARCHIVE_DIR = path.join(INBOX_DIR, 'archive');

async function runWeeklyAgent() {
  const startedAt = new Date().toISOString();
  const runId = crypto.randomUUID();

  fs.mkdirSync(INBOX_DIR, { recursive: true });
  const files = fs
    .readdirSync(INBOX_DIR)
    .filter((f) => (f.endsWith('.csv') || f.endsWith('.json')) && fs.statSync(path.join(INBOX_DIR, f)).isFile());

  const items = [];
  const fileSummaries = [];
  const skippedRows = [];

  if (files.length === 0) {
    const run = {
      id: runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'no_new_data',
      filesProcessed: [],
      items: [],
      skippedRows: [],
    };
    saveRun(run);
    appendLog({
      runId,
      status: 'no_new_data',
      message: 'No new campaign files found in inbox/. Drop a .csv or .json export in inbox/ and run again.',
      campaignsGenerated: 0,
      campaignsSkipped: 0,
    });
    console.log('No new files in inbox/. Nothing to do this run.');
    return run;
  }

  for (const file of files) {
    const filePath = path.join(INBOX_DIR, file);
    const { valid, invalid, parseError } = parseCampaignFile(filePath);

    fileSummaries.push({
      file,
      parseError,
      validCount: valid.length,
      invalidCount: invalid.length,
    });

    invalid.forEach((entry) => {
      skippedRows.push({ file, rowNumber: entry.rowNumber, reasons: entry.reasons });
    });

    for (const entry of valid) {
      const draft = await buildDraftsForCampaign(entry.campaign);
      items.push({
        id: crypto.randomUUID(),
        sourceFile: file,
        campaign_name: entry.campaign.campaign_name,
        campaign: entry.campaign,
        warnings: entry.warnings,
        draft,
        status: 'pending_review',
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: '',
      });
    }
  }

  // Archive processed files so the inbox is clean for next week's drop, keeping a dated audit trail.
  const dateStamp = startedAt.slice(0, 10);
  const archiveSubdir = path.join(ARCHIVE_DIR, dateStamp);
  fs.mkdirSync(archiveSubdir, { recursive: true });
  for (const file of files) {
    fs.renameSync(path.join(INBOX_DIR, file), path.join(archiveSubdir, file));
  }

  const run = {
    id: runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: items.length > 0 ? 'pending_review' : 'no_valid_campaigns',
    filesProcessed: fileSummaries,
    items,
    skippedRows,
  };
  saveRun(run);

  appendLog({
    runId,
    status: run.status,
    message: `Processed ${files.length} file(s): ${items.length} campaign(s) drafted, ${skippedRows.length} row(s) skipped.`,
    campaignsGenerated: items.length,
    campaignsSkipped: skippedRows.length,
    filesProcessed: files,
  });

  console.log(`Run ${runId} complete: ${items.length} campaign(s) drafted, ${skippedRows.length} skipped.`);
  return run;
}

if (require.main === module) {
  runWeeklyAgent()
    .then(() => process.exit(0))
    .catch((err) => {
      appendLog({ status: 'error', message: err.message });
      console.error('Weekly run failed:', err);
      process.exit(1);
    });
}

module.exports = { runWeeklyAgent };

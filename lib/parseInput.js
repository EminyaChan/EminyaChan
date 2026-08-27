const fs = require('fs');
const path = require('path');
const { parse: parseCsv } = require('csv-parse/sync');

const REQUIRED_FIELDS = ['campaign_name', 'goal', 'audience', 'key_message'];
const KNOWN_CHANNELS = ['LinkedIn', 'Instagram', 'Facebook', 'X', 'Twitter', 'TikTok'];
const DEFAULT_CHANNELS = ['LinkedIn', 'Instagram', 'Facebook', 'X'];

function normalizeChannel(raw) {
  const clean = raw.trim();
  const match = KNOWN_CHANNELS.find((c) => c.toLowerCase() === clean.toLowerCase());
  return match || clean;
}

function isValidDate(value) {
  if (!value) return true;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

// Validates one raw campaign row/object. Never throws - returns { ok, campaign|reasons, warnings }.
function validateCampaign(raw, rowNumber) {
  const warnings = [];
  const reasons = [];

  const get = (key) => (raw[key] === undefined || raw[key] === null ? '' : String(raw[key]).trim());

  for (const field of REQUIRED_FIELDS) {
    if (!get(field)) {
      reasons.push(`missing required field "${field}"`);
    }
  }

  if (reasons.length > 0) {
    return { ok: false, rowNumber, reasons };
  }

  if (!isValidDate(get('start_date'))) {
    warnings.push(`start_date "${get('start_date')}" is not a recognizable date - ignored`);
  }
  if (!isValidDate(get('end_date'))) {
    warnings.push(`end_date "${get('end_date')}" is not a recognizable date - ignored`);
  }

  let channels = DEFAULT_CHANNELS;
  const rawChannels = get('channels');
  if (rawChannels) {
    const split = rawChannels.split(/[,;]/).map((c) => c.trim()).filter(Boolean);
    if (split.length > 0) {
      channels = split.map(normalizeChannel);
      const unknown = channels.filter((c) => !KNOWN_CHANNELS.includes(c));
      if (unknown.length > 0) {
        warnings.push(`unrecognized channel(s) "${unknown.join(', ')}" - a generic post format will be used for them`);
      }
    }
  } else {
    warnings.push('no channels specified - defaulted to LinkedIn, Instagram, Facebook, X');
  }

  const campaign = {
    campaign_name: get('campaign_name'),
    goal: get('goal'),
    audience: get('audience'),
    key_message: get('key_message'),
    offer_cta: get('offer_cta') || '',
    channels,
    tone: get('tone') || 'confident, clear, and approachable - no jargon',
    start_date: isValidDate(get('start_date')) ? get('start_date') : '',
    end_date: isValidDate(get('end_date')) ? get('end_date') : '',
    link: get('link') || get('links') || '',
    notes: get('notes') || '',
  };

  return { ok: true, rowNumber, campaign, warnings };
}

// Parses a single file (CSV or JSON) into { valid: [...], invalid: [...], parseError }.
function parseCampaignFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf8');
  let rows;

  try {
    if (ext === '.json') {
      const data = JSON.parse(raw);
      rows = Array.isArray(data) ? data : [data];
    } else if (ext === '.csv') {
      rows = parseCsv(raw, { columns: true, skip_empty_lines: true, trim: true });
    } else {
      return { valid: [], invalid: [], parseError: `unsupported file type "${ext}" - only .csv and .json are supported` };
    }
  } catch (err) {
    return { valid: [], invalid: [], parseError: `could not parse file: ${err.message}` };
  }

  if (!rows || rows.length === 0) {
    return { valid: [], invalid: [], parseError: 'file contained no rows' };
  }

  const valid = [];
  const invalid = [];
  const seenNames = new Set();

  rows.forEach((row, idx) => {
    const result = validateCampaign(row, idx + 2); // +2 to approximate spreadsheet row number (header = row 1)
    if (!result.ok) {
      invalid.push(result);
      return;
    }
    const nameKey = result.campaign.campaign_name.toLowerCase();
    if (seenNames.has(nameKey)) {
      result.warnings.push(`duplicate campaign_name "${result.campaign.campaign_name}" in this file - processed anyway`);
    }
    seenNames.add(nameKey);
    valid.push(result);
  });

  return { valid, invalid, parseError: null };
}

module.exports = { parseCampaignFile, validateCampaign, REQUIRED_FIELDS, KNOWN_CHANNELS };

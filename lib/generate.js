// Turns one validated campaign into ready-to-review draft content:
// title options, a short summary, and one post per channel.
// Uses an AI provider (OpenAI or Anthropic, whichever has a key configured)
// when available; otherwise falls back to a deterministic template
// generator so the app still works end-to-end without any API key.

const CHANNEL_DEFAULTS = {
  LinkedIn: { bestDay: 'Tuesday', style: 'professional, 3-5 short sentences, one clear CTA', hashtagCount: 4 },
  Instagram: { bestDay: 'Wednesday', style: 'punchy hook + value + CTA, light emoji use', hashtagCount: 8 },
  Facebook: { bestDay: 'Wednesday', style: 'conversational, 2-4 sentences, one clear CTA', hashtagCount: 3 },
  X: { bestDay: 'Thursday', style: 'under 280 characters, punchy, one CTA', hashtagCount: 2 },
  Twitter: { bestDay: 'Thursday', style: 'under 280 characters, punchy, one CTA', hashtagCount: 2 },
  TikTok: { bestDay: 'Friday', style: 'short video script: Hook / Body / CTA', hashtagCount: 5 },
};

function slugWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function hashtagsFrom(campaign, count) {
  const words = new Set();
  [...slugWords(campaign.campaign_name), ...slugWords(campaign.key_message)]
    .filter((w) => w.length > 3)
    .slice(0, 10)
    .forEach((w) => words.add(w));
  const tags = Array.from(words).slice(0, count).map((w) => `#${w}`);
  while (tags.length < Math.min(count, 2)) tags.push('#marketing');
  return tags;
}

function titleOptionsTemplate(campaign) {
  return [
    `${campaign.campaign_name}: ${campaign.goal}`,
    `Introducing ${campaign.campaign_name} - built for ${campaign.audience}`,
    `Why ${campaign.audience} should care about ${campaign.campaign_name.toLowerCase()}`,
  ];
}

function summaryTemplate(campaign) {
  return `${campaign.campaign_name} targets ${campaign.audience} with the goal to ${campaign.goal.toLowerCase()}. Core message: ${campaign.key_message}.${campaign.offer_cta ? ` Call to action: ${campaign.offer_cta}.` : ''}`;
}

function postTemplate(campaign, channel) {
  const cfg = CHANNEL_DEFAULTS[channel] || { bestDay: 'Monday', style: 'general social post', hashtagCount: 3 };
  const cta = campaign.offer_cta || 'Learn more';
  const link = campaign.link ? ` ${campaign.link}` : '';
  let caption;

  if (channel === 'X' || channel === 'Twitter') {
    caption = `${campaign.key_message} ${cta}.${link}`.slice(0, 270);
  } else if (channel === 'TikTok') {
    caption = [
      `Hook: ${campaign.key_message}`,
      `Body: Show how ${campaign.campaign_name} helps ${campaign.audience}.`,
      `CTA: ${cta}${link}`,
    ].join('\n');
  } else if (channel === 'LinkedIn') {
    caption = `${campaign.key_message}\n\n${campaign.campaign_name} is built for ${campaign.audience}. ${cta}${link}`;
  } else {
    caption = `${campaign.key_message} ${cta}${link}`;
  }

  return {
    channel,
    caption,
    hashtags: hashtagsFrom(campaign, cfg.hashtagCount),
    suggestedDay: cfg.bestDay,
    style: cfg.style,
  };
}

function buildWithTemplate(campaign) {
  return {
    source: 'template',
    titleOptions: titleOptionsTemplate(campaign),
    summary: summaryTemplate(campaign),
    posts: campaign.channels.map((channel) => postTemplate(campaign, channel)),
  };
}

const SYSTEM_INSTRUCTIONS = 'You are a marketing copywriter. Given a campaign brief, produce ready-to-publish draft social content. Do not invent facts, statistics, dates, or offers not present in the brief.';

function buildPrompt(campaign) {
  return `Return ONLY valid JSON, no prose, matching this exact shape:
{
  "titleOptions": ["...", "...", "..."],
  "summary": "1-2 sentence summary of the content plan",
  "posts": [ { "channel": "LinkedIn", "caption": "...", "hashtags": ["#..."], "suggestedDay": "Tuesday" } ]
}
Include one post per channel listed below, matching each channel's typical style and length (X/Twitter under 280 characters, TikTok as a short Hook/Body/CTA script, LinkedIn professional, Instagram/Facebook punchy with a CTA).

Campaign brief:
- Name: ${campaign.campaign_name}
- Goal: ${campaign.goal}
- Audience: ${campaign.audience}
- Key message: ${campaign.key_message}
- Offer / CTA: ${campaign.offer_cta || '(none given - use a generic soft CTA)'}
- Tone: ${campaign.tone}
- Channels: ${campaign.channels.join(', ')}
- Link to include: ${campaign.link || '(none given)'}
- Notes: ${campaign.notes || '(none)'}`;
}

function parseAndValidate(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI response did not contain JSON');
  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.titleOptions || !parsed.summary || !Array.isArray(parsed.posts)) {
    throw new Error('AI response was missing required fields');
  }
  return parsed;
}

async function buildWithAnthropic(campaign) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    max_tokens: 1500,
    system: SYSTEM_INSTRUCTIONS,
    messages: [{ role: 'user', content: buildPrompt(campaign) }],
  });

  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return { source: 'anthropic', ...parseAndValidate(text) };
}

async function buildWithOpenAI(campaign) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTIONS },
      { role: 'user', content: buildPrompt(campaign) },
    ],
  });

  const text = response.choices[0].message.content || '';
  return { source: 'openai', ...parseAndValidate(text) };
}

// Which provider to use: an explicit AI_PROVIDER env var wins; otherwise
// auto-detect from whichever API key is present (OpenAI checked first
// since it's the more commonly pre-existing key); no key -> template.
function activeProvider() {
  const explicit = (process.env.AI_PROVIDER || '').toLowerCase();
  if (explicit === 'openai' || explicit === 'anthropic' || explicit === 'template') return explicit;
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'template';
}

async function buildDraftsForCampaign(campaign) {
  const provider = activeProvider();
  try {
    if (provider === 'openai') return await buildWithOpenAI(campaign);
    if (provider === 'anthropic') return await buildWithAnthropic(campaign);
  } catch (err) {
    return { ...buildWithTemplate(campaign), aiError: `${provider}: ${err.message}` };
  }
  return buildWithTemplate(campaign);
}

module.exports = { buildDraftsForCampaign, CHANNEL_DEFAULTS };

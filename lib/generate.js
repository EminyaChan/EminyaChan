// Turns one validated campaign into ready-to-review draft content:
// title options, a short summary, and one post per channel.
// Uses the Anthropic API when ANTHROPIC_API_KEY is set; otherwise falls back
// to a deterministic template generator so the app still works end-to-end.

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

async function buildWithAI(campaign) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a marketing copywriter. Given this campaign brief, produce ready-to-publish draft social content.
Return ONLY valid JSON, no prose, matching this exact shape:
{
  "titleOptions": ["...", "...", "..."],
  "summary": "1-2 sentence summary of the content plan",
  "posts": [ { "channel": "LinkedIn", "caption": "...", "hashtags": ["#..."], "suggestedDay": "Tuesday" } ]
}
Include one post per channel listed below, matching each channel's typical style and length (X/Twitter under 280 characters, TikTok as a short Hook/Body/CTA script, LinkedIn professional, Instagram/Facebook punchy with a CTA).
Do not invent facts, statistics, dates, or offers not present in the brief.

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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI response did not contain JSON');
  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.titleOptions || !parsed.summary || !Array.isArray(parsed.posts)) {
    throw new Error('AI response was missing required fields');
  }

  return { source: 'ai', ...parsed };
}

async function buildDraftsForCampaign(campaign) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await buildWithAI(campaign);
    } catch (err) {
      return { ...buildWithTemplate(campaign), aiError: err.message };
    }
  }
  return buildWithTemplate(campaign);
}

module.exports = { buildDraftsForCampaign, CHANNEL_DEFAULTS };

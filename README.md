# Marketing Content Agent

Turns a short campaign brief into ready-to-review social media drafts —
title options, a summary, and one post per platform — so Marketing only
has to review and publish, not start from a blank page.

This guide assumes no coding background. Everything below is plain steps.

## What it actually does, in one paragraph

Every day, you drop a campaign export (a spreadsheet/CSV or JSON file) into
the `inbox` folder — or just leave it there from the day before. The agent
reads it, checks each campaign has the basics it needs, and writes draft
social posts for each one. You open a simple web page, read the drafts, and
click **Approve** or **Reject** on each. An approved draft is saved as a
clean, ready-to-copy file you paste straight into LinkedIn/Instagram/etc.
Nothing gets posted automatically — you are always the last step before
anything goes out.

## 1. One-time setup

You need [Node.js](https://nodejs.org) installed (version 18 or newer).

```
npm install
cp .env.example .env
```

Optional but recommended — open `.env` and add **one** of:

- `OPENAI_API_KEY=...` (from https://platform.openai.com/api-keys), or
- `ANTHROPIC_API_KEY=...` (from https://console.anthropic.com/)

so the agent writes the posts using real AI instead of the built-in
template. If you set both, it uses OpenAI by default — set `AI_PROVIDER=anthropic`
in `.env` to prefer the other one instead. **Without either key, the app
still works end-to-end** — it just fills in posts using a simpler, more
repetitive template, so the drafts are more generic. If an AI call ever
fails (bad key, no network, rate limit), the agent automatically falls
back to the template for that item and shows exactly why on the
dashboard — it never blocks or crashes the run.

## 2. Daily routine (what you do every day)

1. Export your campaign list from wherever you plan campaigns (spreadsheet,
   HubSpot, Mailchimp, Notion, etc.) as a `.csv` or `.json` file. See the
   exact format below.
2. Drop that file into the `inbox` folder. (If there's nothing new, skip
   this — the agent just reports "no new files" and does nothing that day.)
3. Run:
   ```
   npm run daily
   ```
   (Or click **Run now** on the dashboard — see step 4 — which does the
   same thing.)
4. Start the review dashboard:
   ```
   npm start
   ```
   Then open **http://localhost:3000** in your browser.
5. Read each draft. Click **Approve** (saves a ready-to-publish file) or
   **Reject** (records why, nothing is saved). You can leave an optional
   note either way.
6. Approved drafts are saved in `data/approved/<campaign-name>-<date>/ready-to-publish.md`.
   Open that file, copy each post into the platform, and publish.

The `inbox` file you dropped in is moved to `inbox/archive/<date>/` after
each run, so you always know what was processed and when.

## 3. The exact input format

CSV (recommended) or JSON, with these columns/fields per campaign:

| Field | Required? | Example |
|---|---|---|
| `campaign_name` | **Required** | Autumn Product Launch |
| `goal` | **Required** | Drive signups for the new customer portal |
| `audience` | **Required** | Existing customers who manage accounts online |
| `key_message` | **Required** | The new customer portal cuts admin time in half |
| `offer_cta` | optional | Get early access |
| `channels` | optional (default: LinkedIn, Instagram, Facebook, X) | LinkedIn, Instagram, Facebook, X |
| `tone` | optional (default: confident, clear, approachable) | warm and genuine |
| `start_date` / `end_date` | optional | 2026-09-08 |
| `link` | optional | https://example.com/portal |
| `notes` | optional | anything else worth knowing |

A ready-made example is at `inbox/archive/<date>/sample-campaigns.csv` (it
was already run once as this build's live test — see below). Copy its
header row to build your own exports.

**If a row is missing a required field, it is skipped and logged with the
exact reason** — the agent never guesses a goal, audience, or message that
wasn't given. You'll see skipped rows called out at the bottom of the
dashboard for that run.

## 4. The daily schedule

A scheduled trigger runs the agent automatically every day at 08:00 UTC.
It does the drafting step only — you still open the dashboard to review
and approve. If the inbox is empty that day, the run simply logs "no new
files" and does nothing else — running with no new campaign export is not
an error.

**Important:** this automated daily run happens in a cloud sandbox whose
network policy allows `api.anthropic.com` but blocks `api.openai.com`.
Since you're using an OpenAI key, the automated run will always use the
built-in template generator, not real AI drafting — that's a deliberate,
working fallback, not a bug, and you'll see "Drafted by built-in template"
on those items. If you want genuinely AI-written drafts, run
```
npm run daily
```
yourself on your own machine (with `OPENAI_API_KEY` in your local `.env`)
whenever you're ready to review that day's campaigns — there's no network
restriction there. If you later get an Anthropic key instead, put it in
this environment's own environment-variable settings (not a committed
file) and the automated daily run will pick it up and start drafting with
real AI on its own.

## 5. The run log

Every run — whether it found new files, skipped rows, or failed — is
recorded in `data/log.jsonl` and shown in the "Run log" panel on the
dashboard, so you can always see what happened without digging into files.

## The live test run already in this repo

The agent was run once against a realistic 4-campaign sample export
(`inbox/sample-campaigns.csv`, now archived to `inbox/archive/`) to prove
the whole pipeline end-to-end:

- **3 campaigns drafted** (Autumn Product Launch, Customer Spotlight
  Series, Partner Webinar) — each with 3 title options, a summary, and a
  post per channel.
- **1 row skipped on purpose** ("Regional Roadshow" — missing `goal`), to
  prove the validator catches missing data instead of guessing.
- **1 warning surfaced on purpose** (Partner Webinar listed "Threads" and
  "Pinterest", which aren't in the default channel list) — it still
  generated a generic-format post for them and flagged the warning.
- "Autumn Product Launch" was then approved (exported to
  `data/approved/autumn-product-launch-2026-08-27/ready-to-publish.md`)
  and "Customer Spotlight Series" was rejected with a note, to prove both
  paths work. "Partner Webinar" is left pending for you to try.

Run `npm start` and open http://localhost:3000 to see this run for
yourself, or open `data/approved/autumn-product-launch-2026-08-27/ready-to-publish.md`
directly to see the finished, ready-to-copy output.

**The output format (title options + summary + per-channel posts, exported
as one Markdown file per approved campaign) has already been confirmed** —
it was approved on the dashboard against this live sample. Say the word if
you'd rather have plain text, a Word doc, or a different structure, and
it's easy to change.

## What I still need from you

1. **Your real campaign export**, once you're ready to stop using the
   sample data — same column headers as the table above, from whatever
   tool you currently plan campaigns in. If that tool isn't a
   spreadsheet, tell me which one and I can help you get a matching
   export.
2. **Nothing further for now on the API key** — decision made: you're
   staying on OpenAI. The integration is built and proven to fall back
   safely (confirmed live: a real call to `api.openai.com` from this
   sandbox got blocked by network policy, and the app correctly fell back
   to the template and showed the exact error instead of crashing).
   Practically, that means:
   - The automated daily Routine (runs in this same restricted sandbox)
     will keep using the template fallback — real AI drafting isn't
     reachable for OpenAI from there.
   - Run `npm run daily` yourself on your own machine, with your OpenAI
     key in your local `.env`, whenever you want real AI-written drafts —
     no restriction there.
   - If that changes (e.g. you later get an Anthropic key), say so and
     I'll wire it into the automated Routine — `api.anthropic.com` **is**
     reachable from this sandbox, unlike OpenAI's.
   Treat the two OpenAI keys you pasted in chat earlier as exposed since
   they went through plaintext chat; consider rotating them in your OpenAI
   dashboard before using it for real.
3. **Brand/voice guidance**, if you have it (a style guide, banned words,
   preferred hashtags) — right now tone comes only from the `tone` column
   per campaign; I can wire in a standing brand voice if you give me one.

## What should stay manual (on purpose)

- **Actually publishing the post.** This app deliberately stops at
  "ready to copy-paste" — it does not have (or ask for) login access to
  your social platforms. That keeps a human as the last check before
  anything public goes out, which matches the "medium risk, needs
  approval" instruction this was built to.
- **Opening the dashboard.** The drafting step runs on schedule every day,
  but someone still needs to open http://localhost:3000 and click through.
  If you'd rather get a message instead of having to remember to check,
  tell me and I can add a daily reminder.
- **Exporting the campaign list from your marketing tool.** Unless you
  tell me which tool and give it API access, this is a manual export step
  whenever you have a new campaign.

## Project structure (for reference)

```
run-daily.js      the daily agent: reads inbox/, validates, drafts, logs
server.js         the review dashboard (Express server)
lib/parseInput.js validates campaign rows, never guesses missing data
lib/generate.js   drafts titles/summary/posts (AI if key set, else template)
lib/store.js      saves runs, exports approved drafts to data/approved/
lib/log.js        the run log (data/log.jsonl)
public/           the dashboard's web page
inbox/            drop new campaign exports here
inbox/archive/    processed files, kept for your records
data/runs/        every run's full detail (source of truth for the dashboard)
data/approved/    final ready-to-publish files after you approve them
```

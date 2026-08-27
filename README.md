# Marketing Content Agent

An always-on app you open from a browser link anytime: add a campaign brief,
click Generate, review the ready-to-post drafts (titles, summary, per-platform
captions + hashtags, blog draft), then Approve. It does the writing; you do
the reviewing. Nothing ever posts automatically — approving and "mark
published" are both just status tracking inside the app.

There are two parts in this repo:

- **`webapp/`** — the app itself (this is what you asked for: open it anytime, create and manage campaigns, generate on demand). **Start here.**
- **`src/`** — an earlier, optional headless version that reads campaigns from a Google Sheet and runs once a week via GitHub Actions with no UI. Keep it if you specifically want a scheduled batch run with zero clicking; otherwise you can ignore it. See "Optional: weekly headless mode" at the bottom.

## What the app does, in plain English

1. You add a campaign: a name and a short brief (what's happening, key
   message, audience, tone). Nothing else is required.
2. Click **Generate**. It writes 3 title options, a one-line summary, a
   ready-to-post caption + hashtags for every platform you picked, and a
   blog draft if you asked for one.
3. You review it on the same page, edit the brief and regenerate if needed,
   copy any post with one click.
4. Click **Approve** when it's ready to go out. Click **Mark published**
   afterward purely so your own tracking is accurate — the app does not
   have posting access to any platform, so this never actually posts
   anything.
5. Every action (created, generated, approved, published, edited, deleted)
   is recorded in the **Activity log** page, so you can see exactly what
   happened and when.

The agent will not invent campaign facts, numbers, or quotes that aren't in
your brief — if you leave the brief empty, Generate refuses and tells you
why instead of guessing.

## Running it locally

```bash
pip install -r requirements.txt
cp .env.example .env
# edit .env: at minimum set OPENAI_API_KEY
python -m webapp.wsgi
```

Open http://127.0.0.1:5000. Data is stored in a local `webapp.db` SQLite
file (created automatically).

## Deploying it so you have a permanent link

The app is a standard Flask app with a `Procfile` and `render.yaml`, ready
for [Render](https://render.com) (free tier works):

1. Push this repo to GitHub (already done — you're looking at it).
2. On Render: **New → Blueprint**, point it at this repo. It reads
   `render.yaml` and creates the service automatically.
3. Under the new service's **Environment** tab, set:
   - `OPENAI_API_KEY` — your OpenAI key (required for real drafts; without it, the app still works but drafts are mechanical — see "Offline fallback" below)
   - `APP_PASSWORD` — a shared password for your team to open the app (leave blank and **anyone with the link can use it**, not recommended)
4. Deploy. Render gives you a permanent URL like `https://marketing-content-agent.onrender.com`.

**Important — storage durability:** by default the app uses a local SQLite
file. On Render's free tier, that file resets whenever the service
redeploys. For campaigns/drafts that must survive redeploys, add a free
Render Postgres database and set the `DATABASE_URL` environment variable to
its connection string — the app already reads that variable, no code
changes needed. For light use (a handful of campaigns a week reviewed
promptly), SQLite is fine to start with; upgrade to Postgres once you trust
the workflow.

Any other Python host (Railway, Fly.io, a VM) works the same way — install
`requirements.txt`, run `gunicorn webapp.wsgi:app`, set the same environment
variables.

## Offline fallback (when no API key is set)

If neither `OPENAI_API_KEY` nor `ANTHROPIC_API_KEY` is configured (or the
API call fails), Generate still works but uses a template-based fallback —
clearly labeled with an "offline fallback draft" badge on the page. It's
functional but mechanical; add a real key for actual AI-quality copy. See
`sample_data/sample_output_preview.md` for a side-by-side of what real AI
output looks like versus the fallback.

## What stays manual (on purpose)

- **Actually publishing** to LinkedIn/Instagram/Facebook/X — the app has no
  posting credentials for any platform. "Mark published" only updates the
  status shown in the app.
- **Writing the initial brief** — a brief is required; the agent won't
  invent one.
- **Approving** — a human always clicks Approve before a campaign is
  treated as ready to go out.

## Where things live

```
webapp/                  the app: Flask routes, templates, SQLite/Postgres models
webapp/templates/        dashboard, campaign form/detail, activity log, login
Procfile, render.yaml    deployment config for Render (or any similar host)
.env.example             every setting you can configure
```

---

## Optional: weekly headless mode (`src/`)

An earlier, non-interactive version of this idea: reads campaigns from a
Google Sheet, drafts them automatically every Monday via GitHub Actions,
and produces a static review page — no login, nothing to click to trigger
it, but also nothing to click *in* (no Approve button; you approve by
editing the Sheet's Status column yourself). Useful only if you specifically
want scheduled batch generation with zero interaction. If you're using the
web app above, you don't need this.

**Setup:** a Google Sheet with a `Campaigns` tab (`Campaign Name | Brief |
Platforms | Due Date | Status | Notes`), a Google service account key
shared on that sheet, and `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` — all stored
as GitHub Actions secrets (`GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`,
`OPENAI_API_KEY`). Runs every Monday 08:00 UTC via
`.github/workflows/weekly-content-agent.yml`, or trigger it manually:

```bash
python -m src.main --source sheets   # real run against your Sheet
python -m src.main --source sample   # demo run, no credentials needed
```

`output/2026-08-27/index.html` is a real run of this mode against
`sample_data/sample_campaigns.csv` (4 sample campaigns, one deliberately
missing a brief, to show the validation working) — kept here for reference.

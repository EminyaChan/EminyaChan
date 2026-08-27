# Marketing Content Agent

Turns a short campaign brief sitting in your Google Sheet into ready-to-post
drafts (titles, summary, platform captions, hashtags, and a blog draft) —
automatically, once a week. You review a single web page and approve; the
agent does the writing.

## What it does, in plain English

1. Once a week (Monday 08:00 UTC by default), it opens your **Campaigns**
   Google Sheet and finds every row marked `To Do`.
2. For each one, it checks the row makes sense (has a name and a brief). If
   something's missing or messy, it skips that row and tells you exactly
   why instead of guessing.
3. For everything valid, it writes: 3 title options, a one-line summary, a
   ready-to-post caption + hashtags for each platform you listed, and a
   short blog draft if you asked for one.
4. It saves all of that as one review webpage (`output/<date>/index.html`)
   you can open in any browser — no login, nothing to install.
5. It marks each row `Drafted` in your sheet (never `Published` — that part
   always stays manual).
6. It writes one line to `logs/run_log.jsonl` recording what it did, so you
   can look back at any past run.

**Nothing gets posted automatically.** The dashboard it produces is the
approval checkpoint: you read it, edit anything you want by hand, and then
change that row's Status to `Approved` in the Sheet yourself when it's
ready to actually go out. Publishing to each platform is intentionally left
manual — see "What stays manual" below.

## What I need from you to go live

1. **A Google Sheet** with a tab (default name `Campaigns`) with these
   column headers in row 1:

   | Campaign Name | Brief | Platforms | Due Date | Status | Notes |
   |---|---|---|---|---|---|

   - **Platforms**: comma-separated, any of `LinkedIn, Instagram, Facebook, X, Blog` (typos like "insta" or "fb" are auto-corrected).
   - **Status**: leave blank or `To Do` for anything you want drafted. The agent sets it to `Drafted` when done; you set it to `Approved` when you're ready to publish.
   - Two more columns, `Draft Link` and `Last Run`, will be added automatically by the agent's first write-back — you don't need to create them.

2. **Share that Sheet with a Google service account**, and give me:
   - The Sheet's ID (the long string in its URL).
   - A service account JSON key with edit access to the Sheet (Google Cloud Console → IAM & Admin → Service Accounts → Create → Keys → Add key → JSON, then share the Sheet with that account's email address like you would with a person).

3. **An Anthropic API key** (`ANTHROPIC_API_KEY`) — this is what writes the
   actual drafts. Without it, the agent still runs but uses a much more
   mechanical fallback (see `sample_data/sample_output_preview.md` for the
   quality difference).

4. Store both secrets in GitHub (repo Settings → Secrets and variables →
   Actions): `ANTHROPIC_API_KEY`, `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` (paste the whole JSON key file contents), and optionally `GOOGLE_SHEET_TAB` if you don't use the name "Campaigns".

Until those are set up, the weekly GitHub Action will fail at the "read the
sheet" step — that's expected and safe; nothing partial gets published.

## Running it

**Weekly, automatically:** already wired up in
`.github/workflows/weekly-content-agent.yml`, runs every Monday 08:00 UTC
via GitHub Actions once the secrets above are set. You can also trigger it
on demand from the repo's Actions tab ("Run workflow").

**By hand, locally:**
```bash
pip install -r requirements.txt
cp .env.example .env        # fill in your keys
python -m src.main --source sheets
```

**Demo mode (no credentials needed, uses `sample_data/sample_campaigns.csv` instead of a real Sheet):**
```bash
python -m src.main --source sample
```

Either way, open `output/<today's date>/index.html` afterward to review.

## The live test run in this repo

`output/2026-08-27/` is a real run of this exact code against
`sample_data/sample_campaigns.csv` (4 sample campaigns, one deliberately
missing a brief to prove the validation works). Open
`output/2026-08-27/index.html` to see it. Because no Anthropic key is
available in this build environment, that run used the offline fallback
generator — mechanical but functional. `sample_data/sample_output_preview.md`
shows the same campaign at the quality you'll get once your API key is
added, so you can judge the actual format and tone before we finalize it.

**Please confirm:** does the format in that dashboard (titles → summary →
per-platform captions → hashtags → optional blog draft) match what you want
to review each week, or would you like it reshaped (e.g. grouped by
platform instead of by campaign, or with a scheduling field)?

## What stays manual (on purpose)

- **Actually publishing** to LinkedIn/Instagram/Facebook/X. This app drafts
  and stages content; it does not have posting credentials for any
  platform. Wiring that up is a separate, higher-risk step (it would need
  each platform's posting API and would post on your behalf) — happy to
  build it once you've used the draft-and-review flow for a few weeks and
  are comfortable with it.
- **Writing the initial brief.** The agent will not invent campaign facts,
  numbers, or quotes that aren't in your brief — if a brief is empty or a
  key detail is missing, it skips the row and flags it rather than making
  something up.
- **Approving.** Every campaign needs a human to flip Status to `Approved`
  in the Sheet before anyone treats it as ready to go out.

## Where things live

```
src/                     the app
sample_data/             demo input + a quality preview of AI-generated output
output/<date>/           each run's drafts + review dashboard (index.html)
logs/run_log.jsonl       one line per run: what was drafted, skipped, or errored
.github/workflows/       the weekly GitHub Actions schedule
.env.example             every setting you can configure, copy to .env for local runs
```

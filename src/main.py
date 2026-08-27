"""Entry point for the Marketing Content Agent.

Usage:
  python -m src.main --source sample                 # demo run, no credentials needed
  python -m src.main --source sheets                  # real weekly run against your Google Sheet

Every run:
  1. Reads campaign rows from the source.
  2. Validates each row (skips anything missing a Brief, logs why).
  3. Drafts titles, a summary, and per-platform posts for every valid row.
  4. Writes one markdown file per campaign plus one index.html review dashboard.
  5. Writes the campaign's Status back to 'Drafted' (never 'Published' — that
     step is always manual).
  6. Appends a line to logs/run_log.jsonl describing exactly what happened.
"""
import argparse
import os
import re
from datetime import datetime, timezone

from src import config
from src.dashboard import build_dashboard
from src.logger import RunLogger
from src.sheets_client import GoogleSheetsClient, SampleCsvClient
from src.validator import validate_row
from src.content_generator import get_generator


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "campaign"


def write_campaign_markdown(output_dir, campaign, result):
    path = os.path.join(output_dir, f"{slugify(campaign.campaign_name)}.md")
    lines = [f"# {campaign.campaign_name}", "", f"_Summary: {result.summary}_", ""]
    lines.append("## Title options")
    for t in result.title_options:
        lines.append(f"- {t}")
    lines.append("")
    for platform, post in result.posts.items():
        lines.append(f"## {platform}")
        lines.append("")
        lines.append(post.get("caption", ""))
        if post.get("hashtags"):
            lines.append("")
            lines.append(" ".join(post["hashtags"]))
        lines.append("")
    if result.blog_draft:
        lines.append("## Blog / announcement draft")
        lines.append("")
        lines.append(result.blog_draft)
        lines.append("")
    if result.warnings:
        lines.append("## Notes for the reviewer")
        for w in result.warnings:
            lines.append(f"- {w}")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


def run(source: str, sample_csv: str):
    if source == "sheets":
        client = GoogleSheetsClient()
    else:
        client = SampleCsvClient(sample_csv)

    run_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    output_dir = os.path.join(config.OUTPUT_DIR, run_date)
    os.makedirs(output_dir, exist_ok=True)

    logger = RunLogger()
    rows = client.read_campaigns()
    generator, using_fallback = get_generator()
    if using_fallback:
        print("WARNING: no working ANTHROPIC_API_KEY found — using the offline fallback "
              "generator. Drafts will be more mechanical. Set the key in .env for real runs.")

    campaigns_content = []
    for i, raw_row in enumerate(rows):
        campaign, skip = validate_row(i, raw_row)
        if skip:
            logger.log_skipped(skip.row_index, skip.reason)
            continue

        try:
            result = generator.generate(campaign)
        except Exception as e:
            logger.log_error(campaign.campaign_name, e)
            print(f"ERROR generating content for '{campaign.campaign_name}': {e}")
            continue

        draft_path = write_campaign_markdown(output_dir, campaign, result)
        logger.log_processed(
            campaign.campaign_name,
            result.source,
            campaign.warnings + result.warnings,
            draft_path,
        )
        campaigns_content.append(
            {
                "campaign_name": campaign.campaign_name,
                "title_options": result.title_options,
                "summary": result.summary,
                "posts": result.posts,
                "blog_draft": result.blog_draft,
                "source": result.source,
                "warnings": campaign.warnings + result.warnings,
            }
        )

        try:
            client.write_status(
                campaign.row_index,
                "Drafted",
                draft_path,
                datetime.now(timezone.utc).isoformat(),
            )
        except Exception as e:
            print(f"WARNING: could not write status back to source for "
                  f"'{campaign.campaign_name}': {e}")

    summary = logger.finish(output_dir)
    dashboard_path = os.path.join(output_dir, "index.html")
    build_dashboard(summary, campaigns_content, dashboard_path)

    print(f"\nDone. {summary['campaigns_drafted']} drafted, "
          f"{summary['campaigns_skipped']} skipped, {summary['errors']} error(s).")
    print(f"Review dashboard: {dashboard_path}")
    return summary, dashboard_path


def main():
    parser = argparse.ArgumentParser(description="Marketing Content Agent")
    parser.add_argument("--source", choices=["sheets", "sample"], default="sheets")
    parser.add_argument("--sample-csv", default="sample_data/sample_campaigns.csv")
    args = parser.parse_args()
    run(args.source, args.sample_csv)


if __name__ == "__main__":
    main()

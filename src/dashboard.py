"""Builds a single static index.html review dashboard for one run. No
server, no login — open the file in a browser. This is the whole
'approval' gate: nothing is published automatically, a human reads this
page and then flips the Status column in the source sheet/CSV to
'Approved' when a campaign is ready to go out."""
import html as html_escape


def _copy_button(text):
    safe = html_escape.escape(text).replace("`", "&#96;")
    return (
        f"<button class=\"copy-btn\" onclick=\"navigator.clipboard.writeText(this.dataset.text)\" "
        f"data-text=\"{safe}\">Copy</button>"
    )


def build_dashboard(run_summary: dict, campaigns_content: list, output_path: str):
    """campaigns_content: list of dicts with keys
    campaign_name, title_options, summary, posts, blog_draft, source, warnings"""

    sections = []
    for c in campaigns_content:
        source_labels = {
            "openai-api": "OpenAI-drafted",
            "claude-api": "Claude-drafted",
            "offline-fallback": "offline fallback draft",
        }
        badge_class = "fallback" if c["source"] == "offline-fallback" else "ai"
        badge = f'<span class="badge {badge_class}">{source_labels.get(c["source"], c["source"])}</span>'
        warnings_html = ""
        if c["warnings"]:
            items = "".join(f"<li>{html_escape.escape(w)}</li>" for w in c["warnings"])
            warnings_html = f'<ul class="warnings">{items}</ul>'

        titles_html = "".join(f"<li>{html_escape.escape(t)}</li>" for t in c["title_options"])

        posts_html = ""
        for platform, post in c["posts"].items():
            caption = post.get("caption", "")
            hashtags = " ".join(post.get("hashtags", []))
            full_text = caption + ("\n\n" + hashtags if hashtags else "")
            posts_html += f"""
            <div class="post">
              <div class="post-header"><strong>{html_escape.escape(platform)}</strong> {_copy_button(full_text)}</div>
              <pre>{html_escape.escape(caption)}</pre>
              <p class="hashtags">{html_escape.escape(hashtags)}</p>
            </div>"""

        blog_html = ""
        if c.get("blog_draft"):
            blog_html = f"""
            <div class="post">
              <div class="post-header"><strong>Blog / announcement draft</strong> {_copy_button(c['blog_draft'])}</div>
              <pre>{html_escape.escape(c['blog_draft'])}</pre>
            </div>"""

        sections.append(f"""
        <section class="campaign">
          <h2>{html_escape.escape(c['campaign_name'])} {badge}</h2>
          <p class="summary">{html_escape.escape(c['summary'])}</p>
          <h3>Title options</h3>
          <ul>{titles_html}</ul>
          <h3>Ready-to-post drafts</h3>
          {posts_html}
          {blog_html}
          {warnings_html}
        </section>""")

    skipped_html = ""
    if run_summary["skipped"]:
        rows = "".join(
            f"<li><strong>Row {s['row_index']}:</strong> {html_escape.escape(s['reason'])}</li>"
            for s in run_summary["skipped"]
        )
        skipped_html = f"""
        <section class="skipped">
          <h2>Needs your attention (skipped automatically)</h2>
          <ul>{rows}</ul>
        </section>"""

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Marketing Content Agent — Review ({run_summary['run_at']})</title>
<style>
  body {{ font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 820px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; background:#fff; }}
  h1 {{ font-size: 1.4rem; }}
  h2 {{ font-size: 1.15rem; border-bottom: 1px solid #ddd; padding-bottom: .3rem; }}
  h3 {{ font-size: 0.95rem; color:#444; margin-bottom:.3rem; }}
  .campaign {{ margin-bottom: 2.5rem; }}
  .summary {{ color:#333; font-style: italic; }}
  .badge {{ font-size: .7rem; padding: .15rem .5rem; border-radius: 1rem; margin-left:.5rem; vertical-align:middle; }}
  .badge.ai {{ background:#dff5e1; color:#1f7a34; }}
  .badge.fallback {{ background:#fdf0d5; color:#9a6a00; }}
  .post {{ border:1px solid #e2e2e2; border-radius:8px; padding:.75rem 1rem; margin-bottom:.75rem; background:#fafafa; }}
  .post-header {{ display:flex; justify-content:space-between; align-items:center; margin-bottom:.4rem; }}
  pre {{ white-space: pre-wrap; font-family: inherit; margin:0; }}
  .hashtags {{ color:#3b6dbf; margin:.4rem 0 0; }}
  .copy-btn {{ font-size:.75rem; padding:.2rem .6rem; cursor:pointer; }}
  .warnings {{ color:#9a6a00; font-size:.85rem; }}
  .skipped {{ background:#fff4f4; border:1px solid #f3caca; border-radius:8px; padding:1rem 1.5rem; margin-top:2rem; }}
  footer {{ margin-top:3rem; padding-top:1rem; border-top:1px solid #ddd; font-size:.85rem; color:#555; }}
</style>
</head>
<body>
<h1>Weekly content drafts — run at {html_escape.escape(run_summary['run_at'])}</h1>
<p>{run_summary['campaigns_drafted']} campaign(s) drafted, {run_summary['campaigns_skipped']} skipped, {run_summary['errors']} error(s). Review each draft below, edit directly in your normal tools, then mark the campaign <strong>Approved</strong> in the source sheet when it's ready to publish. Nothing here gets posted automatically.</p>
{''.join(sections)}
{skipped_html}
<footer>Generated automatically by the Marketing Content Agent. This page is the approval checkpoint — publishing still happens manually until a publish integration is connected.</footer>
</body>
</html>"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(page)

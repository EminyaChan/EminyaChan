"""Turns a campaign brief into ready-to-publish draft content.

Calls OpenAI (preferred) or Anthropic if configured. Falls back to a
deterministic offline template — clearly flagged in the result — when no
key is set or the API call fails, so "Generate" always produces something
usable rather than erroring out.
"""
import json
import os
import re

SYSTEM_PROMPT = """You are a senior social media copywriter for a company's \
marketing team. Given a short campaign brief, write ready-to-publish draft \
content that a marketing director can review and post with minimal edits. \
Match the tone described in the brief. Never invent facts, numbers, dates, \
or quotes that are not in the brief — if a detail is missing, write around \
it instead of making it up.

Reply with ONLY a JSON object, no prose before or after, in exactly this shape:
{
  "title_options": ["option 1", "option 2", "option 3"],
  "summary": "one or two sentence summary of the content for the reviewer",
  "posts": {
    "<Platform Name>": {"caption": "full ready-to-post caption", "hashtags": ["#tag1", "#tag2"]}
  },
  "blog_draft": "a short 150-250 word blog/announcement draft, or empty string if Blog wasn't requested"
}
Include one entry under "posts" for every platform listed in the brief."""


def _user_prompt(name, brief, platforms, due_date, notes):
    return (
        f"Campaign name: {name}\n"
        f"Brief: {brief}\n"
        f"Platforms requested: {', '.join(platforms)}\n"
        f"Due date: {due_date or 'not set'}\n"
        f"Extra notes: {notes or 'none'}"
    )


def _parse_json_block(text: str) -> dict:
    text = (text or "").strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find JSON in model response: {text[:200]}")
    return json.loads(match.group(0))


def _generate_openai(name, brief, platforms, due_date, notes):
    import openai

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")
    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        max_tokens=2000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _user_prompt(name, brief, platforms, due_date, notes)},
        ],
    )
    data = _parse_json_block(response.choices[0].message.content)
    return {**data, "source": "openai-api", "warnings": []}


def _generate_anthropic(name, brief, platforms, due_date, notes):
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929"),
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _user_prompt(name, brief, platforms, due_date, notes)}],
    )
    raw_text = "".join(block.text for block in response.content if block.type == "text")
    data = _parse_json_block(raw_text)
    return {**data, "source": "claude-api", "warnings": []}


def _template_caption(platform, name, brief):
    if platform == "LinkedIn":
        return f"{name}\n\n{brief}\n\nWe'd love to hear what you think — drop a comment below."
    if platform == "Instagram":
        return f"{name} ✨\n\n{brief}"
    if platform == "Facebook":
        return f"{name}\n\n{brief}\n\nLearn more and share your thoughts with us!"
    if platform == "X":
        text = f"{name}: {brief}"
        return text if len(text) <= 260 else text[:257] + "..."
    return f"{name}\n\n{brief}"


def _template_hashtags(name):
    slug_words = [w for w in re.findall(r"[A-Za-z0-9]+", name) if w.lower() not in {"the", "a", "an"}]
    tags = ["#" + "".join(slug_words)] if slug_words else []
    tags += ["#Marketing", "#News"]
    return tags[:4]


def _generate_offline(name, brief, platforms, due_date, notes):
    first_sentence = re.split(r"(?<=[.!?])\s+", brief.strip())[0] if brief.strip() else name
    title_options = [
        name,
        f"{name}: {first_sentence.rstrip('.')}",
        f"Introducing: {name}",
    ]
    summary = first_sentence if len(first_sentence) < 220 else first_sentence[:217] + "..."
    posts = {
        platform: {"caption": _template_caption(platform, name, brief), "hashtags": _template_hashtags(name)}
        for platform in platforms
    }
    blog_draft = ""
    if "Blog" in platforms:
        blog_draft = (
            f"# {name}\n\n{brief}\n\n"
            "This post was auto-drafted from the campaign brief. Please review, "
            "add supporting details, and edit before publishing."
        )
    return {
        "title_options": title_options,
        "summary": summary,
        "posts": posts,
        "blog_draft": blog_draft,
        "source": "offline-fallback",
        "warnings": [
            "Drafted with the offline fallback generator, not a real AI model "
            "(no OPENAI_API_KEY or ANTHROPIC_API_KEY configured, or the API call failed). "
            "Expect more mechanical copy."
        ],
    }


def generate_content(name, brief, platforms, due_date, notes):
    if not brief.strip():
        raise ValueError("Cannot generate content without a brief.")

    if os.getenv("OPENAI_API_KEY"):
        try:
            return _generate_openai(name, brief, platforms, due_date, notes)
        except Exception:
            pass
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            return _generate_anthropic(name, brief, platforms, due_date, notes)
        except Exception:
            pass
    return _generate_offline(name, brief, platforms, due_date, notes)

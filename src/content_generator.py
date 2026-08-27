"""Turns a validated campaign brief into ready-to-publish draft content.

OpenAIContentGenerator and AnthropicContentGenerator call the real APIs and
are what should run in production once an API key is set — OpenAI is used
automatically if OPENAI_API_KEY is set, otherwise Anthropic if
ANTHROPIC_API_KEY is set. OfflineFallbackGenerator kicks in automatically
when no key is configured (or the API call fails) so the rest of the
pipeline — validation, logging, the review dashboard — can still be run and
demoed end-to-end. Every fallback use is logged as a warning so it's never
mistaken for a real AI draft.
"""
import json
import re

from src import config

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


class GenerationResult:
    def __init__(self, title_options, summary, posts, blog_draft, source, warnings=None):
        self.title_options = title_options
        self.summary = summary
        self.posts = posts
        self.blog_draft = blog_draft
        self.source = source  # "openai-api", "claude-api", or "offline-fallback"
        self.warnings = warnings or []


class OpenAIContentGenerator:
    def __init__(self, api_key=None, model=None):
        self.api_key = api_key or config.OPENAI_API_KEY
        self.model = model or config.OPENAI_MODEL
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not set.")
        import openai

        self._client = openai.OpenAI(api_key=self.api_key)

    def generate(self, campaign) -> GenerationResult:
        user_prompt = (
            f"Campaign name: {campaign.campaign_name}\n"
            f"Brief: {campaign.brief}\n"
            f"Platforms requested: {', '.join(campaign.platforms)}\n"
            f"Due date: {campaign.due_date or 'not set'}\n"
            f"Extra notes: {campaign.notes or 'none'}"
        )
        response = self._client.chat.completions.create(
            model=self.model,
            max_tokens=2000,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw_text = response.choices[0].message.content or ""
        data = _parse_json_block(raw_text)
        return GenerationResult(
            title_options=data.get("title_options", []),
            summary=data.get("summary", ""),
            posts=data.get("posts", {}),
            blog_draft=data.get("blog_draft", ""),
            source="openai-api",
        )


class AnthropicContentGenerator:
    def __init__(self, api_key=None, model=None):
        self.api_key = api_key or config.ANTHROPIC_API_KEY
        self.model = model or config.ANTHROPIC_MODEL
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set.")
        import anthropic

        self._client = anthropic.Anthropic(api_key=self.api_key)

    def generate(self, campaign) -> GenerationResult:
        user_prompt = (
            f"Campaign name: {campaign.campaign_name}\n"
            f"Brief: {campaign.brief}\n"
            f"Platforms requested: {', '.join(campaign.platforms)}\n"
            f"Due date: {campaign.due_date or 'not set'}\n"
            f"Extra notes: {campaign.notes or 'none'}"
        )
        response = self._client.messages.create(
            model=self.model,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw_text = "".join(block.text for block in response.content if block.type == "text")
        data = _parse_json_block(raw_text)
        return GenerationResult(
            title_options=data.get("title_options", []),
            summary=data.get("summary", ""),
            posts=data.get("posts", {}),
            blog_draft=data.get("blog_draft", ""),
            source="claude-api",
        )


class OfflineFallbackGenerator:
    """Deterministic, template-based drafts. Lower quality than the real
    Claude API, but usable in a pinch and safe to run with zero setup."""

    def generate(self, campaign) -> GenerationResult:
        name = campaign.campaign_name
        brief = campaign.brief
        first_sentence = re.split(r"(?<=[.!?])\s+", brief.strip())[0]

        title_options = [
            name,
            f"{name}: {first_sentence.rstrip('.')}",
            f"Introducing: {name}",
        ]
        summary = first_sentence if len(first_sentence) < 220 else first_sentence[:217] + "..."

        posts = {}
        for platform in campaign.platforms:
            posts[platform] = {
                "caption": _template_caption(platform, name, brief),
                "hashtags": _template_hashtags(name),
            }

        blog_draft = ""
        if "Blog" in campaign.platforms:
            blog_draft = (
                f"# {name}\n\n{brief}\n\n"
                "This post was auto-drafted from the campaign brief. Please review, "
                "add supporting details, and edit before publishing."
            )

        return GenerationResult(
            title_options=title_options,
            summary=summary,
            posts=posts,
            blog_draft=blog_draft,
            source="offline-fallback",
            warnings=[
                "Drafted with the offline fallback generator, not a real AI model "
                "(no OPENAI_API_KEY or ANTHROPIC_API_KEY configured). Expect more "
                "mechanical copy — set one of those keys for higher-quality drafts."
            ],
        )


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


def _parse_json_block(text: str) -> dict:
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find JSON in model response: {text[:200]}")
    return json.loads(match.group(0))


def get_generator():
    """Picks the real generator when a key is configured — OpenAI first if
    OPENAI_API_KEY is set, then Anthropic — otherwise falls back
    automatically. Returns (generator, used_fallback: bool)."""
    if config.OPENAI_API_KEY:
        try:
            return OpenAIContentGenerator(), False
        except Exception:
            pass
    if config.ANTHROPIC_API_KEY:
        try:
            return AnthropicContentGenerator(), False
        except Exception:
            pass
    return OfflineFallbackGenerator(), True

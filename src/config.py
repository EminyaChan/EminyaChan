"""Loads settings from environment variables (see .env.example)."""
import os
from dotenv import load_dotenv

load_dotenv()

KNOWN_PLATFORMS = {
    "linkedin": "LinkedIn",
    "instagram": "Instagram",
    "insta": "Instagram",
    "ig": "Instagram",
    "facebook": "Facebook",
    "fb": "Facebook",
    "x": "X",
    "twitter": "X",
    "blog": "Blog",
    "email": "Email",
}
DEFAULT_PLATFORMS = ["LinkedIn", "Instagram", "Facebook"]

REQUIRED_COLUMNS = ["Campaign Name", "Brief", "Platforms", "Due Date", "Status"]
PENDING_STATUSES = {"", "to do", "todo", "new"}

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "")
GOOGLE_SHEET_TAB = os.getenv("GOOGLE_SHEET_TAB", "Campaigns")
GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "service_account.json")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")

OUTPUT_DIR = os.getenv("OUTPUT_DIR", "output")
LOG_FILE = os.getenv("LOG_FILE", "logs/run_log.jsonl")

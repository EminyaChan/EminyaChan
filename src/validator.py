"""Validates and normalizes one campaign row from the sheet/CSV.

Never guesses missing creative content. A row with no Brief is skipped and
flagged for a human, rather than inventing a brief. Everything else that can
be safely normalized (platform name typos, blank due dates) is normalized
and noted in `warnings` so the run log shows exactly what was assumed.
"""
from dataclasses import dataclass, field
from datetime import datetime

from src.config import KNOWN_PLATFORMS, DEFAULT_PLATFORMS, PENDING_STATUSES


@dataclass
class ValidatedCampaign:
    row_index: int
    campaign_name: str
    brief: str
    platforms: list
    due_date: str
    status: str
    notes: str
    warnings: list = field(default_factory=list)


@dataclass
class SkippedRow:
    row_index: int
    reason: str
    raw: dict


def normalize_platforms(raw_value: str, warnings: list) -> list:
    if not raw_value or not raw_value.strip():
        warnings.append("No platforms listed; defaulted to LinkedIn, Instagram, Facebook.")
        return list(DEFAULT_PLATFORMS)

    tokens = [t.strip().lower() for t in raw_value.split(",") if t.strip()]
    resolved, unknown = [], []
    for t in tokens:
        if t in KNOWN_PLATFORMS:
            name = KNOWN_PLATFORMS[t]
            if name not in resolved:
                resolved.append(name)
        else:
            unknown.append(t)

    if unknown:
        warnings.append(f"Unrecognized platform(s) ignored: {', '.join(unknown)}.")
    if not resolved:
        warnings.append("No recognizable platforms after cleanup; defaulted to LinkedIn, Instagram, Facebook.")
        return list(DEFAULT_PLATFORMS)
    return resolved


def normalize_due_date(raw_value: str, warnings: list) -> str:
    if not raw_value or not raw_value.strip():
        warnings.append("No due date set.")
        return ""
    raw_value = raw_value.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%B %d, %Y"):
        try:
            return datetime.strptime(raw_value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    warnings.append(f"Could not parse due date '{raw_value}'; kept as-is, please check.")
    return raw_value


def is_pending(status: str) -> bool:
    return (status or "").strip().lower() in PENDING_STATUSES


def validate_row(row_index: int, raw: dict):
    """Returns (ValidatedCampaign, None) or (None, SkippedRow)."""
    name = (raw.get("Campaign Name") or "").strip()
    brief = (raw.get("Brief") or "").strip()
    status = (raw.get("Status") or "").strip()

    if not name:
        return None, SkippedRow(row_index, "Missing Campaign Name.", raw)
    if not is_pending(status):
        return None, SkippedRow(row_index, f"Status is '{status}', not pending — skipped.", raw)
    if not brief:
        return None, SkippedRow(
            row_index,
            f"'{name}': no Brief written yet. Cannot draft content without one — needs a human to fill it in.",
            raw,
        )

    warnings = []
    platforms = normalize_platforms(raw.get("Platforms", ""), warnings)
    due_date = normalize_due_date(raw.get("Due Date", ""), warnings)

    return ValidatedCampaign(
        row_index=row_index,
        campaign_name=name,
        brief=brief,
        platforms=platforms,
        due_date=due_date,
        status=status,
        notes=(raw.get("Notes") or "").strip(),
        warnings=warnings,
    ), None

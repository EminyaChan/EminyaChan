"""Appends one JSON line per run to logs/run_log.jsonl, so every run this
agent has ever done can be reviewed later — what it found, what it drafted,
what it skipped and why, and any errors."""
import json
import os
from datetime import datetime, timezone

from src import config


class RunLogger:
    def __init__(self, log_file=None):
        self.log_file = log_file or config.LOG_FILE
        self.started_at = datetime.now(timezone.utc).isoformat()
        self.processed = []
        self.skipped = []
        self.errors = []

    def log_processed(self, campaign_name, source, warnings, draft_path):
        self.processed.append(
            {
                "campaign_name": campaign_name,
                "content_source": source,
                "warnings": warnings,
                "draft_path": draft_path,
            }
        )

    def log_skipped(self, row_index, reason):
        self.skipped.append({"row_index": row_index, "reason": reason})

    def log_error(self, campaign_name, error):
        self.errors.append({"campaign_name": campaign_name, "error": str(error)})

    def finish(self, output_dir):
        entry = {
            "run_at": self.started_at,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "output_dir": output_dir,
            "campaigns_drafted": len(self.processed),
            "campaigns_skipped": len(self.skipped),
            "errors": len(self.errors),
            "processed": self.processed,
            "skipped": self.skipped,
            "error_details": self.errors,
        }
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
        return entry

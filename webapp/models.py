import json
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

STATUS_TODO = "To Do"
STATUS_DRAFTED = "Drafted"
STATUS_APPROVED = "Approved"
STATUS_PUBLISHED = "Published"


def now():
    return datetime.now(timezone.utc)


class Campaign(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    brief = db.Column(db.Text, nullable=False, default="")
    platforms = db.Column(db.String(200), nullable=False, default="")
    due_date = db.Column(db.String(20), nullable=False, default="")
    notes = db.Column(db.Text, nullable=False, default="")
    status = db.Column(db.String(20), nullable=False, default=STATUS_TODO)

    draft_json = db.Column(db.Text, nullable=True)
    draft_source = db.Column(db.String(30), nullable=True)
    draft_warnings_json = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=now)
    updated_at = db.Column(db.DateTime, default=now, onupdate=now)

    def platform_list(self):
        return [p.strip() for p in self.platforms.split(",") if p.strip()]

    def draft(self):
        return json.loads(self.draft_json) if self.draft_json else None

    def draft_warnings(self):
        return json.loads(self.draft_warnings_json) if self.draft_warnings_json else []

    def set_draft(self, result):
        self.draft_json = json.dumps(
            {
                "title_options": result["title_options"],
                "summary": result["summary"],
                "posts": result["posts"],
                "blog_draft": result.get("blog_draft", ""),
            }
        )
        self.draft_source = result["source"]
        self.draft_warnings_json = json.dumps(result.get("warnings", []))
        self.status = STATUS_DRAFTED


class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey("campaign.id"), nullable=True)
    campaign_name = db.Column(db.String(200), nullable=False, default="")
    action = db.Column(db.String(50), nullable=False)
    detail = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, default=now)


def log_activity(campaign, action, detail=""):
    entry = ActivityLog(
        campaign_id=campaign.id if campaign else None,
        campaign_name=campaign.name if campaign else "",
        action=action,
        detail=detail,
    )
    db.session.add(entry)
    db.session.commit()

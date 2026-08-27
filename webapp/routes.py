import os
from functools import wraps

from flask import Blueprint, flash, redirect, render_template, request, session, url_for

from webapp.content_generator import generate_content
from webapp.models import (
    Campaign,
    ActivityLog,
    STATUS_APPROVED,
    STATUS_DRAFTED,
    STATUS_PUBLISHED,
    STATUS_TODO,
    db,
    log_activity,
)

bp = Blueprint("main", __name__)

PLATFORM_CHOICES = ["LinkedIn", "Instagram", "Facebook", "X", "Blog"]


def _app_password():
    return os.getenv("APP_PASSWORD", "")


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if _app_password() and not session.get("authed"):
            return redirect(url_for("main.login", next=request.path))
        return view(*args, **kwargs)

    return wrapped


@bp.route("/login", methods=["GET", "POST"])
def login():
    if not _app_password():
        session["authed"] = True
        return redirect(url_for("main.dashboard"))
    if request.method == "POST":
        if request.form.get("password") == _app_password():
            session["authed"] = True
            return redirect(request.args.get("next") or url_for("main.dashboard"))
        flash("Wrong password.", "error")
    return render_template("login.html")


@bp.route("/logout")
def logout():
    session.pop("authed", None)
    return redirect(url_for("main.login"))


@bp.route("/")
@login_required
def dashboard():
    status_filter = request.args.get("status", "")
    query = Campaign.query.order_by(Campaign.updated_at.desc())
    if status_filter:
        query = query.filter_by(status=status_filter)
    campaigns = query.all()
    counts = {
        s: Campaign.query.filter_by(status=s).count()
        for s in [STATUS_TODO, STATUS_DRAFTED, STATUS_APPROVED, STATUS_PUBLISHED]
    }
    return render_template(
        "dashboard.html", campaigns=campaigns, counts=counts, status_filter=status_filter
    )


@bp.route("/campaigns/new", methods=["GET", "POST"])
@login_required
def new_campaign():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        brief = request.form.get("brief", "").strip()
        platforms = request.form.getlist("platforms")
        due_date = request.form.get("due_date", "").strip()
        notes = request.form.get("notes", "").strip()

        if not name:
            flash("Campaign name is required.", "error")
            return render_template("campaign_form.html", platform_choices=PLATFORM_CHOICES, form=request.form)
        if not brief:
            flash("A brief is required — the agent won't invent campaign content for you.", "error")
            return render_template("campaign_form.html", platform_choices=PLATFORM_CHOICES, form=request.form)

        campaign = Campaign(
            name=name,
            brief=brief,
            platforms=", ".join(platforms) if platforms else ", ".join(PLATFORM_CHOICES[:3]),
            due_date=due_date,
            notes=notes,
            status=STATUS_TODO,
        )
        db.session.add(campaign)
        db.session.commit()
        log_activity(campaign, "created", f"Campaign '{name}' created.")
        return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))

    return render_template("campaign_form.html", platform_choices=PLATFORM_CHOICES, form={})


@bp.route("/campaigns/<int:campaign_id>")
@login_required
def campaign_detail(campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    return render_template("campaign_detail.html", campaign=campaign, draft=campaign.draft())


@bp.route("/campaigns/<int:campaign_id>/edit", methods=["POST"])
@login_required
def edit_campaign(campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    name = request.form.get("name", "").strip()
    brief = request.form.get("brief", "").strip()
    platforms = request.form.getlist("platforms")

    if not name or not brief:
        flash("Campaign name and brief can't be empty.", "error")
        return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))

    campaign.name = name
    campaign.brief = brief
    campaign.platforms = ", ".join(platforms) if platforms else campaign.platforms
    campaign.due_date = request.form.get("due_date", "").strip()
    campaign.notes = request.form.get("notes", "").strip()
    db.session.commit()
    log_activity(campaign, "edited", "Brief/details edited.")
    flash("Saved.", "success")
    return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))


@bp.route("/campaigns/<int:campaign_id>/generate", methods=["POST"])
@login_required
def generate(campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    if not campaign.brief.strip():
        flash("Add a brief before generating.", "error")
        return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))

    try:
        result = generate_content(
            campaign.name, campaign.brief, campaign.platform_list(), campaign.due_date, campaign.notes
        )
    except Exception as e:
        log_activity(campaign, "generate_error", str(e))
        flash(f"Could not generate content: {e}", "error")
        return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))

    campaign.set_draft(result)
    db.session.commit()
    log_activity(campaign, "generated", f"Drafted via {result['source']}.")
    return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))


@bp.route("/campaigns/<int:campaign_id>/approve", methods=["POST"])
@login_required
def approve(campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    if campaign.status != STATUS_DRAFTED:
        flash("Only drafted campaigns can be approved.", "error")
        return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))
    campaign.status = STATUS_APPROVED
    db.session.commit()
    log_activity(campaign, "approved", "Marked approved for publishing.")
    flash("Approved. Publishing to each platform is still a manual step.", "success")
    return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))


@bp.route("/campaigns/<int:campaign_id>/mark_published", methods=["POST"])
@login_required
def mark_published(campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    if campaign.status != STATUS_APPROVED:
        flash("Only approved campaigns can be marked published.", "error")
        return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))
    campaign.status = STATUS_PUBLISHED
    db.session.commit()
    log_activity(campaign, "marked_published", "Marked published (tracking only — this app does not post for you).")
    return redirect(url_for("main.campaign_detail", campaign_id=campaign.id))


@bp.route("/campaigns/<int:campaign_id>/delete", methods=["POST"])
@login_required
def delete_campaign(campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    name = campaign.name
    db.session.delete(campaign)
    db.session.commit()
    log_activity(None, "deleted", f"Campaign '{name}' deleted.")
    return redirect(url_for("main.dashboard"))


@bp.route("/activity")
@login_required
def activity():
    entries = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(200).all()
    return render_template("activity.html", entries=entries)

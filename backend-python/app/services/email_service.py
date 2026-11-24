import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from app.config import settings

TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "email"
_jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


def _send_email(to: str, subject: str, html_body: str) -> None:
    if not settings.mail_username:
        return  # email not configured; silently skip
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.mail_from_name} <{settings.mail_from}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))
    context = ssl.create_default_context()
    with smtplib.SMTP(settings.mail_host, settings.mail_port) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(settings.mail_username, settings.mail_password)
        server.sendmail(settings.mail_from, to, msg.as_string())


def _render(template_name: str, **kwargs) -> str:
    tpl = _jinja_env.get_template(template_name)
    return tpl.render(**kwargs)


def send_password_reset_otp(to: str, full_name: str, otp: str) -> None:
    html = _render("password_reset_otp.html", full_name=full_name, otp=otp)
    _send_email(to, "Password Reset OTP", html)


def send_voter_id_approved(to: str, full_name: str, voter_id: str) -> None:
    html = _render("voter_id_approved.html", full_name=full_name, voter_id=voter_id)
    _send_email(to, "Your Voter ID Has Been Approved", html)


def send_voter_id_rejected(to: str, full_name: str, remarks: str | None) -> None:
    html = _render("voter_id_rejected.html", full_name=full_name, remarks=remarks or "")
    _send_email(to, "Voter ID Application Rejected", html)


def send_vote_confirmation(to: str, full_name: str, election_title: str) -> None:
    html = _render("vote_confirmation.html", full_name=full_name, election_title=election_title)
    _send_email(to, "Vote Confirmation", html)


def send_result_declared(to: str, full_name: str, election_title: str) -> None:
    html = _render("result_declared.html", full_name=full_name, election_title=election_title)
    _send_email(to, f"Results Declared: {election_title}", html)


def send_candidate_credentials(to: str, full_name: str, temp_password: str) -> None:
    html = _render(
        "candidate_credentials.html", full_name=full_name, temp_password=temp_password, email=to
    )
    _send_email(to, "Your Candidate Account Credentials", html)


def send_nomination_status(
    to: str, full_name: str, approved: bool, rejection_reason: str | None = None
) -> None:
    html = _render(
        "nomination_status.html",
        full_name=full_name,
        approved=approved,
        rejection_reason=rejection_reason or "",
    )
    subject = "Nomination Approved" if approved else "Nomination Rejected"
    _send_email(to, subject, html)

import logging
from email.message import EmailMessage
import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_otp_email(to_email: str, otp: str) -> None:
    """Send an OTP verification email using aiosmtplib and SMTP credentials.

    Subject: "Your Zestra Verification Code"
    Body includes the OTP and a note that it expires in 10 minutes.
    """
    message = EmailMessage()
    from_email = (
        settings.SMTP_FROM_EMAIL
        or settings.SMTP_USERNAME
        or "noreply@zestra.com"
    )
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = "Your Zestra Verification Code"

    body = (
        f"Hello,\n\n"
        f"Your Zestra verification code is: {otp}\n\n"
        f"Note: This code will expire in 10 minutes. If you did not request this verification, please ignore this email.\n\n"
        f"Best regards,\n"
        f"The Zestra Team"
    )
    message.set_content(body)

    smtp_kwargs = {
        "hostname": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "start_tls": True,
    }
    if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
        smtp_kwargs["username"] = settings.SMTP_USERNAME
        smtp_kwargs["password"] = settings.SMTP_PASSWORD

    try:
        await aiosmtplib.send(message, **smtp_kwargs)
        logger.info(f"Successfully sent verification OTP email to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        raise

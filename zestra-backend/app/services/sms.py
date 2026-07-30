import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_otp_sms(phone_number: str, otp: str) -> bool:
    """Send an OTP SMS to a phone number using 2Factor.in API.

    Strips leading '+' prefix from phone_number.
    Catches and logs all failures (network, HTTP status, missing API key) without raising an exception.
    Returns True if sent successfully, False otherwise.
    """
    if not settings.TWOFACTOR_API_KEY:
        logger.warning(
            "TWOFACTOR_API_KEY is not configured. Skipping SMS OTP for %s.",
            phone_number,
        )
        return False

    formatted_phone = phone_number.lstrip("+").strip()
    url = (
        f"https://2factor.in/API/V1/{settings.TWOFACTOR_API_KEY}/SMS/{formatted_phone}/{otp}"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                logger.info("Successfully sent OTP SMS to %s", phone_number)
                return True
            else:
                logger.error(
                    "2Factor SMS API returned status %s for %s: %s",
                    response.status_code,
                    phone_number,
                    response.text,
                )
                return False
    except Exception as e:
        logger.error(
            "Failed to send OTP SMS to %s: %s",
            phone_number,
            e,
            exc_info=True,
        )
        return False

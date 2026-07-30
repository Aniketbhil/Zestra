from unittest.mock import AsyncMock, patch
import pytest
from app.services.email import send_otp_email


@pytest.mark.asyncio
async def test_send_otp_email_success():
    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_send:
        await send_otp_email("testuser@example.com", "123456")
        mock_send.assert_called_once()
        msg = mock_send.call_args[0][0]
        assert msg["To"] == "testuser@example.com"
        assert msg["Subject"] == "Your Zestra Verification Code"
        body = msg.get_content()
        assert "123456" in body
        assert "10 minutes" in body


@pytest.mark.asyncio
async def test_send_otp_email_failure_raises_exception():
    with patch(
        "aiosmtplib.send",
        new_callable=AsyncMock,
        side_effect=Exception("SMTP connection failed"),
    ):
        with pytest.raises(Exception, match="SMTP connection failed"):
            await send_otp_email("failuser@example.com", "654321")

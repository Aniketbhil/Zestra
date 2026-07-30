from unittest.mock import AsyncMock, patch
import httpx
import pytest

from app.core.config import settings
from app.services.sms import send_otp_sms


@pytest.mark.asyncio
async def test_send_otp_sms_success():
    with patch.object(settings, "TWOFACTOR_API_KEY", "dummy_key"):
        mock_response = httpx.Response(200, json={"Status": "Success", "Details": "OTP Sent"})
        with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock, return_value=mock_response) as mock_get:
            result = await send_otp_sms("+919876543210", "123456")
            assert result is True
            mock_get.assert_called_once()
            called_url = str(mock_get.call_args[0][0])
            assert "https://2factor.in/API/V1/dummy_key/SMS/919876543210/123456" in called_url


@pytest.mark.asyncio
async def test_send_otp_sms_missing_api_key():
    with patch.object(settings, "TWOFACTOR_API_KEY", ""):
        result = await send_otp_sms("+919876543210", "123456")
        assert result is False


@pytest.mark.asyncio
async def test_send_otp_sms_http_error():
    with patch.object(settings, "TWOFACTOR_API_KEY", "dummy_key"):
        mock_response = httpx.Response(400, text="Invalid Phone Number")
        with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock, return_value=mock_response):
            result = await send_otp_sms("+919876543210", "123456")
            assert result is False


@pytest.mark.asyncio
async def test_send_otp_sms_network_exception_never_raises():
    with patch.object(settings, "TWOFACTOR_API_KEY", "dummy_key"):
        with patch.object(
            httpx.AsyncClient, "get", new_callable=AsyncMock, side_effect=httpx.ConnectError("Network Error")
        ):
            # Must not raise an exception
            result = await send_otp_sms("+919876543210", "123456")
            assert result is False

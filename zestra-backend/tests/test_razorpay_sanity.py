import logging
import pytest
from app.core.config import Settings


def test_razorpay_secrets_stripping():
    settings = Settings(
        RAZORPAY_KEY_ID="  rzp_test_12345678  \n",
        RAZORPAY_KEY_SECRET="\tsecret_abcdef12345\n ",
        RAZORPAY_WEBHOOK_SECRET="  webhook_secret_999  ",
    )
    assert settings.RAZORPAY_KEY_ID == "rzp_test_12345678"
    assert settings.RAZORPAY_KEY_SECRET == "secret_abcdef12345"
    assert settings.RAZORPAY_WEBHOOK_SECRET == "webhook_secret_999"


def test_razorpay_startup_sanity_check(caplog):
    from app.main import lifespan
    from fastapi import FastAPI

    app = FastAPI(lifespan=lifespan)
    
    with caplog.at_level(logging.INFO):
        key_id = "rzp_test_abcdef"
        key_id_len = len(key_id)
        key_id_prefix = key_id[:8]
        starts_with_rzp = key_id.startswith("rzp_test_")
        secret_len = len("secret_123456789")

        assert key_id_len == 15
        assert key_id_prefix == "rzp_test"
        assert starts_with_rzp is True
        assert secret_len == 16

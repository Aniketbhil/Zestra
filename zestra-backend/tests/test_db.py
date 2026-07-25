import pytest
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine, get_db


def test_db_base():
    assert Base.metadata is not None


def test_db_session_initialization():
    assert engine is not None
    assert AsyncSessionLocal is not None


@pytest.mark.asyncio
async def test_get_db_generator():
    db_gen = get_db()
    assert hasattr(db_gen, "__anext__")

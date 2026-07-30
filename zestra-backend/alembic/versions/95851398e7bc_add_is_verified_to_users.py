"""add_is_verified_to_users

Revision ID: 95851398e7bc
Revises: 28c4f07b0fbd
Create Date: 2026-07-30 11:41:46.156927

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '95851398e7bc'
down_revision: Union[str, Sequence[str], None] = '28c4f07b0fbd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.execute("UPDATE users SET is_verified = true")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'is_verified')


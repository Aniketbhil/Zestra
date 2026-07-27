"""add_contact_number_and_business_hours_to_restaurants

Revision ID: a1b2c3d4e5f6
Revises: 9a3e48e70118
Create Date: 2026-07-27 04:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9a3e48e70118'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('restaurants', sa.Column('contact_number', sa.String(length=50), nullable=True))
    op.add_column('restaurants', sa.Column('business_hours', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('restaurants', 'business_hours')
    op.drop_column('restaurants', 'contact_number')

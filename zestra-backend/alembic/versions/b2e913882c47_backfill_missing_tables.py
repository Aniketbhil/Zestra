"""backfill_missing_tables

Revision ID: b2e913882c47
Revises: 4e6e820456b6
Create Date: 2026-07-30 16:28:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2e913882c47'
down_revision: Union[str, Sequence[str], None] = '4e6e820456b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Backfill missing Table rows for any restaurant where total_tables > count(tables)."""
    bind = op.get_bind()

    # Fetch all restaurants
    restaurants = bind.execute(sa.text("SELECT id, total_tables FROM restaurants")).fetchall()

    for rest in restaurants:
        rest_id, total_tables = rest[0], rest[1]
        if not total_tables or total_tables <= 0:
            continue

        # Count existing tables for this restaurant
        count_res = bind.execute(
            sa.text("SELECT COUNT(*) FROM tables WHERE restaurant_id = :rid"),
            {"rid": rest_id},
        ).scalar()
        existing_count = count_res or 0

        if total_tables > existing_count:
            for num in range(existing_count + 1, total_tables + 1):
                bind.execute(
                    sa.text(
                        "INSERT INTO tables (id, restaurant_id, table_number, capacity) "
                        "VALUES (:id, :rid, :num, 4)"
                    ),
                    {
                        "id": str(uuid.uuid4()),
                        "rid": str(rest_id),
                        "num": num,
                    },
                )


def downgrade() -> None:
    """No-op downgrade for data backfill."""
    pass

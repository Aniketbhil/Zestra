import re
import unicodedata
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.restaurant import Restaurant


def generate_base_slug(name: str) -> str:
    """Convert a name string into a lowercase, hyphenated, URL-safe slug."""
    # Normalize unicode characters to ASCII
    normalized = (
        unicodedata.normalize("NFKD", name)
        .encode("ascii", "ignore")
        .decode("utf-8")
    )
    # Convert to lowercase and strip leading/trailing whitespace
    slug = normalized.lower().strip()
    # Replace non-alphanumeric characters with hyphens
    slug = re.sub(r"[^\w\s-]", "", slug)
    # Replace spaces and underscores with hyphens
    slug = re.sub(r"[\s_]+", "-", slug)
    # Collapse multiple hyphens into a single hyphen
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "restaurant"


async def generate_unique_slug(db: AsyncSession, name: str) -> str:
    """Generate a unique slug for a restaurant, appending a short numeric suffix if the slug already exists."""
    base_slug = generate_base_slug(name)
    slug = base_slug
    suffix = 1

    while True:
        stmt = select(Restaurant.id).where(Restaurant.slug == slug)
        result = await db.execute(stmt)
        if result.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug}-{suffix}"
        suffix += 1

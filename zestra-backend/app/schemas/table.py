from uuid import UUID
from pydantic import BaseModel, ConfigDict


class PublicTableAvailabilityResponse(BaseModel):
    id: UUID
    table_number: int
    capacity: int | None = 4
    booked_slots: list[str] = []

    model_config = ConfigDict(from_attributes=True)

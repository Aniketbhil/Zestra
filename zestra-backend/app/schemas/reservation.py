from datetime import date, datetime, time
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models.reservation import ReservationStatus


class ReservationCreateRequest(BaseModel):
    slug: str
    table_id: UUID
    reservation_date: date
    reservation_time: time


class ReservationStatusUpdateRequest(BaseModel):
    status: ReservationStatus


class ReservationResponse(BaseModel):
    id: UUID
    table_id: UUID
    restaurant_id: UUID
    customer_id: UUID
    reservation_date: date
    reservation_time: time
    status: ReservationStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

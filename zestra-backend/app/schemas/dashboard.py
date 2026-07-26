from decimal import Decimal
from pydantic import BaseModel


class TopItemResponse(BaseModel):
    name: str
    count: int


class AnalyticsResponse(BaseModel):
    total_sales: Decimal
    top_items: list[TopItemResponse]
    orders_by_hour: dict[int, int]

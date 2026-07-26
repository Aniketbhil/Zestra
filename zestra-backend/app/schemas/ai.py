from pydantic import BaseModel


class AIInsightsResponse(BaseModel):
    summary: str

from uuid import UUID
from pydantic import BaseModel
from app.models.order import PaymentStatus


class PaymentCreateOrderRequest(BaseModel):
    order_id: UUID


class PaymentCreateOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int
    currency: str = "INR"
    key_id: str


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
    message: str = "Payment verification successful."
    order_id: UUID
    payment_status: PaymentStatus = PaymentStatus.PAID

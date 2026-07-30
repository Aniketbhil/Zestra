import logging
import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.db.session import get_db
from app.models.order import Order, PaymentStatus
from app.schemas.payment import (
    PaymentCreateOrderRequest,
    PaymentCreateOrderResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)
from app.services.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


def get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


@router.post(
    "/create-order",
    response_model=PaymentCreateOrderResponse,
    status_code=status.HTTP_200_OK,
)
async def create_razorpay_order(
    payload: PaymentCreateOrderRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a Razorpay order for an existing Zestra order (guest-friendly, no auth).

    Looks up order by order_id, converts total rupees to paise, creates order in Razorpay,
    stores razorpay_order_id on the Order row, and returns checkout credentials.
    """
    stmt = select(Order).where(Order.id == payload.order_id)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    amount_in_paise = int(order.total * 100)

    try:
        client = get_razorpay_client()
        razorpay_order = client.order.create(
            {
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": str(order.id),
            }
        )
    except Exception as e:
        logger.error(f"Razorpay order creation error for order {order.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Razorpay order creation failed: {str(e)}",
        )

    razorpay_order_id = razorpay_order["id"]
    order.razorpay_order_id = razorpay_order_id
    await db.commit()

    return PaymentCreateOrderResponse(
        razorpay_order_id=razorpay_order_id,
        amount=amount_in_paise,
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
    )


@router.post(
    "/verify",
    response_model=PaymentVerifyResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_razorpay_payment(
    payload: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify Razorpay payment signature and mark Order as paid.

    Validates signature via Razorpay SDK utility. If valid:
    - Updates order.payment_status to 'paid'
    - Stores razorpay_payment_id on order
    - Broadcasts payment_confirmed on orders:{slug} and order:{order_id} WS channels.
    """
    params_dict = {
        "razorpay_order_id": payload.razorpay_order_id,
        "razorpay_payment_id": payload.razorpay_payment_id,
        "razorpay_signature": payload.razorpay_signature,
    }

    try:
        client = get_razorpay_client()
        client.utility.verify_payment_signature(params_dict)
    except Exception as e:
        logger.warning(f"Razorpay signature verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature.",
        )

    stmt = (
        select(Order)
        .where(Order.razorpay_order_id == payload.razorpay_order_id)
        .options(joinedload(Order.restaurant))
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order matching razorpay_order_id not found.",
        )

    order.payment_status = PaymentStatus.PAID
    order.razorpay_payment_id = payload.razorpay_payment_id
    await db.commit()
    await db.refresh(order)

    # Broadcast payment_confirmed on restaurant staff orders channel
    if order.restaurant and order.restaurant.slug:
        await manager.broadcast(
            f"orders:{order.restaurant.slug}",
            {
                "type": "payment_confirmed",
                "order_id": str(order.id),
                "payment_status": "paid",
                "razorpay_payment_id": payload.razorpay_payment_id,
            },
        )

    # Broadcast payment_confirmed on customer tracking channel
    await manager.broadcast(
        f"order:{order.id}",
        {
            "type": "payment_confirmed",
            "order_id": str(order.id),
            "payment_status": "paid",
            "razorpay_payment_id": payload.razorpay_payment_id,
        },
    )

    return PaymentVerifyResponse(
        message="Payment verification successful.",
        order_id=order.id,
        payment_status=PaymentStatus.PAID,
    )


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
)
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public Razorpay Webhook endpoint.

    Verifies signature header `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET`.
    On `payment.captured` event:
    - Finds matching Order by `razorpay_order_id`
    - Guards against double-processing if already marked `PAID`
    - Marks `payment_status` as `PAID` and saves `razorpay_payment_id`
    - Broadcasts `payment_confirmed` on WebSocket channels `orders:{slug}` and `order:{order_id}`
    """
    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Razorpay-Signature header.",
        )

    try:
        client = get_razorpay_client()
        client.utility.verify_webhook_signature(
            body_str,
            signature,
            settings.RAZORPAY_WEBHOOK_SECRET,
        )
    except Exception as e:
        logger.warning(f"Razorpay webhook signature verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature.",
        )

    try:
        event_data = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload.",
        )

    event = event_data.get("event")
    if event == "payment.captured":
        payment_entity = (
            event_data.get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )
        razorpay_order_id = payment_entity.get("order_id")
        razorpay_payment_id = payment_entity.get("id")

        if razorpay_order_id:
            stmt = (
                select(Order)
                .where(Order.razorpay_order_id == razorpay_order_id)
                .options(joinedload(Order.restaurant))
            )
            res = await db.execute(stmt)
            order = res.scalar_one_or_none()

            if order:
                # Guard against double-processing
                if order.payment_status == PaymentStatus.PAID:
                    logger.info(
                        f"Webhook received for already paid order {order.id}. Skipping update."
                    )
                    return {"status": "ok", "message": "Order already processed"}

                order.payment_status = PaymentStatus.PAID
                if razorpay_payment_id:
                    order.razorpay_payment_id = razorpay_payment_id
                await db.commit()
                await db.refresh(order)

                # Broadcast live updates
                if order.restaurant and order.restaurant.slug:
                    await manager.broadcast(
                        f"orders:{order.restaurant.slug}",
                        {
                            "type": "payment_confirmed",
                            "order_id": str(order.id),
                            "payment_status": "paid",
                            "razorpay_payment_id": order.razorpay_payment_id,
                        },
                    )

                await manager.broadcast(
                    f"order:{order.id}",
                    {
                        "type": "payment_confirmed",
                        "order_id": str(order.id),
                        "payment_status": "paid",
                        "razorpay_payment_id": order.razorpay_payment_id,
                    },
                )

    return {"status": "ok"}

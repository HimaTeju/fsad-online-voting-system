import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.websocket_broadcast import add_to_room, remove_from_room, broadcast_to_room
from app.models.chat_message import ChatMessage
from app.security.jwt import decode_token

router = APIRouter()


def _get_user_from_token(token: str, db: Session):
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = int(payload["sub"])
        from app.models.user import User
        return db.query(User).filter(User.id == user_id, User.is_active == True).first()
    except Exception:
        return None


@router.websocket("/ws/election/{election_id}/stats")
async def election_stats_ws(election_id: int, websocket: WebSocket):
    await websocket.accept()
    room_id = f"election-{election_id}"
    add_to_room(room_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        remove_from_room(room_id, websocket)


@router.websocket("/ws/chat/{constituency_id}")
async def chat_ws(constituency_id: int, websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    db = SessionLocal()
    try:
        user = _get_user_from_token(token, db)
        if not user:
            await websocket.close(code=4001)
            return

        room_id = f"constituency-{constituency_id}"
        add_to_room(room_id, websocket)

        # Send recent chat history
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.room_id == room_id)
            .order_by(ChatMessage.sent_at.asc())
            .limit(50)
            .all()
        )
        for m in messages:
            await websocket.send_text(json.dumps({
                "type": "history",
                "id": m.id,
                "senderId": m.sender_id,
                "senderName": m.sender.full_name if m.sender else None,
                "message": m.message,
                "sentAt": m.sent_at.isoformat() if m.sent_at else None,
            }))

        try:
            while True:
                data = await websocket.receive_text()
                try:
                    payload = json.loads(data)
                    text = payload.get("message", "").strip()
                except Exception:
                    text = data.strip()

                if not text:
                    continue

                msg = ChatMessage(
                    room_id=room_id,
                    sender_id=user.id,
                    constituency_id=constituency_id,
                    message=text,
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)

                await broadcast_to_room(room_id, {
                    "type": "message",
                    "id": msg.id,
                    "senderId": user.id,
                    "senderName": user.full_name,
                    "message": text,
                    "sentAt": msg.sent_at.isoformat() if msg.sent_at else None,
                })
        except WebSocketDisconnect:
            remove_from_room(room_id, websocket)
    finally:
        db.close()


@router.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    db = SessionLocal()
    try:
        user = _get_user_from_token(token, db)
        if not user:
            await websocket.close(code=4001)
            return
        room_id = f"user-{user.email}"
        add_to_room(room_id, websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            remove_from_room(room_id, websocket)
    finally:
        db.close()

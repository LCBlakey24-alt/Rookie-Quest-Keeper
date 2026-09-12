"""Lightweight player handout counts for dashboard badges."""
from fastapi import APIRouter, Depends

from config import db
from utils.auth import get_current_user

router = APIRouter()


@router.get("/player/handouts/summary")
async def get_player_handout_summary(current_user: str = Depends(get_current_user)):
    """Return only the counts Player Home needs without loading handout bodies."""
    pipeline = [
        {"$match": {"username": current_user}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "unread": {
                    "$sum": {
                        "$cond": [{"$ne": ["$read", True]}, 1, 0]
                    }
                },
                "saved": {
                    "$sum": {
                        "$cond": [{"$eq": ["$saved", True]}, 1, 0]
                    }
                },
            }
        },
    ]

    rows = await db.player_handouts.aggregate(pipeline).to_list(1)
    if not rows:
        return {"total": 0, "unread": 0, "saved": 0}

    row = rows[0]
    return {
        "total": int(row.get("total", 0) or 0),
        "unread": int(row.get("unread", 0) or 0),
        "saved": int(row.get("saved", 0) or 0),
    }

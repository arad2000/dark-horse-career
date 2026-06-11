"""
Dark Horse Career Matcher API v6.1
FastAPI endpoint برای اتصال فرانت‌اند به موتور تطبیق
"""

import sys
import logging
from pathlib import Path
from typing import List, Optional, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# تنظیم مسیرها
ENGINE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ENGINE_DIR))
BASE_DIR = ENGINE_DIR.parent
DATA_DIR = BASE_DIR / "data"

from matcher import DarkHorseMatcher

# راه‌اندازی لاگر
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("darkhorse_api")

app = FastAPI(
    title="Dark Horse Career Matcher API",
    description="API for discovering individuality through the Dark Horse philosophy",
    version="6.1",
    docs_url="/docs",
    redoc_url="/redoc"
)

# فعال‌سازی CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# راه‌اندازی موتور
logger.info("🚀 Initializing Dark Horse Matcher...")
logger.info(f"   Data directory: {DATA_DIR}")
if not DATA_DIR.exists():
    logger.error(f"❌ Data directory not found: {DATA_DIR}")
    raise RuntimeError(f"Data directory not found: {DATA_DIR}")

try:
    matcher = DarkHorseMatcher(data_dir=str(DATA_DIR))
    logger.info("✅ Matcher initialized successfully")
    logger.info(f"   📚 {len(matcher.majors_db)} majors loaded")
    logger.info(f"   💎 {len(matcher.micro_motives)} micro-motives loaded")
    logger.info(f"   ❓ {len(matcher.strategy_questions)} strategy questions loaded")
    logger.info(f"   ⚖️  {len(matcher.value_questions)} value questions loaded")
except Exception as e:
    logger.error(f"❌ Failed to initialize matcher: {e}", exc_info=True)
    raise


# =========================================================================
# مدل‌های Pydantic برای اعتبارسنجی
# =========================================================================

class MatchRequest(BaseModel):
    micro_motives: List[str] = Field(..., min_length=1, max_length=50)
    strategies: List[int] = Field(..., min_length=20, max_length=20)
    values: List[str] = Field(..., min_length=10, max_length=10)
    reality: Optional[Dict] = None
    top_n: int = Field(15, ge=5, le=50)

    class Config:
        json_schema_extra = {
            "example": {
                "micro_motives": ["MED-001", "CS-005", "PAINT-003"],
                "strategies": [1, 1, 1, 3, 4, 2, 3, 2, 3, 1, 1, 1, 1, 1, 4, 1, 3, 2, 2, 3],
                "values": ["Q1A", "Q2B", "Q3A", "Q4A", "Q5B", "Q6B", "Q7A", "Q8B", "Q9B", "Q10A"],
                "top_n": 15
            }
        }


# =========================================================================
# Endpoints
# =========================================================================

@app.get("/")
def root():
    """صفحه اصلی - اطلاعات API"""
    return {
        "message": "🐎 به API موتور اسب سیاه خوش آمدید!",
        "version": "6.1",
        "status": "live",
        "endpoints": {            "health": "/health",
            "docs": "/docs (Swagger UI)",
            "calculate": "/calculate (POST)",
            "majors": "/majors",
            "motives": "/motives",
            "questions_strategies": "/questions/strategies",
            "questions_values": "/questions/values",
        },
        "data_loaded": {
            "majors": len(matcher.majors_db),
            "micro_motives": len(matcher.micro_motives),
            "strategy_questions": len(matcher.strategy_questions),
            "value_questions": len(matcher.value_questions),
        }
    }


@app.get("/health")
def health_check():
    """بررسی سلامت API"""
    return {
        "status": "ok",
        "version": "6.1",
        "majors_loaded": len(matcher.majors_db),
        "motives_loaded": len(matcher.micro_motives),
        "strategy_questions_loaded": len(matcher.strategy_questions),
        "value_questions_loaded": len(matcher.value_questions),
    }


@app.post("/calculate")
def calculate_match(request: MatchRequest):
    """محاسبه تطابق پروفایل کاربر با ۱۵۰ رشته"""
    try:
        for i, idx in enumerate(request.strategies):
            if not (0 <= idx <= 4):
                raise HTTPException(400, f"strategy_answers[{i}]={idx} must be 0-4")

        valid_values = {f"Q{i}{c}" for i in range(1, 11) for c in "AB"}
        for code in request.values:
            if code not in valid_values:
                raise HTTPException(400, f"Invalid value code: {code}")

        result = matcher.match(
            user_motives=request.micro_motives,
            strategy_answers=request.strategies,
            value_choices=request.values,
            reality_check=request.reality,
            top_n=request.top_n
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in /calculate: {e}", exc_info=True)
        raise HTTPException(500, f"Internal error: {str(e)}")


@app.get("/majors")
def list_majors():
    """لیست تمام ۱۵۰ رشته"""
    majors_list = [
        {
            "id": m["id"],
            "name": m["name"],
            "group": m.get("group", ""),
            "realm": m.get("realm", ""),
            "realm_fa": m.get("realm_fa", ""),
            "motives_count": len(m.get("micro_motive_codes", []))
        }
        for m in matcher.majors_db.values()
    ]
    majors_list.sort(key=lambda x: x["id"])
    return {"total": len(majors_list), "majors": majors_list}


@app.get("/motives")
def list_motives():
    """لیست تمام میکروموتیوها"""
    return {
        "total": len(matcher.micro_motives),
        "motives": matcher.micro_motives
    }


@app.get("/questions/strategies")
def get_strategy_questions():
    """دریافت ۲۰ سوال استراتژی"""
    return {
        "total": len(matcher.strategy_questions),
        "questions": matcher.strategy_questions
    }


@app.get("/questions/values")
def get_value_questions():
    """دریافت ۱۰ سوال ارزشی"""
    return {        "total": len(matcher.value_questions),
        "questions": matcher.value_questions
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=False)

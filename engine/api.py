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

# =========================================================================
# تنظیم مسیرها و import ها
# =========================================================================

# اضافه کردن پوشه engine به PYTHONPATH برای import کردن matcher
ENGINE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ENGINE_DIR))

# مسیر پوشه data (یک پوشه بالاتر از engine)
BASE_DIR = ENGINE_DIR.parent
DATA_DIR = BASE_DIR / "data"

# حالا matcher را import می‌کنیم
from matcher import DarkHorseMatcher

# =========================================================================
# راه‌اندازی لاگر و اپلیکیشن
# =========================================================================

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

# فعال‌سازی CORS برای دسترسی از هر فرانت‌اندی
app.add_middleware(
    CORSMiddleware,    allow_origins=["*"],  # در production می‌توانید محدود کنید
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================================
# راه‌اندازی موتور (فقط یک بار در startup)
# =========================================================================

logger.info("🚀 Initializing Dark Horse Matcher...")
logger.info(f"   Data directory: {DATA_DIR}")

if not DATA_DIR.exists():
    logger.error(f"❌ Data directory not found: {DATA_DIR}")
    raise RuntimeError(f"Data directory not found: {DATA_DIR}")

try:
    matcher = DarkHorseMatcher(data_dir=str(DATA_DIR))
    logger.info(f"✅ Matcher initialized successfully")
    logger.info(f"   📚 {len(matcher.majors_db)} majors loaded")
    logger.info(f"   💎 {len(matcher.micro_motives)} micro-motives loaded")
    logger.info(f"   ❓ {len(matcher.questions_data)} strategy questions loaded")
except Exception as e:
    logger.error(f"❌ Failed to initialize matcher: {e}", exc_info=True)
    raise


# =========================================================================
# مدل‌های Pydantic برای اعتبارسنجی ورودی/خروجی
# =========================================================================

class MatchRequest(BaseModel):
    """ساختار درخواست تطابق از فرانت‌اند"""
    micro_motives: List[str] = Field(
        ..., 
        description="لیست کدهای میکروموتیو انتخابی (مثلاً ['MED-001', 'CS-005'])",
        min_items=1,
        max_items=50
    )
    strategies: List[int] = Field(
        ..., 
        description="آرایه ۲۰ تایی از ایندکس‌های انتخابی (۰ تا ۴)",
        min_items=20,
        max_items=20
    )
    values: List[str] = Field(
        ..., 
        description="آرایه ۱۰ تایی از کدهای ارزشی (Q1A, Q1B, Q2A, ...)",
        min_items=10,        max_items=10
    )
    reality: Optional[Dict] = Field(
        None,
        description="واقعیت‌های کاربر برای تعدیل (اختیاری)"
    )
    top_n: int = Field(
        15,
        description="تعداد رشته‌های برتر برای نمایش",
        ge=5,
        le=50
    )

    class Config:
        json_schema_extra = {
            "example": {
                "micro_motives": ["MED-001", "MED-005", "CS-001", "CS-005", "PAINT-003"],
                "strategies": [1, 1, 1, 3, 4, 2, 3, 2, 3, 1, 1, 1, 1, 1, 4, 1, 3, 2, 2, 3],
                "values": ["Q1A", "Q2B", "Q3A", "Q4A", "Q5B", "Q6B", "Q7A", "Q8B", "Q9B", "Q10A"],
                "reality": {
                    "pressure_tolerance": 4,
                    "prestige_sensitivity": 2,
                    "financial_constraint": 3
                },
                "top_n": 15
            }
        }


# =========================================================================
# Endpoints
# =========================================================================

@app.get("/health")
def health_check():
    """بررسی سلامت API و وضعیت بارگذاری داده‌ها"""
    return {
        "status": "ok",
        "version": "6.1",
        "majors_loaded": len(matcher.majors_db),
        "motives_loaded": len(matcher.micro_motives),
        "questions_loaded": len(matcher.questions_data),
        "data_directory": str(DATA_DIR),
    }


@app.post("/calculate")
def calculate_match(request: MatchRequest):
    """
    Endpoint اصلی محاسبه تطابق پروفایل کاربر با ۱۵۰ رشته    
    ## ورودی
    - `micro_motives`: لیست کدهای میکروموتیو انتخابی (از لایه ۱)
    - `strategies`: آرایه ۲۰ تایی ایندکس‌ها (۰-۴) از ۲۰ سوال
    - `values`: آرایه ۱۰ تایی کدهای Q1A-Q10B از ۱۰ سوال
    - `reality` (اختیاری): واقعیت‌های کاربر
    - `top_n` (اختیاری): تعداد رشته‌های برتر (پیش‌فرض ۱۵)
    
    ## خروجی
    - `fingerprint`: اثر انگشت فردیت کاربر
    - `recommendations`: لیست رشته‌های پیشنهادی
    - `nonlinear_pathways`: مسیرهای غیرخطی کشف‌شده
    - `summary`: آمار تطابق
    """
    try:
        # اعتبارسنجی ایندکس‌های استراتژی
        for i, idx in enumerate(request.strategies):
            if not (0 <= idx <= 4):
                raise HTTPException(
                    status_code=400,
                    detail=f"strategy_answers[{i}]={idx} must be between 0 and 4"
                )
        
        # اعتبارسنجی کدهای ارزشی
        valid_values = {f"Q{i}{c}" for i in range(1, 11) for c in "AB"}
        for code in request.values:
            if code not in valid_values:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid value code: {code}. Must be Q1A-Q10B"
                )
        
        logger.info(f"📥 Received calculate request:")
        logger.info(f"   Motives: {len(request.micro_motives)} codes")
        logger.info(f"   Strategies: {len(request.strategies)} answers")
        logger.info(f"   Values: {len(request.values)} choices")
        
        # اجرای موتور
        result = matcher.match(
            user_motives=request.micro_motives,
            strategy_answers=request.strategies,
            value_choices=request.values,
            reality_check=request.reality,
            top_n=request.top_n
        )
        
        logger.info(f"✅ Calculation complete:")
        logger.info(f"   Personality: {result['method']['personality_type']}")
        logger.info(f"   CMS: {result['method']['cms']}")
        logger.info(f"   Top recommendation: {result['recommendations'][0]['name']} ({result['recommendations'][0]['total_score']}%)")        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in /calculate: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/majors")
def list_majors():
    """لیست تمام ۱۵۰ رشته با اطلاعات پایه"""
    majors_list = []
    for major_id, major in matcher.majors_db.items():
        majors_list.append({
            "id": major["id"],
            "name": major["name"],
            "group": major.get("group", ""),
            "realm": major.get("realm", ""),
            "realm_fa": major.get("realm_fa", ""),
            "motives_count": len(major.get("micro_motive_codes", []))
        })
    
    # مرتب‌سازی بر اساس ID
    majors_list.sort(key=lambda x: x["id"])
    
    return {
        "total": len(majors_list),
        "majors": majors_list
    }


@app.get("/motives")
def list_motives():
    """لیست تمام ۹۶۰ میکروموتیو با توضیحات فارسی"""
    return {
        "total": len(matcher.micro_motives),
        "motives": matcher.micro_motives
    }


@app.get("/motives/{code}")
def get_motive_by_code(code: str):
    """دریافت یک میکروموتیو خاص با کد"""
    if code not in matcher.micro_motives:
        raise HTTPException(status_code=404, detail=f"Motive code '{code}' not found")    
    return {
        "code": code,
        "description_fa": matcher.micro_motives[code]
    }


@app.get("/questions/strategies")
def get_strategy_questions():
    """دریافت ۲۰ سوال استراتژی (برای استفاده فرانت‌اند)"""
    return {
        "total": len(matcher.questions_data),
        "questions": matcher.questions_data
    }


# =========================================================================
# اجرای مستقیم (برای تست محلی)
# =========================================================================

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 70)
    print("🐎 Dark Horse Career Matcher API v6.1")
    print("=" * 70)
    print(f"📁 Data directory: {DATA_DIR}")
    print(f"🌐 Docs URL: http://localhost:8000/docs")
    print(f"💚 Health check: http://localhost:8000/health")
    print("=" * 70 + "\n")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )

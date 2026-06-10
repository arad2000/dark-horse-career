"""
Dark Horse API v6.1
FastAPI endpoint برای اتصال فرانت‌اند به موتور
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import logging
from matcher import DarkHorseMatcher

# راه‌اندازی
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("darkhorse_api")

app = FastAPI(
    title="Dark Horse Career Matcher API",
    description="API for discovering individuality through the Dark Horse philosophy",
    version="6.1"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# راه‌اندازی موتور
matcher = DarkHorseMatcher(data_dir="../data")


# -------------------------------------------------------------------------
# مدل‌های Pydantic
# -------------------------------------------------------------------------

class MatchRequest(BaseModel):
    """ساختار درخواست تطابق"""
    micro_motives: List[str] = Field(..., description="لیست کدهای میکروموتیو انتخابی")
    strategies: List[int] = Field(..., description="آرایه ۲۰ تایی ایندکس‌های انتخابی (۰-۴)")
    values: List[str] = Field(..., description="آرایه ۱۰ تایی کدهای ارزشی (Q1A, Q2B, ...)")
    reality: Optional[Dict] = Field(None, description="واقعیت‌های کاربر (اختیاری)")
    top_n: int = Field(15, description="تعداد رشته‌های برتر")


# -------------------------------------------------------------------------
# Endpoints# -------------------------------------------------------------------------

@app.get("/health")
def health_check():
    """بررسی سلامت API"""
    return {
        "status": "ok",
        "version": "6.1",
        "majors_loaded": len(matcher.majors_db),
        "motives_loaded": len(matcher.micro_motives),
        "questions_loaded": len(matcher.questions_data),
    }


@app.post("/calculate")
def calculate_match(request: MatchRequest):
    """
    محاسبه تطابق پروفایل کاربر با ۱۵۰ رشته
    
    ورودی:
        - micro_motives: لیست کدها (مثلاً ["MED-001", "CS-005"])
        - strategies: ۲۰ عدد بین ۰ تا ۴
        - values: ۱۰ کد از Q1A تا Q10B
        - reality (اختیاری): {pressure_tolerance, prestige_sensitivity, financial_constraint}
    
    خروجی:
        - fingerprint: اثر انگشت فردیت
        - recommendations: رشته‌های پیشنهادی
        - nonlinear_pathways: مسیرهای غیرخطی
        - summary: خلاصه آمار
    """
    try:
        # اعتبارسنجی
        if not request.micro_motives:
            raise HTTPException(400, "micro_motives is required")
        
        if len(request.strategies) != 20:
            raise HTTPException(400, "strategies must have exactly 20 elements")
        
        if len(request.values) != 10:
            raise HTTPException(400, "values must have exactly 10 elements")
        
        # اجرای موتور
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
        logger.error(f"Error in /calculate: {e}", exc_info=True)
        raise HTTPException(500, f"Internal error: {str(e)}")


@app.get("/majors")
def list_majors():
    """لیست تمام ۱۵۰ رشته"""
    return {
        "total": len(matcher.majors_db),
        "majors": [
            {
                "id": m["id"],
                "name": m["name"],
                "group": m["group"],
                "realm": m["realm"],
                "realm_fa": m["realm_fa"],
                "motives_count": len(m.get("micro_motive_codes", []))
            }
            for m in matcher.majors_db.values()
        ]
    }


@app.get("/motives")
def list_motives():
    """لیست تمام ۹۶۰ میکروموتیو"""
    return {
        "total": len(matcher.micro_motives),
        "motives": matcher.micro_motives
    }


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Dark Horse API v6.1 on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""
Dark Horse API v9.0 - سازگار با داده‌های جدید
موتور کشف فردیت + موتور سنجش
"""

import json
import logging
import os
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import asyncio

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("darkhorse_api_v9")

# Import Engines
try:
    from sanjesh_engine import (
        calculate_admission_for_major,
        calculate_all_majors_admission,
    )
    from darkhorse_engine import discover_individuality
except ImportError as e:
    logger.error(f"Import error: {e}")
    calculate_admission_for_major = None
    calculate_all_majors_admission = None
    discover_individuality = None


# =========================================================================
# توابع بارگذاری داده‌ها
# =========================================================================

def load_json_file(filename: str) -> Optional[Dict]:
    """بارگذاری فایل JSON"""
    try:
        base_path = Path(__file__).parent
        possible_paths = [
            base_path / "data" / filename,            base_path / filename,
        ]
        for path in possible_paths:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                logger.info(f"✅ Loaded {filename}")
                return data
        logger.warning(f"❌ File not found: {filename}")
        return None
    except Exception as e:
        logger.error(f"Error loading {filename}: {e}")
        return None


def load_all_majors_new_format() -> Dict:
    """
    بارگذاری ۶ فایل رشته جدید و تبدیل به فرمت سازگار با main.py
    
    Returns:
        دیکشنری با کلید major_id (string)
    """
    realm_mapping = {
        "medical_majors.json":        {"realm": "healer",       "realm_fa": "درمانگر"},
        "engineering_majors.json":    {"realm": "builder",      "realm_fa": "سازنده"},
        "basic_sciences_majors.json": {"realm": "explorer",     "realm_fa": "کاشف"},
        "humanities_majors.json":     {"realm": "thinker",      "realm_fa": "اندیشمند"},
        "art_majors.json":            {"realm": "artist",       "realm_fa": "هنرمند"},
        "language_majors.json":       {"realm": "communicator", "realm_fa": "ارتباط‌گر"},
    }
    
    majors_db = {}
    
    for filename, realm_info in realm_mapping.items():
        data = load_json_file(filename)
        if not data:
            continue
        
        # تبدیل از list به dict با کلید major_id
        for major in data:
            major_id = str(major.get("id", ""))
            if not major_id:
                continue
            
            # افزودن realm
            major["realm"] = realm_info["realm"]
            major["realm_fa"] = realm_info["realm_fa"]
            
            # تبدیل کلیدها برای سازگاری با موتور قدیمی
            major["major_id"] = major_id            
            major["name_fa"] = major.get("name", "")
            
            majors_db[major_id] = major
    
    logger.info(f"✅ Loaded {len(majors_db)} majors from 6 files")
    return majors_db


async def load_all_data(app: FastAPI):
    """بارگذاری همه داده‌ها"""
    
    # Majors (فرمت جدید)
    app.state.majors_db = load_all_majors_new_format()
    logger.info(f"Majors loaded: {len(app.state.majors_db)}")
    
    # Programs (حفظ شود)
    programs_data = load_json_file("programs.json")
    if programs_data:
        if isinstance(programs_data, list):
            app.state.programs_db = programs_data
        elif isinstance(programs_data, dict):
            if "programs" in programs_data and isinstance(programs_data["programs"], list):
                app.state.programs_db = programs_data["programs"]
            else:
                all_programs = []
                for value in programs_data.values():
                    if isinstance(value, list):
                        all_programs.extend(value)
                    elif isinstance(value, dict):
                        all_programs.append(value)
                app.state.programs_db = all_programs
        else:
            app.state.programs_db = []
    else:
        app.state.programs_db = []
    logger.info(f"Programs loaded: {len(app.state.programs_db)}")
    
    # Universities (حفظ شود)
    universities_data = load_json_file("universities_top50.json")
    if universities_data:
        if isinstance(universities_data, dict):
            app.state.universities_db = universities_data
        elif isinstance(universities_data, list):
            app.state.universities_db = {
                u.get("university_id"): u for u in universities_data if u.get("university_id")
            }
        else:
            app.state.universities_db = {}
    else:
        app.state.universities_db = {}    
        logger.info(f"Universities loaded: {len(app.state.universities_db)}")


# =========================================================================
# Lifespan
# =========================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Dark Horse API v9.0...")
    await load_all_data(app)
    logger.info("Dark Horse API v9.0 started successfully")
    yield


# =========================================================================
# FastAPI App
# =========================================================================

app = FastAPI(
    title="Dark Horse API",
    description="موتور کشف فردیت و انتخاب رشته هوشمند",
    version="9.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================================
# Pydantic Models
# =========================================================================

class EducationHistory(BaseModel):
    grade_10_city: Optional[str] = None
    grade_11_city: Optional[str] = None
    grade_12_city: Optional[str] = None


class UserProfile(BaseModel):
    gender: str = Field(..., description="جنسیت") 
    province: str = Field(..., description="استان")
    rank: Optional[int] = Field(99999)
    quota: Optional[str] = Field(None)
    gpa: Optional[float] = Field(0)
    final_gpa: Optional[float] = Field(0)
    traz: Optional[float] = Field(0)
    diploma_type: str = Field("ریاضی")
    age: Optional[int] = Field(None)
    education_history: Optional[EducationHistory] = None
    
    @validator('rank')
    def rank_valid(cls, v):
        if v is not None and (v < 1 or v > 300000):
            raise ValueError('رتبه باید بین ۱ تا ۳۰۰۰۰۰ باشد')
        return v
    
    @validator('gpa', 'final_gpa')
    def gpa_valid(cls, v):
        if v is not None and (v < 0 or v > 20):
            raise ValueError('معدل باید بین ۰ تا ۲۰ باشد')
        return v


class DarkHorseDiscoverRequest(BaseModel):
    micro_motives: List[str] = Field(default=[])
    sjt_answers: Optional[Dict[str, str]] = Field(default=None)
    conjoint_choices: Optional[Dict[str, str]] = Field(default=None)
    reality: Optional[Dict] = Field(default=None)


class SanjeshCalculateRequest(BaseModel):
    major_id: str
    user_profile: UserProfile


class SanjeshDiscoverAllRequest(BaseModel):
    user_profile: UserProfile
    admission_type: str = Field("both")


# =========================================================================
# Helper Functions
# =========================================================================

def get_majors_db(request: Request):
    return getattr(request.app.state, 'majors_db', {})


def get_programs_db(request: Request):
    return getattr(request.app.state, 'programs_db', [])

# =========================================================================
# Endpoints
# =========================================================================

@app.get("/")
async def root():
    return {"name": "Dark Horse API", "version": "9.0", "status": "online"}


@app.get("/api/health")
async def health_check(request: Request):
    engines_ok = (discover_individuality is not None and 
                   calculate_admission_for_major is not None)
    data_ok = (len(get_majors_db(request)) > 0 and len(get_programs_db(request)) > 0)
    return {
        "ok": engines_ok and data_ok,
        "engines": {
            "darkhorse": discover_individuality is not None,
            "sanjesh": calculate_admission_for_major is not None,
        },
        "data_loaded": {
            "majors": len(get_majors_db(request)),
            "programs": len(get_programs_db(request)),
        }
    }


@app.post("/api/darkhorse/discover")
async def discover_darkhorse(request: DarkHorseDiscoverRequest, req: Request):
    if discover_individuality is None:
        raise HTTPException(status_code=503)
    
    try:
        majors_db = get_majors_db(req)
        if not majors_db:
            raise HTTPException(status_code=500)
        
        discovery = await asyncio.to_thread(
            discover_individuality,
            majors_db,
            request.micro_motives,
            request.sjt_answers or {},
            request.conjoint_choices or {},
            request.reality,
        )
        
        recommendations = []
        for item in discovery.get("discovered_majors", []):       
            fit_data = item.get("individuality_fit", {})
            score = fit_data.get("score", 0)
            if score >= 30:
                major_data = majors_db.get(item.get("major_id"), {})
                evidence = fit_data.get("evidence", {})
                recommendations.append({
                    "major_id": item.get("major_id"),
                    "major_name_fa": item.get("major_name_fa"),
                    "fit_score": score,
                    "fit_level": fit_data.get("level", ""),
                    "prestige_level": major_data.get("prestige_level", 2),
                    "evidence": evidence,
                })
        
        recommendations.sort(key=lambda x: x["fit_score"], reverse=True)
        for i, rec in enumerate(recommendations, 1):
            rec["order"] = i
        
        high_fit = sum(1 for r in recommendations if r["fit_score"] >= 80)
        medium_fit = sum(1 for r in recommendations if 60 <= r["fit_score"] < 80)
        
        next_step = discovery.get("next_step")
        if not next_step:
            next_step = "اطلاعات سنجش را کامل کن"
        
        return {
            "session_id": str(uuid.uuid4()),
            "discovery_result": {
                "total_matches": len(recommendations),
                "high_fit_majors": high_fit,
                "medium_fit_majors": medium_fit,
                "recommendations": recommendations,
                "basis": "بر اساس ریزانگیزه‌ها، SJT، Conjoint و تعدیل بر اساس واقعیت‌ها",
                "method": discovery.get("method", {}),
                "summary": discovery.get("summary", {}),
                "next_step": next_step,
            },
        }
    
    except HTTPException:
        raise
    except Exception:
        logger.error("Error in darkhorse discover", exc_info=True)
        raise HTTPException(status_code=500)


@app.post("/api/sanjesh/calculate")
async def calculate_admission(request: SanjeshCalculateRequest, req: Request):
    if calculate_admission_for_major is None:
        raise HTTPException(status_code=503)    
    try:
        programs_db = get_programs_db(req)
        majors_db = get_majors_db(req)
        if not programs_db or not majors_db:
            raise HTTPException(status_code=500)
        
        user_dict = request.user_profile.model_dump()
        result = await asyncio.to_thread(
            calculate_admission_for_major,
            programs_db,
            majors_db,
            request.major_id,
            user_dict,
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail="خطا در محاسبه")
        
        return {
            "session_id": str(uuid.uuid4()),
            "admission_result": result,
        }
    
    except HTTPException:
        raise
    except Exception:
        logger.error("Error in calculate_admission", exc_info=True)
        raise HTTPException(status_code=500)


@app.post("/api/sanjesh/discover-all")
async def discover_all_majors(request: SanjeshDiscoverAllRequest, req: Request):
    if calculate_all_majors_admission is None:
        logger.error("calculate_all_majors_admission is not available")
        raise HTTPException(status_code=503)
    
    try:
        programs_db = get_programs_db(req)
        majors_db = get_majors_db(req)
        if not programs_db or not majors_db:
            raise HTTPException(status_code=500)
        
        user_dict = request.user_profile.model_dump()
        result = await asyncio.to_thread(
            calculate_all_majors_admission,
            programs_db,
            majors_db,
            user_dict,
            request.admission_type,        )
        
        return {
            "session_id": str(uuid.uuid4()),
            "sanjesh_result": result,
        }
    
    except Exception:
        logger.error("Error in discover-all", exc_info=True)
        raise HTTPException(status_code=500)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "دوباره تلاش کن"},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
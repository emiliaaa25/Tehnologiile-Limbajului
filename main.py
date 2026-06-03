from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from groq import Groq
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── App setup ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ABSA API — Săli de sport Iași",
    description="Aspect-Based Sentiment Analysis pentru recenzii în română",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files (if built into `frontend/dist`)
dist_path = Path(__file__).parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="frontend")

# ── Load data files ─────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"

with open(DATA_DIR / "aspects_stats.json", encoding="utf-8") as f:
    ASPECTS_STATS = json.load(f)
    # Aspectele reale din datele voastre
    ASPECT_IDS = [a["aspect"] for a in ASPECTS_STATS]

with open(DATA_DIR / "few_shot_examples.json", encoding="utf-8") as f:
    FEW_SHOT_EXAMPLES = json.load(f)

# Label-uri frumoase pentru frontend
ASPECT_LABELS = {
    "atmosfera":             "Atmosferă",
    "aglomerare":            "Aglomerare",
    "echipamente":           "Echipamente",
    "facilitati_curatenie":  "Facilități / Curățenie",
    "pret_valoare":          "Preț / Valoare",
    "program_antrenamente":  "Program antrenamente",
    "antrenori":             "Antrenori / Staff",
}

# ── Groq client ─────────────────────────────────────────────────────────────────
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
GROQ_MODEL = "llama-3.3-70b-versatile"  # gratuit, foarte bun

# ── Schemas ─────────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    text: str

class AspectResult(BaseModel):
    aspect: str
    label: str
    sentiment: str   # Positive | Negative | Neutral
    evidence: str

class AnalyzeResponse(BaseModel):
    aspects: list[AspectResult]
    overall_sentiment: str   # Positive | Negative | Mixed | Neutral
    dominant_aspect: str | None
    aspects_found: int
    input_text: str

# ── Prompt builder ──────────────────────────────────────────────────────────────
def build_prompt(text: str) -> str:
    aspects_list = "\n".join(f'- "{a}"' for a in ASPECT_IDS)

    # Construiește exemple few-shot din datele reale
    examples_text = ""
    for ex in FEW_SHOT_EXAMPLES[:8]:
        examples_text += f'\nReview: "{ex["review_text"]}"\n'
        examples_text += f'Response: {json.dumps({"aspects": ex["aspects"]}, ensure_ascii=False)}\n'

    return f"""You are an ABSA (Aspect-Based Sentiment Analysis) system for Romanian gym reviews.

## The 7 fixed aspects you analyze:
{aspects_list}

IMPORTANT: Extract ONLY aspects from the list above. Ignore everything else.

## Few-shot examples from real reviews:
{examples_text}

## Instructions:
1. Identify which aspects from the list are mentioned in the review (explicitly or implicitly).
2. For each aspect found, determine sentiment: "Positive", "Negative", or "Neutral".
3. Extract the exact text fragment that justifies the sentiment (the "evidence" field).
4. If an aspect is not mentioned at all, do NOT include it.
5. Respond EXCLUSIVELY with valid JSON, no text before or after, no markdown.

## Response format:
{{"aspects": [{{"aspect": "antrenori", "sentiment": "Positive", "evidence": "antrenorii sunt dedicați"}}, {{"aspect": "aglomerare", "sentiment": "Negative", "evidence": "extrem de aglomerat seara"}}], "overall_sentiment": "Mixed", "dominant_aspect": "antrenori"}}

## Review to analyze:
"{text}"

Respond ONLY with JSON:"""

# ── Helpers ─────────────────────────────────────────────────────────────────────
def normalize_sentiment(s: str) -> str:
    s = s.strip().lower()
    if s in ("positive", "pozitiv"):   return "Positive"
    if s in ("negative", "negativ"):   return "Negative"
    if s in ("neutral",  "neutru"):    return "Neutral"
    return "Neutral"

def normalize_aspect(a: str) -> str | None:
    """Mapează variante din few-shot la ID-urile fixe."""
    mapping = {
        "atmosphere":             "atmosfera",
        "atmosfera":              "atmosfera",
        "crowding":               "aglomerare",
        "aglomerare":             "aglomerare",
        "equipment":              "echipamente",
        "echipamente":            "echipamente",
        "facilities / cleanliness": "facilitati_curatenie",
        "facilitati_curatenie":   "facilitati_curatenie",
        "price / value":          "pret_valoare",
        "pret_valoare":           "pret_valoare",
        "training program":       "program_antrenamente",
        "program_antrenamente":   "program_antrenamente",
        "trainers / staff":       "antrenori",
        "antrenori":              "antrenori",
    }
    return mapping.get(a.strip().lower())

# ── Routes ──────────────────────────────────────────────────────────────────────
@app.get("/ping")
def ping():
    return {"status": "ok", "message": "ABSA API funcționează (Groq / LLaMA 3.3 70B)"}


@app.get("/aspects")
def get_aspects():
    """Lista aspectelor + statistici din corpus — pentru graficele din frontend."""
    return {
        "aspects": [
            {
                "id":    a["aspect"],
                "label": ASPECT_LABELS.get(a["aspect"], a["aspect"]),
                "stats": {
                    "pos": a["pos"], "neg": a["neg"], "neu": a["neu"],
                    "total": a["total"],
                    "pos_pct": a["pos_pct"], "neg_pct": a["neg_pct"], "neu_pct": a["neu_pct"],
                }
            }
            for a in ASPECTS_STATS
        ]
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    if not req.text or len(req.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Recenzia este prea scurtă (minim 5 caractere).")
    if len(req.text) > 2000:
        raise HTTPException(status_code=400, detail="Recenzia este prea lungă (maxim 2000 caractere).")

    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": build_prompt(req.text)}],
            temperature=0,
            max_tokens=500,
        )
        raw = completion.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Eroare Groq API: {str(e)}")

    # Curăță eventuale markdown fences
    raw = raw.replace("```json", "").replace("```", "").strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1:
        raise HTTPException(status_code=500, detail="Răspuns invalid de la model. Încearcă din nou.")

    try:
        parsed = json.loads(raw[start:end+1])
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Răspuns JSON invalid. Încearcă din nou.")

    # Normalizează și filtrează aspectele
    aspects_out = []
    for a in parsed.get("aspects", []):
        asp_id = normalize_aspect(a.get("aspect", ""))
        if not asp_id:
            continue
        aspects_out.append(AspectResult(
            aspect=asp_id,
            label=ASPECT_LABELS.get(asp_id, asp_id),
            sentiment=normalize_sentiment(a.get("sentiment", "Neutral")),
            evidence=a.get("evidence", ""),
        ))

    overall = parsed.get("overall_sentiment", "Neutral")
    dominant = normalize_aspect(parsed.get("dominant_aspect", "")) or (aspects_out[0].aspect if aspects_out else None)

    return AnalyzeResponse(
        aspects=aspects_out,
        overall_sentiment=overall,
        dominant_aspect=dominant,
        aspects_found=len(aspects_out),
        input_text=req.text,
    )
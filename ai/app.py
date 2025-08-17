from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import trafilatura
import docx2txt
from io import BytesIO
from pypdf import PdfReader
import re
import random

app = FastAPI(title="Cerply AI")

# ---------- helpers ----------
def extract_text_from_pdf(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    parts = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            pass
    return "\n".join(parts)

def extract_text_from_docx(data: bytes) -> str:
    bio = BytesIO(data)
    return docx2txt.process(bio) or ""

def extract_text_from_html_url(url: str) -> str:
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return ""
        return trafilatura.extract(downloaded, include_formatting=False) or ""
    except Exception:
        return ""

def normalise_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()

def naive_objectives(text: str, limit: int = 5) -> List[str]:
    # rough baseline: pick salient sentences and cast to objectives
    sents = re.split(r"(?<=[.!?])\s+", text)
    sents = [normalise_spaces(s) for s in sents if len(s) > 40][:50]
    random.shuffle(sents)
    goals = []
    for s in sents:
        goals.append(f"Understand: {s[:180]}")
        if len(goals) >= limit:
            break
    if not goals:
        goals = ["Understand the key points of this material."]
    return goals

def naive_items(objective: str, context: str, n: int = 4):
    stem = f"Which statement best aligns with this objective? {objective}"
    correct = (context.split(".")[0] or context[:120]).strip()
    distractors = []
    for piece in re.split(r"[.;:]\s+", context)[1:10]:
        piece = piece.strip()
        if 20 <= len(piece) <= 120 and piece != correct:
            distractors.append(piece)
        if len(distractors) >= 6:
            break
    while len(distractors) < 3:
        distractors.append("None of the above.")
    options = [correct] + distractors[:3]
    random.shuffle(options)
    correct_index = options.index(correct)
    explainer = f"The correct answer ties directly to the source: '{correct}'."
    return {
        "stem": stem[:280],
        "options": options,
        "correctIndex": correct_index,
        "explainer": explainer
    }

# ---------- models ----------
class DraftObjectivesIn(BaseModel):
    text: str
    maxObjectives: int = 5

class DraftObjectivesOut(BaseModel):
    objectives: List[str]

class DraftItemsIn(BaseModel):
    objective: str
    context: str
    count: int = 3

class DraftItemsOut(BaseModel):
    items: List[dict]

# ---------- routes ----------
@app.post("/extract_text")
async def extract_text(file: Optional[UploadFile] = File(None), url: Optional[str] = Form(None)):
    if file:
        data = await file.read()
        name = (file.filename or "").lower()
        if name.endswith(".pdf"):
            txt = extract_text_from_pdf(data)
        elif name.endswith(".docx"):
            txt = extract_text_from_docx(data)
        else:
            try:
                txt = data.decode("utf-8", errors="ignore")
            except Exception:
                txt = ""
    elif url:
        txt = extract_text_from_html_url(url)
    else:
        return {"text": ""}

    return {"text": normalise_spaces(txt)}

@app.post("/draft/objectives", response_model=DraftObjectivesOut)
async def draft_objectives(payload: DraftObjectivesIn):
    objectives = naive_objectives(payload.text, payload.maxObjectives)
    return {"objectives": objectives}

@app.post("/draft/items", response_model=DraftItemsOut)
async def draft_items(payload: DraftItemsIn):
    items = []
    for _ in range(max(1, payload.count)):
        items.append(naive_items(payload.objective, payload.context))
    return {"items": items}

@app.get("/health")
async def health():
    return {"ok": True}

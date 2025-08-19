
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any

app = FastAPI(title="Cerply AI", version="0.4.1")

class DecomposeRequest(BaseModel):
    policy_id: str | None = None
    text: str

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/rde/decompose")
def decompose(req: DecomposeRequest) -> Dict[str, Any]:
    # Stub for now
    return {"id":"plan-demo","policyId":req.policy_id or "policy-demo","obligations":[],"controls":[],"procedures":[]}

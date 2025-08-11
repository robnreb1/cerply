
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any

app = FastAPI(title="Cerply AI Service", version="0.1.0")

class DecomposeRequest(BaseModel):
    policy_id: str | None = None
    text: str

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/rde/decompose")
def decompose(req: DecomposeRequest) -> Dict[str, Any]:
    # Stubbed "AI" output for demo purposes.
    obligations = [
        {"id": "obl-1", "text": "Maintain records for 6 years", "citation": "Policy §1.2", "riskWeight": 0.7},
        {"id": "obl-2", "text": "Perform AML checks for new customers", "citation": "Policy §2.1", "riskWeight": 0.9}
    ]
    controls = [
        {"id": "ctl-1", "name": "Records Retention Policy", "description": "Retention schedule and WORM storage", "mappedStandards": ["ISO27001:A.8.3"]},
        {"id": "ctl-2", "name": "KYC/AML Procedure", "description": "KYC checklist and approvals", "mappedStandards": ["FCA:SYSC3"]}
    ]
    procedures = [
        {"id": "pro-1", "steps": ["Classify records", "Store in WORM"], "ownerRole": "Records Manager", "frequency": "ongoing"},
        {"id": "pro-2", "steps": ["Collect ID", "Screen sanctions", "Approve"], "ownerRole": "Onboarding Lead", "frequency": "per new customer"}
    ]
    ecs = 42.0
    return {"id": "plan-demo", "policyId": req.policy_id or "policy-demo", "obligations": obligations, "controls": controls, "procedures": procedures, "evidenceTemplates": [], "ecs": ecs}

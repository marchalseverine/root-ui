"""FastAPI generation service for root-ui.

Exposes POST /internal/generate, which streams an LLM completion back as SSE.
Protected by a shared bearer secret (INTERNAL_API_SECRET) checked in middleware.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from starlette.requests import Request

from _llm import get_model, stream_completion
from deploy_check import run_deploy_check

app = FastAPI(title="root-ui generation service")

PROMPTS_DIR = Path(__file__).parent / "prompts"
VALID_TYPES = {"prd", "spec", "tasks"}


def _expected_auth() -> str | None:
    secret = os.environ.get("INTERNAL_API_SECRET")
    return f"Bearer {secret}" if secret else None


@app.middleware("http")
async def bearer_auth(request: Request, call_next):
    if request.url.path.startswith("/internal/"):
        expected = _expected_auth()
        if expected is None or request.headers.get("authorization") != expected:
            return JSONResponse({"detail": "Invalid or missing token"}, status_code=401)
    return await call_next(request)


class GenerateRequest(BaseModel):
    type: str
    project_id: str
    prompt_language: str
    context: dict = {}


class TaskStats(BaseModel):
    total: int
    checked: int


class DeployCheckRequest(BaseModel):
    task_stats: TaskStats
    prd_approved: bool
    spec_approved: bool
    tasks_artifact_exists: bool


def _load_prompt(artifact_type: str) -> str:
    path = PROMPTS_DIR / f"{artifact_type}.txt"
    if not path.exists():
        raise HTTPException(status_code=422, detail=f"Unknown type: {artifact_type}")
    return path.read_text(encoding="utf-8")


def _build_user_prompt(req: GenerateRequest) -> str:
    context = json.dumps(req.context, ensure_ascii=False, indent=2)
    return (
        f"Output language: {req.prompt_language}\n"
        f"Project id: {req.project_id}\n\n"
        f"Context (approved upstream artifacts and brief):\n{context}\n"
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "model": get_model()}


@app.post("/internal/generate")
async def generate(req: GenerateRequest, authorization: str | None = Header(default=None)):
    if req.type not in VALID_TYPES:
        raise HTTPException(status_code=422, detail="type must be prd, spec, or tasks")

    system = _load_prompt(req.type)
    user = _build_user_prompt(req)
    model = get_model()

    async def event_stream():
        start = time.monotonic()
        try:
            async for chunk in stream_completion(system, user, model=model):
                yield f"event: chunk\ndata: {json.dumps({'text': chunk})}\n\n"
        except Exception as exc:  # surface upstream failures as an SSE error event
            payload = json.dumps({"message": str(exc), "code": "LLM_ERROR"})
            yield f"event: error\ndata: {payload}\n\n"
            return
        duration_ms = int((time.monotonic() - start) * 1000)
        done = json.dumps({"model": model, "duration_ms": duration_ms})
        yield f"event: done\ndata: {done}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/internal/deploy-check")
async def deploy_check(req: DeployCheckRequest) -> dict:
    return run_deploy_check(
        total=req.task_stats.total,
        checked=req.task_stats.checked,
        prd_approved=req.prd_approved,
        spec_approved=req.spec_approved,
        tasks_artifact_exists=req.tasks_artifact_exists,
    )

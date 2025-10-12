import os
import asyncio
import logging
from pathlib import Path
from typing import Optional, Any, Dict

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Dotenv (optional) - loads .env into environment if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Import OpenAI client
try:
    # modern OpenAI Python client
    from openai import OpenAI
except Exception as e:
    raise RuntimeError("Missing 'openai' package. Install with 'pip install openai'.")

# -------------------- Configuration --------------------
API_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-nano")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
FRONTEND_DIR = os.getenv("FRONTEND_DIR", "../frontend")  # relative path from backend folder

# Basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastapi_gpt5_backend")

# Instantiate client (passes api_key explicitly so it's clear where it comes from)
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY is not set. Set it in your environment or in .env before running.")

client = OpenAI(api_key=OPENAI_API_KEY)

# -------------------- FastAPI app --------------------
app = FastAPI(title="GPT-5 Nano Proxy API", version="0.1")

# CORS - during development it is common to allow frontend origins. Tighten in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# If there's a frontend, mount it so you can visit the UI at '/'
frontend_path = Path(FRONTEND_DIR).resolve()
if frontend_path.exists():
    logger.info(f"Mounting frontend from: {frontend_path}")
    app.mount("/static", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
else:
    logger.info(f"No frontend found at {frontend_path} — static files won't be served.")

# -------------------- Request / Response models --------------------
class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="User prompt/text to send to the model")
    max_output_tokens: Optional[int] = Field(
        512,  # ✅ safer default
        ge=1,
        le=4000,  # allow more if needed
        description="Max tokens to generate (defaults to 512)"
    )


class ChatResponse(BaseModel):
    reply: str
    usage: Optional[Dict[str, Any]] = None


# -------------------- Helpers --------------------
def extract_text_from_response(resp) -> str:
    """Extract plain text from GPT Responses API safely, with fallback + incomplete handling."""
    try:
        # ✅ If response has a direct text field
        if hasattr(resp, "output_text") and resp.output_text:
            return resp.output_text.strip()
        if hasattr(resp, "text") and resp.text:
            return str(resp.text).strip()

        # ✅ Handle output blocks
        if hasattr(resp, "output") and resp.output:
            parts = []
            for block in resp.output or []:
                if hasattr(block, "content") and block.content:
                    for c in block.content or []:
                        if hasattr(c, "text") and c.text:
                            parts.append(c.text)
                        elif isinstance(c, dict) and "text" in c:
                            parts.append(c["text"])
            if parts:
                return "\n".join([p.strip() for p in parts if p])

        # ✅ Handle incomplete responses
        if hasattr(resp, "status") and resp.status == "incomplete":
            reason = None
            if hasattr(resp, "incomplete_details") and resp.incomplete_details:
                reason = getattr(resp.incomplete_details, "reason", None)
            return f"[incomplete response: {reason or 'unknown reason'}]"

        # ✅ Last resort: dump raw object
        return str(resp)

    except Exception as e:
        return f"[extractor error: {e}]"
    
    
def safe_extract_reply(resp) -> str:
    """
    Safely get the assistant's reply text from the Responses API.
    Prefers message blocks; falls back to output_text; handles incomplete responses.
    Always returns a non-empty string.
    """
    try:
        # Dump to dict for reliable navigation
        resp_dict = resp.model_dump() if hasattr(resp, "model_dump") else resp
        if not isinstance(resp_dict, dict):
            return str(resp_dict)

        # 1. If there's a message block with content → that's what we want
        output_list = resp_dict.get("output") or []
        for block in output_list:
            # message blocks have type "message" and role "assistant"
            if block.get("type") == "message" and block.get("role") == "assistant":
                # block.content is a list of content items
                content_items = block.get("content") or []
                for c in content_items:
                    # look for the output_text type
                    if isinstance(c, dict) and c.get("type") == "output_text" and c.get("text"):
                        return c["text"].strip()
                    # if content items are simpler
                    if isinstance(c, dict) and "text" in c and c["text"]:
                        return c["text"].strip()

        # 2. Fallback: output_text field on top-level
        if "output_text" in resp_dict and resp_dict["output_text"]:
            return resp_dict["output_text"].strip()

        # 3. If status is incomplete, indicate that to user
        status = resp_dict.get("status")
        if status == "incomplete":
            inc = resp_dict.get("incomplete_details") or {}
            reason = inc.get("reason") or "reason unknown"
            return f"[incomplete response: {reason}]"

        # 4. Final fallback: first non-reasoning block content that has text
        for block in output_list:
            if block.get("type") != "reasoning":
                # try content of block
                content_items = block.get("content") or []
                for c in content_items:
                    if isinstance(c, dict) and "text" in c and c["text"]:
                        return c["text"].strip()
                # maybe simple field
                text = block.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()

        # 5. If nothing found, dump the JSON to help debug
        import json
        return json.dumps(resp_dict, indent=2, default=str)

    except Exception as e:
        return f"[extract error: {e}]"







@app.get("/")
async def root():
    return {"message": "Welcome to VeriHuman API backend 🚀"}

# -------------------- Middleware for basic logging --------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"{request.method} {request.url} -> {response.status_code}")
        return response
    except Exception as e:
        logger.exception("Unhandled error in request")
        raise


# -------------------- Routes --------------------
@app.get("/api/health")
async def health():
    """Simple health check."""
    return {"status": "ok"}




@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    prompt_text = req.prompt.strip()
    if not prompt_text:
        raise HTTPException(status_code=400, detail="Empty prompt")

    try:
        # ✅ Use Chat Completions API for GPT-3.5
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt_text}],
            max_tokens=req.max_output_tokens or 512,
        )

        # ✅ Corrected way to access model reply
        reply = response.choices[0].message.content.strip()

        usage = None
        if hasattr(response, "usage"):
            usage = response.usage.model_dump() if hasattr(response.usage, "model_dump") else dict(response.usage)

        return {"reply": reply, "usage": usage}

    except Exception as e:
        import traceback, time
        err_text = f"{time.ctime()} - OpenAI API request failed: {str(e)}\n{traceback.format_exc()}\n"
        with open("last_error.log", "a", encoding="utf-8") as f:
            f.write(err_text)
        logger.error(err_text)
        raise HTTPException(status_code=502, detail=f"OpenAI error: {str(e)}")






@app.post("/api/verify")
async def verify():
    """Quick endpoint that pings the model to verify the API key and model are working.
    It runs a tiny prompt and returns the model text. Use for quick integration checks.
    Note: this consumes a small amount of credit.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OPENAI_API_KEY not configured")

    try:
        resp = await asyncio.to_thread(
            client.responses.create,
            model=API_MODEL,
            input="Reply with the single word: pong",
            max_output_tokens=16,
        )
        text = extract_text_from_response(resp)
        return {"ok": True, "model": API_MODEL, "response": text}
    except Exception as e:
        logger.exception("Verification call failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


# -------------------- Run with: uvicorn fastapi_gpt5_backend:app --------------------
if __name__ == "__main__":
    import uvicorn

    # 🚫 no reload=True in production / testing with file writes
    uvicorn.run("fastapi_gpt5_backend:app", host="0.0.0.0", port=8000, reload=False)


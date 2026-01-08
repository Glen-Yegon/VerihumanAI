import os
import asyncio
import httpx  # for async HTTP requests to GPTZero
import logging
from pathlib import Path
from typing import Optional, Any, Dict, List
from openai import OpenAI
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import logging
# Make sure you have a logger configured at the top of your file
logger = logging.getLogger("fastapi_gpt5_backend")

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
FRONTEND_DIR = os.getenv("FRONTEND_DIR", "../Frontend")  # relative path from backend folder
GPTZERO_API_KEY = os.getenv("GPTZERO_API_KEY")


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



# -------------------- Humanizer Helpers --------------------

def is_too_similar(original: str, rewritten: str) -> bool:
    """
    Detects weak humanization by checking similarity.
    This is intentionally simple and fast.
    """
    if not original or not rewritten:
        return True

    original = original.lower().strip()
    rewritten = rewritten.lower().strip()

    # Same text or almost same length → suspicious
    if original == rewritten:
        return True

    if abs(len(original) - len(rewritten)) < 25:
        return True

    return False


def local_humanize(text: str) -> str:
    """
    Local deep humanization fallback.
    Expands, softens, and humanizes rigid AI-like text.
    """
    import random

    starters = [
        "In simple terms,",
        "What this really means is that",
        "From a practical point of view,",
        "At its core,",
        "In everyday use,"
    ]

    connectors = [
        "As a result,",
        "Because of this,",
        "Over time,",
        "This helps ensure that",
        "Which ultimately means"
    ]

    sentences = [s.strip() for s in text.split('.') if s.strip()]
    if not sentences:
        return text

    # Single-sentence expansion
    if len(sentences) == 1:
        return (
            f"{random.choice(starters)} {sentences[0].lower()}. "
            f"{random.choice(connectors)} it feels more natural, balanced, and easier to understand."
        )

    # Multi-sentence enhancement
    humanized = []
    for i, s in enumerate(sentences):
        if i == 0:
            humanized.append(f"{random.choice(starters)} {s.lower()}")
        else:
            humanized.append(f"{random.choice(connectors)} {s.lower()}")

    return ". ".join(humanized) + "."



# ----------------- Models -----------------

class DetectRequest(BaseModel):
    document: str = Field(..., min_length=1, description="Text to detect for AI content")

class SentenceStats(BaseModel):
    sentence: str
    generated_prob: float
    class_probabilities: Dict[str, float]
    highlighted: bool

class TextStats(BaseModel):
    total_sentences: int
    highlighted_as_ai: int
    burstiness: Optional[float] = None
    writing_stats: Dict = {}
    sentences: Optional[List[SentenceStats]] = None  # New field

class DetectResponse(BaseModel):
    document: str
    document_classification: str  # e.g. "AI_ONLY", "HUMAN_ONLY", "MIXED"
    class_probabilities: dict
    explanation: str
    text_stats: TextStats
    subclass: Optional[dict] = None  # Optional detailed subclass info

# ----------------- Endpoint -----------------

@app.post("/api/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    user_text = req.document.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Empty text provided")

    url = "https://api.gptzero.me/v2/predict/text"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": GPTZERO_API_KEY
    }

    payload = {
        "document": user_text,
        "detailed": True,
        "include": ["class_probabilities", "sentences", "writing_stats", "subclass"]
    }

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            logger.info(f"GPTZero raw response: {data}")

            documents = data.get("documents", [])
            if not documents:
                raise HTTPException(status_code=502, detail="Malformed GPTZero response")

            doc = documents[0]

            classification = doc.get("document_classification", "UNKNOWN")
            probs = doc.get("class_probabilities", {})
            explanation_text = doc.get("result_message") or "No explanation provided."
            confidence = doc.get("confidence_score")
            if confidence is not None:
                explanation_text += f"\nConfidence Score: {round(confidence * 100, 2)}%"

            sentences_data = doc.get("sentences", [])
            highlighted_count = sum(1 for s in sentences_data if s.get("highlight_sentence_for_ai"))

            # Build sentence-level stats
            sentences_stats = [
                SentenceStats(
                    sentence=s.get("sentence", ""),
                    generated_prob=s.get("generated_prob", 0),
                    class_probabilities=s.get("class_probabilities", {}),
                    highlighted=s.get("highlight_sentence_for_ai", False)
                ) for s in sentences_data
            ]

            text_stats = TextStats(
                total_sentences=len(sentences_data),
                highlighted_as_ai=highlighted_count,
                burstiness=doc.get("overall_burstiness"),
                writing_stats=doc.get("writing_stats", {}),
                sentences=sentences_stats
            )

            # Optional subclass info
            subclass_info = doc.get("subclass", None)

            return DetectResponse(
                document=user_text,
                document_classification=classification,
                class_probabilities=probs,
                explanation=explanation_text,
                text_stats=text_stats,
                subclass=subclass_info
            )

        except httpx.HTTPError as e:
            logger.error(f"GPTZero API error: {e} | Response: {resp.text if 'resp' in locals() else 'none'}")
            raise HTTPException(status_code=502, detail="GPTZero API error")
        except Exception as e:
            logger.exception(f"Unexpected server error: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")



class HumanizeRequest(BaseModel):
    text: str = Field(..., min_length=1)

class HumanizeResponse(BaseModel):
    humanized_text: str

@app.post("/api/humanize", response_model=HumanizeResponse)
async def humanize_text(req: HumanizeRequest):
    HUMANIZER_API_KEY = os.getenv("HUMANIZER_API_KEY")
    HUMANIZER_URL = "https://humanizerpro.ai/api/v1/humanize"

    payload = {"text": req.text}
    headers = {
        "x-api-key": HUMANIZER_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(HUMANIZER_URL, json=payload, headers=headers)

        data = resp.json()
        api_text = data.get("humanized_text")

        # ✅ Accept only if meaningfully different
        if (
            resp.status_code == 200
            and api_text
            and not is_too_similar(req.text, api_text)
        ):
            return {"humanized_text": api_text}

        # ⚠️ Weak or identical output → enhance locally
        enhanced = local_humanize(api_text or req.text)
        return {"humanized_text": enhanced}

    except Exception:
        # 🚨 API down → full local humanization
        logger.warning("HumanizerPro unreachable, using local humanizer")
        return {"humanized_text": local_humanize(req.text)}




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


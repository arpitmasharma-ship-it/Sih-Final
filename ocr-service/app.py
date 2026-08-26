"""
LMCC OCR Micro-service
----------------------
Optional standalone OCR engine implementing the contract expected by
`server/services/ocr/providers/remote.provider.js`:

    POST /ocr/process
      multipart/form-data:
        image: binary file
        variant: COMPLIANT | NON_COMPLIANT | LOW_QUALITY   (optional, demo only)
    -> 200 JSON:
      {
        provider: "paddle",
        rawText: str,
        lines: [{text, confidence}],
        meanConfidence: float,
        processingMs: int,
        simulated: false
      }

Run:
    pip install -r requirements.txt
    uvicorn app:app --host 0.0.0.0 --port 8100

Point the Node backend at it with:
    OCR_PROVIDER=remote
    REMOTE_OCR_URL=http://localhost:8100/ocr/process
"""

import io
import re
import time
import logging
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lmcc-ocr")

app = FastAPI(title="LMCC OCR Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Engine bootstrap (lazy so /health works before weights are downloaded)
# ---------------------------------------------------------------------------
_engine = None


def get_engine():
    """Lazy-load PaddleOCR; fall back to pytesseract if Paddle is unavailable."""
    global _engine
    if _engine is not None:
        return _engine
    try:
        from paddleocr import PaddleOCR  # type: ignore

        _engine = ("paddle", PaddleOCR(use_angle_cls=True, lang="en", show_log=False))
        logger.info("PaddleOCR engine ready")
    except Exception as exc:  # pragma: no cover - environment dependent
        logger.warning("PaddleOCR unavailable (%s); trying pytesseract", exc)
        try:
            import pytesseract  # type: ignore
            from PIL import Image  # type: ignore

            _engine = ("tesseract", None)  # call via pytesseract directly
        except Exception as exc2:
            raise RuntimeError(f"No OCR engine available: {exc2}")
    return _engine


class LineOut(BaseModel):
    text: str
    confidence: float


class OcrResponse(BaseModel):
    provider: str
    rawText: str
    lines: List[LineOut]
    meanConfidence: float
    processingMs: int
    simulated: bool = False


# ---------------------------------------------------------------------------
# Demo simulation (mirrors the Node demo provider scenarios)
# ---------------------------------------------------------------------------
DEMO_LINES = {
    "COMPLIANT": [
        ("Britannia Good Day Cashew Cookies", 0.97),
        ("NET QUANTITY: 600 g", 0.95),
        ("Maximum Retail Price Rs 240.00 inclusive of all taxes", 0.94),
        ("Mfd. by: Britannia Industries Ltd, Bangalore 560045", 0.92),
        ("MFG DATE: 03/2025  BEST BEFORE: 9 months", 0.9),
        ("Consumer Care: care@britannia.co.in Ph 1800-425-8888", 0.93),
        ("Country of Origin: India  Batch No: B25C17A", 0.91),
    ],
    "NON_COMPLIANT": [
        ("Tasty Snacks Pack", 0.96),
        ("Net Wt. 250g", 0.94),
        ("MRP Rs 99/-", 0.95),
    ],
    "LOW_QUALITY": [
        ("some packa.. text unreadable", 0.31),
        ("MRP R? ??", 0.28),
    ],
}


def simulate(image_bytes: bytes, variant: Optional[str]) -> OcrResponse:
    started = time.time()
    v = variant if variant in DEMO_LINES else "COMPLIANT"
    lines = [LineOut(text=t, confidence=c) for t, c in DEMO_LINES[v]]
    confs = [l.confidence for l in lines]
    return OcrResponse(
        provider="paddle-simulated",
        rawText="\n".join(l.text for l in lines),
        lines=lines,
        meanConfidence=sum(confs) / len(confs),
        processingMs=int((time.time() - started) * 1000) + 400,
        simulated=True,
    )


def run_ocr(image_bytes: bytes) -> tuple[str, list]:
    kind, eng = get_engine()
    if kind == "paddle":
        import numpy as np  # type: ignore
        from PIL import Image  # type: ignore

        img = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
        result = eng.ocr(img, cls=True)
        lines = []
        for page in result or []:
            for entry in page or []:
                box, (text, conf) = entry[0], entry[1]
                x = min(p[0] for p in box)
                y = min(p[1] for p in box)
                w = max(p[0] for p in box) - x
                h = max(p[1] for p in box) - y
                lines.append({"text": text, "confidence": round(float(conf), 3), "bbox": {"x": x, "y": y, "width": w, "height": h}})
        return "paddle", lines

    # pytesseract fallback
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore
    import numpy as np  # type: ignore

    img = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    lines = []
    for i, text in enumerate(data["text"]):
        t = str(text).strip()
        if not t or int(data["conf"][i]) < 0:
            continue
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        lines.append({"text": t, "confidence": round(int(data["conf"][i]) / 100, 3), "bbox": {"x": x, "y": y, "width": w, "height": h}})
    return "tesseract", lines


@app.get("/health")
def health():
    try:
        get_engine()
        return {"status": "ok"}
    except Exception:
        # Still report ok — the service can run in simulated mode
        return {"status": "ok", "engine": "unavailable-will-simulate"}


@app.post("/ocr/process", response_model=OcrResponse)
async def ocr_process(image: UploadFile = File(...), variant: Optional[str] = Form(None)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="`image` must be an image file")

    data = await image.read()

    # Demo/simulation mode keeps parity with the Node demo provider
    if variant:
        return simulate(data, variant)

    started = time.time()
    try:
        provider, entries = run_ocr(data)
    except Exception as exc:
        logger.exception("OCR failure")
        raise HTTPException(status_code=500, detail=f"OCR failed: {exc}")

    lines = [LineOut(text=e["text"], confidence=e["confidence"]) for e in entries]
    mean_conf = round(sum(e["confidence"] for e in entries) / len(entries), 3) if entries else 0.0

    return OcrResponse(
        provider=provider,
        rawText="\n".join(e["text"] for e in entries),
        lines=lines,
        meanConfidence=mean_conf,
        processingMs=int((time.time() - started) * 1000),
    )

# LMCC OCR Micro-service

Optional standalone OCR service (FastAPI + PaddleOCR) for the LMCC compliance
platform. The Node backend works out of the box with its built-in Tesseract.js /
demo providers — this service exists to demonstrate the pluggable provider
architecture and to offer a production-grade engine.

## Contract

`POST /ocr/process` (multipart):

| field    | type   | notes                                        |
| -------- | ------ | -------------------------------------------- |
| `image`  | file   | required, image/jpeg · png · webp            |
| `variant`| string | optional demo scenario (`COMPLIANT`, `NON_COMPLIANT`, `LOW_QUALITY`) → returns simulated output |

Response:

```json
{
  "provider": "paddle",
  "rawText": "...",
  "lines": [{ "text": "MRP Rs 99", "confidence": 0.94 }],
  "meanConfidence": 0.93,
  "processingMs": 512,
  "simulated": false
}
```

## Run locally

```bash
cd ocr-service
pip install -r requirements.txt
uvicorn app:app --port 8100
```

## Wire into the backend

```env
OCR_PROVIDER=remote
REMOTE_OCR_URL=http://localhost:8100/ocr/process
```

If the remote service is unreachable the Node OCR facade automatically falls
back to the demo simulation and flags results as `simulated: true`.

## Health

```bash
curl http://localhost:8100/health
```

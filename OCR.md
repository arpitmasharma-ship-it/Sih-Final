# OCR Pipeline

`server/services/ocr/` — pluggable OCR with field extraction tuned for packaged
commodity labels.

## Pipeline

```
buffer → preprocess (Jimp) → provider → extractFieldsFromLines → declarations
```

1. **Preprocess** (`preprocess.js`): greyscale → normalize → contrast boost →
   sharpen; computes `blurScore` / `contrastScore` heuristics that feed the
   readability warning downstream.
2. **Provider** (selected by `OCR_PROVIDER`, with graceful fallback):
   - `tesseract` — Tesseract.js v5 worker, per-line confidence + word boxes.
   - `demo` — deterministic simulated labels for the three SIH scenarios
     (flagged `simulated: true`).
   - `remote` — POSTs to the Python micro-service (`ocr-service/`, PaddleOCR).
     On failure the facade falls back to demo and records `fallbackFrom`.
3. **Field extraction** (`fieldExtractor.js`): pure regex parsers over OCR
   lines — `parseMRP`, `parseNetQuantity` (incl. bare values like "200 g"),
   `parseLabeledDate`, party-name/address parsers, phone/e-mail, product-name
   heuristic (skips lines that look like declarations). Each field carries
   `{field, value, confidence, bbox, sourceImageIndex}`.

## Multi-image merging

`mergeMultiImageOcr()` merges fields across up to 5 photos: highest-confidence
non-rejected entry wins; every entry keeps its provenance (which image, where
on it) so inspectors can verify against the evidence overlay in the UI.

## Human-in-the-loop

The Scanner UI lets officers correct any extracted value; corrections set
`humanVerified: true` (trusted at full confidence downstream) and are recorded
in `humanCorrections[]` + audit log. Rejected fields are dropped by
`sanitizeDeclarations`.

## Configuration

```env
OCR_PROVIDER=tesseract        # tesseract | demo | remote
REMOTE_OCR_URL=               # e.g. http://localhost:8100/ocr/process
```

Upload limits (enforced by Multer memory storage): max 5 images per request,
image MIME types only, 10 MB each.

## Testing

Pure parsers are covered by unit tests:

```bash
cd server && npm test          # includes ocrParsing.unit.test.js
```

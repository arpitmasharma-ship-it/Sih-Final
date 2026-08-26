# Architecture

LMCC (Legal Metrology Compliance Intelligence) is a MERN monorepo with an
optional Python OCR micro-service.

```
┌─────────────┐   HTTP (cookies)    ┌──────────────────┐
│  client/     │ ──────────────────▶ │  server/ (Node)  │
│  React+Vite  │ ◀────────────────── │  Express + Mongoose
│  Redux, TW   │                     │                  │
└─────────────┘                      │  ┌──────────────┐│        ┌───────────────┐
                                     │  │ OCR facade   ││──────▶ │ ocr-service/  │
                                     │  │ providers:   ││ HTTP   │ FastAPI       │
                                     │  │ tesseract    ││        │ PaddleOCR     │
                                     │  │ demo         ││        └───────────────┘
                                     │  │ remote ──────┼───────────┐
                                     │  └──────────────┘            ▼
                                     │  compliance engine      Cloudinary / local disk
                                     │  (pure functions)       uploads & report PDFs
                                     └────────┬─────────┘
                                              ▼
                                          MongoDB
```

## Monorepo layout

| Path | Purpose |
|---|---|
| `client/` | React 18 SPA. Vite dev server on :5173, Tailwind, Redux Toolkit, Recharts. |
| `server/` | Express API on :5000. JWT in httpOnly cookie (`lmcc_token`). |
| `ocr-service/` | Optional FastAPI service implementing the remote OCR contract. |

## Backend layering

```
routes/index.js          ← REST surface, RBAC guards, ObjectId param validation
controllers/*            ← thin HTTP adapters (validate → service → envelope)
services/*               ← business logic; all Mongo access lives here
services/compliance/     ← deterministic rule engine + validators + seed rules
services/ocr/            ← preprocess → provider → fieldExtractor pipeline
models/*                 ← Mongoose schemas (User, Product, Inspection, …)
middleware/*             ← auth, upload, validation, rate limiting, errors
```

### Request lifecycle (scan flow)

1. `POST /api/scan/ocr` — Multer buffers images → `uploadImage()` stores them
   (Cloudinary or local `/uploads`) → Jimp preprocessing → provider OCR →
   `fieldExtractor.js` parses declaration fields with confidence + bbox →
   `OcrResult` persisted → merged declarations returned.
2. Inspector corrects values in the UI (`humanVerified: true`, corrections
   recorded).
3. `POST /api/compliance/check` — pure evaluation preview, nothing stored.
4. `POST /api/inspections` — sanitized declarations re-evaluated server-side,
   Product upserted, Inspection created (`LMC-INS-YYYY-XXXXX`), notifications +
   audit logs written.
5. `POST /api/reports {inspectionId}` — idempotent PDFKit report with SHA-256
   content checksum printed inside the document and stored on the Report.

## Compliance engine

Pure and deterministic (`evaluateCompliance(rules, declarations, ocrMeta)`):
same inputs ⇒ same outputs, so verdicts are reproducible for appeals.
Rules live in MongoDB (`ComplianceRule`) with a 60s in-memory cache; 14 seeded
rules cite LMPC Rules 2011 sections. Three rules are **advisory** — they emit
warnings but never flip the final status. Low OCR confidence produces a
readability warning that routes to REQUIRES_REVIEW instead of inventing legal
certainty from a bad photo.

## Security model

- Session: signed JWT (8h) in `httpOnly; SameSite=Lax` cookie (prod: `None; Secure`).
- RBAC middleware per route: ADMIN > INSPECTOR > ANALYST; public registration forced ANALYST.
- express-validator chains + central error handler (no stack traces in prod).
- Rate limits: auth 30/15min, general API 600/15min; uploads type/size capped.
- Audit log on every security-relevant action (login, scans, reviews, rule edits).

## Storage

`storage.service.js` abstracts persistence: Cloudinary when configured, else
local disk under `server/uploads` served at `/uploads`. Swapping S3 means
implementing one function (`uploadImage`).

## Frontend architecture

- Feature-sliced pages under `src/pages/<domain>`; shared kit under `src/components/ui`.
- State: Redux Toolkit slices (`auth`, `ui`, `notifications`); server data fetched ad hoc via axios with friendly error mapping.
- Router guards: `ProtectedRoute` (session), `RoleRoute` (RBAC mirror of backend rules), `GuestRoute`.
- Theme: class-based dark mode persisted to localStorage (`lmcc_theme`).

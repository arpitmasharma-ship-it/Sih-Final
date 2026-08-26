# Legal Metrology Packaged Commodity Compliance Intelligence Platform

SIH 2026 — Full-stack MERN platform that scans packaged-commodity labels, extracts mandatory
declarations via OCR, validates them against the **Legal Metrology (Packaged Commodities)
Rules, 2011** with an explainable deterministic rule engine, and produces evidence-backed
inspections, analytics and PDF reports for enforcement officials.

> This is a compliance-**assistance** system. Final legal determination always rests with the
> competent authority. Checks that cannot be verified from an image return
> `REQUIRES_MANUAL_VERIFICATION` instead of a false PASS/FAIL.

## Quick start (local)

```bash
# 1. Install everything (root + server + client)
npm run setup

# 2. Configure environment
copy server\.env.example server\.env      # Windows
# cp server/.env.example server/.env     # macOS/Linux
copy client\.env.example client\.env

# 3. Start MongoDB locally OR put an Atlas URI into server/.env (MONGODB_URI)

# 4. Seed demo data (users, 13 official LMPC rules, demo products A/B/C, inspections)
npm run seed

# 5. Run backend + frontend together
npm run dev
```

| App     | URL                          |
|---------|------------------------------|
| Frontend| http://localhost:5173        |
| Backend | http://localhost:5000/api    |

### Demo credentials (created by seed)

| Role      | Email                  | Password    |
|-----------|------------------------|-------------|
| ADMIN     | admin@lmcc.gov.in      | Admin@1234  |
| INSPECTOR | inspector@lmcc.gov.in  | Insp@1234   |
| ANALYST   | analyst@lmcc.gov.in    | Anal@1234   |

### Demo mode (no external OCR needed)

On the Scanner page toggle **Demo Mode** and pick a scenario:

- `COMPLIANT` – fully declared label → COMPLIANT
- `NON_COMPLIANT` – missing MRP / invalid net-quantity unit / no consumer-care → NON_COMPLIANT
- `LOW_QUALITY_IMAGE` – low-confidence OCR → readability warnings, REQUIRES_REVIEW

Real OCR uses Tesseract.js (first run downloads `eng.traineddata`, needs internet once).
Set `OCR_PROVIDER=remote` to use the bundled Python/PaddleOCR microservice (see `ocr-service/`),
or plug Google Vision / Azure / AWS Textract by implementing one provider file.

Full documentation: [ARCHITECTURE.md](ARCHITECTURE.md) · [API.md](API.md) ·
[COMPLIANCE_ENGINE.md](COMPLIANCE_ENGINE.md) · [OCR.md](OCR.md) · [DEPLOYMENT.md](DEPLOYMENT.md)

## Feature map

Auth (JWT httpOnly cookie, bcrypt hashing, RBAC) · Scanner (multi-image, drag&drop, camera,
rotate/crop/zoom) · Image preprocessing · OCR with confidence+bbox per field · Human review
(`human_verified:true`) · Explainable rule engine (rule codes, evidence, guidance) · Violations
with severity & explainability · Compliance scores · Products/Inspections repositories · Global
search · Analytics + district heat-map API · PDF report with checksum & disclaimer · Rule
management with history · User management · Audit logs · Notifications · Dark/light mode ·
Responsive UI.

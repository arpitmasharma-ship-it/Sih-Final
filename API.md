# API Reference

Base URL: `http://localhost:5000/api`
Auth: JWT httpOnly cookie `lmcc_token` (set by login/register). All routes below
require a valid session unless noted.

Envelope: `{ success, message?, data, pagination? }` — errors return
`{ success: false, message }` with proper status codes.

## Auth — `/auth` (public)

| Method | Path | Body | Notes |
|---|| POST | `---|---|---|
/register` | name, email, password, state?, district? | Role forced to ANALYST |
| POST | `/login` | email, password | Rate limited 30/15min |
| POST | `/logout` | – | Clears cookie |
| GET | `/current-user` | – | Session probe used on app boot |

## Users — `/users`

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/me` | any | Profile |
| PUT | `/me` | any | name, phone, department, state, district |
| GET | `/` | ADMIN | q, role, isActive, page, limit |
| POST | `/` | ADMIN | Provision officers (any role) |
| PUT | `/:id` | ADMIN | role / isActive / profile fields |
| POST | `/:id/reset-password` | ADMIN | { newPassword ≥8 } |
| DELETE | `/:id` | ADMIN | Soft-delete/deactivate |

## Scan flow

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/scan/ocr` | ADMIN, INSPECTOR | multipart `images[]` (≤5, image/*), optional `labels` JSON array, optional demo `variant`. Uploads + OCR + field extraction. Returns `{images[], ocrPerImage[], declarations{}, ocrMeta}` |
| POST | `/compliance/check` | any | `{declarations, ocrMeta}` → full engine result preview (nothing persisted) |
| POST | `/scan/complete` | ADMIN, INSPECTOR | Persist Product + Inspection. Same body as `/inspections` |

### Declaration entry shape

```json
"MRP": {
  "value": "Rs 499",
  "confidence": 0.93,
  "humanVerified": false,
  "bbox": {"x":12,"y":40,"width":180,"height":22},
  "sourceImage": "/uploads/…",
  "sourceImageIndex": 0
}
```

## Inspections

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/` | any | filters: status, district, inspectorId, productId, from, to, q (LMC-INS ref), page/limit |
| GET | `/:id` | any | Full record incl. complianceChecks, violations, warnings, declarations snapshot |
| POST | `/` | ADMIN, INSPECTOR | `{productName, brandName?, category?, barcode?, images[{url,publicId,label,provider}], declarations, humanCorrections[], location{state,district,addressLabel}, inspectorNotes, ocrResultIds[]}` |
| PUT | `/:id/review` | ADMIN, INSPECTOR | `{decision ∈ COMPLIANT\|NON_COMPLIANT\|REQUIRES_REVIEW\|PASS_AFTER_REVIEW\|VIOLATION_CONFIRMED, remarks}` — updates violation statuses and product status |
| PUT | `/:id/notes` | ADMIN, INSPECTOR | `{inspectorNotes}` |

## Reports

| Method | Path | Notes |
|---|---|---|
| POST | `/` | `{inspectionId}` → idempotent PDF generation (`LMC-RPT-XXXXXX`) |
| GET | `/` | List; q, status, page/limit |
| GET | `/:idOrRef` | Metadata incl. checksumSha256 |
| GET | `/:id/pdf` | Download (local disk or redirect to Cloudinary) |
| GET | `/:id/export.json` | Machine-readable export with disclaimer |

## Products

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/` | any | q, status, category, page/limit |
| GET | `/:id` | any | Product + latest declarations snapshot |
| POST | `/` | ADMIN, INSPECTOR | Manual metadata-only creation |
| PUT | `/:id` | ADMIN, INSPECTOR | Update metadata |
| DELETE | `/:id` | ADMIN | Remove |

## Rules

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/` | any | enabled, category, q |
| POST | `/rules/sync` | ADMIN | Re-sync built-in LMPC seed rules |
| POST | `/` | ADMIN | Custom rule (validationType PRESENCE/PATTERN, severity, advisory flag) |
| PUT | `/:id` | ADMIN | Versioned edit; changeSummary required by service |
| DELETE | `/:id` | ADMIN | Disable-by-removal |

## Dashboard

| Path | Notes |
|---|---|
| `/dashboard/summary` | KPI counts, compliance %, avg score |
| `/dashboard/trends?months=6..24` | Monthly inspections/violations/compliance rate |
| `/dashboard/violations` | Severity/category splits + most-common rules |
| `/dashboard/districts` | Heatmap rows: inspections, violations, violationRate, avgScore |
| `/dashboard/inspectors` | ADMIN leaderboard |
| `/dashboard/system` | ADMIN counters |

## Misc

| Path | Roles | Notes |
|---|---|---|
| GET `/search?q&status&severity&category&district&from&to` | any | Cross-entity search |
| GET `/notifications`, PATCH `/notifications/read` | any | Bell feed |
| GET `/audit-logs`, `/audit-logs/actions` | ADMIN | Immutable trail |
| GET `/health` | public | On API root (outside `/api`) |

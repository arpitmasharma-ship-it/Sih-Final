# Compliance Engine

`server/services/compliance/` implements a deterministic, explainable rule
engine for the Legal Metrology (Packaged Commodities) Rules, 2011.

## Design principles

1. **Pure function.** `evaluateCompliance(rules, declarations, ocrMeta)` has no
   I/O; identical inputs produce identical verdicts — essential when a trader
   challenges a finding.
2. **Rules are data, not code paths.** Each rule row carries
   `validationType + params`, executed by a matching validator in
   `validators/index.js`. Adding a rule = adding a DB row.
3. **Explainability first.** Every check returns *whatWasExpected*,
   *whatWasFound*, *legalReference*, and *remediationHint*.
4. **Honesty about uncertainty.** Advisory rules and low OCR confidence never
   fabricate legal conclusions (see Status policy).

## Inputs

- `rules`: active `ComplianceRule` docs (Mongo, 60s cache).
- `declarations`: `{ [FIELD_KEY]: { value, confidence, humanVerified, bbox,
  sourceImageIndex } }`. Rejected / "NOT DETECTED" entries are stripped by
  `sanitizeDeclarations` before evaluation; human-verified fields are trusted at
  confidence ≥ 1.
- `ocrMeta`: `{ meanConfidence, blurScore, contrastScore, simulated }`.

## Seeded rules (`rulesSeed.js`)

| Rule code | Check | Severity | Notes |
|---|---|---|---|
| LM-PC-MFR-001 | Manufacturer / packer / importer name & address | HIGH | Rule 6(1)(a); validator MANUFACTURER |
| LM-PC-COMM-001 | Common/generic name of commodity | HIGH | Rule 6(1)(b) |
| LM-PC-NETQTY-001 | Net quantity declared in prescribed units | CRITICAL | Rule 6(1)(c), Rule 9 units |
| LM-PC-MRP-001 | MRP declared (tax-inclusive wording per 2017 amendment) | CRITICAL | v1.1.0 |
| LM-PC-DATE-001 | Month & year of manufacture/pre-packing/import | HIGH | Rule 6(1)(d) |
| LM-PC-COO-001 | Country of origin (imported packages) | HIGH | importedOnly applicability |
| LM-PC-IMP-001 | Importer name & address (imported packages) | HIGH | importedOnly applicability |
| LM-PC-CC-001 | Consumer-care declaration | HIGH | w.e.f. 01-01-2018 amendment |
| LM-PC-FONT-001 | Numeral/letter height vs display panel (advisory) | LOW | Rule 9 table; needs calibration → manual verification |
| LM-PC-RDBL-001 | Readability inferred from OCR quality signals | MEDIUM | drives REQUIRES_REVIEW on bad photos |
| LM-PC-PLCE-001 | Placement on principal display panel (advisory) | LOW | cannot be judged from arbitrary photos |
| LM-PC-FMT-002 | Numeral formatting sanity (assistive heuristic) | MEDIUM | non-statutory platform check |
| LM-PC-MISL-001 | Potentially misleading claims scan (advisory) | LOW | never auto-fails |

Three rules are `advisory: true` — they surface warnings only.

## Scoring

```
mandatoryDeclarations = % of required declarations present & parseable
readability           = f(mean OCR confidence, blur, contrast)
dataCompleteness      = weighted presence across all tracked fields
overall               = weighted blend, clamped 0..100
```

## Status policy

```
violations > 0                      → NON_COMPLIANT
blocking warnings (non-advisory) or manualVerificationRequired → REQUIRES_REVIEW
overall < 60                        → REQUIRES_REVIEW
otherwise                           → COMPLIANT
```

Human review can later override via `PUT /inspections/:id/review`
(PASS_AFTER_REVIEW ⇒ violations DISMISSED, product back to COMPLIANT;
VIOLATION_CONFIRMED ⇒ violations CONFIRMED).

## Font-size & placement honesty

Without calibrated camera geometry, exact character-height measurement is not
possible from arbitrary photos. These validators therefore either (a) run with
calibration context when supplied (packageWidthMm, dpi) or (b) return
`manualVerificationRequired` warnings that route to REQUIRES_REVIEW instead of
asserting a violation.

## Versioning

Rule edits create history entries (`version`, changeSummary, snapshot). The
engine stamps results with its own `engineVersion` so stored inspections remain
interpretable even as the rulebook evolves.

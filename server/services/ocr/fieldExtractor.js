/**
 * Pure declaration-field extraction from OCR output.
 * No DB / no I/O - fully unit-testable.
 *
 * Input : { lines: [{text, confidence, bbox}], rawText }
 * Output: [{ field, value, confidence, bbox, status, sourceImageIndex }]
 */
const { FIELDS } = require('../../constants');

const STRONG = 1.0;
const MEDIUM = 0.9;

// ---------- low level parsers (exported for tests) ----------

function cleanText(t = '') {
  return String(t).replace(/\s+/g, ' ').trim();
}

function parseNumber(s = '') {
  const m = s.replace(/[₹]/g, '').match(/([0-9][0-9,]*(?:\.[0-9]+)?)/);
  if (!m) return null;
  return m[1].replace(/,/g, '');
}

// "MRP ₹499", "MRP Rs. 199/-", "Maximum Retail Price Rs. 499.00", "₹199.00"
function parseMRP(text) {
  const t = cleanText(text);
  // Pattern 1: MRP / M.R.P / Max Retail Price keyword + amount
  const re1 =
    /\b(?:m\.?\s?r\.?\s?p\.?|max(?:imum)?\s*retail\s*price)\b[^\d₹]{0,15}(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*\/?\s*(?:incl.*)?/i;
  let m = t.match(re1);
  // Pattern 2: standalone ₹ or Rs amount (fallback)
  if (!m) {
    m = t.match(/(?:^|[^\w])(?:₹|rs\.?\s?|inr\s?)([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*\/?\s*(?:incl.*)?/i);
  }
  if (!m) return null;
  const num = m[1] ? parseNumber(m[1]) : null;
  if (!num) return null;
  return {
    value: `Rs ${num}`,
    numericValue: parseFloat(num),
    hasCurrencySymbol: /₹|rs|inr/i.test(t),
    inclusiveOfAllTaxes: /incl(?:usive)?\s*of\s*all\s*taxes/i.test(t),
  };
}

// "Net Qty 500 g", "Net Wt. : 1 kg", "NET QUANTITY 750 ml"
const NETQTY_UNITS = [
  'kg', 'g', 'gm', 'grams', 'gram', 'gms', 'mg',
  'l', 'ltr', 'litre', 'litres', 'liter', 'liters', 'ml', 'cl',
  'm', 'cm', 'mm', 'metre', 'meter',
  'nos', 'no', 'pcs', 'pc', 'units', 'unit', 'pieces',
];

function canonicalUnit(u) {
  u = u.toLowerCase();
  if (['gm', 'gms', 'gram', 'grams'].includes(u)) return 'g';
  if (['ltr', 'litre', 'litres', 'liter', 'liters'].includes(u)) return 'l';
  if (['pcs', 'pc', 'pieces'].includes(u)) return 'pcs';
  if (['no', 'nos'].includes(u)) return 'units';
  return u;
}

function parseNetQuantity(text) {
  const t = cleanText(text);
  const unitAlt = NETQTY_UNITS.join('|');
  // Pattern 1: labeled — "Net Qty 500 g", "Quantity: 200g", "Contents 250 ml"
  const re1 = new RegExp(
    `\\b(?:net|qty\\.?|quantity|contents?|wt\\.?|weight)[^.0-9]{0,15}([0-9]+(?:\\.[0-9]+)?)\\s*(${unitAlt})\\b`,
    'i'
  );
  let m = t.match(re1);
  // Pattern 2: bare — "200 g", "500 ml", "1 kg"
  if (!m) {
    m = t.match(new RegExp(`\\b([0-9]+(?:\\.[0-9]+)?)\\s*(${unitAlt})\\b`, 'i'));
  }
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unit = canonicalUnit(m[2]);
  return { value: `${m[1]} ${unit}`, numericValue: value, unit };
}

// Dates: "Mfg: 03/2025", "Mfd. Mar 2025", "Packed on 12/08/25", "Manufactured 12-08-2025", "15 MAR 2026"
function parseLabeledDate(text, labels) {
  const t = cleanText(text);
  const labelAlt = labels.join('|');
  const datePattern =
    `((?:[0-3]?[0-9][\\/\\-.][01]?[0-9][\\/\\-.][0-9]{2,4})` +
    `|(?:[01]?[0-9]\\s*[A-Za-z]{3,9}\\s*[0-9]{2,4})` +
    `|(?:[A-Za-z]{3,9}\\s*[,\\-]?\s*[0-9]{2,4})` +
    `|(?:[01]?[0-9][\\/][0-9]{2,4}))`;
  const re = new RegExp(`\\b(?:${labelAlt})\\b[^A-Za-z0-9]{0,14}(?:on|date)?[:.\\-]?\\s*(?:e\\.&\\.o\\.e\\.)?\\s*${datePattern}`, 'i');
  const m = t.match(re);
  if (!m) return null;
  return { value: cleanText(m[1]), matchedLabel: m[0] };
}

const MFG_LABELS = ['mfg', 'mfged', 'mfd', 'manufactured', 'manufacture', 'manf', 'mnp'];
const PACK_LABELS = ['packed', 'pkd', 'pkg', 'pre-packed', 'prepack', 'packing'];
const IMPORT_LABELS = ['imported', 'imp'];
const BESTBEFORE_LABELS = ['best before', 'use by', 'exp', 'expiry', 'expire', 'use-before'];

function parseBestBefore(text) {
  const t = cleanText(text);
  // Pattern 1: date format — "Best before: 12/2025"
  const dateResult = parseLabeledDate(text, BESTBEFORE_LABELS);
  if (dateResult) return dateResult;
  // Pattern 2: relative text — "9 months from packaging", "12 months from mfg"
  const re = /\b(?:best\s*before|use\s*by|exp(?:iry)?)\s*[:.\-]?\s*(.+)/i;
  const m = t.match(re);
  if (m && /\b(?:month|year|day|week)s?\b/i.test(m[1])) {
    return { value: cleanText(m[1]), matchedLabel: m[0] };
  }
  return null;
}

function parseBatchNumber(text) {
  const t = cleanText(text);
  const m = t.match(/\b(?:batch|lot|bch)\s*(?:no\.?|#|number)?\s*[:.\-]?\s*([A-Za-z0-9][\w\-]{1,30})/i);
  return m ? { value: cleanText(m[1]) } : null;
}

function parseManufacturerLine(text) {
  const t = cleanText(text);
  if (/\b(?:date|month|year|batch|best before|use by|expir)/i.test(t)) return null;
  const m = t.match(
    /\b(?:mfd\.?|mfg\.?|mfged|manufactured|mktd|marketed)\s*(?:by|for)?\s*[:.\-]?\s*(.{3,90})/i
  );
  return m ? { name: cleanText(m[1]) } : null;
}

function parsePackerLine(text) {
  const m = cleanText(text).match(
    /\b(?:pkd\.?|packed|pkr|packer)\s*(?:by)?\s*[:.\-]?\s*(.{3,90})/i
  );
  return m && !/pre[- ]?pack/i.test(m[0])
    ? { name: cleanText(m[1]) }
    : null;
}

function parseImporterLine(text) {
  const m = cleanText(text).match(
    /\b(?:imported|importer)\s*(?:by)?\s*[:.\-]?\s*(.{3,90})/i
  );
  return m ? { name: cleanText(m[1]) } : null;
}

function parseCountryOfOrigin(text) {
  const m = cleanText(text).match(
    /\b(?:country\s*of\s*origin|made\s*in)\s*[:.\-]?\s*([A-Za-z][A-Za-z ]{2,28})/i
  );
  return m ? { value: cleanText(m[1]).replace(/\s*(address|tel|phone).*$/i, '') } : null;
}

const PHONE_RE =
  /((?:\+91[\-\s]?)?[6-9][0-9]{4}[\s\-]?[0-9]{5}|1[89]00[\s\-]?[0-9]{3}[\s\-]?[0-9]{3,4}|(?:\+?0?[0-9]{2,4}[\-\s]?)[0-9]{6,8}|18[0-9]{2}[0-9]{6,8})/;

function parseConsumerCarePhone(text) {
  const t = cleanText(text);
  // prefer lines mentioning care/toll-free/helpline
  const careRe =
    /\b(?:customer|consumer)\s*care\b[^0-9+]{0,60}?([\d+\-\s()]{8,20})/i;
  let m = t.match(careRe);
  if (m) {
    const phone = (m[1].match(PHONE_RE) || [])[0];
    if (phone) return { value: cleanText(phone), context: 'care' };
  }
  if (/toll\s*free|helpline/i.test(t)) {
    m = t.match(PHONE_RE);
    if (m) return { value: cleanText(m[0]), context: 'tollfree' };
  }
  return null;
}

function parseEmail(text) {
  const m = cleanText(text).match(
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
  );
  return m ? { value: m[0].toLowerCase() } : null;
}

// ---------- line-level extraction engine ----------

function buildJoinedLines(lines) {
  const joined = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    if (cur.text && cur.text.trim().length <= 30 && i + 1 < lines.length) {
      const next = lines[i + 1];
      if (next.text && next.text.trim()) {
        joined.push({
          text: `${cur.text.trim()} ${next.text.trim()}`,
          confidence: Math.min(cur.confidence || 0.7, next.confidence || 0.7),
          bbox: cur.bbox,
          _joined: true,
        });
      }
    }
    joined.push(cur);
  }
  return joined;
}

function extractFieldsFromLines(lines, imageMeta = {}) {
  const fields = [];
  const seen = new Map(); // field -> best entry so far

  const push = (field, value, confidence, bbox, extra = {}) => {
    if (!value || !String(value).trim()) return;
    const entry = {
      field,
      value: String(value).trim(),
      confidence: Math.round(confidence * 1000) / 1000,
      bbox,
      status: 'DETECTED',
      sourceImage: imageMeta.imageUrl,
      sourceImageIndex: imageMeta.imageIndex,
      ...extra,
    };
    const prev = seen.get(field);
    if (!prev || entry.confidence > prev.confidence) seen.set(field, entry);
  };

  const allLines = [...lines, ...buildJoinedLines(lines)];

  allLines.forEach((line) => {
    const text = line.text || '';
    if (!cleanText(text)) return;
    const conf = typeof line.confidence === 'number' ? line.confidence : 0.8;
    const bbox = line.bbox || null;

    const mrp = parseMRP(text);
    if (mrp)
      push(FIELDS.MRP, mrp.value, Math.min(0.99, conf * STRONG), bbox, {
        meta: { hasCurrencySymbol: mrp.hasCurrencySymbol },
      });
    if (mrp?.inclusiveOfAllTaxes) push(FIELDS.INCLUSIVE_OF_ALL_TAXES, 'YES', conf * STRONG, bbox);
    // Independent inclusive-of-taxes detection (not just MRP side-effect)
    if (!seen.has(FIELDS.INCLUSIVE_OF_ALL_TAXES) && /incl(?:usive)?\s*of\s*all\s*taxes/i.test(text)) {
      push(FIELDS.INCLUSIVE_OF_ALL_TAXES, 'YES', conf * STRONG, bbox);
    }

    const nq = parseNetQuantity(text);
    if (nq) push(FIELDS.NET_QUANTITY, nq.value, Math.min(0.99, conf * STRONG), bbox);

    const mfgDate = parseLabeledDate(text, MFG_LABELS);
    if (mfgDate) push(FIELDS.MFG_DATE, mfgDate.value, Math.min(0.99, conf * STRONG), bbox);

    const packDate = parseLabeledDate(text, PACK_LABELS);
    if (packDate) push(FIELDS.PACK_DATE, packDate.value, Math.min(0.99, conf * STRONG), bbox);

    const impDate = parseLabeledDate(text, IMPORT_LABELS);
    if (impDate) push(FIELDS.IMPORT_DATE, impDate.value, Math.min(0.99, conf * STRONG), bbox);

    const bbDate = parseBestBefore(text);
    if (bbDate) push(FIELDS.BEST_BEFORE, bbDate.value, Math.min(0.99, conf * MEDIUM), bbox);

    const batch = parseBatchNumber(text);
    if (batch) push(FIELDS.BATCH_NUMBER, batch.value, Math.min(0.95, conf * MEDIUM), bbox);

    const manu = parseManufacturerLine(text);
    if (manu) push(FIELDS.MANUFACTURER_NAME, manu.name.replace(/[,;]\s*$/, ''), Math.min(0.97, conf * MEDIUM), bbox);

    const packer = parsePackerLine(text);
    if (packer) push(FIELDS.PACKER_NAME, packer.name.replace(/[,;]\s*$/, ''), Math.min(0.97, conf * MEDIUM), bbox);

    const importer = parseImporterLine(text);
    if (importer) push(FIELDS.IMPORTER_NAME, importer.name.replace(/[,;]\s*$/, ''), Math.min(0.97, conf * MEDIUM), bbox);

    const coo = parseCountryOfOrigin(text);
    if (coo) push(FIELDS.COUNTRY_OF_ORIGIN, coo.value, Math.min(0.97, conf * STRONG), bbox);

    const phone = parseConsumerCarePhone(text);
    if (phone) push(FIELDS.CONSUMER_CARE_PHONE, phone.value, Math.min(0.97, conf * MEDIUM), bbox);

    const email = parseEmail(text);
    if (email) push(FIELDS.CONSUMER_CARE_EMAIL, email.value, Math.min(0.97, conf * MEDIUM), bbox);

    // Address heuristics: line following a manufacturer/packer/importer line containing pincode cues
    if (/\b\d{6}\b/.test(cleanText(text)) && text.length > 10) {
      const lineIdx = lines.indexOf(line);
      const prevText = lineIdx > 0 ? cleanText(lines[lineIdx - 1]?.text || '') : '';
      if (parseManufacturerLine(prevText) || /\bmfd\b|\bmfg\b/i.test(prevText)) {
        push(FIELDS.MANUFACTURER_ADDRESS, cleanText(text), 0.8, bbox);
      } else if (parsePackerLine(prevText) || /\bpacked\b|\bpkd\b/i.test(prevText)) {
        push(FIELDS.PACKER_ADDRESS, cleanText(text), 0.8, bbox);
      } else if (!seen.has(FIELDS.MANUFACTURER_ADDRESS)) {
        push(FIELDS.MANUFACTURER_ADDRESS, cleanText(text), 0.6, bbox);
      }
    }
  });

  // Attach addresses: a pincode-bearing line right after the name line
  allLines.forEach((line, idx) => {
    const cur = cleanText(line.text);
    if (/\b\d{6}\b/.test(cur) && cur.length > 8) {
      const prev = idx > 0 ? cleanText(lines[idx - 1]?.text || '') : '';
      if (prev) {
        const isManu = parseManufacturerLine(prev);
        const isPack = parsePackerLine(prev);
        const isImp = parseImporterLine(prev);
        const targetField = isImp
          ? FIELDS.IMPORTER_ADDRESS
          : isPack
          ? FIELDS.PACKER_ADDRESS
          : isManu
          ? FIELDS.MANUFACTURER_ADDRESS
          : null;
        if (targetField && !seen.has(targetField)) {
          seen.set(targetField, {
            field: targetField,
            value: cur,
            confidence: Math.min(0.9, (line.confidence || 0.7) * MEDIUM),
            bbox: line.bbox || null,
            status: 'DETECTED',
            sourceImage: imageMeta.imageUrl,
            sourceImageIndex: imageMeta.imageIndex,
          });
        }
      }
    }
  });

  // Product name heuristic: prefer early short-to-medium lines that are not declarations
  const DECLARATIONISH =
    /(m\.?\s?r\.?\s?p|mrp|max.*retail|net\s*(wt|qty)|mfg|mfd|packed|imported|made in|country\s*of\s*origin|customer care|consumer care|toll free|www\.|@|\d{6}|incl.*tax|batch|lot|licence|lic no|fssai|best before|use by)/i;
  const candidates = allLines
    .map((l, i) => ({ l, i }))
    .filter(
      ({ l }) =>
        cleanText(l.text) &&
        cleanText(l.text).length >= 4 &&
        cleanText(l.text).length <= 80 &&
        !DECLARATIONISH.test(l.text) &&
        (l.confidence ?? 0) > 0.5
    )
    .slice(0, 8)
    .sort((a, b) => a.i - b.i);
  if (candidates.length) {
    const best = candidates[0];
    seen.set(FIELDS.PRODUCT_NAME, {
      field: FIELDS.PRODUCT_NAME,
      value: cleanText(best.l.text),
      confidence: Math.round(Math.min(0.75, (best.l.confidence || 0.6) * 0.85) * 1000) / 1000,
      bbox: best.l.bbox || null,
      status: 'DETECTED',
      sourceImage: imageMeta.imageUrl,
      sourceImageIndex: imageMeta.imageIndex,
    });
  }

  // Brand name: explicit "Brand:" label or short line before product name
  if (!seen.has(FIELDS.BRAND_NAME)) {
    const brandLine = allLines.find((l) => /\bbrand\s*(?:name)?\s*[:.\-]?\s*\S/i.test(l.text));
    if (brandLine) {
      const bm = cleanText(brandLine.text).match(/brand\s*(?:name)?\s*[:.\-]?\s*(.{2,40})/i);
      if (bm) push(FIELDS.BRAND_NAME, bm[1], 0.85, brandLine.bbox);
    } else if (seen.has(FIELDS.PRODUCT_NAME)) {
      const prodBbox = seen.get(FIELDS.PRODUCT_NAME).bbox;
      if (prodBbox) {
        const prevLine = allLines.find((l) => l.bbox && l.bbox.y < prodBbox.y && cleanText(l.text).length >= 2 && cleanText(l.text).length <= 30 && !DECLARATIONISH.test(l.text));
        if (prevLine) push(FIELDS.BRAND_NAME, cleanText(prevLine.text), 0.7, prevLine.bbox);
      }
    }
  }

  for (const [, v] of seen) fields.push(v);

  // Sort top-to-bottom for stable UI ordering
  fields.sort((a, b) => (a.bbox?.y ?? 99999) - (b.bbox?.y ?? 99999));
  return fields;
}

module.exports = {
  extractFieldsFromLines,
  parseMRP,
  parseNetQuantity,
  parseLabeledDate,
  parseBestBefore,
  parseBatchNumber,
  parseManufacturerLine,
  parsePackerLine,
  parseImporterLine,
  parseCountryOfOrigin,
  parseConsumerCarePhone,
  parseEmail,
  canonicalUnit,
  cleanText,
};

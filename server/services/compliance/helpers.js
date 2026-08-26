const { FIELDS } = require('../../constants');

function getEntry(declarations, key) {
  return declarations && declarations[key] ? declarations[key] : null;
}

function getVal(declarations, key) {
  const e = getEntry(declarations, key);
  if (!e) return '';
  if (typeof e.value === 'string') return e.value.trim();
  if (e.value === true) return 'YES';
  return String(e.value ?? '').trim();
}

function hasAnyValue(declarations, keys) {
  return keys.some((k) => {
    const v = getVal(declarations, k);
    // NOT_DETECTED placeholders count as empty
    return v && v.toUpperCase() !== 'NOT DETECTED';
  });
}

function firstAvailableFieldKey(declarations, keys) {
  return keys.find((k) => {
    const v = getVal(declarations, k);
    return v && v.toUpperCase() !== 'NOT DETECTED';
  });
}

function confidenceOf(declarations, key, fallback = 0.9) {
  const e = getEntry(declarations, key);
  if (!e || typeof e.confidence !== 'number') return fallback;
  // Human-verified fields are trusted fully
  return e.humanVerified ? 1 : e.confidence;
}

// Determine whether package appears imported based on available evidence
function detectImported(declarations) {
  const importer = getVal(declarations, FIELDS.IMPORTER_NAME);
  const origin = getVal(declarations, FIELDS.COUNTRY_OF_ORIGIN);
  if (importer) return { imported: true, basis: 'Importer declared' };
  if (origin && !/india/i.test(origin)) return { imported: true, basis: `Origin: ${origin}` };
  if (/india/i.test(origin)) return { imported: false, basis: 'Origin India' };
  return { imported: null, basis: 'Cannot be determined from image' };
}

module.exports = { getEntry, getVal, hasAnyValue, firstAvailableFieldKey, confidenceOf, detectImported };

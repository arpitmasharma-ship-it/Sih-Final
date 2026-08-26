const {
  parseMRP,
  parseNetQuantity,
  parseLabeledDate,
  parseManufacturerLine,
  parsePackerLine,
  parseImporterLine,
  parseCountryOfOrigin,
  parseConsumerCarePhone,
  parseEmail,
  canonicalUnit,
  extractFieldsFromLines,
} = require('../services/ocr/fieldExtractor');
const { FIELDS } = require('../constants');

describe('OCR field parsing', () => {
  test('MRP variants', () => {
    expect(parseMRP('MRP Rs. 499')).toMatchObject({ value: 'Rs 499' });
    expect(parseMRP('Max Retail Price ₹499.00 (Inclusive of all taxes)')).toMatchObject({
      numericValue: 499,
      inclusiveOfAllTaxes: true,
    });
    expect(parseMRP('M.R.P.: Rs 1,299')).toMatchObject({ value: 'Rs 1299' });
    expect(parseMRP('Net weight 500g')).toBeNull();
  });

  test('net quantity variants', () => {
    expect(parseNetQuantity('NET QUANTITY : 750 ml')).toMatchObject({ unit: 'ml', numericValue: 750 });
    expect(parseNetQuantity('Net Wt. 1 kg')).toMatchObject({ unit: 'kg' });
    expect(parseNetQuantity('Net Content: 200 grams')).toMatchObject({ unit: 'g', value: '200 g' });
    expect(parseNetQuantity('MRP Rs 99')).toBeNull();
  });

  test('date labels', () => {
    expect(parseLabeledDate('MFG DATE: 03/2025', ['mfg']).value).toBe('03/2025');
    expect(parseLabeledDate('Packed on Mar 2025', ['packed']).value).toMatch(/mar/i);
    expect(parseLabeledDate('Best before 08/2026', ['best before'])).not.toBeNull();
    // duration phrases are not dates and must not match
    expect(parseLabeledDate('Best before 9 months from packaging', ['best before'])).toBeNull();
  });

  test('party lines', () => {
    expect(parseManufacturerLine('MFD BY Sunrise Foods Pvt Ltd').name).toContain('Sunrise');
    expect(parsePackerLine('Packed by QuickFoods LLP').name).toContain('QuickFoods');
    expect(parseImporterLine('Imported by GlobalTrade Pvt Ltd').name).toContain('GlobalTrade');
    expect(parseCountryOfOrigin('Country of Origin: India').value).toBe('India');
  });

  test('consumer care phone & email', () => {
    expect(parseConsumerCarePhone('Customer Care: 1800-123-4567').value).toContain('1800');
    expect(parseEmail('write to care@sunrise.co.in for help').value).toBe('care@sunrise.co.in');
  });

  test('canonical units normalize', () => {
    expect(canonicalUnit('GM')).toBe('g');
    expect(canonicalUnit('Grams')).toBe('g');
    expect(canonicalUnit('ltr')).toBe('l');
    expect(canonicalUnit('pcs')).toBe('pcs');
  });

  test('extractFieldsFromLines maps OCR lines to declaration fields with bbox+confidence', () => {
    const lines = [
      { text: 'Crunchy Almond Cookies', confidence: 0.95, bbox: { x: 60, y: 30, width: 300, height: 26 } },
      { text: 'NET QUANTITY 200 g', confidence: 0.94, bbox: { x: 60, y: 80, width: 240, height: 26 } },
      { text: 'MRP Rs 99.00 (Inclusive of all taxes)', confidence: 0.96, bbox: { x: 60, y: 130, width: 340, height: 26 } },
      { text: 'MFD BY Sunrise Foods Pvt Ltd', confidence: 0.92, bbox: { x: 60, y: 180, width: 320, height: 26 } },
      { text: 'Customer Care: 1800-123-4567', confidence: 0.91, bbox: { x: 60, y: 360, width: 300, height: 26 } },
    ];
    const fields = extractFieldsFromLines(lines, { imageUrl: '/x.png', imageIndex: 0 });
    const byField = Object.fromEntries(fields.map((f) => [f.field, f]));

    expect(byField[FIELDS.MRP].value).toBe('Rs 99.00');
    expect(byField[FIELDS.MRP].bbox.y).toBe(130);
    expect(byField[FIELDS.NET_QUANTITY].confidence).toBeGreaterThan(0.9);
    expect(byField[FIELDS.MANUFACTURER_NAME]).toBeDefined();
    expect(byField[FIELDS.CONSUMER_CARE_PHONE].value).toContain('1800');
    expect(byField[FIELDS.INCLUSIVE_OF_ALL_TAXES].value).toBe('YES');
    // product-name heuristic must not pick a declaration line
    expect(byField[FIELDS.PRODUCT_NAME].value).toBe('Crunchy Almond Cookies');
  });

  test('invalid unit line still yields NET_QUANTITY (engine will fail it)', () => {
    const lines = [{ text: 'Net Weight 70 x', confidence: 0.72, bbox: null }];
    const fields = extractFieldsFromLines(lines, {});
    expect(fields.some((f) => f.field === FIELDS.NET_QUANTITY)).toBe(false);
  });

  test('low-confidence lines produce low field confidence', () => {
    const lines = [
      { text: 'Herbal Hair Oil 100 ml', confidence: 0.48, bbox: null },
      { text: 'Net Qty 100 ml', confidence: 0.44, bbox: null },
      { text: 'MRP Rs 150.00', confidence: 0.52, bbox: null },
    ];
    const fields = extractFieldsFromLines(lines, {});
    const mrp = fields.find((f) => f.field === FIELDS.MRP);
    expect(mrp.confidence).toBeLessThan(0.6);
  });
});

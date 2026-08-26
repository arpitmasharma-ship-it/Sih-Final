/**
 * Demo OCR provider - deterministic simulated OCR output for presentations
 * and offline demos. Clearly flagged with `simulated: true` everywhere it is used.
 * NEVER presented as real OCR output.
 *
 * Variants: COMPLIANT | NON_COMPLIANT | LOW_QUALITY
 */

function line(text, confidence, y, height = 26) {
  return { text, confidence, bbox: { x: 60, y, width: Math.max(120, text.length * 11), height } };
}

const SCENARIOS = {
  COMPLIANT: {
    width: 900,
    height: 640,
    lines: [
      line('Crunchy Almond Cookies', 0.95, 30),
      line('NET QUANTITY 200 g', 0.94, 80),
      line('MRP Rs 99.00 (Inclusive of all taxes)', 0.96, 130),
      line('MFD BY Sunrise Foods Pvt Ltd', 0.92, 180),
      line('Plot 42, Industrial Area Phase 2, Noida, UP - 201305', 0.88, 215),
      line('MFG DATE: 03/2025', 0.93, 270),
      line('BEST BEFORE: 9 months from packaging', 0.85, 310),
      line('Customer Care: 1800-123-4567', 0.91, 360),
      line('care@sunrisefoods.example', 0.9, 395),
      line('BATCH NO: CF-2025-0312', 0.87, 445),
      line('Country of Origin: India', 0.93, 495),
      line('Lic No: 10012345678901', 0.86, 535),
    ],
  },
  NON_COMPLIANT: {
    width: 900,
    height: 600,
    // Missing MRP entirely; invalid net-quantity unit; no consumer care; no mfg date
    lines: [
      line('Instant Masala Noodles', 0.94, 30),
      line('Net Weight 70 x', 0.72, 85), // invalid unit "x"
      line('Packed by QuickFoods LLP', 0.9, 140),
      line('Survey No. 18, Hosur Road, Bengaluru - 560095', 0.84, 175),
      line('Store in a cool dry place', 0.89, 230),
      line('Batch No: QF-1188', 0.88, 275),
      line('Made in India', 0.92, 325),
    ],
  },
  LOW_QUALITY: {
    width: 800,
    height: 520,
    lines: [
      line('Herbal Hair Oil 100 ml', 0.48, 25),
      line('MRP Rs 150.00', 0.52, 75),
      line('Mfd by GreenCare Ltd', 0.41, 125),
      line('Net Qty 100 ml', 0.44, 170),
      line('Customer care 1800-000-111', 0.38, 220),
    ],
  },
};

async function recognize({ variant = 'COMPLIANT' } = {}) {
  const scenario = SCENARIOS[variant] || SCENARIOS.COMPLIANT;
  return {
    provider: 'demo-simulation',
    simulated: true,
    rawText: scenario.lines.map((l) => l.text).join('\n'),
    lines: scenario.lines,
    imageMeta: {
      width: scenario.width,
      height: scenario.height,
      preprocessed: true,
      blurScore: variant === 'LOW_QUALITY' ? 12 : 46,
      contrastScore: variant === 'LOW_QUALITY' ? 14 : 58,
    },
  };
}

module.exports = { recognize, SCENARIOS };

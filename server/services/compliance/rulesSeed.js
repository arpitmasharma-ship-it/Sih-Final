/**
 * Compliance rule repository seed.
 *
 * SOURCE OF TRUTH: Legal Metrology (Packaged Commodities) Rules, 2011,
 * Ministry of Consumer Affairs / Department of Consumer Affairs, Govt. of India.
 * https://consumeraffairs.nic.in / legalmetrology.dca.gov.in
 *
 * IMPORTANT: Only requirements that are well-established in the Rules are encoded.
 * Sub-rule citations are kept at the level published in official consolidated text;
 * each rule stores its sourceReference + effectiveDate + version so inspectors can
 * trace every automated decision back to the legal provision.
 * Checks that cannot be verified from an image intentionally return
 * REQUIRES MANUAL VERIFICATION instead of PASS/FAIL (see validators).
 */

const EFFECTIVE = new Date('2011-04-01');
const AMEND_NOTE =
  'Encoded from consolidated public text incl. subsequent amendments (2017, 2021, 2022). Verify against the latest official consolidation before enforcement action.';
const SOURCE =
  'Legal Metrology (Packaged Commodities) Rules, 2011 - Dept. of Consumer Affairs, Ministry of Consumer Affairs, Food & Public Distribution, GoI';

module.exports = [
  {
    ruleCode: 'LM-PC-MFR-001',
    title: 'Name & address of manufacturer / packer / importer',
    description:
      'Every retail package shall bear the name and address of either the manufacturer, or the packer, or the importer (as applicable to the case).',
    category: 'MANUFACTURER_INFO',
    requiredFields: ['MANUFACTURER_NAME', 'PACKER_NAME', 'IMPORTER_NAME'],
    validationType: 'MANUFACTURER',
    severity: 'HIGH',
    sourceReference: `${SOURCE} - Rule 6(1)(a)`,
    sourceUrl: 'https://legalmetrology.dca.gov.in',
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-COMM-001',
    title: 'Common or generic name of the commodity',
    description:
      'The common or generic name of the commodity contained in the package and, where applicable, its trade name/description shall be declared.',
    category: 'MANDATORY_DECLARATION',
    requiredFields: ['COMMODITY_IDENTITY', 'PRODUCT_NAME'],
    validationType: 'MANDATORY_FIELD',
    severity: 'HIGH',
    sourceReference: `${SOURCE} - Rule 6(1)(b)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-NETQTY-001',
    title: 'Net quantity declaration',
    description:
      'The net quantity of the commodity must be declared in prescribed units (weight, volume, length, or number) on every retail package.',
    category: 'NET_QUANTITY',
    requiredFields: ['NET_QUANTITY'],
    validationType: 'NET_QUANTITY',
    severity: 'CRITICAL',
    sourceReference: `${SOURCE} - Rule 6(1)(c)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-MRP-001',
    title: 'Retail sale price (MRP) declaration',
    description:
      'The retail sale price (MRP) inclusive of all taxes must be declared on every retail package.',
    category: 'MRP',
    requiredFields: ['MRP'],
    validationType: 'MRP',
    severity: 'CRITICAL',
    sourceReference: `${SOURCE} - Rule 6(1) (retail sale price; tax-inclusive wording per 2017 amendment)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.1.0',
  },
  {
    ruleCode: 'LM-PC-DATE-001',
    title: 'Month & year of manufacture / pre-packing',
    description:
      'The month and year of manufacture or pre-packing shall be declared on the package (day-month-year for perishables where specified).',
    category: 'DATE_DECLARATIONS',
    requiredFields: ['MFG_DATE', 'PACK_DATE', 'IMPORT_DATE'],
    validationType: 'DATE',
    severity: 'HIGH',
    sourceReference: `${SOURCE} - Rule 6(1)(d)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-COO-001',
    title: 'Country of origin (imported packages)',
    description:
      'Every package imported into India shall declare the country of origin/manufacture.',
    category: 'COUNTRY_OF_ORIGIN',
    requiredFields: ['COUNTRY_OF_ORIGIN'],
    validationType: 'COUNTRY_OF_ORIGIN',
    severity: 'HIGH',
    applicableTo: { importedOnly: true, notes: 'Applies only to imported packages' },
    sourceReference: `${SOURCE} - Rule 6 (declarations on imported packages)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-IMP-001',
    title: 'Importer name & address (imported packages)',
    description:
      'Imported packages shall bear the name and address of the importer in India along with origin declaration.',
    category: 'IMPORTER_INFO',
    requiredFields: ['IMPORTER_NAME'],
    validationType: 'IMPORTER',
    severity: 'HIGH',
    applicableTo: { importedOnly: true, notes: 'Applies only to imported packages' },
    sourceReference: `${SOURCE} - Rule 6 (imported packages)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-CC-001',
    title: 'Consumer-care declaration',
    description:
      'Packages shall carry consumer-care details (postal/e-mail/telephone) for receiving consumer complaints.',
    category: 'CONSUMER_CARE',
    requiredFields: ['CONSUMER_CARE_PHONE', 'CONSUMER_CARE_EMAIL', 'CUSTOMER_CARE_DETAILS', 'CONSUMER_CARE_ADDRESS'],
    validationType: 'CONSUMER_CARE',
    severity: 'HIGH',
    sourceReference: `${SOURCE} - Rule 6 (as amended w.e.f. 01-01-2018, consumer-care declaration)`,
    effectiveDate: new Date('2018-01-01'),
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-FONT-001',
    advisory: true,
    title: 'Size of letters & numerals (net quantity)',
    description:
      'Height of numerals/letters for net quantity depends on the area of principal display panel (size table). Physical measurement requires calibrated inspection.',
    category: 'FONT_SIZE',
    requiredFields: [],
    validationType: 'FONT_SIZE',
    severity: 'LOW',
    params: { minHeightMm: 1 },
    sourceReference: `${SOURCE} - Rule 9 (manner of declaration; numeral-height table)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-RDBL-001',
    title: 'Readability of declarations',
    description:
      'Declarations must be printed/written legibly and prominently so as to be easily readable. Automated readability is inferred from OCR quality signals only.',
    category: 'READABILITY',
    requiredFields: [],
    validationType: 'READABILITY',
    severity: 'MEDIUM',
    sourceReference: `${SOURCE} - Rule 9 (manner of declaration: legibility/prominence)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-PLCE-001',
    advisory: true,
    title: 'Placement/location of declarations',
    description:
      'Declarations are required to appear on the principal display panel or as otherwise prescribed. Placement cannot be judged from arbitrary photographs.',
    category: 'PLACEMENT',
    requiredFields: [],
    validationType: 'PLACEMENT',
    severity: 'LOW',
    sourceReference: `${SOURCE} - Rule 9 (location/manner of declaration)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: AMEND_NOTE,
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-FMT-002',
    title: 'Numeral formatting sanity',
    description:
      'Numeric declarations should be free of ambiguous formatting artifacts detectable in extraction (digit runs, separators, date-format confusion).',
    category: 'FORMATTING',
    requiredFields: [],
    validationType: 'FORMATTING',
    severity: 'MEDIUM',
    sourceReference: `Platform assistive check derived from ${SOURCE} - Rule 6(1) clarity requirements`,
    effectiveDate: EFFECTIVE,
    amendmentNote: 'Assistive formatting check (non-statutory heuristic).',
    version: '1.0.0',
  },
  {
    ruleCode: 'LM-PC-MISL-001',
    advisory: true,
    title: 'Potentially misleading claims scan',
    description:
      'Assistive scan flagging superlative/substantiation-dependent claims ("No.1", "cures", unlicensed ISI-mark style claims) for human review.',
    category: 'MISLEADING_DECLARATIONS',
    requiredFields: [],
    validationType: 'MISLEADING_CLAIMS',
    severity: 'LOW',
    sourceReference: `${SOURCE} - Rule 6(2) (no false/misleading declarations to a material degree)`,
    effectiveDate: EFFECTIVE,
    amendmentNote: 'Assistive informational check; legality depends on context. Never auto-FAILs.',
    version: '1.0.0',
  },
];

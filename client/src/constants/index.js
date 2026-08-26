export const FIELD_GROUPS = [
  {
    group: 'Identity',
    fields: [
      { key: 'PRODUCT_NAME', label: 'Product Name' },
      { key: 'BRAND_NAME', label: 'Brand Name' },
      { key: 'COMMODITY_IDENTITY', label: 'Commodity Identity' },
    ],
  },
  {
    group: 'Quantity & Price',
    fields: [
      { key: 'NET_QUANTITY', label: 'Net Quantity', placeholder: 'e.g. 500 g' },
      { key: 'MRP', label: 'MRP (Retail Sale Price)', placeholder: 'e.g. Rs 499' },
      { key: 'INCLUSIVE_OF_ALL_TAXES', label: 'Inclusive of All Taxes?', placeholder: 'YES / NO' },
    ],
  },
  {
    group: 'Responsible Party',
    fields: [
      { key: 'MANUFACTURER_NAME', label: 'Manufacturer Name' },
      { key: 'MANUFACTURER_ADDRESS', label: 'Manufacturer Address' },
      { key: 'PACKER_NAME', label: 'Packer Name' },
      { key: 'PACKER_ADDRESS', label: 'Packer Address' },
      { key: 'IMPORTER_NAME', label: 'Importer Name' },
      { key: 'IMPORTER_ADDRESS', label: 'Importer Address' },
      { key: 'COUNTRY_OF_ORIGIN', label: 'Country of Origin' },
    ],
  },
  {
    group: 'Dates',
    fields: [
      { key: 'MFG_DATE', label: 'Manufacturing Date', placeholder: 'e.g. 03/2025' },
      { key: 'PACK_DATE', label: 'Packing Date', placeholder: 'e.g. Mar 2025' },
      { key: 'IMPORT_DATE', label: 'Import Date' },
      { key: 'BEST_BEFORE', label: 'Best Before / Expiry' },
    ],
  },
  {
    group: 'Consumer Care',
    fields: [
      { key: 'CONSUMER_CARE_PHONE', label: 'Consumer Care Phone' },
      { key: 'CONSUMER_CARE_EMAIL', label: 'Consumer Care Email' },
      { key: 'CONSUMER_CARE_ADDRESS', label: 'Consumer Care Address' },
      { key: 'CUSTOMER_CARE_DETAILS', label: 'Customer Care Block (free text)' },
    ],
  },
  {
    group: 'Other',
    fields: [
      { key: 'BATCH_NUMBER', label: 'Batch / Lot Number' },
    ],
  },
];

export const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

export const FIELD_LABEL = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f.label]));

export const STATUS_META = {
  COMPLIANT: { label: 'Compliant', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', dot: '#10b981' },
  NON_COMPLIANT: { label: 'Non-Compliant', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: '#ef4444' },
  REQUIRES_REVIEW: { label: 'Requires Review', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', dot: '#f59e0b' },
  PASS_AFTER_REVIEW: { label: 'Passed after review', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', dot: '#10b981' },
  VIOLATION_CONFIRMED: { label: 'Violation confirmed', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: '#ef4444' },
};

export const SEVERITY_META = {
  CRITICAL: { label: 'Critical', cls: 'bg-red-700 text-white', bar: '#b91c1c' },
  HIGH: { label: 'High', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', bar: '#ef4444' },
  MEDIUM: { label: 'Medium', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', bar: '#f59e0b' },
  LOW: { label: 'Low', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', bar: '#94a3b8' },
};

export const CATEGORIES = [
  'FOOD', 'BEVERAGE', 'PERSONAL_CARE', 'HOUSEHOLD',
  'PHARMA_OTC', 'AGRI_INPUTS', 'ELECTRONICS', 'OTHER',
];

export const IMAGE_LABELS = [
  'FRONT_PACKAGE', 'BACK_PACKAGE', 'SIDE_IMAGE', 'LABEL_CLOSEUP', 'LISTING_SCREENSHOT', 'BARCODE_QR',
];

export const DEMO_SCENARIOS = [
  { value: 'COMPLIANT', label: 'Product A — Compliant label' },
  { value: 'NON_COMPLIANT', label: 'Product B — Violations present' },
  { value: 'LOW_QUALITY', label: 'Product C — Low-quality photo' },
];

export const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

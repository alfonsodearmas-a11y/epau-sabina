// Archetype A: years (or date serials) across header row, indicators as rows.
// Per-sheet configs are 0-indexed absolute row/col positions in the sheet.
// NOTE: most sheets in this workbook have col 0 empty and use col 1 for the label,
// so labelCol: 1 is the default. Always verify against the debug probe before shipping.
import type { ArchetypeAConfig } from '../lib/runners';

const SKIP_SUBHEADERS = [
  /^public debt in us\$m$/i,
  /^table\s/i,
  /^year$/i,
  /^$/,
];

export const ARCHETYPE_A: ArchetypeAConfig[] = [
  {
    sheet: 'Global Growth', archetype: 'A',
    category: 'external', source: 'IMF WEO', unit: 'percent', frequency: 'annual',
    idPrefix: 'global_growth', subcategory: 'Global growth',
    headerRow: 3, labelCol: 1, dataStartRow: 5,
  },
  {
    sheet: 'GDP Growth by Sector', archetype: 'A',
    category: 'real_economy', source: 'Bureau of Statistics', unit: 'percent', frequency: 'annual',
    idPrefix: 'gdp_growth_sector', subcategory: 'Real GDP growth by sector',
    headerRow: 4, labelCol: 1, dataStartRow: 6,
  },
  {
    sheet: 'Nominal GDP by Sector', archetype: 'A',
    category: 'real_economy', source: 'Bureau of Statistics', unit: 'G$ millions', frequency: 'annual',
    idPrefix: 'gdp_nominal_sector', subcategory: 'Nominal GDP by sector',
    headerRow: 4, labelCol: 1, dataStartRow: 6,
  },
  {
    sheet: 'Oil Trajectory', archetype: 'A',
    category: 'real_economy', source: 'IMF WEO', unit: 'varies', frequency: 'annual',
    idPrefix: 'oil_trajectory', subcategory: 'Oil projections',
    headerRow: 3, labelCol: 1, unitCol: 2, dataStartRow: 5,
  },
  {
    sheet: 'FDI 2', archetype: 'A',
    category: 'external', source: 'ECLAC', unit: 'US$ millions', frequency: 'annual',
    idPrefix: 'fdi2', subcategory: 'FDI inflows by country',
    headerRow: 6, labelCol: 1, dataStartRow: 7,
  },
  {
    sheet: 'Inflation_Contribution', archetype: 'A',
    category: 'prices', source: 'Bureau of Statistics', unit: 'index', frequency: 'annual',
    idPrefix: 'inflation_contrib', subcategory: 'Inflation contribution',
    headerRow: 3, labelCol: 1, dataStartRow: 4,
  },
  {
    sheet: 'Global Inflation', archetype: 'A',
    category: 'external', source: 'IMF WEO', unit: 'percent', frequency: 'annual',
    idPrefix: 'global_inflation', subcategory: 'End-of-period inflation',
    headerRow: 4, labelCol: 1, dataStartRow: 5,
  },
  {
    sheet: 'Central Gov Ops', archetype: 'A',
    category: 'fiscal', source: 'MoF FMD', unit: 'G$ millions', frequency: 'annual',
    idPrefix: 'cgo', subcategory: 'Central government operations',
    headerRow: 3, labelCol: 1, dataStartRow: 5, skipLabelPatterns: SKIP_SUBHEADERS,
  },
  {
    sheet: 'Sector Share', archetype: 'A',
    category: 'fiscal', source: 'MoF FMD', unit: 'G$ millions', frequency: 'annual',
    idPrefix: 'sector_share', subcategory: 'Sector share of government expenditure',
    headerRow: 4, labelCol: 1, dataStartRow: 5,
  },
  {
    sheet: 'Sector Expenditure', archetype: 'A',
    category: 'fiscal', source: 'MoF FMD', unit: 'G$ millions', frequency: 'annual',
    idPrefix: 'sector_expenditure', subcategory: 'Government expenditure by sector',
    headerRow: 4, labelCol: 1, dataStartRow: 6,
  },
  {
    sheet: 'Wage Bill', archetype: 'A',
    category: 'fiscal', source: 'MoF PCMD', unit: 'G$ millions', frequency: 'annual',
    idPrefix: 'wage_bill', subcategory: 'Public sector wage bill',
    headerRow: 4, labelCol: 1, dataStartRow: 6,
  },
  {
    sheet: 'Debt', archetype: 'A',
    category: 'debt', source: 'MoF DMD', unit: 'varies', frequency: 'annual',
    idPrefix: 'debt', subcategory: 'Public debt',
    headerRow: 3, labelCol: 1, dataStartRow: 5, skipLabelPatterns: SKIP_SUBHEADERS,
  },
  {
    sheet: 'External Financing', archetype: 'A',
    category: 'debt', source: 'MoF DMD', unit: 'G$ millions', frequency: 'annual',
    idPrefix: 'external_financing', subcategory: 'Bilateral and multilateral financing',
    headerRow: 3, labelCol: 1, dataStartRow: 4,
  },
  {
    sheet: 'Debt by Type', archetype: 'A',
    category: 'debt', source: 'MoF DMD', unit: 'US$ millions', frequency: 'annual',
    idPrefix: 'debt_by_type', subcategory: 'Public debt by type',
    headerRow: 3, labelCol: 1, dataStartRow: 5,
  },
  {
    sheet: 'Vehicle Registration', archetype: 'A',
    category: 'social', source: 'Guyana Revenue Authority', unit: 'count', frequency: 'annual',
    idPrefix: 'vehicle_reg', subcategory: 'Vehicles registered by type',
    headerRow: 5, labelCol: 1, dataStartRow: 6,
  },
  {
    sheet: 'Debt-to-GDP', archetype: 'A',
    category: 'debt', source: 'IMF WEO', unit: 'percent', frequency: 'annual',
    idPrefix: 'debt_to_gdp', subcategory: 'Debt-to-GDP: Western Hemisphere',
    headerRow: 3, labelCol: 1, dataStartRow: 4,
  },
  // A-date: date serials in header row, quarterly or monthly
  {
    sheet: 'NPL', archetype: 'A-date',
    category: 'monetary', source: 'Bank of Guyana', unit: 'percent', frequency: 'quarterly',
    idPrefix: 'npl', subcategory: 'Commercial banks asset quality',
    headerRow: 5, labelCol: 1, dataStartRow: 7,
  },
  {
    sheet: 'CPI_Key Food_Breakouts', archetype: 'A-date',
    category: 'prices', source: 'Bureau of Statistics', unit: 'index', frequency: 'monthly',
    idPrefix: 'cpi_food_item', subcategory: 'CPI food items',
    headerRow: 3, labelCol: 1, dataStartRow: 5,
  },
];

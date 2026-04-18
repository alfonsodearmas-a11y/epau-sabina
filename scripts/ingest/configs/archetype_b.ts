// Archetype B: years in a dedicated date column, indicators as header-row cells.
import type { ArchetypeBConfig } from '../lib/runners';

export const ARCHETYPE_B: ArchetypeBConfig[] = [
  {
    sheet: 'GDP', archetype: 'B',
    category: 'real_economy', source: 'Bureau of Statistics', unit: 'G$ millions', frequency: 'annual',
    idPrefix: 'gdp', subcategory: 'Historical GDP',
    headerRow: 5, yearCol: 1, dataStartRow: 7, labelCols: [3, 4, 5, 6, 7, 8],
  },
  {
    sheet: 'Production', archetype: 'B',
    category: 'real_economy', source: 'Bureau of Statistics', unit: 'varies', frequency: 'annual',
    idPrefix: 'production', subcategory: 'Key commodity production',
    headerRow: 4, yearCol: 1, dataStartRow: 5, labelCols: [2, 3, 4, 5, 6, 7, 8],
  },
  {
    sheet: 'Exports', archetype: 'B',
    category: 'external', source: 'Bank of Guyana', unit: 'US$ millions', frequency: 'annual',
    idPrefix: 'exports', subcategory: 'Export earnings by commodity',
    headerRow: 5, yearCol: 1, dataStartRow: 7, labelCols: [2, 3, 4, 5, 6, 7, 8, 9],
  },
  {
    sheet: 'Inflation_Historical', archetype: 'B',
    category: 'prices', source: 'Bureau of Statistics', unit: 'percent', frequency: 'annual',
    idPrefix: 'inflation_hist', subcategory: 'Historical inflation',
    headerRow: 4, yearCol: 1, dataStartRow: 5, labelCols: [2, 3],
  },
  {
    sheet: 'Private Sector Credit', archetype: 'B',
    category: 'monetary', source: 'Bank of Guyana', unit: 'G$ millions', frequency: 'annual',
    idPrefix: 'psc', subcategory: 'Private sector credit',
    headerRow: 3, yearCol: 1, dataStartRow: 4, labelCols: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    sheet: 'Debt Service to Revenue', archetype: 'B',
    category: 'debt', source: 'MoF DMD', unit: 'varies', frequency: 'annual',
    idPrefix: 'debt_service', subcategory: 'Debt service metrics',
    headerRow: 3, yearCol: 1, dataStartRow: 4, labelCols: [2, 3, 4, 5, 6, 7, 8],
  },
  {
    sheet: 'Exchange Rate', archetype: 'B',
    category: 'external', source: 'Bank of Guyana', unit: 'G$ per US$', frequency: 'annual',
    idPrefix: 'fx', subcategory: 'Exchange rate',
    headerRow: 4, yearCol: 1, dataStartRow: 5, labelCols: [2, 3],
  },
  {
    sheet: 'Minimum Wage', archetype: 'B',
    category: 'social', source: 'MoF PCMD', unit: 'varies', frequency: 'annual',
    idPrefix: 'min_wage', subcategory: 'Public sector minimum wage',
    headerRow: 4, yearCol: 1, dataStartRow: 5, labelCols: [2, 3],
  },
  {
    sheet: 'OAP and Pub Assistance', archetype: 'B',
    category: 'social', source: 'Ministry of Human Services', unit: 'varies', frequency: 'annual',
    idPrefix: 'oap_pubassist', subcategory: 'Pensions and public assistance',
    headerRow: 4, yearCol: 1, dataStartRow: 5, labelCols: [2, 3, 4, 5],
  },
  {
    sheet: 'Water', archetype: 'B',
    category: 'social', source: 'Guyana Water Inc.', unit: 'varies', frequency: 'annual',
    idPrefix: 'water', subcategory: 'Water services',
    headerRow: 5, yearCol: 1, dataStartRow: 6, labelCols: [2, 3, 4, 5, 6],
  },
  {
    sheet: 'Health_Physicians', archetype: 'B',
    category: 'social', source: 'Budget Speech Appendix I', unit: 'per 10,000 population', frequency: 'annual',
    idPrefix: 'health', subcategory: 'Physicians per capita',
    headerRow: 4, yearCol: 1, dataStartRow: 5, labelCols: [2],
  },
];

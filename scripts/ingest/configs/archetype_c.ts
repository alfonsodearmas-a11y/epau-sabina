// Archetype C: sub-annual (monthly or quarterly), dates (or Excel serials) in a dateCol.
import type { ArchetypeCConfig } from '../lib/runners';

export const ARCHETYPE_C: ArchetypeCConfig[] = [
  {
    sheet: 'Merchandise Trade', archetype: 'C',
    category: 'external', source: 'Bank of Guyana', unit: 'US$ millions', frequency: 'monthly',
    idPrefix: 'mtrade', subcategory: 'Merchandise trade monthly',
    headerRow: 3, dateCol: 1, dataStartRow: 4, labelCols: [2, 3, 4, 5],
  },
  {
    // Employment mixes "August 2020" with "End-YYYY" annual snapshots; treat the
    // whole sheet as annual (MoF's own convention) so every row ingests.
    sheet: 'Employment', archetype: 'C',
    category: 'social', source: 'Sectoral reports', unit: 'count', frequency: 'annual',
    idPrefix: 'employment', subcategory: 'Employment by sector',
    headerRow: 4, dateCol: 1, dataStartRow: 5, labelCols: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    sheet: '2023 Price Indices', archetype: 'C',
    category: 'prices', source: 'IMF / Bureau of Statistics', unit: 'index', frequency: 'monthly',
    idPrefix: 'price_idx_2023', subcategory: 'Food and crude oil price indices',
    headerRow: 3, dateCol: 1, dataStartRow: 4, labelCols: [2, 3, 4, 5, 6],
  },
  {
    sheet: 'Price of Pumpkin', archetype: 'C',
    category: 'prices', source: 'Bureau of Statistics', unit: 'G$/lb', frequency: 'monthly',
    idPrefix: 'pumpkin', subcategory: 'Pumpkin retail prices by market',
    headerRow: 3, dateCol: 2, dataStartRow: 5, labelCols: [3, 4, 5, 6],
  },
  {
    sheet: 'NIS Contributors', archetype: 'C',
    category: 'social', source: 'National Insurance Scheme', unit: 'count', frequency: 'monthly',
    idPrefix: 'nis', subcategory: 'NIS contributor counts',
    headerRow: 3, dateCol: 1, dataStartRow: 4, labelCols: [2, 3, 4],
  },
];

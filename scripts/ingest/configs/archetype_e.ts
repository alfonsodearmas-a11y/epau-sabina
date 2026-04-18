// Archetype E: multi-block hybrid sheets. Run through the generic multi-block scanner
// unless the sheet warrants a bespoke adapter (see scripts/ingest/adapters/).
import type { MultiBlockConfig } from '../lib/multiblock';

export const ARCHETYPE_E: MultiBlockConfig[] = [
  // BOP, Mortgages_CB, Capital Expenditure_Sector, and Prices_Summary have bespoke
  // adapters — see scripts/ingest/adapters/. They are NOT run by the multi-block
  // runner; the config below covers the remaining E sheets only.
  {
    sheet: 'Current Transfers', category: 'external', source: 'Bank of Guyana',
    unit: 'US$ millions', frequency: 'annual', idPrefix: 'current_transfers',
    subcategory: 'Current transfers and remittances', labelCol: 1, minHeaderYears: 3,
  },
  {
    sheet: 'FDI', category: 'external', source: 'Bank of Guyana',
    unit: 'US$ millions', frequency: 'annual', idPrefix: 'fdi',
    subcategory: 'FDI by source country', labelCol: 1, minHeaderYears: 3,
  },
  {
    sheet: 'Private Sector Credit 2', category: 'monetary', source: 'Bank of Guyana',
    unit: 'G$ millions', frequency: 'annual', idPrefix: 'psc2',
    subcategory: 'Private sector credit — historical breakdown', labelCol: 1, minHeaderYears: 3,
  },
  {
    sheet: 'GOG Measures', category: 'fiscal', source: 'MoF FMD',
    unit: 'G$ thousands', frequency: 'annual', idPrefix: 'gog_measures',
    subcategory: 'Government fiscal measures', labelCol: 1, minHeaderYears: 2,
  },
  {
    sheet: 'Vehicle Imports', category: 'social', source: 'Guyana Revenue Authority',
    unit: 'varies', frequency: 'annual', idPrefix: 'vehicle_imports',
    subcategory: 'Vehicle imports by type', labelCol: 1, minHeaderYears: 2,
  },
  {
    sheet: 'Housing', category: 'social', source: 'Central Housing and Planning Authority',
    unit: 'count', frequency: 'annual', idPrefix: 'housing',
    subcategory: 'Housing allocations', labelCol: 1, minHeaderYears: 2,
  },
];

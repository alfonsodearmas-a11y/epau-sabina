// Archetype G: oddball singletons. Each lands as a comparison_table snapshot unless
// a bespoke indicator fit is obvious. Public Service is multi-table training stats;
// Discoveries and Oil Reserves Rank are static reference lists.
import type { ComparisonConfig } from '../lib/comparisons';

export const ARCHETYPE_G: ComparisonConfig[] = [
  { sheet: 'Discoveries', id: 'reference_discoveries', name: 'Stabroek Block — Discovery Catalogue',
    category: 'external', source: 'Ministry of Natural Resources',
    description: 'Block, discovery number, discovery name, date of notice of discovery.',
    labelCol: 2 /* use "Discovery" column as row label */ },
  { sheet: 'Oil Reserves Rank', id: 'reference_oil_reserves_rank', name: 'Oil Reserves — Latin America & Caribbean Ranking',
    category: 'external', source: 'Ministry of Natural Resources',
    description: 'Oil reserves by country (ranked snapshot).' },
  { sheet: 'Public Service', id: 'reference_public_service_training', name: 'Ministry of Public Service — Training Statistics',
    category: 'social', source: 'Ministry of Public Service',
    description: 'Public servants trained yearly by gender and department.' },
];

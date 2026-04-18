// Archetype F: political / Measures_* tabs. Each one lands as a comparison_table.
import type { ComparisonConfig } from '../lib/comparisons';

export const ARCHETYPE_F: ComparisonConfig[] = [
  { sheet: 'Measures_MIR', id: 'measures_mir', name: 'Mortgage Interest Relief (MIR): Beneficiaries & Refunds',
    category: 'social', source: 'MoF PCMD', description: 'MIR beneficiaries and refunds paid by year.' },
  { sheet: 'Measures_GOAL', id: 'measures_goal', name: 'GOAL Scholarships Awarded by Region',
    category: 'social', source: 'MoF PCMD', description: 'GOAL scholarships awarded by region and year.' },
  { sheet: 'Measures_BWC', id: 'measures_bwc', name: 'Because We Care (BWC) Cash Grant',
    category: 'social', source: 'MoF PCMD', description: 'BWC grant, uniform voucher, transport grant, and beneficiaries.' },
  { sheet: 'Measures_Cost of Living', id: 'measures_cost_of_living', name: 'Cost of Living Measures',
    category: 'social', source: 'MoF PCMD', description: 'Cost of Living allocation releases (two blocks, 2022 and 2023).' },
  { sheet: 'Measures_APNU Losses', id: 'measures_apnu_losses', name: 'APNU — Losses from Eliminated Measures',
    category: 'social', source: 'MoF PCMD', description: 'Aggregate student losses from eliminated cash grant, 2015 to 2019.' },
  { sheet: 'Measures_Low Income Ceiling', id: 'measures_low_income_ceiling', name: 'Low Income Mortgage Ceiling',
    category: 'monetary', source: 'MoF PCMD', description: 'Low income mortgage ceiling at commercial banks.' },
  { sheet: 'Measures_Medical Insurance', id: 'measures_medical_insurance', name: 'Life and Medical Insurance Refunds',
    category: 'social', source: 'MoF PCMD', description: 'Medical insurance beneficiaries and ceilings.' },
  { sheet: 'Measures_Tax Threshold', id: 'measures_tax_threshold', name: 'Income Tax Threshold Adjustments',
    category: 'fiscal', source: 'MoF FMD', description: 'Monthly income tax threshold and annual disposable income impact.' },
  { sheet: 'APNU_Fuel Prices', id: 'measures_apnu_fuel_prices', name: 'Impact of APNU Fuel-Tax Policy on Gasoline and Diesel',
    category: 'prices', source: 'Guyana Revenue Authority', description: 'Monthly Brent crude and fuel excise tax under prior administration.' },
];

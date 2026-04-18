// Shared axis styling for Recharts, ported byte-for-byte from
// docs/design/workbench.jsx.

export const axisProps = {
  tick: { fill: '#8A8778', fontSize: 11, fontFamily: 'Outfit' },
  axisLine: { stroke: 'rgba(255,255,255,0.08)' },
  tickLine: { stroke: 'rgba(255,255,255,0.06)' },
} as const;

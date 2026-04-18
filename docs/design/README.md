# Design source of truth

The EPAU Analyst Workbench visual design was produced as a working React prototype in a separate Claude design session. This directory is the vendored copy we port from.

## Canonical source — port from these

Modular React components (use `React.useState` etc via `const { useState } = React`, tagged for `window.Recharts`). When porting to Next.js:

- `app.jsx` — top-level shell: nav, command palette, route switch, bottom status
- `workbench.jsx` — the hero surface; three states (empty / running / results)
- `surfaces.jsx` — `Catalog`, `SavedViews`, `Comparisons`, `Admin`
- `ui.jsx` — shared primitives (buttons, pills, glassmorphic panels, slide-out)
- `data.jsx` — illustrative mock data tied to the real workbook's series; **replace with live API data when wiring UI**, but preserve indicator ids and shapes where possible

## Reference — do not port from, but consult when a JSX detail is ambiguous

- `reference/EPAU_Workbench_v2.html` — rendered prototype (current)
- `reference/EPAU_Workbench_v1.html` — prior rendered prototype
- `reference/app.combined.jsx` — bundled single-file build used by the HTML prototypes
- `reference/*.png` — visual ground truth screenshots (`final.png`, `v2.png`, `v2b.png`, `debug*.png`)

## Porting rules

1. Preserve the palette, typography, and component styling byte-for-byte where possible.
2. Replace mocked data with real API calls, keep render/style logic.
3. Do not redesign. If something looks wrong, flag it in the root README under "Design decisions flagged for review."
4. Structural conflicts with real data (chart type can't render real shape, metadata too long for the mocked layout) must be raised before adapting.

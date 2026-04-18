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

- `reference/EPAU_Workbench_v1.html` — **authoritative rendered prototype**, matches the JSX modules and the screenshots (dark navy + gold)
- `reference/app.combined.jsx` — bundled single-file build of the JSX modules
- `reference/final.png`, `reference/v2.png`, `reference/v2b.png`, `reference/debug*.png` — visual ground truth (dark theme)
- `reference/EPAU_Workbench_v2.html` — **NOT canonical**: a light/Apple-style experimental variant that diverged from the JSX source (paper backgrounds, `#0071E3` blue accent, SF Pro). Does not match any of the reference PNGs. Keep for archaeology only; do not port from.

## Canonical palette (from `EPAU_Workbench_v1.html` and `ui.jsx`)

- ink: `950:#0A0E1A, 900:#0E1424, 850:#121A2E, 800:#151B2E, 750:#1B2340, 700:#222A48`
- gold: `50:#FBF4DC, 100:#F0E3B4, 200:#E4D084, 300:#D4AF37, 400:#C49A2A, 500:#B8941F, 600:#8F7218`
- text: `primary:#F2ECD9, secondary:#C7C2B3, tertiary:#8A8778, quat:#5C5A52`
- category accents (pill tones): macro `#7AA7D9`, fiscal `#C8A87F`, external `#7FC29B`, debt `#C89878`, social `#B099D4`, monetary = gold, warn `#E0A050`, danger `#E06C6C`, success `#7FC29B`
- fonts: `Outfit` (sans, 300–700), `DM Serif Display` (headings), `JetBrains Mono` (numeric / mono)
- body background: two radial gradients (gold NE, blue SW) over `#0A0E1A → #0E1424 → #151B2E`
- glass: `rgba(255,255,255,0.035 → 0.015)` + `blur(14px) saturate(1.1)`, `glass-strong` stronger
- gold-ring focus: `1px solid rgba(212,175,55,0.35)`, outer glow

## Porting rules

1. Preserve the palette, typography, and component styling byte-for-byte where possible.
2. Replace mocked data with real API calls, keep render/style logic.
3. Do not redesign. If something looks wrong, flag it in the root README under "Design decisions flagged for review."
4. Structural conflicts with real data (chart type can't render real shape, metadata too long for the mocked layout) must be raised before adapting.

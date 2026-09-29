# @oss-os/ui

Common UBIO UI primitives, tokens and hexagonal app marks. [Development guide](../../docs/development.md) · [Agent guide](AGENTS.md)

Sixty identical components from the original applications now have one canonical implementation. They include buttons, inputs, dialogs, navigation, tables, charts, calendar, tooltips, loading states and composable layout controls. Their source is under `src/components/`.

```tsx
import { Button } from '@oss-os/ui/components/button';
import { Dialog } from '@oss-os/ui/components/dialog';
import { OrbitMark, BeaconMark } from '@oss-os/ui/brand';
import { cn } from '@oss-os/ui/utils';
import { useIsMobile } from '@oss-os/ui/hooks/use-mobile';
```

Global CSS in an app must import the shared tokens and scan this package:

```css
@import 'tailwindcss';
@import '@oss-os/ui/fonts.css';
@import '@oss-os/ui/theme.css';
@import '@oss-os/ui/workspace.css';
@source '../../ui/src';
```

Keep all CSS imports before source/theme directives. `theme.css` defines shared identity and spacing variables; `workspace.css` is the canonical Orbit theme used by **both Orbit and Beacon**. It owns the color palette, type scale, sidebar, header, content inset, headings, metrics, panels, tables, fields, notices and login layout. Application CSS contains only domain-specific presentation.

Both apps import `@oss-os/ui/fonts.css`, which bundles the same seven Source Sans 3 variable-font subsets as ordinary Vite assets. `theme.css` sets `--font-source`; app layouts do not use a separate font loader. This avoids cached machine-local font URLs and ensures identical 200–900 weights, including the 750-weight UBIO wordmark. The original SIL Open Font License is included in `src/fonts/OFL.txt`. Static 400/600/700 files are not a substitute: they produce different intermediate weights.

| Element | Canonical geometry |
| :-- | :-- |
| Desktop sidebar | 220px; shared `Sidebar` and menu primitives |
| Navigation item | 36px high, 13px text, 10px icon gap |
| Top bar | 58px high, 12px text |
| Content | 29px × 30px; 33px × 38px at 1400px; 23px × 16px below 768px |
| Page title | 28px, 24px on mobile; 26px bottom gap, 22px on mobile |
| Metric | 19px × 21px, 27px value; shared smaller-viewport rules |
| Panel heading | 20px 21px 16px |
| Text input / default button | Shared 32px primitive; page actions use 34px |
| Table | Shared table cells and 39px headers / 54px rows |
| Form grid | 16px gaps; one column on mobile |

Use `.oss-sidebar`, `.workspace-card`, `.workarea`, `.topbar`, `.page-content`, `.page-title`, `.metric-grid`, `.metric`, `.panel`, `.panel-heading`, `.record-table` and `.field` as the existing apps do. Set `--sidebar-width: var(--oss-sidebar-width)` on `SidebarProvider`. Metric grids can set `--oss-metric-columns` for their data count while retaining the shared spacing and responsive rules.

**Change common appearance here, once.** Do not create an app-local copy of a shared selector or restore global `button`, `input`, `table`, `.grid` or font overrides. Use the exported components, and preserve explicit `type="submit"` for form submission when replacing native buttons. Business layouts, monitoring history bars and editor scrolling still belong to the app.

React and React DOM are peer dependencies to keep a single compatible runtime. The app build compiles exported TypeScript source, so this package does not need a separate emitted JavaScript build.

Business forms, navigation, data queries and domain-specific screens belong to the owning application. A shared component must not depend on either app's aliases or permissions.

```sh
npm run typecheck --workspace @oss-os/ui
npm run build # validates both consumers
npm run check:fonts # checks all font URLs, weights and identical asset bytes
npm run check:fonts -- --live # also checks the deployed font responses
```

# Restaurant ERP — Design Prototype

A high-fidelity React prototype of a restaurant inventory / stock management ERP, presented as a multi-screen design canvas.

## What this is

This is a **design-only prototype** built in plain HTML + Babel-transpiled JSX (no build step, no npm). It renders 7 product screens side-by-side on a pannable, zoomable canvas so the designer and stakeholders can review the whole product at once. There is no real backend — all data is hardcoded inside the screen components.

## How to run

Just open `Restaurant ERP.html` in a browser. Everything is loaded via CDN script tags (React 18, ReactDOM, Babel standalone) and local relative-path `.jsx` files.

## File layout

```
Restaurant ERP.html      # Entry point. Loads all scripts, renders <App />.
styles.css               # Design tokens + base components (cards, buttons, pills, tables, sidebar, inputs).
design-canvas.jsx        # Starter component — the pan/zoom canvas with <DCSection> and <DCArtboard>.
tweaks-panel.jsx         # Starter component — floating Tweaks panel + useTweaks() hook.
shared.jsx               # Shared chrome: <Sidebar>, <TopBar>, <Card>, <Stat>, <StatusPill>, <ScreenShell>, Icon set, NAV list.
auth.jsx                 # <AuthScreen /> — sign-in.
screens-a.jsx            # <DashboardScreen />, <SetupScreen />.
screens-b.jsx            # <BillCaptureScreen />, <RegisterScreen />.
screens-c.jsx            # <LedgerScreen />, <AlertsScreen />.
```

## Screens

| File | Component | Purpose |
|---|---|---|
| `auth.jsx` | `AuthScreen` | Sign in (same screen for owner & staff; role determined by account). |
| `screens-a.jsx` | `DashboardScreen` | Home — stock health stats, low stock table, recent purchases, activity feed, attention card. |
| `screens-a.jsx` | `SetupScreen` | Stock items master list with tabs for items / vendors / categories / units. |
| `screens-b.jsx` | `BillCaptureScreen` | Paste a supplier WhatsApp message → AI extracts a structured bill. |
| `screens-b.jsx` | `RegisterScreen` | Manual purchase entry form with live bill preview. |
| `screens-c.jsx` | `LedgerScreen` | Audit trail of every stock movement (purchase / usage / wastage). |
| `screens-c.jsx` | `AlertsScreen` | Suspicious bill / unusual activity alerts with severity, status, and 30-day heatmap. |

## Design system

All design tokens live in **`styles.css`** as CSS custom properties on `:root`:

- **Colors**: `--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-2`, `--muted`, `--muted-2`, `--border`, `--border-2`, `--accent` (and `--accent-soft`), plus `--ok` / `--warn` / `--bad` (each with a soft variant).
- **Radii**: `--radius` (14px), `--radius-sm` (10px), `--radius-xs` (8px).
- **Sidebar**: `--sidebar-bg`, `--sidebar-border`.

**Font**: Inter (loaded from Google Fonts), 400 / 500 / 600 / 700. Tabular numerics on numeric cells via `.t-num`.

**Reusable classes** (in `styles.css`):
- `.card`, `.card-quiet` — surfaces.
- `.btn`, `.btn-primary`, `.btn-accent`, `.btn-ghost`, `.btn-sm` — buttons.
- `.pill`, `.pill-ok`, `.pill-warn`, `.pill-bad`, `.pill-accent`, `.pill-dark` — status pills (with optional `<span className="dot" />`).
- `.fld`, `.fld-label` — inputs.
- `.tbl` — tables (handles th / td styling, hover, last-row).
- `.sidebar`, `.nav-item.active` — sidebar chrome.
- `.kbd` — keyboard shortcut pill.

**Reusable React components** (in `shared.jsx`, attached to `window`):
- `<Sidebar active="dashboard" />`
- `<TopBar title subtitle actions />`
- `<SearchInput placeholder width />`
- `<Card title subtitle right padded>{children}</Card>`
- `<Stat label value suffix sub trend={{dir:'up'|'down'|'flat', label}} tone />`
- `<StatusPill status />` — supports `OK | LOW | OUT | APPROVED | DRAFT | FLAGGED | PURCHASE | USAGE | WASTAGE`.
- `<ScreenShell active title subtitle topActions>{children}</ScreenShell>` — the standard chrome wrapper every screen uses.
- `Icon` — object of inline SVG icons.

## Tweaks

The bottom-right Tweaks panel exposes the accent color (4 curated swatches). The accent is written to `--accent` on `:root` via `useEffect`. Defaults live in a JSON block delimited by `EDITMODE-BEGIN` / `EDITMODE-END` in `Restaurant ERP.html`.

## Conventions for changes

- **Don't rename component globals** without updating both the definition (`window.Foo = Foo` at the bottom of each file) and every caller. Component scope is per-script — they communicate via `window`.
- **Don't introduce a build step.** This is a flat, no-bundler prototype on purpose. Every script tag in `Restaurant ERP.html` is `type="text/babel"` and loaded with a `src=` attribute.
- **Keep styling token-driven.** Prefer `var(--…)` over hardcoded colors. The accent is themable; everything else is fixed neutrals.
- **Status pills** should go through `<StatusPill>` rather than `<span className="pill pill-…">` so the labels stay consistent.
- **Number cells** in tables get `className="t-num"` for tabular figures.
- **Sidebar active state** is driven by the `active` prop on `<ScreenShell>` / `<Sidebar>`. The keys are: `dashboard | setup | bill | register | ledger | alerts`.

## Out of scope / fake bits

- No routing — each screen is a static artboard inside the design canvas.
- No data persistence — everything is hardcoded inline in the screen components.
- No real auth, no real bill parsing, no real notifications.

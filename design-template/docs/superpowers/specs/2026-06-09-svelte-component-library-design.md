# Design: Svelte Component Library (parallel deliverable)

**Date:** 2026-06-09
**Status:** Approved (pending spec review)
**Relationship:** A new `svelte/` directory in the existing repo. The zero-build static
template at the repo root is NOT modified. This is a separate sub-project with its own
spec → plan → implementation cycle.

## Goal

Provide reusable Svelte 5 / SvelteKit components (sections + primitives) derived from the
same Miljöhusesyn design, styled with a real Tailwind v4 `@theme` (reconstructed from the
static template's compiled CSS), so they can be dropped into a future SvelteKit app. Ship a
minimal runnable harness so the demo renders and parity can be verified.

## Non-Goals

- Do NOT modify or replace the static template (root `src/`, `build.py`, `dist/`, etc.).
- Not a production app: no routing beyond the demo page, no backend, no auth, no live search.
- No CMS/data layer — content comes from component props with demo defaults.

## Decisions (from brainstorming)

1. **Relationship:** Parallel deliverable in `svelte/`. Static template untouched.
2. **Styling:** Proper Tailwind v4 `@theme` config reconstructed from `assets/css/site.css`.
3. **Granularity:** Sections AND primitives.
4. **Runnable:** Minimal SvelteKit harness (`npm install && npm run dev` renders the demo).
5. **Framework:** Svelte 5 with runes (`$props()`, snippets). **Icons:** `lucide-svelte`.

## Stack

- SvelteKit (latest) + Svelte 5 (runes) + Vite.
- Tailwind CSS v4 via `@tailwindcss/vite`, configured with `@theme` in `app.css`.
- `lucide-svelte` for icons (the design's icons are Lucide: wheat, leaf, arrow-right,
  download, search, file-text, arrow-up-right, etc.).
- Fraunces font loaded properly via `@fontsource-variable/fraunces` (the static snapshot
  never bundled it — it relied on Next.js font loading we dropped, so the static site
  currently falls back to serif; the Svelte version fixes this).
- Dev/test: `vitest` + `@testing-library/svelte` + `@sveltejs/adapter-auto`, `svelte-check`.

## Target Structure

```
svelte/
├── package.json
├── svelte.config.js
├── vite.config.js          # includes @tailwindcss/vite + vitest config
├── jsconfig.json
├── .gitignore              # node_modules, .svelte-kit, build
├── README.md               # usage + props reference
├── static/
│   └── images/             # copy of assets/images/* from the static template
└── src/
    ├── app.html
    ├── app.css             # @import "tailwindcss"; @theme {tokens}; Fraunces; .grain
    ├── lib/
    │   ├── index.js        # barrel exports (primitives + sections)
    │   ├── primitives/
    │   │   ├── Button.svelte      # variant: primary|secondary; href? (renders <a> or <button>); icon snippet
    │   │   ├── Card.svelte        # padded rounded surface; children snippet
    │   │   ├── Badge.svelte       # pill/eyebrow; icon snippet + text
    │   │   ├── SearchBar.svelte   # input + button; placeholder, buttonLabel props
    │   │   ├── NavLink.svelte     # { href, label }
    │   │   └── Icon.svelte        # thin wrapper around lucide-svelte (name, size, class)
    │   └── sections/
    │       ├── Header.svelte      # sticky nav + mobile menu (uses NavLink, Icon)
    │       ├── Hero.svelte        # eyebrow, title, highlight, subtitle, CTAs, image, search
    │       ├── PartnersBand.svelte
    │       ├── FeatureGrid.svelte # title, items:[{icon,label}]
    │       ├── Faktabank.svelte   # title, cards:[{icon,title,body,href}]
    │       ├── Calculations.svelte# title, tools:[{icon,title,body}]
    │       ├── News.svelte        # title, items:[{date,title,body}]
    │       ├── Contact.svelte
    │       └── Footer.svelte
    └── routes/
        └── +page.svelte    # assembles all sections with demo defaults (mirrors static index)
```

## Design Tokens → `@theme`

Reconstructed verbatim from `assets/css/site.css`:
```css
@theme {
  --color-cream: #faf6ec;
  --color-cream-2: #f3ecda;
  --color-bark: #1e2a22;
  --color-ink: #243027;
  --color-line: #e3dcc6;
  --color-leaf: #2f5d3a;
  --color-leaf-2: #244a2e;
  --color-sage: #88a878;
  --color-sage-2: #c8d6b6;
  --color-mute: #5b6a5f;
  --font-display: "Fraunces", Georgia, "Times New Roman", serif;
}
```
Bespoke utility ported as plain CSS (not a standard Tailwind class):
```css
.grain{
  background-image:radial-gradient(#1e2a220f 1px,#0000 1px),radial-gradient(#1e2a220a 1px,#0000 1px);
  background-position:0 0,1px 2px;
  background-size:3px 3px,7px 7px;
}
```
`font-display` maps to the `font-display` utility (used by headings as `class="font-display"`).

## Props Model

Every component accepts props via `$props()` with defaults drawn from the demo content, so
`<Hero />` with no props renders the Miljöhusesyn hero, while `<Hero title="…" />` overrides.
Representative interfaces (documented in README):

- `Button`: `{ variant = "primary", href = undefined, label, icon? (snippet) }` — renders
  `<a>` when `href` is set, else `<button>`.
- `Card`: `{ class? }` + `children` snippet.
- `Badge`: `{ label, icon? (snippet) }`.
- `SearchBar`: `{ placeholder, buttonLabel = "Sök" }`.
- `NavLink`: `{ href, label }`.
- `Hero`: `{ eyebrow, title, highlight, subtitle, primaryCta:{label,href},
  secondaryCta:{label,href}, image, searchPlaceholder }`.
- `FeatureGrid`: `{ title, items: [{ icon, label }] }`.
- `Faktabank`: `{ title, cards: [{ icon, title, body, href }] }`.
- `Calculations`: `{ title, tools: [{ icon, title, body }] }`.
- `News`: `{ title, items: [{ date, title, body }] }`.
- `Header`: `{ brand, links: [{href,label}] }` with mobile-menu state via runes.
- `PartnersBand`, `Contact`, `Footer`: content props with demo defaults.

Markup/classes are copied from the corresponding extracted static section so visual output
matches; only the dynamic text/lists are parameterized.

## Verification / Testing

1. **Component tests (TDD), `vitest` + `@testing-library/svelte`:**
   - `Button` renders its `label`; `variant="primary"` applies the leaf background class;
     setting `href` renders an `<a>` (not `<button>`).
   - `Hero` renders the `title` and `highlight` props.
   - `FeatureGrid` renders one list item per `items` entry.
2. `npm run check` (`svelte-check`) passes with no errors.
3. `npm run build` succeeds.
4. `npm run dev` serves the demo; capture a screenshot and compare to the static template
   for visual parity (palette, Fraunces headings, all sections present).

## Known Trade-offs / Risks

- Reintroduces the npm/Vite build for this directory only (acceptable — it's the SvelteKit
  deliverable; the static template stays zero-build).
- `node_modules`, `.svelte-kit`, `build` are gitignored; a clean checkout requires
  `npm install`.
- Lucide icon names must be matched to the originals; any not in Lucide get a small inline
  fallback in `Icon.svelte` (none expected — all observed icons are standard Lucide).
- Fraunces is now actually loaded, so headings will look slightly different (better) than the
  current static snapshot, which silently falls back to serif.

## Success Criteria

1. `cd svelte && npm install && npm run dev` renders a demo visually equivalent to the static
   template (with Fraunces properly applied).
2. All sections and primitives exist as documented components with prop-overridable content.
3. Component tests pass; `svelte-check` and `npm run build` succeed.
4. The static template (repo root) is byte-for-byte unchanged.
5. README documents each component's props with at least one usage example.
```

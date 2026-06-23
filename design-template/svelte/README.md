# Miljöhusesyn — Svelte component library

The Svelte 5 / SvelteKit counterpart to the zero-build static template at the repo root.
It exposes the same Miljöhusesyn agricultural-regulations design as reusable, props-driven
components (section blocks + primitives), styled with Tailwind v4 using design tokens
reconstructed from the static template's compiled CSS. Every component renders the demo
content out-of-the-box and is fully overridable via props.

## Getting started

```bash
cd svelte
npm install
npm run dev      # demo at http://localhost:5173
npm run build    # production build
npm run test     # vitest component tests
npm run check    # svelte-check
```

## Usage

```svelte
<script>
  import { Hero, Button } from '$lib/index.js';
</script>

<Hero title="Välkommen till" highlight="Miljöhusesyn" />
<Button label="Go" href="/x" variant="secondary" />
```

Import any component from the `$lib/index.js` barrel. The demo page
(`src/routes/+page.svelte`) assembles all sections in order.

## Components

### Sections

| Component | Key props |
|-----------|-----------|
| `Header` | `brand`, `links: [{ href, label }]` (reactive mobile menu built in) |
| `Hero` | `eyebrow`, `title`, `highlight`, `subtitle`, `primaryCta: {label,href}`, `secondaryCta`, `image`, `searchPlaceholder` |
| `PartnersBand` | `label` (thin band under the hero) |
| `FeatureGrid` | `eyebrow`, `title`, `heading`, `body`, `disclaimer`, `items: [{ icon, label }]` |
| `Faktabank` | `eyebrow`, `title`, `seeAll`, `cards: [{ icon, title, body, href }]` |
| `Calculations` | `eyebrow`, `heading`, `body`, `tools: [{ icon, title, body }]` |
| `News` | `eyebrow`, `title`, `linkLabel`, `linkHref`, `items: [{ date, title, body }]` |
| `Contact` | `eyebrow`, `heading`, `body`, `downloadLabel`, `downloadHref`, `contactLabel`, `contactHref`, `cards` |
| `Footer` | (no required props) |

### Primitives

| Component | Key props |
|-----------|-----------|
| `Button` | `label`, `href?` (renders `<a>` when set, else `<button>`), `variant: "primary" \| "secondary"`, `icon` (snippet) |
| `Card` | `class?`, `children` (snippet) |
| `Badge` | `label`, `icon` (snippet) |
| `SearchBar` | `placeholder`, `buttonLabel` |
| `NavLink` | `href`, `label`, `class?` |
| `Icon` | `name` (kebab-case lucide name), `size`, `class` |

## Styling

- **Design tokens** live in `src/app.css` under `@theme`: `cream`, `cream-2`, `bark`, `ink`,
  `line`, `leaf`, `leaf-2`, `sage`, `sage-2`, `mute`, plus the `font-display` (Fraunces) family.
  Use them as normal Tailwind utilities (`bg-cream`, `text-bark`, `border-line`, `text-leaf-2`, …).
- **Tailwind v4** compiles utilities on the fly, so unlike the static template you can freely
  add new utility classes.
- **Icons** come from `lucide-svelte` via the `Icon` primitive (a registry of the 14 icons the
  design uses). Add an icon by importing it and extending the registry in `src/lib/primitives/Icon.svelte`.
- **Fraunces** is loaded properly via `@fontsource-variable/fraunces` (the static snapshot never
  bundled it and silently fell back to serif).

## Images

Photos are served from `static/images/` (9 files). See the repo-root `template.config.json`
`images[]` for a caption and suggested use of each.

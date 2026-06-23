# Svelte Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a parallel `svelte/` SvelteKit app exposing the Miljöhusesyn design as reusable Svelte 5 components (sections + primitives), styled with a Tailwind v4 `@theme` reconstructed from the static template's compiled CSS, with a runnable demo and component tests.

**Architecture:** A self-contained SvelteKit project under `svelte/` (the repo-root static template is never touched). Tailwind v4 via `@tailwindcss/vite`; tokens declared in `app.css @theme`. Primitives (Button/Card/Badge/SearchBar/NavLink/Icon) are written from scratch with full code in this plan. Section components PORT their markup from the existing `src/sections/*.html` and `src/partials/*.html` files (read them; swap dynamic text/lists for `$props()`), so visual output matches. A demo `+page.svelte` assembles everything.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), Vite, Tailwind CSS v4, lucide-svelte, @fontsource-variable/fraunces, vitest + @testing-library/svelte. JavaScript (jsconfig, not TS).

**Working directory:** repo root `C:\tmp\repaint-template` (Bash: `/c/tmp/repaint-template`). NOTE: Bash `/tmp` maps to `%TEMP%`, NOT `C:\tmp` — always use `/c/tmp/...`. All Svelte work lives under `svelte/`. Git branch: `build-template`. Node 22 / npm 10 confirmed present; npm registry reachable.

**Token values (verbatim from `assets/css/site.css`):**
cream `#faf6ec`, cream-2 `#f3ecda`, bark `#1e2a22`, ink `#243027`, line `#e3dcc6`, leaf `#2f5d3a`, leaf-2 `#244a2e`, sage `#88a878`, sage-2 `#c8d6b6`, mute `#5b6a5f`. Display font: `"Fraunces", Georgia, "Times New Roman", serif`.

---

## File Structure

```
svelte/
├── package.json, svelte.config.js, vite.config.js, jsconfig.json, .gitignore
├── vitest-setup.js
├── README.md
├── static/images/                 # copied from ../assets/images
└── src/
    ├── app.html, app.css
    ├── routes/+layout.svelte, +page.svelte
    └── lib/
        ├── index.js
        ├── primitives/{Icon,Button,Card,Badge,NavLink,SearchBar}.svelte
        └── sections/{Header,Hero,PartnersBand,FeatureGrid,Faktabank,Calculations,News,Contact,Footer}.svelte
```

---

### Task 1: SvelteKit scaffold + Tailwind theme + working build/test harness

**Files (all under `/c/tmp/repaint-template/svelte/`):** create the project skeleton and prove `dev`, `build`, `check`, and `test` all work before any component exists.

- [ ] **Step 1: Create `svelte/.gitignore`**
```gitignore
node_modules/
.svelte-kit/
build/
.env
```

- [ ] **Step 2: Create `svelte/package.json`**
```json
{
  "name": "miljohusesyn-svelte",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./jsconfig.json",
    "test": "vitest run"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.3.1",
    "@sveltejs/kit": "^2.8.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/svelte": "^5.2.6",
    "jsdom": "^25.0.1",
    "svelte": "^5.1.0",
    "svelte-check": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "@fontsource-variable/fraunces": "^5.1.0",
    "lucide-svelte": "^0.460.0"
  }
}
```

- [ ] **Step 3: Create `svelte/svelte.config.js`**
```js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() }
};
```

- [ ] **Step 4: Create `svelte/vite.config.js`**
```js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), svelteTesting()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.js'],
    include: ['src/**/*.{test,spec}.{js,svelte.js}']
  }
});
```

- [ ] **Step 5: Create `svelte/vitest-setup.js`**
```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Create `svelte/jsconfig.json`**
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

- [ ] **Step 7: Create `svelte/src/app.html`**
```html
<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover" class="bg-cream text-ink antialiased">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 8: Create `svelte/src/app.css`** (Tailwind v4 + theme + Fraunces + bespoke `.grain`)
```css
@import 'tailwindcss';
@import '@fontsource-variable/fraunces';

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
  --font-display: 'Fraunces Variable', 'Fraunces', Georgia, 'Times New Roman', serif;
}

.grain {
  background-image: radial-gradient(#1e2a220f 1px, #0000 1px),
    radial-gradient(#1e2a220a 1px, #0000 1px);
  background-position: 0 0, 1px 2px;
  background-size: 3px 3px, 7px 7px;
}
```

- [ ] **Step 9: Create `svelte/src/routes/+layout.svelte`**
```svelte
<script>
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 10: Create a temporary `svelte/src/routes/+page.svelte`**
```svelte
<h1 class="font-display text-bark p-10 text-4xl">Svelte harness OK</h1>
```

- [ ] **Step 11: Create a smoke test `svelte/src/lib/smoke.test.js`**
```js
import { describe, it, expect } from 'vitest';

describe('harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 12: Install and verify the whole toolchain**
Run:
```bash
cd /c/tmp/repaint-template/svelte && npm install
npm run test
npm run build
```
Expected: `npm install` completes; `npm run test` shows the smoke test passing (1 passed); `npm run build` finishes without errors. If `@testing-library/svelte/vite` export is missing for the installed version, instead set `vite.config.js` plugins to `[tailwindcss(), sveltekit()]` and add `resolve: { conditions: ['browser'] }` under a `test`-only config; re-run. Report exactly what you changed.

- [ ] **Step 13: Commit**
```bash
cd /c/tmp/repaint-template
git add svelte/ && git commit -m "feat(svelte): scaffold SvelteKit harness with Tailwind theme"
```
(Note: `svelte/node_modules`, `.svelte-kit`, `build` are gitignored.)

---

### Task 2: `Icon` primitive (lucide-svelte wrapper)

**Files:** Create `svelte/src/lib/primitives/Icon.svelte`, Test `svelte/src/lib/primitives/Icon.test.js`

- [ ] **Step 1: Write the failing test**
```js
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Icon from './Icon.svelte';

describe('Icon', () => {
  it('renders an svg for a valid lucide name', () => {
    const { container } = render(Icon, { props: { name: 'leaf' } });
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
  it('applies the class prop to the svg', () => {
    const { container } = render(Icon, { props: { name: 'search', class: 'h-4 w-4' } });
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });
});
```

- [ ] **Step 2: Run `cd /c/tmp/repaint-template/svelte && npm run test -- Icon`** — expect FAIL (Icon.svelte missing).

- [ ] **Step 3: Implement `Icon.svelte`** (explicit registry of named imports — the dynamic `import { icons }` map is unreliable with lucide-svelte's Svelte entry; named imports are the documented, Vite-safe API). The registry MUST cover exactly the 14 icons the design uses: arrow-right, arrow-up-right, book-open, calculator, download, file-text, leaf, log-in, mail, menu, search, sprout, tractor, wheat.
```svelte
<script>
  import {
    ArrowRight, ArrowUpRight, BookOpen, Calculator, Download, FileText,
    Leaf, LogIn, Mail, Menu, Search, Sprout, Tractor, Wheat
  } from 'lucide-svelte';

  const REGISTRY = {
    'arrow-right': ArrowRight,
    'arrow-up-right': ArrowUpRight,
    'book-open': BookOpen,
    calculator: Calculator,
    download: Download,
    'file-text': FileText,
    leaf: Leaf,
    'log-in': LogIn,
    mail: Mail,
    menu: Menu,
    search: Search,
    sprout: Sprout,
    tractor: Tractor,
    wheat: Wheat
  };

  let { name, size = 24, class: cls = '' } = $props();
  const Cmp = $derived(REGISTRY[name]);
</script>

{#if Cmp}
  <Cmp {size} class={cls} aria-hidden="true" />
{:else}
  <!-- unknown icon name: {name} -->
{/if}
```
If `npm install` resolved `@lucide/svelte` instead (the non-deprecated package), change the import source from `'lucide-svelte'` to `'@lucide/svelte'` — the named exports are identical. Report which you used.

- [ ] **Step 4: Run `npm run test -- Icon`** — expect PASS (2 passed).

- [ ] **Step 5: Commit**
```bash
cd /c/tmp/repaint-template
git add svelte/src/lib/primitives/Icon.svelte svelte/src/lib/primitives/Icon.test.js
git commit -m "feat(svelte): Icon primitive wrapping lucide-svelte"
```

---

### Task 3: `Button` primitive (TDD)

**Files:** Create `svelte/src/lib/primitives/Button.svelte`, Test `svelte/src/lib/primitives/Button.test.js`

- [ ] **Step 1: Write the failing test**
```js
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
  it('renders its label', () => {
    render(Button, { props: { label: 'Logga in' } });
    expect(screen.getByText('Logga in')).toBeInTheDocument();
  });
  it('renders a <button> by default and an <a> when href is set', () => {
    const { unmount } = render(Button, { props: { label: 'X' } });
    expect(document.querySelector('button')).toBeInTheDocument();
    unmount();
    render(Button, { props: { label: 'Y', href: '#faktabank' } });
    const a = document.querySelector('a');
    expect(a).toBeInTheDocument();
    expect(a).toHaveAttribute('href', '#faktabank');
  });
  it('applies the leaf background for the primary variant', () => {
    render(Button, { props: { label: 'P', variant: 'primary' } });
    expect(document.querySelector('.bg-leaf')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run `npm run test -- Button`** — expect FAIL.

- [ ] **Step 3: Implement `Button.svelte`**
```svelte
<script>
  let {
    label,
    href = undefined,
    variant = 'primary',
    class: cls = '',
    icon,
    ...rest
  } = $props();

  const base =
    'inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition';
  const variants = {
    primary: 'bg-leaf text-cream shadow-md shadow-leaf/20 hover:bg-leaf-2',
    secondary: 'border border-leaf/30 bg-cream/70 text-leaf-2 hover:border-leaf'
  };
  const klass = `${base} ${variants[variant] ?? variants.primary} ${cls}`;
</script>

{#if href}
  <a {href} class={klass} {...rest}>{label}{@render icon?.()}</a>
{:else}
  <button class={klass} {...rest}>{label}{@render icon?.()}</button>
{/if}
```

- [ ] **Step 4: Run `npm run test -- Button`** — expect PASS (3 passed).

- [ ] **Step 5: Commit**
```bash
cd /c/tmp/repaint-template
git add svelte/src/lib/primitives/Button.svelte svelte/src/lib/primitives/Button.test.js
git commit -m "feat(svelte): Button primitive with variant + href polymorphism"
```

---

### Task 4: `Card`, `Badge`, `NavLink`, `SearchBar` primitives

**Files:** Create the four components + one combined test file `svelte/src/lib/primitives/primitives.test.js`.

- [ ] **Step 1: Write the failing test `primitives.test.js`**
```js
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Badge from './Badge.svelte';
import NavLink from './NavLink.svelte';
import SearchBar from './SearchBar.svelte';

describe('primitives', () => {
  it('Badge renders its label', () => {
    render(Badge, { props: { label: 'Ett verktyg från LRF' } });
    expect(screen.getByText('Ett verktyg från LRF')).toBeInTheDocument();
  });
  it('NavLink renders an anchor with href + label', () => {
    render(NavLink, { props: { href: '#hem', label: 'Hem' } });
    const a = screen.getByText('Hem');
    expect(a.closest('a')).toHaveAttribute('href', '#hem');
  });
  it('SearchBar renders an input with the placeholder and a button', () => {
    render(SearchBar, { props: { placeholder: 'Sök', buttonLabel: 'Sök' } });
    expect(screen.getByPlaceholderText('Sök')).toBeInTheDocument();
    expect(document.querySelector('button')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run `npm run test -- primitives`** — expect FAIL.

- [ ] **Step 3: Implement `Card.svelte`**
```svelte
<script>
  let { class: cls = '', children } = $props();
</script>

<div class={`rounded-3xl border border-line bg-cream/95 p-6 shadow-xl shadow-leaf/5 ${cls}`}>
  {@render children?.()}
</div>
```

- [ ] **Step 4: Implement `Badge.svelte`**
```svelte
<script>
  let { label, icon } = $props();
</script>

<span
  class="inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-cream/70 px-3 py-1 text-xs font-medium tracking-wide text-leaf-2 uppercase"
>
  {@render icon?.()}{label}
</span>
```

- [ ] **Step 5: Implement `NavLink.svelte`**
```svelte
<script>
  let { href, label, class: cls = 'transition hover:text-leaf' } = $props();
</script>

<a {href} class={cls}>{label}</a>
```

- [ ] **Step 6: Implement `SearchBar.svelte`**
```svelte
<script>
  import Icon from './Icon.svelte';
  let { placeholder = 'Sök', buttonLabel = 'Sök' } = $props();
</script>

<div
  class="flex max-w-xl items-center gap-2 rounded-full border border-line bg-cream/90 p-1.5 pl-5 shadow-sm"
>
  <Icon name="search" class="h-4 w-4 shrink-0 text-mute" />
  <input
    type="search"
    {placeholder}
    class="flex-1 bg-transparent py-2 text-sm text-ink placeholder:text-mute focus:outline-none"
  />
  <button class="rounded-full bg-leaf px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf-2">
    {buttonLabel}
  </button>
</div>
```

- [ ] **Step 7: Run `npm run test -- primitives`** — expect PASS (3 passed).

- [ ] **Step 8: Commit**
```bash
cd /c/tmp/repaint-template
git add svelte/src/lib/primitives/
git commit -m "feat(svelte): Card, Badge, NavLink, SearchBar primitives"
```

---

### Task 5: `Header` + `Footer` sections (port from static partials)

**Files:** Create `svelte/src/lib/sections/Header.svelte`, `Footer.svelte`, Test `svelte/src/lib/sections/header-footer.test.js`.

**Porting source:** Read `/c/tmp/repaint-template/src/partials/header.html` and `footer.html`. Reproduce their markup/classes in Svelte, replacing the nav-link list with a `links` prop rendered via `NavLink`, and the mobile menu open/close with Svelte 5 runes (`let open = $state(false)`), toggled by the hamburger button (replace the `data-menu-toggle` button's behavior with `onclick={() => (open = !open)}` and bind the mobile `<nav hidden={!open}>`). Replace inline lucide SVGs with `<Icon name="..." />`.

- [ ] **Step 1: Write the failing test**
```js
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Header from './Header.svelte';
import Footer from './Footer.svelte';

describe('Header/Footer', () => {
  it('Header renders the brand and all nav links', () => {
    render(Header, {
      props: {
        brand: 'Miljöhusesyn',
        links: [
          { href: '#hem', label: 'Hem' },
          { href: '#faktabank', label: 'Faktabank' }
        ]
      }
    });
    expect(screen.getByText('Miljöhusesyn')).toBeInTheDocument();
    expect(screen.getAllByText('Faktabank').length).toBeGreaterThan(0);
  });
  it('Footer renders without crashing and shows copy', () => {
    render(Footer, {});
    expect(document.querySelector('footer')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run `npm run test -- header-footer`** — expect FAIL.

- [ ] **Step 3: Implement `Header.svelte`** — port from `src/partials/header.html`. Props:
```
let {
  brand = 'Miljöhusesyn',
  links = [
    { href: '#hem', label: 'Hem' },
    { href: '#viktigt', label: 'Viktigt för alla' },
    { href: '#nyheter', label: 'Regeländringar' },
    { href: '#faktabank', label: 'Faktabank' },
    { href: '#berakningar', label: 'Beräkningar' },
    { href: '#kontakt', label: 'Kontakt' }
  ]
} = $props();
let open = $state(false);
```
Render the desktop `<nav class="hidden ... lg:flex">` and mobile `<nav id="mobile-nav" hidden={!open} class="... lg:hidden">` by mapping `links` through `<NavLink {...l} />`. Use the brand wheat `<Icon name="wheat" />`. Wire the hamburger `<button onclick={() => (open = !open)} aria-expanded={open} aria-controls="mobile-nav" class="... lg:hidden">` with an `<Icon name="menu" />`. Keep all other classes identical to the source.

- [ ] **Step 4: Implement `Footer.svelte`** — port the markup from `src/partials/footer.html` verbatim into the component (no props needed beyond optional overrides; convert any inline lucide SVG to `<Icon>`). Keep `<footer class="...">` and all classes/text.

- [ ] **Step 5: Run `npm run test -- header-footer`** — expect PASS (2 passed).

- [ ] **Step 6: Commit**
```bash
cd /c/tmp/repaint-template
git add svelte/src/lib/sections/Header.svelte svelte/src/lib/sections/Footer.svelte svelte/src/lib/sections/header-footer.test.js
git commit -m "feat(svelte): Header (reactive mobile menu) + Footer sections"
```

---

### Task 6: `Hero` + `PartnersBand` sections

**Files:** Create `svelte/src/lib/sections/Hero.svelte`, `PartnersBand.svelte`, Test `svelte/src/lib/sections/hero.test.js`.

**Porting source:** `src/sections/hero.html` and `src/sections/partners-band.html`. In hero, the background image becomes a prop `image` used as `style={`background-image:url(${image})`}` (default `/images/field-wheat.jpg` — note leading slash: served from `static/`). Replace CTAs with `<Button>`, the badge with `<Badge>`, the search box with `<SearchBar>`, inline SVGs with `<Icon>`. The right-hand card ("Vad omfattar Miljöhusesyn?") uses `<Card>`.

- [ ] **Step 1: Write the failing test**
```js
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Hero from './Hero.svelte';

describe('Hero', () => {
  it('renders title and highlight props', () => {
    render(Hero, { props: { title: 'Välkommen till', highlight: 'Miljöhusesyn' } });
    expect(screen.getByText('Välkommen till', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Miljöhusesyn')).toBeInTheDocument();
  });
  it('uses the image prop for the background', () => {
    const { container } = render(Hero, { props: { image: '/images/banner-01.jpg' } });
    expect(container.innerHTML).toContain('/images/banner-01.jpg');
  });
});
```

- [ ] **Step 2: Run `npm run test -- hero`** — expect FAIL.

- [ ] **Step 3: Implement `Hero.svelte`** — port from `src/sections/hero.html`. Props:
```
let {
  eyebrow = 'Ett verktyg från LRF',
  title = 'Välkommen till',
  highlight = 'Miljöhusesyn',
  subtitle = 'Snabbt och enkelt – ta reda på vilka regler och författningar som gäller just ditt jordbruksföretag. Samlat, sökbart och uppdaterat inför 2026.',
  primaryCta = { label: 'Logga in / Registrera dig', href: '#' },
  secondaryCta = { label: 'Ladda ned Miljöhusesyn', href: '#faktabank' },
  image = '/images/field-wheat.jpg',
  searchPlaceholder = 'Sök i faktabanken – t.ex. ”stallgödsel” eller ”köldmedia”'
} = $props();
```
Keep the two overlay divs and `.grain` div. The right card's checklist ("Grundvillkor…", etc.) may stay as static markup inside the component (it is demo content). Use `<Badge label={eyebrow}>`, `<Button label={primaryCta.label} href={primaryCta.href} variant="primary">`, `<Button ... variant="secondary">`, `<SearchBar placeholder={searchPlaceholder} />`.

- [ ] **Step 4: Implement `PartnersBand.svelte`** — port `src/sections/partners-band.html` verbatim; expose its text as an optional prop with the current value as default. Convert inline SVG to `<Icon>` if present.

- [ ] **Step 5: Run `npm run test -- hero`** — expect PASS (2 passed).

- [ ] **Step 6: Commit**
```bash
cd /c/tmp/repaint-template
git add svelte/src/lib/sections/Hero.svelte svelte/src/lib/sections/PartnersBand.svelte svelte/src/lib/sections/hero.test.js
git commit -m "feat(svelte): Hero + PartnersBand sections"
```

---

### Task 7: `FeatureGrid` + `Faktabank` sections

**Files:** Create `svelte/src/lib/sections/FeatureGrid.svelte`, `Faktabank.svelte`, Test `svelte/src/lib/sections/grid.test.js`.

**Porting source:** `src/sections/feature-grid.html` (id `viktigt`) and `src/sections/faktabank.html` (id `faktabank`). Each repeated card/item becomes an entry in a list prop rendered with `{#each}` and `<Card>` / `<Icon>`.

- [ ] **Step 1: Write the failing test**
```js
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FeatureGrid from './FeatureGrid.svelte';
import Faktabank from './Faktabank.svelte';

describe('FeatureGrid/Faktabank', () => {
  it('FeatureGrid renders one entry per item', () => {
    render(FeatureGrid, {
      props: { title: 'T', items: [{ icon: 'leaf', label: 'A' }, { icon: 'leaf', label: 'B' }, { icon: 'leaf', label: 'C' }] }
    });
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
  it('Faktabank renders its section id anchor', () => {
    const { container } = render(Faktabank, {});
    expect(container.querySelector('#faktabank')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run `npm run test -- grid`** — expect FAIL.

- [ ] **Step 3: Implement `FeatureGrid.svelte`** — port `src/sections/feature-grid.html`. Props:
```
let {
  title = 'Vad omfattar Miljöhusesyn?',
  items = [ /* default from the source section's cards, each { icon, label } */ ]
} = $props();
```
Keep the `<section id="viktigt" class="...">` wrapper; render items with `{#each items as item}` using `<Icon name={item.icon} />` + `item.label`. Populate the default `items` from the actual cards in the source file.

- [ ] **Step 4: Implement `Faktabank.svelte`** — port `src/sections/faktabank.html`. Props:
```
let {
  title = 'Faktabank',
  cards = [ /* default from source: each { icon, title, body, href } */ ]
} = $props();
```
Keep `<section id="faktabank" class="...">`; render cards via `{#each}` with `<Card>` + `<Icon>`. Populate defaults from the source file's six cards.

- [ ] **Step 5: Run `npm run test -- grid`** — expect PASS (2 passed).

- [ ] **Step 6: Commit**
```bash
cd /c/tmp/repaint-template
git add svelte/src/lib/sections/FeatureGrid.svelte svelte/src/lib/sections/Faktabank.svelte svelte/src/lib/sections/grid.test.js
git commit -m "feat(svelte): FeatureGrid + Faktabank sections"
```

---

### Task 8: `Calculations` + `News` + `Contact` sections

**Files:** Create `svelte/src/lib/sections/Calculations.svelte`, `News.svelte`, `Contact.svelte`, Test `svelte/src/lib/sections/rest.test.js`.

**Porting source:** `src/sections/calculations.html` (id `berakningar`), `news.html` (id `nyheter`), `contact.html` (id `kontakt`). Repeated cards/items → list props with `{#each}`.

- [ ] **Step 1: Write the failing test**
```js
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Calculations from './Calculations.svelte';
import News from './News.svelte';
import Contact from './Contact.svelte';

describe('Calculations/News/Contact', () => {
  it('Calculations renders its anchor', () => {
    const { container } = render(Calculations, {});
    expect(container.querySelector('#berakningar')).toBeTruthy();
  });
  it('News renders one entry per item', () => {
    const { getByText } = render(News, {
      props: { title: 'N', items: [{ date: '2026', title: 'One', body: 'x' }, { date: '2026', title: 'Two', body: 'y' }] }
    });
    expect(getByText('One')).toBeTruthy();
    expect(getByText('Two')).toBeTruthy();
  });
  it('Contact renders its anchor', () => {
    const { container } = render(Contact, {});
    expect(container.querySelector('#kontakt')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run `npm run test -- rest`** — expect FAIL.

- [ ] **Step 3: Implement `Calculations.svelte`** — port `src/sections/calculations.html`. Prop `tools = [ /* {icon,title,body} from source */ ]`, default from the source's three cards; keep `<section id="berakningar" class="...">`, render via `{#each tools}`.

- [ ] **Step 4: Implement `News.svelte`** — port `src/sections/news.html`. Props `title` + `items = [ /* {date,title,body} from source */ ]`; keep `<section id="nyheter" class="...">`, render via `{#each items}`.

- [ ] **Step 5: Implement `Contact.svelte`** — port `src/sections/contact.html` verbatim into the component (content props optional, defaults = current text); keep `<section id="kontakt" class="...">`.

- [ ] **Step 6: Run `npm run test -- rest`** — expect PASS (3 passed).

- [ ] **Step 7: Commit**
```bash
cd /c/tmp/repaint-template
git add svelte/src/lib/sections/Calculations.svelte svelte/src/lib/sections/News.svelte svelte/src/lib/sections/Contact.svelte svelte/src/lib/sections/rest.test.js
git commit -m "feat(svelte): Calculations, News, Contact sections"
```

---

### Task 9: Barrel exports, demo page, images, README, parity check

**Files:** Create `svelte/src/lib/index.js`, replace `svelte/src/routes/+page.svelte`, copy images to `svelte/static/images/`, create `svelte/README.md`.

- [ ] **Step 1: Copy the image library into `static/`**
```bash
cd /c/tmp/repaint-template
mkdir -p svelte/static/images
cp assets/images/* svelte/static/images/
ls svelte/static/images | wc -l   # expect 9
```

- [ ] **Step 2: Create `svelte/src/lib/index.js` (barrel)**
```js
export { default as Icon } from './primitives/Icon.svelte';
export { default as Button } from './primitives/Button.svelte';
export { default as Card } from './primitives/Card.svelte';
export { default as Badge } from './primitives/Badge.svelte';
export { default as NavLink } from './primitives/NavLink.svelte';
export { default as SearchBar } from './primitives/SearchBar.svelte';
export { default as Header } from './sections/Header.svelte';
export { default as Hero } from './sections/Hero.svelte';
export { default as PartnersBand } from './sections/PartnersBand.svelte';
export { default as FeatureGrid } from './sections/FeatureGrid.svelte';
export { default as Faktabank } from './sections/Faktabank.svelte';
export { default as Calculations } from './sections/Calculations.svelte';
export { default as News } from './sections/News.svelte';
export { default as Contact } from './sections/Contact.svelte';
export { default as Footer } from './sections/Footer.svelte';
```

- [ ] **Step 3: Replace `svelte/src/routes/+page.svelte` with the demo assembly**
```svelte
<script>
  import {
    Header, Hero, PartnersBand, FeatureGrid, Faktabank,
    Calculations, News, Contact, Footer
  } from '$lib/index.js';
</script>

<svelte:head><title>Miljöhusesyn – Svelte demo</title></svelte:head>

<main id="hem" class="text-ink">
  <Header />
  <Hero />
  <PartnersBand />
  <FeatureGrid />
  <Faktabank />
  <Calculations />
  <News />
  <Contact />
</main>
<Footer />
```

- [ ] **Step 4: Create `svelte/README.md`** with: overview, `npm install && npm run dev`, a component list, and at least one props example per component group. Include exactly:
  - A "Usage" section showing `import { Hero, Button } from '$lib/index.js';` and a `<Hero title="…" />` + `<Button label="Go" href="/x" variant="secondary" />` example.
  - A "Components" table listing each component and its key props (Hero, FeatureGrid, Faktabank, Calculations, News, Header, Button, Card, Badge, SearchBar, NavLink, Icon) drawn from their `$props()` declarations.
  - A "Styling" note: tokens live in `src/app.css @theme`; icons via `lucide-svelte`; Fraunces via `@fontsource-variable/fraunces`.
  - A line clarifying this is the Svelte counterpart to the zero-build static template at the repo root.

- [ ] **Step 5: Full verification — tests, check, build**
```bash
cd /c/tmp/repaint-template/svelte
npm run test        # all suites pass
npm run check       # svelte-check: 0 errors
npm run build       # succeeds
```
Expected: every test suite passes, `svelte-check` reports 0 errors (warnings acceptable — report them), build completes. Fix any real errors before continuing.

- [ ] **Step 6: Visual parity smoke test**
Start the dev server in the background and capture a screenshot:
```bash
cd /c/tmp/repaint-template/svelte
npm run dev   # run in background; note the localhost port (usually 5173)
```
Open the port in the preview tool, screenshot, and confirm: cream palette, Fraunces headings (now actually loaded), all sections present (hero → contact) with the footer, hero background image visible, no console errors. Report the screenshot result. Stop the dev server when done.

- [ ] **Step 7: Commit**
```bash
cd /c/tmp/repaint-template
git add svelte/src/lib/index.js svelte/src/routes/+page.svelte svelte/static/images svelte/README.md
git commit -m "feat(svelte): barrel exports, demo page, image assets, README"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** parallel `svelte/` dir, static untouched (all tasks confined to `svelte/`) ✓; Tailwind v4 `@theme` from real tokens (Task 1) ✓; `.grain` ported (Task 1) ✓; Fraunces actually loaded (Task 1) ✓; primitives Button/Card/Badge/SearchBar/NavLink/Icon (Tasks 2–4) ✓; sections Header/Hero/PartnersBand/FeatureGrid/Faktabank/Calculations/News/Contact/Footer (Tasks 5–8) ✓; props-with-demo-defaults model (each section task) ✓; lucide-svelte icons (Task 2) ✓; component tests via vitest + @testing-library (every task) ✓; build/check/dev parity (Task 9) ✓; barrel exports + README props reference (Task 9) ✓; images copied (Task 9) ✓.
- **Placeholder scan:** section-default content (`items`/`cards`/`tools` defaults) is intentionally sourced from the existing `src/sections/*.html` files, which the implementer reads — the source is concrete and present, not a TBD. All config/primitive code is inlined in full.
- **Type/name consistency:** component names, prop names (`label`, `href`, `variant`, `items`, `cards`, `tools`, `image`, `title`, `highlight`), and barrel exports match across tasks; `Icon` `name`/`size`/`class` props consistent; test `npm run test -- <substr>` filters match each task's test filename.
- **Toolchain de-risking:** Task 1 stands up dev/build/check/test with a trivial test before any component, with a documented fallback if the `@testing-library/svelte/vite` export differs.
- **Path hazard noted:** Bash `/tmp` ≠ `C:\tmp`; all commands use `/c/tmp/...`.
- **Static template safety:** every task's `git add` is scoped to `svelte/...` paths (plus this plan), so the root template stays byte-for-byte unchanged (spec success criterion 4).
```

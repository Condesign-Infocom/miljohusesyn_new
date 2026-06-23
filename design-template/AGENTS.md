# AGENTS.md — How to work in this template

This is a **zero-build static site**. You edit small files in `src/`, then run
`python build.py` to produce `dist/` (the deployable output). No npm, no framework.

## Golden rules
1. **Never edit `dist/`** — it is generated. Edit `src/` and rebuild.
2. **The nav lives in ONE place:** `src/partials/header.html`.
3. **No new Tailwind utility classes.** There is no Tailwind compiler. Reuse the
   utility classes already in `assets/css/site.css`, or add plain CSS to
   `src/styles/custom.css` using the variables in `src/styles/tokens.css`.
4. **Always rebuild before preview:** `python build.py`.
5. **Keep `template.config.json` in sync** whenever you add a section or page.

## Project map
- `src/partials/` — shared chrome: `head-meta.html`, `header.html`, `footer.html`
- `src/sections/` — the reusable section catalog (copy these)
- `src/pages/` — pages; each is a thin list of `<!-- @include ... -->` lines + its own `<title>`
- `src/styles/` — `tokens.css` (palette), `custom.css` (your new CSS)
- `assets/` — `css/site.css` (compiled Tailwind, do not hand-edit), `js/template.js`, `images/`
- `template.config.json` — machine-readable catalog of everything
- `build.py` — the include expander

## Include syntax
Inside any file under `src/`, this line:
`<!-- @include sections/hero.html -->`
is replaced at build time by the contents of `src/sections/hero.html`. Paths are
relative to `src/`. Includes may nest.

## Recipe: add a section to a page
1. Pick a section from `src/sections/` (see `template.config.json` → `sections`).
2. If reusing as-is, just add `<!-- @include sections/<name>.html -->` to the page
   in `src/pages/` at the desired position.
3. To customize, copy the file to a new name in `src/sections/`, edit its text/images
   (use images from `assets/images/` — see `template.config.json` → `images` for captions),
   register it in `template.config.json` → `sections`, then include it.
4. `python build.py` and preview.

## Recipe: add a new page
1. Copy `src/pages/index.html` to `src/pages/<name>.html`.
2. Change its `<title>` and the list of section `@include` lines.
3. Add a nav link in `src/partials/header.html` (the ONE nav) pointing to `<name>.html`.
4. Add a `pages[]` entry in `template.config.json`.
5. `python build.py` — the new page appears at `dist/<name>.html`.

## Recipe: add a brand-new section type
1. Create `src/sections/<name>.html`. Reuse existing utility classes; match the rhythm
   (`max-w-7xl` container, `px-6` gutter, `py-24` vertical padding). Give it an `id` if it
   should be a nav anchor.
2. Register it in `template.config.json` → `sections`.
3. Include it on a page and rebuild.

## Preview
`python build.py`, then serve the output:
`python -m http.server 8000 --directory dist`
and open http://localhost:8000. (Or just open `dist/index.html` directly.)

## Known limits
- No Tailwind compiler (rule 3 above).
- Interactivity is limited to `assets/js/template.js` (mobile menu). Add small vanilla JS
  there if needed. There is no client framework.

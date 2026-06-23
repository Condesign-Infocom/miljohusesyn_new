# Design: AI-Optimized Zero-Build Static Template

**Date:** 2026-06-09
**Status:** Approved (pending spec review)
**Source artifact:** `repaint-template/` — a Next.js server-rendered snapshot of
`https://d836a9ea-…preview.repaint.com/` (the "Miljöhusesyn" agricultural-regulations site).

## Goal

Turn the flat HTML snapshot into a **design template that is easy for an AI agent to
extend** — adding new pages and new sections — with **no build toolchain** (no npm, no
framework). The existing visual design and the real Swedish content are preserved as a
living demo that an AI mimics.

## Non-Goals

- No framework (Astro/Next/Tailwind-CLI). Explicitly rejected in favor of zero-build.
- No restoration of Next.js client interactivity beyond a minimal mobile-menu toggle.
- No live search / dynamic data. (Documented as a future follow-up, not built.)
- No genericizing of content — the Swedish Miljöhusesyn page stays as the demo.

## Decisions (from brainstorming)

1. **Toolchain:** Zero-build static HTML. A ~40-line `build.py` (Python 3 stdlib only)
   expands `<!-- @include path -->` directives and copies assets. Python 3.11 is already
   on the machine.
2. **Content:** Keep the real Swedish content as the living home-page demo; split it into
   clean, editable section files an AI clones.
3. **Next.js JS:** Drop the `_next` hydration chunks. Visuals are 100% server-rendered
   HTML + CSS, so the look is fully preserved. Re-add one tiny vanilla `template.js` for
   the mobile-menu toggle.
4. **Images:** Enrich the asset library with real photos from `https://miljohusesyn.nu/`
   (6 banner photos + 1 content image + logo), each captioned in the manifest.

## Target Structure

```
repaint-template/
├── AGENTS.md                 # the contract an AI reads first
├── template.config.json      # machine-readable catalog: pages, sections, tokens, nav, images
├── build.py                  # expands @include directives, copies assets → dist/
├── src/
│   ├── partials/
│   │   ├── head-meta.html     # <head> meta + CSS/JS links
│   │   ├── header.html        # the ONE canonical sticky nav
│   │   └── footer.html
│   ├── sections/             # reusable section CATALOG (copy these)
│   │   ├── hero.html          (#hem)
│   │   ├── feature-grid.html  (#viktigt — "Vad omfattar Miljöhusesyn?")
│   │   ├── faktabank.html     (#faktabank)
│   │   ├── calculations.html  (#berakningar)
│   │   ├── news.html          (#nyheter)
│   │   └── contact.html       (#kontakt)
│   ├── pages/
│   │   └── index.html         # a page = thin list of @include lines + its own <title>
│   └── styles/
│       ├── tokens.css         # design tokens as documented CSS variables
│       └── custom.css         # where new hand-written styles go (zero-build safe)
├── assets/
│   ├── css/site.css           # existing compiled Tailwind CSS (kept verbatim)
│   ├── js/template.js         # tiny vanilla JS (mobile menu)
│   └── images/                # captioned library (see Images)
├── dist/                      # build output; served by .claude/launch.json
└── docs/superpowers/specs/    # this document
```

## The Include Mechanism (`build.py`)

- Input: every `*.html` in `src/pages/`.
- Transform: recursively replace lines matching `<!-- @include <relpath> -->`
  (relpath relative to `src/`) with the referenced file's contents. Recursion depth
  is bounded (e.g. 10) to catch accidental include cycles.
- Output: write expanded files to `dist/` with the same filename; copy `assets/` →
  `dist/assets/` and `src/styles/` → `dist/assets/css/`.
- **No variables / no templating language.** Each page is a complete, self-describing
  HTML document. Shared chrome (head-meta, header, footer) and section blocks are the
  only includes. This maximizes AI legibility: every file reads top-to-bottom.
- Pure Python stdlib (`pathlib`, `shutil`, `re`). Run with `python build.py`.

## AI-Friendliness Artifacts (the core ask)

### `AGENTS.md`
Recipe-style conventions with three copy-paste workflows:

1. **Add a section to a page** — copy a file from `src/sections/`, edit its text, add one
   `<!-- @include sections/<name>.html -->` line to the target page, run `python build.py`.
2. **Add a new page** — copy `src/pages/index.html`, swap its section includes + `<title>`,
   add a nav link in `src/partials/header.html`, add a `pages[]` entry in the manifest.
3. **Add a new reusable section type** — create `src/sections/<name>.html`, register it in
   `template.config.json` `sections[]`.

Hard rules section:
- **Reuse existing utility classes; do NOT invent new Tailwind utilities** (there is no
  Tailwind compiler — unknown utilities won't have CSS). New styling goes in `custom.css`
  or uses the documented token CSS variables.
- The nav lives in exactly ONE place: `src/partials/header.html`.
- Always `python build.py` before previewing; never edit `dist/` by hand.
- Preview via `.claude/launch.json` → `repaint-template` (serves `dist/`).

### `template.config.json`
Machine-readable index so an AI discovers the catalog without grepping HTML:
- `tokens` — colors (`--cream`, `--cream-2`, `--bark`, `--ink`, `--line`), fonts, spacing rhythm.
- `sections[]` — `{ id, file, anchor, description }` for each catalog section.
- `pages[]` — `{ name, file, includes[] }`.
- `navigation[]` — `{ label, href }`.
- `images[]` — `{ file, caption, suggestedUse }` for every asset image.

## Design Tokens (Part C)

Extract the snapshot's existing semantic palette into documented CSS variables in
`tokens.css` so they are nameable rather than buried in utility soup:
`--cream`, `--cream-2`, `--bark`, `--ink`, `--line`, the `font-display` family, and the
spacing rhythm (`max-w-7xl` containers, `py-24` section padding). The compiled Tailwind
CSS (`assets/css/site.css`) remains the rendering engine; `tokens.css` documents the
vocabulary an AI should stay within.

## Images

Download from `https://miljohusesyn.nu/assets/images/` into `assets/images/`, give each a
descriptive filename, and **view each image to write an accurate caption** for the manifest:

| Source | Notes |
|---|---|
| `topbilder/MHS/00.jpg` | identical to current `wheat-hero.jpg` (keep, rename consistently) |
| `topbilder/MHS/01.jpg`, `02.jpg`, `03.jpg` | 3 banner photos |
| `topbilder/common/00.jpg`, `01.jpg`, `02.jpg` | 3 banner photos |
| `Cow-sad.jpg` | content image (livestock/animal-welfare sections) |
| `mhs-logo.png` | brand logo |

Each entry in `template.config.json.images[]` gets a human caption (what it depicts) and a
`suggestedUse` (e.g. "hero background", "section accent") so an AI picks contextually
appropriate imagery for new sections.

## Build / Preview Wiring

After implementation, repoint `.claude/launch.json` `repaint-template` config to serve
`dist/` (run `python build.py` first). Document the build+preview loop in `AGENTS.md`.

## Known Trade-offs / Risks

- **Lost interactivity:** dropping `_next` removes any JS behavior beyond the re-added
  mobile menu. Acceptable per decision 3; live search is an explicit non-goal.
- **No Tailwind compiler:** new arbitrary utility classes won't render. Mitigated by the
  "reuse existing classes / use custom.css" rule, prominently in `AGENTS.md`.
- **No git repo yet:** spec is written to disk but not committed. Offer `git init` separately.

## Success Criteria

1. `python build.py` produces a `dist/index.html` that is visually equivalent to the
   original snapshot (earth-tone palette, fonts, all six sections, header, footer).
2. An AI can add a new page and a new section by following `AGENTS.md` using only file
   copies + one rebuild, with no framework knowledge.
3. `template.config.json` accurately lists every section, page, nav item, and captioned image.
4. The mobile-menu toggle works without the Next.js runtime.
```

# AI-Optimized Zero-Build Static Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the flat `repaint-template/` Next.js snapshot into a zero-build, AI-extensible static-site template (source partials + sections, a Python include-builder, a machine-readable manifest, and an `AGENTS.md` contract).

**Architecture:** Source files live in `src/` (partials, sections, pages, styles). A ~50-line stdlib-only `build.py` expands `<!-- @include path -->` directives and copies assets into a deployable `dist/`. The existing compiled Tailwind CSS is kept verbatim as the rendering engine; the Next.js JS runtime is dropped and replaced by a tiny vanilla mobile-menu script. Real photos from `miljohusesyn.nu` enrich a captioned image library.

**Tech Stack:** HTML, compiled Tailwind CSS (static), vanilla JS, Python 3.11 stdlib (`pathlib`, `re`, `shutil`). No npm, no framework.

**Working directory:** `C:\tmp\repaint-template` (Bash tool: `/c/tmp/repaint-template`). NOTE: the Bash tool's `/tmp` maps to `%TEMP%`, NOT `C:\tmp` — always use `/c/tmp/...` absolute paths.

---

## File Structure

```
repaint-template/
├── AGENTS.md                     # Task 7 — the AI contract
├── template.config.json          # Task 6 — machine-readable catalog
├── build.py                      # Task 2 — include expander + asset copy
├── test_build.py                 # Task 2 — stdlib test for build.py
├── tools/extract_sections.py     # Task 3 — one-time migration helper
├── src/
│   ├── partials/{head-meta,header,footer}.html   # Task 3
│   ├── sections/*.html                            # Task 3
│   ├── pages/index.html                           # Task 4
│   └── styles/{tokens,custom}.css                 # Task 5
├── assets/
│   ├── css/site.css              # Task 1 — renamed compiled Tailwind CSS
│   ├── js/template.js            # Task 5 — mobile menu
│   └── images/*                  # Task 6 — captioned library
├── dist/                         # build output (served)
└── docs/superpowers/{specs,plans}/   # spec + this plan
```

---

### Task 1: Directory skeleton + asset migration (drop Next.js JS)

**Files:**
- Create dirs: `src/partials`, `src/sections`, `src/pages`, `src/styles`, `assets/css`, `assets/js`, `assets/images`, `tools`, `dist`
- Move: `_next/static/chunks/d3cb4a29ca1b4742.css` → `assets/css/site.css`
- Move: `images/wheat-hero.jpg` → `assets/images/field-wheat.jpg`
- Delete: `_next/` (all JS chunks + the now-moved CSS dir)

- [ ] **Step 1: Create directory skeleton**

Run:
```bash
cd /c/tmp/repaint-template
mkdir -p src/partials src/sections src/pages src/styles assets/css assets/js assets/images tools dist
```

- [ ] **Step 2: Migrate the compiled CSS and hero image, then drop `_next`**

Run:
```bash
cd /c/tmp/repaint-template
cp _next/static/chunks/d3cb4a29ca1b4742.css assets/css/site.css
cp images/wheat-hero.jpg assets/images/field-wheat.jpg
rm -rf _next images
ls assets/css/site.css assets/images/field-wheat.jpg
```
Expected: both paths listed, no error. `_next/` and old `images/` gone.

- [ ] **Step 3: Commit (if git is initialized; otherwise skip until Task 8)**

```bash
cd /c/tmp/repaint-template
git add -A 2>/dev/null && git commit -m "chore: scaffold template dirs, migrate assets, drop _next JS" 2>/dev/null || echo "no git yet — skipping"
```

---

### Task 2: `build.py` include-expander (TDD)

**Files:**
- Create: `build.py`
- Test: `test_build.py`

- [ ] **Step 1: Write the failing test**

Create `test_build.py`:
```python
import shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).parent
TMP = ROOT / "_test_tmp"

def setup():
    if TMP.exists(): shutil.rmtree(TMP)
    (TMP / "src/partials").mkdir(parents=True)
    (TMP / "src/pages").mkdir(parents=True)
    (TMP / "assets/css").mkdir(parents=True)
    (TMP / "src/partials/header.html").write_text("<header>NAV</header>", encoding="utf-8")
    (TMP / "src/pages/index.html").write_text(
        "<html><body><!-- @include partials/header.html --><p>hi</p></body></html>",
        encoding="utf-8")
    (TMP / "assets/css/site.css").write_text("body{}", encoding="utf-8")

def test_include_expansion_and_asset_copy():
    setup()
    r = subprocess.run([sys.executable, str(ROOT / "build.py"), "--root", str(TMP)],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    out = (TMP / "dist/index.html").read_text(encoding="utf-8")
    assert "<header>NAV</header>" in out, "include not expanded"
    assert "@include" not in out, "directive left in output"
    assert "<p>hi</p>" in out
    assert (TMP / "dist/assets/css/site.css").exists(), "assets not copied"
    print("PASS")

def test_missing_include_errors():
    setup()
    (TMP / "src/pages/bad.html").write_text("<!-- @include partials/nope.html -->", encoding="utf-8")
    r = subprocess.run([sys.executable, str(ROOT / "build.py"), "--root", str(TMP)],
                       capture_output=True, text=True)
    assert r.returncode != 0, "should fail on missing include"
    print("PASS")

if __name__ == "__main__":
    test_include_expansion_and_asset_copy()
    test_missing_include_errors()
    print("ALL PASS")
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /c/tmp/repaint-template && python test_build.py`
Expected: FAIL — `build.py` does not exist (`No such file or directory` / non-zero exit).

- [ ] **Step 3: Write `build.py`**

Create `build.py`:
```python
#!/usr/bin/env python3
"""Zero-dependency static-site builder.

Expands `<!-- @include <relpath> -->` directives (relpath is relative to src/)
in every src/pages/*.html, then writes the result to dist/. Copies assets/ and
src/styles/ into dist/. No templating language, no variables — includes only.

Usage: python build.py [--root DIR]
"""
import argparse, re, shutil, sys
from pathlib import Path

INCLUDE_RE = re.compile(r"<!--\s*@include\s+(?P<path>[^\s]+)\s*-->")
MAX_DEPTH = 10

def expand(text: str, src_dir: Path, _depth: int = 0) -> str:
    if _depth > MAX_DEPTH:
        raise RecursionError("include nesting too deep (cycle?)")
    def repl(m: re.Match) -> str:
        inc = src_dir / m.group("path")
        if not inc.is_file():
            raise FileNotFoundError(f"@include target not found: {m.group('path')}")
        return expand(inc.read_text(encoding="utf-8"), src_dir, _depth + 1)
    return INCLUDE_RE.sub(repl, text)

def build(root: Path) -> None:
    src, dist = root / "src", root / "dist"
    pages = src / "pages"
    if dist.exists():
        shutil.rmtree(dist)
    dist.mkdir(parents=True)
    # expand pages
    for page in sorted(pages.glob("*.html")):
        out = expand(page.read_text(encoding="utf-8"), src)
        (dist / page.name).write_text(out, encoding="utf-8")
    # copy assets/ verbatim
    assets = root / "assets"
    if assets.exists():
        shutil.copytree(assets, dist / "assets", dirs_exist_ok=True)
    # copy hand-written styles into dist/assets/css
    styles = src / "styles"
    if styles.exists():
        css_out = dist / "assets" / "css"
        css_out.mkdir(parents=True, exist_ok=True)
        for css in styles.glob("*.css"):
            shutil.copy2(css, css_out / css.name)
    print(f"Built {len(list(pages.glob('*.html')))} page(s) → {dist}")

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(Path(__file__).parent))
    args = ap.parse_args()
    try:
        build(Path(args.root))
    except Exception as e:  # noqa: BLE001 — surface a clean error + nonzero exit
        print(f"BUILD ERROR: {e}", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /c/tmp/repaint-template && python test_build.py`
Expected: `ALL PASS`. Then clean the test scratch dir:
```bash
rm -rf /c/tmp/repaint-template/_test_tmp
```

- [ ] **Step 5: Commit**

```bash
cd /c/tmp/repaint-template
git add build.py test_build.py 2>/dev/null && git commit -m "feat: add zero-dep include builder + tests" 2>/dev/null || echo "no git yet"
```

---

### Task 3: Extract partials + sections from the snapshot

The snapshot `index.html` is minified onto one line, so extraction is programmatic: find each landmark by a unique anchor marker, then capture the balanced tag fragment.

**Files:**
- Create: `tools/extract_sections.py`
- Produces: `src/partials/header.html`, `src/partials/footer.html`, and `src/sections/*.html`

- [ ] **Step 1: Inventory the top-level children of `<main>` in order**

Run:
```bash
cd /c/tmp/repaint-template
grep -oE '<section[^>]*>|<header[^>]*>|<footer[^>]*>' index.html | head -40
```
Expected: header, then sections in order: hero (`class="relative overflow-hidden"`), a band (`class="border-y border-line/70 bg-cream-2/60"`), `id="viktigt"`, `id="faktabank"`, `id="berakningar"`, `id="nyheter"`, `id="kontakt"`, then footer. Note the exact opening-tag strings — they are the anchor markers used below.

- [ ] **Step 2: Write `tools/extract_sections.py`**

Create `tools/extract_sections.py`:
```python
#!/usr/bin/env python3
"""One-time migration: slice partials/sections out of the minified index.html.

For each (marker, tag, outfile) it finds `marker` in index.html, then captures
the balanced <tag>...</tag> fragment (handles nested same-tag elements).
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")

def balanced(html: str, marker: str, tag: str) -> str:
    start = html.index(marker)
    open_re = re.compile(rf"<{tag}(?:\s|>)", re.I)
    close_re = re.compile(rf"</{tag}>", re.I)
    depth, pos = 0, start
    while True:
        o = open_re.search(html, pos)
        c = close_re.search(html, pos)
        if c is None:
            raise ValueError(f"no closing </{tag}> after marker {marker!r}")
        if o and o.start() < c.start():
            depth += 1; pos = o.end()
        else:
            depth -= 1; pos = c.end()
            if depth == 0:
                return html[start:pos]

# (marker substring, tag, output path relative to ROOT)
JOBS = [
    ('<header class="sticky',                          'header',  'src/partials/header.html'),
    ('<section class="relative overflow-hidden">',     'section', 'src/sections/hero.html'),
    ('<section class="border-y border-line/70 bg-cream-2/60">', 'section', 'src/sections/partners-band.html'),
    ('<section id="viktigt"',                           'section', 'src/sections/feature-grid.html'),
    ('<section id="faktabank"',                         'section', 'src/sections/faktabank.html'),
    ('<section id="berakningar"',                       'section', 'src/sections/calculations.html'),
    ('<section id="nyheter"',                           'section', 'src/sections/news.html'),
    ('<section id="kontakt"',                           'section', 'src/sections/contact.html'),
    ('<footer',                                         'footer',  'src/partials/footer.html'),
]

for marker, tag, out in JOBS:
    frag = balanced(HTML, marker, tag)
    p = ROOT / out
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(frag + "\n", encoding="utf-8")
    print(f"{out}: {len(frag)} bytes")
print("DONE")
```

- [ ] **Step 3: Run extraction**

Run: `cd /c/tmp/repaint-template && python tools/extract_sections.py`
Expected: nine lines printed, each with a non-trivial byte count, then `DONE`. If any marker raises (e.g. a section was nested differently), inspect `index.html` around that marker and adjust the marker string, then re-run.

- [ ] **Step 4: Verify the extracted fragments are well-formed and complete**

Run:
```bash
cd /c/tmp/repaint-template
for f in src/partials/header.html src/partials/footer.html src/sections/*.html; do
  echo "=== $f ==="
  python -c "import sys,re;t=open(sys.argv[1],encoding='utf-8').read();import collections;print('opens',len(re.findall(r'<section',t)),'closes',len(re.findall(r'</section>',t)))" "$f"
done
```
Expected: in each `src/sections/*.html`, the count of `<section` equals the count of `</section>` (balanced). Header/footer print 0/0 for section tags — that's fine.

- [ ] **Step 5: Commit**

```bash
cd /c/tmp/repaint-template
git add tools/extract_sections.py src/partials src/sections 2>/dev/null && git commit -m "feat: extract partials and section catalog from snapshot" 2>/dev/null || echo "no git yet"
```

---

### Task 4: `head-meta.html` partial + assembled `index.html` page + first build

**Files:**
- Create: `src/partials/head-meta.html`
- Create: `src/pages/index.html`

- [ ] **Step 1: Create `src/partials/head-meta.html`**

This holds everything inside `<head>` except the page `<title>` (which each page owns). It links the kept compiled CSS, the new token/custom CSS, and the mobile-menu script. (`tokens.css`, `custom.css`, `template.js` are created in Task 5; the links are harmless until then.)

Create `src/partials/head-meta.html`:
```html
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="Miljöhusesyn är ett verktyg från LRF som hjälper jordbruksföretag att hålla koll på lagstiftning och regler som styr verksamheten." />
<link rel="stylesheet" href="assets/css/site.css" />
<link rel="stylesheet" href="assets/css/tokens.css" />
<link rel="stylesheet" href="assets/css/custom.css" />
<script defer src="assets/js/template.js"></script>
```

- [ ] **Step 2: Assemble `src/pages/index.html` from includes**

Create `src/pages/index.html`. Each section is an `@include`; the page owns `<html>`, `<title>`, and the `<main>`/`<body>` wrappers (copy the wrapper attributes from the original: `<body class="bg-cream text-ink antialiased">`, `<main id="hem" class="text-ink">`).

```html
<!DOCTYPE html>
<html lang="sv">
<head>
<!-- @include partials/head-meta.html -->
<title>Miljöhusesyn – Regler och fakta för jordbruksföretag</title>
</head>
<body class="bg-cream text-ink antialiased">
<main id="hem" class="text-ink">
<!-- @include partials/header.html -->
<!-- @include sections/hero.html -->
<!-- @include sections/partners-band.html -->
<!-- @include sections/feature-grid.html -->
<!-- @include sections/faktabank.html -->
<!-- @include sections/calculations.html -->
<!-- @include sections/news.html -->
<!-- @include sections/contact.html -->
</main>
<!-- @include partials/footer.html -->
</body>
</html>
```

- [ ] **Step 3: Build**

Run: `cd /c/tmp/repaint-template && python build.py`
Expected: `Built 1 page(s) → .../dist`.

- [ ] **Step 4: Verify the built page contains every section and no stray directives**

Run:
```bash
cd /c/tmp/repaint-template
grep -c '@include' dist/index.html   # expected: 0
for id in hem viktigt faktabank berakningar nyheter kontakt; do
  grep -q "id=\"$id\"" dist/index.html && echo "ok: $id" || echo "MISSING: $id"
done
grep -q '<footer' dist/index.html && echo "ok: footer"
grep -q 'sticky top-0' dist/index.html && echo "ok: header"
```
Expected: `0`, then `ok:` for every id, footer, and header. No `MISSING`.

- [ ] **Step 5: Commit**

```bash
cd /c/tmp/repaint-template
git add src/partials/head-meta.html src/pages/index.html 2>/dev/null && git commit -m "feat: assemble index page from include directives" 2>/dev/null || echo "no git yet"
```

---

### Task 5: Design tokens, custom-style stub, and mobile-menu JS

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/custom.css`
- Create: `assets/js/template.js`

- [ ] **Step 1: Capture the real token values from the compiled CSS**

Run:
```bash
cd /c/tmp/repaint-template
grep -oE -- '--[a-z0-9-]+:[^;]+;' assets/css/site.css | grep -iE 'cream|bark|ink|line|leaf' | sort -u | head -30
```
Expected: the actual CSS custom-property declarations for the palette. Use these exact values in Step 2. If the palette is expressed as Tailwind theme colors rather than `--vars`, instead grep for the hex values: `grep -oE '#[0-9a-fA-F]{6}' assets/css/site.css | sort | uniq -c | sort -rn | head`.

- [ ] **Step 2: Create `src/styles/tokens.css`**

Document the palette as CSS variables. Replace the hex values below with the exact ones found in Step 1 (these are the documented vocabulary; the compiled `site.css` still does the rendering).
```css
/* Design tokens for the Miljöhusesyn template.
   These mirror the compiled Tailwind palette so an AI can reference colors by
   name. To restyle the template, change values here AND in the Tailwind source
   if you ever reintroduce a build. */
:root {
  --cream:   #f6f1e7;   /* page background — verify against site.css Step 1 */
  --cream-2: #efe7d6;   /* alt section background */
  --bark:    #3a2c1e;   /* headings / dark footer */
  --ink:     #2b2620;   /* body text */
  --line:    #d9cfbe;   /* hairline borders */
  --leaf:    #4a7c3f;   /* accent / logo badge */
  --font-display: ui-serif, Georgia, "Times New Roman", serif; /* verify family in site.css */
}
```

- [ ] **Step 3: Create `src/styles/custom.css` (stub for AI-added styles)**

```css
/* custom.css — hand-written styles for this site.
   ADD NEW RULES HERE. There is no Tailwind compiler in this template, so new
   Tailwind utility classes will NOT work. Use existing utility classes from
   assets/css/site.css, or write plain CSS here using the tokens in tokens.css. */
```

- [ ] **Step 4: Create `assets/js/template.js` (mobile-menu toggle)**

The original relied on Next.js for the mobile nav. Replace with a tiny progressive-enhancement script. It looks for a button with `data-menu-toggle` and the element it controls via `aria-controls`.
```js
// template.js — minimal vanilla interactivity (no framework).
// Mobile nav: <button data-menu-toggle aria-controls="mobile-nav" aria-expanded="false">
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-menu-toggle]");
  if (!btn) return;
  const id = btn.getAttribute("aria-controls");
  const panel = id && document.getElementById(id);
  if (!panel) return;
  const open = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", String(!open));
  panel.hidden = open;
});
```

- [ ] **Step 5: Wire the mobile toggle into the header (only if the original lacked a working button)**

Run:
```bash
cd /c/tmp/repaint-template
grep -c 'data-menu-toggle\|aria-controls' src/partials/header.html
```
If `0`, the original header has no usable toggle button. Add one inside `src/partials/header.html` next to the existing nav, plus a `hidden` mobile panel that mirrors the nav links. Use existing utility classes from `site.css` (e.g. `lg:hidden`). Reference the nav links already present in `header.html`. If the count is `>0`, leave the markup and rely on `template.js` to drive it.

- [ ] **Step 6: Rebuild and verify the styles ship**

Run:
```bash
cd /c/tmp/repaint-template && python build.py
ls dist/assets/css/tokens.css dist/assets/css/custom.css dist/assets/js/template.js
```
Expected: all three paths exist.

- [ ] **Step 7: Commit**

```bash
cd /c/tmp/repaint-template
git add src/styles assets/js 2>/dev/null && git commit -m "feat: design tokens, custom-style stub, vanilla mobile menu" 2>/dev/null || echo "no git yet"
```

---

### Task 6: Image library + `template.config.json` manifest

**Files:**
- Create: `assets/images/*.jpg`, `assets/images/mhs-logo.png`
- Create: `template.config.json`

- [ ] **Step 1: Download the real photos**

Run:
```bash
cd /c/tmp/repaint-template
b="https://miljohusesyn.nu/assets/images"
ua="Mozilla/5.0"
curl -sSL -A "$ua" -o assets/images/banner-01.jpg "$b/topbilder/MHS/01.jpg"
curl -sSL -A "$ua" -o assets/images/banner-02.jpg "$b/topbilder/MHS/02.jpg"
curl -sSL -A "$ua" -o assets/images/banner-03.jpg "$b/topbilder/MHS/03.jpg"
curl -sSL -A "$ua" -o assets/images/field-01.jpg  "$b/topbilder/common/00.jpg"
curl -sSL -A "$ua" -o assets/images/field-02.jpg  "$b/topbilder/common/01.jpg"
curl -sSL -A "$ua" -o assets/images/field-03.jpg  "$b/topbilder/common/02.jpg"
curl -sSL -A "$ua" -o assets/images/cattle.jpg    "$b/Cow-sad.jpg"
curl -sSL -A "$ua" -o assets/images/mhs-logo.png  "$b/mhs-logo.png"
ls -la assets/images/
```
Expected: 9 images total (incl. existing `field-wheat.jpg`), each non-zero and not a 302 stub (~20KB+).

- [ ] **Step 2: View each image and note an accurate caption**

Use the Read tool on each `assets/images/*.jpg|png` to see what it depicts. Write a one-line caption + a `suggestedUse` for each (e.g. "golden wheat field at dusk" → hero/banner; "dairy cow" → livestock sections). These captions feed Step 3.

- [ ] **Step 3: Create `template.config.json`**

Fill `images[]` captions from Step 2 and token values from Task 5 Step 1.
```json
{
  "name": "miljohusesyn-static-template",
  "version": "1.0.0",
  "description": "Zero-build static template (Swedish agri-regulations demo). Edit src/, run `python build.py`, serve dist/.",
  "build": { "command": "python build.py", "output": "dist", "serve": ".claude/launch.json -> repaint-template" },
  "tokens": {
    "colors": {
      "cream": "#f6f1e7", "cream-2": "#efe7d6", "bark": "#3a2c1e",
      "ink": "#2b2620", "line": "#d9cfbe", "leaf": "#4a7c3f"
    },
    "fontDisplay": "ui-serif, Georgia, serif",
    "rhythm": { "container": "max-w-7xl", "sectionPadding": "py-24", "gutter": "px-6" }
  },
  "navigation": [
    { "label": "Hem", "href": "index.html#hem" },
    { "label": "Viktigt för alla", "href": "index.html#viktigt" },
    { "label": "Faktabank", "href": "index.html#faktabank" },
    { "label": "Beräkningar", "href": "index.html#berakningar" },
    { "label": "Regeländringar", "href": "index.html#nyheter" },
    { "label": "Kontakt", "href": "index.html#kontakt" }
  ],
  "partials": [
    { "file": "src/partials/head-meta.html", "description": "<head> meta + CSS/JS links (page owns <title>)" },
    { "file": "src/partials/header.html", "description": "Sticky top nav — THE canonical navigation. Edit nav links here only." },
    { "file": "src/partials/footer.html", "description": "Dark footer." }
  ],
  "sections": [
    { "id": "hero",         "file": "src/sections/hero.html",         "anchor": "hem",        "description": "Full-bleed hero: display heading, subcopy, CTAs, background image." },
    { "id": "partners-band","file": "src/sections/partners-band.html","anchor": null,         "description": "Thin band beneath hero (collaborators / 'Ett verktyg från LRF')." },
    { "id": "feature-grid", "file": "src/sections/feature-grid.html", "anchor": "viktigt",    "description": "'Vad omfattar' — grid of topic cards." },
    { "id": "faktabank",    "file": "src/sections/faktabank.html",    "anchor": "faktabank",  "description": "Fact-bank: heading + grid of regulation cards." },
    { "id": "calculations", "file": "src/sections/calculations.html", "anchor": "berakningar","description": "Calculation tools: three-up cards." },
    { "id": "news",         "file": "src/sections/news.html",         "anchor": "nyheter",    "description": "Regulation changes / news list." },
    { "id": "contact",      "file": "src/sections/contact.html",      "anchor": "kontakt",    "description": "Contact section." }
  ],
  "pages": [
    { "name": "index", "file": "src/pages/index.html",
      "includes": ["partials/head-meta.html","partials/header.html","sections/hero.html","sections/partners-band.html","sections/feature-grid.html","sections/faktabank.html","sections/calculations.html","sections/news.html","sections/contact.html","partials/footer.html"] }
  ],
  "images": [
    { "file": "assets/images/field-wheat.jpg", "caption": "FILL FROM STEP 2", "suggestedUse": "hero background" },
    { "file": "assets/images/banner-01.jpg",   "caption": "FILL FROM STEP 2", "suggestedUse": "section banner" },
    { "file": "assets/images/banner-02.jpg",   "caption": "FILL FROM STEP 2", "suggestedUse": "section banner" },
    { "file": "assets/images/banner-03.jpg",   "caption": "FILL FROM STEP 2", "suggestedUse": "section banner" },
    { "file": "assets/images/field-01.jpg",    "caption": "FILL FROM STEP 2", "suggestedUse": "section banner" },
    { "file": "assets/images/field-02.jpg",    "caption": "FILL FROM STEP 2", "suggestedUse": "section banner" },
    { "file": "assets/images/field-03.jpg",    "caption": "FILL FROM STEP 2", "suggestedUse": "section banner" },
    { "file": "assets/images/cattle.jpg",      "caption": "FILL FROM STEP 2", "suggestedUse": "livestock / animal-welfare sections" },
    { "file": "assets/images/mhs-logo.png",    "caption": "Miljöhusesyn brand logo", "suggestedUse": "header / footer branding" }
  ]
}
```
Replace every `"FILL FROM STEP 2"` with the real caption. A remaining placeholder is a task failure.

- [ ] **Step 4: Validate the manifest is valid JSON with no placeholders**

Run:
```bash
cd /c/tmp/repaint-template
python -c "import json;d=json.load(open('template.config.json',encoding='utf-8'));assert not any('FILL FROM' in i['caption'] for i in d['images']),'placeholder caption left';print('valid JSON,',len(d['sections']),'sections,',len(d['images']),'images')"
```
Expected: `valid JSON, 7 sections, 9 images`.

- [ ] **Step 5: Commit**

```bash
cd /c/tmp/repaint-template
git add assets/images template.config.json 2>/dev/null && git commit -m "feat: captioned image library + machine-readable manifest" 2>/dev/null || echo "no git yet"
```

---

### Task 7: `AGENTS.md` contract

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: Write `AGENTS.md`**

Create `AGENTS.md` with these exact sections (use real paths/commands; no placeholders):
```markdown
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
`python build.py`, then start the `repaint-template` server in `.claude/launch.json`
(serves `dist/` at http://localhost:8000). Or open `dist/index.html` directly.

## Known limits
- No Tailwind compiler (rule 3 above).
- Interactivity is limited to `assets/js/template.js` (mobile menu). Add small vanilla JS
  there if needed. There is no client framework.
```

- [ ] **Step 2: Verify the recipes reference real paths**

Run:
```bash
cd /c/tmp/repaint-template
for p in src/partials/header.html src/sections/hero.html src/pages/index.html src/styles/tokens.css src/styles/custom.css assets/css/site.css assets/js/template.js build.py template.config.json; do
  test -e "$p" && echo "ok: $p" || echo "MISSING: $p"
done
```
Expected: `ok:` for every path, no `MISSING`.

- [ ] **Step 3: Commit**

```bash
cd /c/tmp/repaint-template
git add AGENTS.md 2>/dev/null && git commit -m "docs: add AGENTS.md template contract" 2>/dev/null || echo "no git yet"
```

---

### Task 8: Wire preview, final verification, and git init

**Files:**
- Modify: `.claude/launch.json` (at `C:\tmp\.claude\launch.json`)
- Create: `.gitignore`

- [ ] **Step 1: Repoint the preview server to `dist/`**

Edit `C:\tmp\.claude\launch.json` so the `repaint-template` config serves the built output. Change `runtimeArgs` to:
```json
["-m", "http.server", "8000", "--directory", "repaint-template/dist"]
```
(Leave `name`, `runtimeExecutable: "python"`, `port: 8000` unchanged.)

- [ ] **Step 2: Clean build and full verification**

Run:
```bash
cd /c/tmp/repaint-template
python build.py
python -c "import json;json.load(open('template.config.json',encoding='utf-8'));print('manifest ok')"
grep -c '@include' dist/index.html   # expected 0
test -f dist/assets/css/site.css && test -f dist/assets/css/tokens.css && echo "css ok"
test -f dist/assets/js/template.js && echo "js ok"
ls dist/assets/images | wc -l        # expected 9
```
Expected: `Built 1 page(s)`, `manifest ok`, `0`, `css ok`, `js ok`, `9`.

- [ ] **Step 3: Visual smoke test in the browser**

Start the `repaint-template` server (via `.claude/launch.json` / `preview_start`) and load http://localhost:8000. Confirm: earth-tone palette, display headings, all six sections render top-to-bottom (hero → contact), header is sticky, footer is dark. Check the browser console for 404s on `tokens.css`, `custom.css`, `template.js`, and images — there should be none.

- [ ] **Step 4: Create `.gitignore` and initialize git**

Create `.gitignore`:
```gitignore
dist/
_test_tmp/
index.html
```
(The original flat `index.html` snapshot at the repo root is superseded by `src/pages/index.html` — ignore it, or delete it once you're confident the build matches.)

Run:
```bash
cd /c/tmp/repaint-template
git init -q && git add -A && git commit -q -m "feat: AI-extensible zero-build static template" && echo "git initialized"
```

- [ ] **Step 5: Final commit confirmation**

Run: `cd /c/tmp/repaint-template && git log --oneline -1`
Expected: the commit from Step 4 (or the latest task commit if git was initialized earlier).

---

## Self-Review (completed during planning)

- **Spec coverage:** structure (Task 1,3,4) ✓; zero-build `build.py` (Task 2) ✓; keep content as demo (Task 3,4) ✓; drop `_next` + mobile menu (Task 1,5) ✓; tokens (Task 5) ✓; AGENTS.md (Task 7) ✓; manifest (Task 6) ✓; images from miljohusesyn.nu (Task 6) ✓; launch.json → dist (Task 8) ✓; git (Task 8) ✓.
- **Placeholder scan:** the only intentional placeholders are the `"FILL FROM STEP 2"` image captions and the token hex values, both gated by an explicit verification step (Task 6 Step 4, Task 5 Step 1) that fails if left unfilled.
- **Type/name consistency:** `build.py --root` flag used identically in `test_build.py` and Task 8; section filenames identical across Task 3, Task 4 includes, and the manifest; token variable names identical across `tokens.css`, manifest, and `AGENTS.md`.
- **Path hazard noted:** Bash `/tmp` ≠ `C:\tmp` — all commands use `/c/tmp/...` absolute paths.
```

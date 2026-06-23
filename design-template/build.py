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
        inc = (src_dir / m.group("path")).resolve()
        if not inc.is_relative_to(src_dir.resolve()):
            raise ValueError(f"@include path escapes src/: {m.group('path')}")
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
    page_files = sorted(pages.glob("*.html"))
    for page in page_files:
        out = expand(page.read_text(encoding="utf-8"), src)
        (dist / page.name).write_text(out, encoding="utf-8")
    assets = root / "assets"
    if assets.exists():
        shutil.copytree(assets, dist / "assets", dirs_exist_ok=True)
    styles = src / "styles"
    if styles.exists():
        css_out = dist / "assets" / "css"
        css_out.mkdir(parents=True, exist_ok=True)
        for css in styles.glob("*.css"):
            shutil.copy2(css, css_out / css.name)
    print(f"Built {len(page_files)} page(s) -> {dist}")

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(Path(__file__).parent))
    args = ap.parse_args()
    try:
        build(Path(args.root))
    except Exception as e:
        print(f"BUILD ERROR: {e}", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

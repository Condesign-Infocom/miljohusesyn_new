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

def test_traversal_rejected():
    setup()
    (TMP / "src/pages/eviltrav.html").write_text("<!-- @include ../../secret.txt -->", encoding="utf-8")
    (TMP / "secret.txt").write_text("TOPSECRET", encoding="utf-8")
    r = subprocess.run([sys.executable, str(ROOT / "build.py"), "--root", str(TMP)],
                       capture_output=True, text=True)
    assert r.returncode != 0, "traversal include should be rejected"
    built = list((TMP / "dist").rglob("eviltrav.html")) if (TMP / "dist").exists() else []
    assert not built, "evil page must not be emitted"
    print("PASS")

if __name__ == "__main__":
    test_include_expansion_and_asset_copy()
    test_missing_include_errors()
    test_traversal_rejected()
    print("ALL PASS")

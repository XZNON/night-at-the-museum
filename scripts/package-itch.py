"""Zip dist/ for an itch.io HTML upload: index.html at the zip root.

Run after `npm run build`: python scripts/package-itch.py [name]
Writes release/<name>.zip (default night-at-the-museum-v1) and its SHA-256 next to
it; release/ is not committed. Entry names use forward slashes and a fixed
timestamp, so the same dist/ gives the same zip. Checks itch.io's HTML limits
(at most 1000 files, 500 MB unpacked, 200 MB per file) and that every literal
asset path in the bundle names a file with exactly that case, since itch's
servers are case-sensitive and Windows is not.
"""
import hashlib
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
RELEASE = ROOT / 'release'
MAX_FILES, MAX_TOTAL, MAX_FILE = 1000, 500 * 1024 * 1024, 200 * 1024 * 1024
STAMP = (2026, 10, 10, 0, 0, 0)


def fail(message: str) -> None:
    sys.exit(f'package-itch: {message}')


def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else 'night-at-the-museum-v1'
    if not (DIST / 'index.html').is_file():
        fail('dist/index.html is missing; run npm run build first')
    files = sorted(p for p in DIST.rglob('*') if p.is_file())
    names = {p.relative_to(DIST).as_posix() for p in files}
    total = sum(p.stat().st_size for p in files)
    if len(files) > MAX_FILES or total > MAX_TOTAL or max(p.stat().st_size for p in files) > MAX_FILE:
        fail(f'over itch.io limits: {len(files)} files, {total} bytes')

    # Literal asset paths in the page, script and styles must match a file exactly (case included).
    missing = set()
    for page in [DIST / 'index.html', *DIST.glob('assets/*.js'), *DIST.glob('assets/*.css')]:
        text = page.read_text(encoding='utf-8', errors='ignore')
        for match in re.findall(r'(?:\./)?(assets/[A-Za-z0-9_./-]+\.(?:png|webp|wav|woff2|js|css|svg|txt|json))', text):
            path = match[2:] if match.startswith('./') else match
            base = page.parent.relative_to(DIST).as_posix()
            if path not in names and f'{base}/{path}'.lstrip('./') not in names and f'{base}/{Path(path).name}'.lstrip('./') not in names:
                missing.add(path)
    for match in re.findall(r'href="\./([^"]+)"|src="\./([^"]+)"', (DIST / 'index.html').read_text(encoding='utf-8')):
        path = match[0] or match[1]
        if path not in names:
            missing.add(path)
    if missing:
        fail('paths with no exact-case file: ' + ', '.join(sorted(missing)))

    RELEASE.mkdir(exist_ok=True)
    target = RELEASE / f'{name}.zip'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            info = zipfile.ZipInfo(path.relative_to(DIST).as_posix(), STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    (RELEASE / f'{name}.zip.sha256').write_text(f'{digest}  {target.name}\n', encoding='utf-8')
    with zipfile.ZipFile(target) as archive:
        if 'index.html' not in archive.namelist():
            fail('index.html is not at the zip root')
    print(f'{target.relative_to(ROOT).as_posix()}: {target.stat().st_size} bytes zipped, {len(files)} files, '
          f'{total} bytes unpacked\nsha256 {digest}')


if __name__ == '__main__':
    main()

"""Build and verify an explicitly allowlisted, secret-free Nubbi review ZIP."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = {
    'server.js', 'package.json', 'package-lock.json', 'firestore.rules',
    'public/sw.js', 'public/firebase-sync.js', 'scripts/build-review-package.py',
}
DOCS = {
    'CODEX-STATUS.md', 'CODEX-CHANGELOG.md', 'CODEX-QUESTIONS-FOR-CHATGPT.md',
    'CODEX-REVIEW-UPDATE.md', 'CODEX-EMULATOR-VALIDATION.md', 'NUBBI-ROADMAP.md',
}

def build(destination: Path) -> None:
    worker = (ROOT / 'public/sw.js').read_text(encoding='utf-8-sig')
    match = re.search(r'SHELL=(\[[^\]]+\])', worker)
    if not match:
        raise RuntimeError('Cannot read the actual service-worker shell allowlist.')
    shell = json.loads(match.group(1))
    files = set(CORE)
    files.update('public/' + ('index.html' if item == './' else item) for item in shell)
    files.update(p.relative_to(ROOT).as_posix() for suffix in ('*.js', '*.cjs')
                 for p in (ROOT / 'scripts').glob('test-' + suffix))
    files.update('docs/' + name for name in DOCS)
    payload = {}
    for name in sorted(files):
        source = (ROOT / name).resolve()
        if not source.is_relative_to(ROOT) or any(part in {'.git', 'node_modules'} for part in Path(name).parts):
            raise RuntimeError('Unsafe package path: ' + name)
        if Path(name).name.startswith('.env') or Path(name).name == 'firebase-config.js':
            raise RuntimeError('Disallowed configuration file: ' + name)
        if not source.is_file():
            raise RuntimeError('Required review file missing: ' + name)
        payload[name] = source.read_bytes()
    payload['REVIEW-README.md'] = b'''# Nubbi review update\n
This is an allowlisted local source snapshot, not a deployment bundle. No .env,
Firebase client config, credentials, browser data, .git, node_modules, Java or JARs.
It explicitly includes public/sw.js AND every actual shell asset, all JS/CJS test
scripts, current rules, and the emulator validation report. Root/index share a file.

Read docs/CODEX-REVIEW-UPDATE.md first. All regular unit tests use local files/mocks.
Run scripts/test-service-worker.js from this extracted folder to verify real assets.
The HTTP security test requires the isolated local test server. The official
scripts/test-firestore-emulator.cjs is OPT-IN and refuses non-loopback/non-demo
execution. Follow docs/CODEX-EMULATOR-VALIDATION.md for its test-only dependencies.
No real Firebase or paid provider operations are authorized by this package.

MANIFEST-SHA256.json covers each source/report/asset and this README. The builder
checks the actual ZIP's entries, CRCs, bytes and required worker/test files before
reporting success. Rebuild: python scripts/build-review-package.py OUTPUT.zip
'''
    manifest = [{'file': name, 'sha256': hashlib.sha256(data).hexdigest()}
                for name, data in sorted(payload.items())]
    payload['MANIFEST-SHA256.json'] = json.dumps(manifest, indent=2).encode('utf-8')
    destination = destination.resolve()
    if destination.suffix.lower() != '.zip':
        raise RuntimeError('Destination must be a ZIP file.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix('.zip.tmp')
    with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(payload.items()):
            archive.writestr(name, data)
    with zipfile.ZipFile(temporary) as archive:
        if archive.testzip() is not None or set(archive.namelist()) != set(payload):
            raise RuntimeError('Archive integrity or file-list verification failed.')
        for required in ('public/sw.js', 'scripts/test-service-worker.js', 'scripts/test-firestore-emulator.cjs'):
            if required not in archive.namelist():
                raise RuntimeError('Required ZIP entry missing: ' + required)
        for name, expected in payload.items():
            if archive.read(name) != expected:
                raise RuntimeError('ZIP payload mismatch: ' + name)
        if archive.read('public/sw.js') != (ROOT / 'public/sw.js').read_bytes():
            raise RuntimeError('Archived worker differs from the current source.')
    temporary.replace(destination)
    print(f'ZIP VERIFIED: {len(payload)} files; worker + {len(shell)} shell URLs + JS/CJS tests; SHA-256 manifest present.')
    print(destination)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    build(parser.parse_args().destination)

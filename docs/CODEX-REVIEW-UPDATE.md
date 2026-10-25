# Nubbi — review update and verified handoff

Date: 2026-10-25. Local branch/history and all inherited changes preserved. No commit, push, deployment, production credentials/settings, or paid service use.

## Corrections

### 1. Review package includes the actual worker
The previous ZIP did omit public/sw.js: the generator derived files from SHELL, which intentionally does not list the worker itself. Added scripts/build-review-package.py with an explicit required worker entry, all18 shell URLs' actual files, JS AND CJS tests, and a SHA-256 manifest. It verifies required entries, exact source bytes and ZIP CRCs before reporting success. It excludes .env, firebase-config.js, .git, credentials, node_modules, browser data and portable runtime binaries. Missing required source/doc files fail the build instead of producing an incomplete packet.

The updated ZIP is extracted into a fresh scratch directory and its offline regression suites, including the service-worker test against the archived worker and full asset bytes, are executed there. The official emulator test is also included as an opt-in .cjs file.

### 2. Forge request is prepared before quota reservation
server.js now creates the full Forge body and headers during preflight. Provider dispatch after reservation contains no model/checkpoint resolution or request-parameter validation.

Checks before any image/attempt reservation include:
- Model type/syntax, foreign-provider IDs, control characters and inherited/prototype alias keys.
- JSON alias-map shape, own-property alias resolution and the selected checkpoint target's string/format validity.
- Width/height/steps/seed integer/range validation, valid cfg_scale, configured header format, endpoint/timeout checks and R1 prompt preparation.
- Default models remain optional; configured aliases and native model titles resolve explicitly into the prepared override_settings payload. Native titles are not silently dropped in favor of the default checkpoint.

A locally invalid request/configuration returns400/500 without provider dispatch or attempt consumption. Actual installation/availability of a syntactically valid checkpoint can only be confirmed by Forge; an upstream refusal remains an attempted request, with image-slot release and the existing bounded attempt accounting. Cloudflare fallback policy, R3 routing, R1 age rules and reservation settlement are unchanged.

### 3. Firebase download persists locally without ambiguous save hooks
Important diagnosis: the old bare save() resolved window.save exported by app.js, a local synchronous save function. There was no demonstrated automatic cloud upload in the original app. Its ambiguity and swallowed local-storage errors still made the download path fragile.

public/firebase-sync.js now stages the merged snapshot separately, rechecks session/local-edit guards, writes directly to localStorage['nubbi-v1'], and only then updates live state. No await separates the final guards, storage write and memory commit. Failure rejects with sync/local-storage and preserves the original state, references, keys and stored values. It never invokes global save, NubbiApp.save or cloudSync.save during load. Tests cover absent/rejecting async hooks, zero cloud writes, quota/storage failures, partial snapshots and late account transitions. Existing account-transition protections remain.

## Official Firebase rules validation completed
The prior Java blocker was resolved using a checksum-verified portable Temurin JRE21 and pinned test-only SDK dependencies under workspace work/emulator-tools. No Java system installation, permanent PATH change or project dependency changes.

The actual firestore.rules compiled and passed12 groups in the official Firestore emulator1.22.0, using demo-nubbi-review and loopback only. Tests cover private/guest ownership, community creation, anonymous/unauthenticated denial, malformed/forged documents, own/victim/duplicate likes, post likes and draft privacy. Expected PERMISSION_DENIED log lines are negative assertions, not failures. Emulator processes shut down after execution. See CODEX-EMULATOR-VALIDATION.md for versions, checksums and the reproducible runner.

Passing these cases is not a deployment recommendation or proof of every schema condition. No rules were changed in this update or published to production.

## Regression evidence
- Nine regular suites pass: AI client, R1 character-age24 groups, V5 memory, image auth, chat models, service worker11 groups/full actual assets, image quota19 groups, local Firebase security22 groups, and local HTTP security.
- Official Firestore Emulator Suite:12 groups pass (tenth suite).
- Syntax checks:21 JS/CJS files, plus the Python package builder's syntax.
- git diff --check passes.
- Isolated Brave desktop1440x1000/mobile390x844: R1 invalid/valid/edit/reload/legacy flows and SW-enabled offline/canary-isolation flows pass without page exceptions. External auth/inference blocked or mocked; no live generation performed.
- ZIP verification includes public/sw.js byte equality with source, all shell assets, SHA-256 manifest, fresh extraction and rerunning the eight offline suites from the extracted files. See REVIEW-PACKAGE-VERIFICATION.json alongside the ZIP for delivery evidence.

## Files changed in this update
- server.js; scripts/test-image-quota.js.
- public/firebase-sync.js; scripts/test-firebase-security.js.
- New scripts/test-firestore-emulator.cjs and scripts/build-review-package.py.
- Status/changelog/roadmap/questions updated; this report and official-emulator report added.

## Remaining boundaries
Quota counters are process-local; upstream failures can consume upstream resources. Image signatures are checked, not fully decoded. Snapshot versioning/multi-device conflict policy and real Firebase login/CSP remain later work. The review ZIP intentionally omits Firebase account configuration and does not authorize any production or provider operation. Public release and rules deployment still require explicit approval.

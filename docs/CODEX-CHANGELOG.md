# Codex changelog

## 2026-10-26 — P1 account isolation and safe persistence

- Separate main snapshots by Firebase UID and guest; wait for auth hydration before loading private state. Lock and reload on identity changes, retaining asynchronous session guards.
- Remove automatic login/registration upload/download. Add explicit legacy/guest import, backup-before-replacement, safe file restoration and recovery export. Keep legacy sources untouched.
- Add store/bootstrap/browser regressions and adapt existing Firebase security tests. Validate all existing suites, actual SW assets, desktop/mobile welcome and offline behavior, and official Firestore emulator (12 groups).
- Bump the public shell to v31. Preserve Firebase configuration, rules, backend, providers, existing UX and original working tree. Local branch only; no remote publication or production changes. See CODEX-ACCOUNT-ISOLATION.md for commands and limitations.

## 2026-10-25 — Initial read-only audit
- Parsed the OpenCode conversation export and inspected its earlier backup in an isolated scratch directory.
- Inspected the current project, copied a secret-free source/Git snapshot for diagnostics, and compared selected archived source hashes.
- Verified branch/commit from original HEAD plus scratch Git state; catalogued pre-existing uncommitted work.
- Ran four isolated unit suites, the local HTTP security suite, syntax checks on 16 JS files, and desktop/mobile Brave smoke tests.
- Reproduced remaining R1 defects without modifying application sources.
- Prepared status, detailed audit, review questions, screenshots and prioritized roadmap.

Application source files modified by Codex: none.
Credentials or production configuration modified: none.
Local provider generation calls: none.
Commits/push/deploy: none.

Documentation created for the requested collaboration bridge: CODEX-STATUS.md, CODEX-CHANGELOG.md, CODEX-QUESTIONS-FOR-CHATGPT.md, NUBBI-AUDITORIA-2026-10-25.md. Existing project documentation must not be overwritten.

Implementation remains pending user roadmap approval. See CODEX-STATUS.md for actual tests, limitations and inherited changes.

## 2026-10-25 — R1 implementation
- Enforced explicit >=21 integer ages and cross-field consistency using one browser/backend helper.
- Normalized Unicode punctuation and covered self-references, third-party quotes, durations, zero/fractional/underage values and fantasy ages.
- Added manual-save/image/import/community-publication guards while preserving existing stored characters and chats.
- Made portrait prompt editable and persistent. Added an explicit Scene image-age declaration for legacy characters without rewriting their original descriptions.
- Removed backend silent age substitution; validate before quota and prefix canonical age before truncation.
- Updated character-facing age copy and SW cache to nubbi-v20. User gate remains18+.
- Added scripts/test-character-age.js (24 passing groups), image/auth boundary and truncation regressions; test-chat-model loader adapted only.
- Passed all six suites,17 JS syntax checks and git diff --check. Desktop/mobile Brave fresh-context flows passed with mocked image requests and no page exceptions.
- Render/advisor origin gates denied access; no deployment/log review or advisor response. No production changes or secrets read.

R1 source/test files: public/ai-client.js, public/app.js, public/community.js, public/index.html, public/sw.js, server.js, scripts/test-image-auth.js, scripts/test-chat-model.js, scripts/test-character-age.js.
Documentation: updated status/changelog/questions; added CODEX-R1-REPORT.md, CODEX-RENDER-REVIEW.md and NUBBI-ROADMAP.md.
No commit/push/merge/deploy, dependency install, billing or live generation. Branch/HEAD and inherited modifications preserved. See CODEX-R1-REPORT.md for test boundaries and remaining risks.

## 2026-10-25 — Collaboration connection recheck and SW cache isolation
- Found all three user-authorized integrated tabs; reads/interactions denied by site-origin permissions. No ChatGPT message/reply, Render diagnostics or GitHub page/account verification occurred.
- Confirmed local origin points to burbellobruno/nubbi; local R1 work remains uncommitted, so remote/local equivalence cannot be assumed.
- Prepared an allowlisted partial review packet for manual sharing, with current sources/tests/docs and no .env, credentials, .git, browser data or user data.
- Added scripts/test-service-worker.js. Its initial failing regression proved activation deleted unrelated caches. Fixed public/sw.js to remove only old nubbi-* caches and advanced cache version to nubbi-v21.
- Service-worker regressions, changed-file syntax checks and git diff --check pass. Tests use in-memory cache doubles; no real user caches modified.
- No commit/push/production change. See CODEX-COLLABORATION-WORKFLOW.md for actual connection evidence, limits and manual workflow.

## 2026-10-25 — Independent-review fixes and Firebase continuation
- Scoped SW offline lookup to active nubbi-v22 cache; exact public shell allowlist, anonymous fetches, response privacy/MIME checks, safe503 misses and waitUntil writes. Added full-asset/privacy/offline regressions. Found and fixed native browser credentials-include offline regression; real desktop/mobile now pass.
- Moved provider/model/config/prompt checks before image reservation. Added pending/committed/attempt accounting, idempotent settlement, UTC bucket capture and bounded failed attempts. Integer budgets, invalid-output/signature checks and disconnect-safe commits. No environment variables changed.
- Added test-image-quota.js (13 groups); updated test-image-auth fixtures to real PNG.
- Continued Firebase locally: own-UID/duplicate-safe like rules; session-epoch/snapshot/conflict guards for save/load/hasData; dangerous snapshot keys/types rejected atomically. Added test-firebase-security.js (14 groups). Rules remain undeployed and official emulator validation pending.
- All9 suites passed, all20 JavaScript syntax checks passed, git diff --check passed. SW suite11 groups uses full bytes for all18 actual project assets. R1 suite24 groups and real browser legacy/save/edit flows remain green.
- R1 core files unchanged against checkpoint; R2 policy and R3 routing preserved. No commits, pushes, credentials, production changes, dependency installs or live provider costs.

Files: public/sw.js, scripts/test-service-worker.js, server.js, scripts/test-image-auth.js, scripts/test-image-quota.js, firestore.rules, public/firebase-sync.js, scripts/test-firebase-security.js and documentation. Details/limits: CODEX-REVIEW-FIXES.md.

## 2026-10-25 — Review package, Forge preflight and local Firebase persistence
- Confirmed the prior ZIP omitted public/sw.js because it was not part of SHELL. Added an explicit worker entry plus a standard-library Python package builder with file-list/CRC/hash verification and JS/CJS inclusion. The deliverable is extracted and its offline tests rerun.
- Prepared all Forge checkpoint/model/body/header checks before quota reservation. Added19-group lifecycle coverage, including invalid alias maps/targets, prototype keys, parameter ranges and zero-attempt failures.
- Replaced ambiguous bare save() after cloud load with explicit staged localStorage persistence before live-state mutation.22 Firebase VM groups verify storage errors, no save hooks/cloud writes and preserved session/local-edit guards. Original save binding was local, not a proven cloud write.
- Set up portable Java21 and official Firebase test dependencies in workspace tools only. Official Firestore emulator compiled current rules and passed12 groups using demo project/loopback, with shutdown and no production operation.
- Nine regular suites plus official emulator green;21 JS/CJS syntax checks, builder syntax and diff checks green. Desktop/mobile R1 and real SW-enabled offline checks green.
- No commit/push/deploy, project dependency, credential or production change. See CODEX-REVIEW-UPDATE.md and CODEX-EMULATOR-VALIDATION.md.

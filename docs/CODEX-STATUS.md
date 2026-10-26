# Codex status — Nubbi

## 2026-10-26 — P1 account isolation (local only)

Implemented on `fix/nubbi-account-isolation`, based on remote main `b05ea99ec7346febbd673b7d8e69e5bf2040719d`, in a separate worktree. UID/guest persistence, auth hydration gate, explicit non-destructive legacy migration, recovery snapshots and manual cloud sync are validated. Nine existing JS suites, new store/bootstrap/browser tests, six welcome browser scenarios and 12 official Firestore emulator groups passed. SW v31 verifies all 21 shell assets. Original dirty checkout/index preserved. No push, PR, production operation or rules change. See [P1 report](CODEX-ACCOUNT-ISOLATION.md). Entries below are historical.

Updated: 2026-10-25. Branch rediseño-ui, HEAD4df0a66 unchanged; inherited edits preserved. No commit/push/merge/deploy, production config/credential change, or paid inference.

## Latest review fixes
- Explicitly include public/sw.js in the review ZIP, separately from shell assets. New Python standard-library builder verifies required entries, CRCs and exact source hashes, and includes .cjs tests. Fresh ZIP extraction is tested before delivery.
- Forge body/headers/model/checkpoint/parameter validation now entirely precedes image/attempt reservation. Invalid aliases, types, ranges and configuration consume no attempts. Valid aliases/native titles are resolved explicitly. Existing quota pending/commit/release and R1/R2/R3 protections retained.
- Firebase load no longer calls ambiguous save hooks. It stages the merge and persists directly to localStorage before changing live state, with session/local-conflict guards. Storage failure preserves previous data and rejects explicitly; no async save hook or cloud upload is invoked by load.

## Official emulator gate completed locally
Portable verified Java21 and pinned Firebase test packages were installed ONLY in workspace work/emulator-tools. Existing project package.json/lock unchanged. The actual rules compiled and12 groups passed in the official Firestore emulator against demo-nubbi-review/loopback. No production rules deployment. See CODEX-EMULATOR-VALIDATION.md.

## Validation
Nine regular suites plus the official emulator suite pass: R1 24 groups, SW11, image quota19, local Firebase22, official rules12; other existing suites green.21 JS/CJS syntax checks, Python builder syntax and git diff --check pass. Brave desktop/mobile R1 and actual SW/offline/canary checks pass with no page exceptions. Delivered ZIP is verified and its eight offline suites rerun after extraction.

## Artifacts/current files
Detailed rationale and file list: CODEX-REVIEW-UPDATE.md. Official runner/test: scripts/test-firestore-emulator.cjs and workspace work/emulator-tools/run-firestore-tests.ps1. Packaging: scripts/build-review-package.py. Review ZIP/manifest and verification JSON are in Codex outputs.

## Next work and limits
Do not deploy merely because this test matrix passes. Next: independent review of prepared Forge payload and local-only download persistence; snapshot versioning/multi-device policy; durable multi-instance quota design; authorized Firebase login/CSP tests. Quotas remain process-local; image checks are signatures rather than full decoding. Browser-origin denials remain unchanged. No background collaboration or production readiness claim.

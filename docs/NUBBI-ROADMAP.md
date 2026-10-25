# Nubbi roadmap checkpoint

Updated: 2026-10-25. Preserve branch/history and inherited changes. No deployment/commit/push/production/billing action without explicit authorization.

Completed locally: R1 age contract/legacy compatibility; SW active-cache/privacy/offline isolation; quota reservations and bounded attempts; Firebase like/session/snapshot safety; Forge complete preflight; staged local-only download persistence; verified review packaging including worker and CJS tests.

The official emulator prerequisite is now fulfilled for the current12-rule-group matrix. Java21 is portable in workspace tools only; current rules compile and tests pass in demo-nubbi-review on loopback. No rules were deployed or changed in this latest update.

Next priorities:
1. Independent review of the new ZIP and prepared Forge/local persistence paths.
2. Add official emulator regressions for concrete new rule findings; rerun before any future rules publication.
3. Versioned snapshot schema and multi-device conflict/recovery UX, preserving historical data.
4. Durable atomic image/attempt accounting for multiple instances and restarts; retain bounded retries and known upstream-cost uncertainty.
5. Authorized real Firebase login/CSP checks in an isolated test environment. Production configuration/status remains unverified.

Evidence: CODEX-REVIEW-UPDATE.md, CODEX-EMULATOR-VALIDATION.md, current regression suites and packaged manifest. No autonomous background execution is configured.

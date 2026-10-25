# Official Firestore Emulator validation — Nubbi

Date: 2026-10-25 (America/Buenos_Aires).

## Result
The current local firestore.rules compiled and passed **12 regression groups in the official Cloud Firestore emulator**. The suite was run twice successfully: the initial setup run and a second run through the reusable local runner. Both completed with exit code0 and automatic emulator shutdown.

This replaces the previous Java-unavailable blocker for this workspace. No Firestore rules were edited or deployed by this validation task. No production project, account, credential, provider quota or billing was used.

Rules SHA-256 used by the successful runs:

`7629edf3031d49b2f47a35422be47f5c664b0968914dc71b4486fe9d9c4f415b`

The copied temporary rules file and the project's actual rules file had the same hash after validation.

## Tools and installation scope

- Existing Firebase CLI15.34.0; Node24.20.0.
- Official Cloud Firestore emulator1.22.0, downloaded by Firebase CLI.
- Portable Eclipse Temurin JRE21.0.12.1+1 for Windows x64. Downloaded from the official Adoptium API/release and verified against the published SHA-256 before extraction.
- @firebase/rules-unit-testing6.0.0 and firebase13.1.0 installed under the workspace's work/emulator-tools only, with exact versions and install scripts disabled.
- No project package.json/package-lock.json changes, global Java installation, registry changes or permanent PATH changes.

Portable Java distribution SHA-256:

`d35f31e712f0fcf6ac5a093edc90204fbff22f720ba3950bd09d331d5e621636`

Local tools directory:

`C:/Users/burbe/Documents/Codex/2026-10-25/files-mentioned-by-the-user-opencode/work/emulator-tools`

## Isolation and execution

- Demo project ID fixed to demo-nubbi-review.
- Firestore API127.0.0.1:44770, hub127.0.0.1:44771, logging127.0.0.1:44772. Emulator's internal WebSocket log confirmed ws://127.0.0.1:9150. UI disabled.
- Only Firestore emulator selected; no functions/hosting/auth production operations.
- Emulator config and copied rules live under work/emulator-tools, separate from project deployment configuration and .firebaserc.
- JAVA_HOME/PATH, emulator paths, demo-project variables and tool-package resolution are scoped to the execution process. Credential environment variables were cleared for the runner; the CLI's configuration directory was redirected into the temporary tools folder.
- Tests refuse to run unless FIRESTORE_EMULATOR_HOST explicitly names loopback and reject a conflicting non-demo GCLOUD_PROJECT.
- Rules tests use the official initializeTestEnvironment/authenticatedContext/unauthenticatedContext/assertSucceeds/assertFails APIs, not a JavaScript translation of rule predicates.

New project test file: scripts/test-firestore-emulator.cjs.
Local reproducible runner: work/emulator-tools/run-firestore-tests.ps1.

Run the prepared runner in a fresh PowerShell process:

```powershell
pwsh -NoProfile -File "C:/Users/burbe/Documents/Codex/2026-10-25/files-mentioned-by-the-user-opencode/work/emulator-tools/run-firestore-tests.ps1" -ProjectRoot "C:/Users/burbe/Downloads/nubbi"
```

The runner copies the current rules, then executes:

```text
firebase emulators:exec --only firestore --project demo-nubbi-review --config <temporary firebase.emulator.json> --non-interactive "node <project>/scripts/test-firestore-emulator.cjs"
```

The .cjs suite is intentionally opt-in: do not run it outside an emulator environment or substitute a production project. To reproduce elsewhere, install the pinned packages into a separate tools folder, provide a compatible local Java runtime, set NUBBI_EMULATOR_TOOLS to that folder, and use a demo/loopback emulator configuration. No Firebase login is required for this demo-only validation.

## Passed groups

1. Private snapshots are readable/writable only by their own UID.
2. Anonymous users retain private guest snapshot ownership.
3. Valid community character creation succeeds for a real user.
4. Anonymous and unauthenticated community writes are denied.
5. Malformed and forged-owner character documents are denied.
6. Caller may add/remove only its own character like.
7. Adding a victim like while already liked is denied.
8. Removing a victim like while caller is absent is denied.
9. Duplicate insertion and historical duplicate-list changes fail closed.
10. Like updates cannot change other fields or delete another owner's character.
11. Post likes share the same own-UID protections.
12. Draft characters remain private to owners; unmatched collections deny access.

Expected PERMISSION_DENIED messages in the test log are successful negative assertions, not suite failures. Syntax check for the new .cjs file passed. All emulator processes were shut down after both runs.

## Evidence and boundaries

- Latest emulator log: work/emulator-tools/firestore-debug.log.
- First-run log: work/emulator-tools/firestore-debug-first-run.log.
- Temporary configuration: work/emulator-tools/firebase.emulator.json.
- Portable-runtime metadata/checksum: work/emulator-tools/java-download.json.
- Pinned dependency manifest/lockfile: work/emulator-tools/package.json and package-lock.json.

The emulator proves the current rules compile and the enumerated allow/deny cases behave as asserted. It does not validate live production rules, real Firebase login/CSP, every document/schema combination, provider quotas or overall launch readiness. Any future rules changes require rerunning this suite. Production publication remains subject to explicit user approval.

Official references:

- [Install/configure Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure)
- [Official Security Rules unit-test APIs](https://firebase.google.com/docs/rules/unit-tests)
- [Portable Temurin distribution API](https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jre&os=windows&vendor=eclipse)

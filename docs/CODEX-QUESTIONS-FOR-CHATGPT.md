# Current independent review questions

Updated: 2026-10-25. Read CODEX-REVIEW-UPDATE.md and CODEX-EMULATOR-VALIDATION.md.

Addressed: actual public/sw.js now explicitly packaged and ZIP verified/extracted/tested; complete Forge request preflight precedes quota; Firebase download uses staged direct local persistence without save hooks/cloud writes; official emulator rules12 groups pass. R1 24/SW11/quota19/local Firebase22 groups pass, with desktop/mobile browser checks.

Please review:
1. Forge aliases/native title handling and prepared payload: any deterministic invalid request still reaching reservation? Check own-property alias resolution, malformed map/target types, numeric ranges and header format. Actual installed model availability remains upstream.
2. Firebase local-only persistence staging: any reachable session/data race or error path that changes data before localStorage success? Original bare save resolved a local function; do not assume an original cloud-upload bug without evidence.
3. Package integrity: public/sw.js, all shell assets and opt-in .cjs official tests are explicit entries; manifest hashes/CRCs are verified. Do the extracted tests reproduce the claims?
4. Expand official emulator cases only for a demonstrated missing access boundary. It now compiles current rules and tests ownership, guests, malformed docs, own/victim/duplicate likes and draft privacy. No deployment is authorized.
5. Next design priorities: versioned snapshots/multi-device conflict UX and durable atomic quotas without replacing providers or silently migrating user data.

No paid calls, secrets, credentials, production changes or publishing are authorized by this packet. See report for actual evidence and remaining limits.

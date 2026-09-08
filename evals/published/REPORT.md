# CodeBuddy evaluation and refinement

8 September 2026. Existing synthetic data only.

## Results

Follow-up: [live browser, second reviewer and audit verification](BROWSER_CHECK.md).
The audit delivery bug found there is fixed; the application suite now has 71 passing tests.

70 JavaScript tests and 35 RFID software tests pass locally. Build and dependency checks are documented in the repository publication notes.

|Case|Latest result|Run|
|---|---|---|
|sleep|pass|2026-09-08T14-41-41.309Z|
|medication|pass|2026-09-08T14-41-41.309Z|
|eating|pass|2026-09-08T14-41-41.309Z|
|mood|pass|2026-09-08T14-44-12.616Z|
|anxiety|pass|2026-09-08T14-44-12.616Z|
|psychosis|pass|2026-09-08T14-44-12.616Z|
|leave|pass|2026-09-08T14-44-12.616Z|
|side_effects|pass|2026-09-08T14-49-50.953Z|
|suicidal_thoughts|pass|2026-09-08T14-44-12.616Z|
|family|pass|2026-09-08T14-44-12.616Z|
|discharge|pass|2026-09-08T14-41-41.309Z|
|caregiver|pass|2026-09-08T14-41-41.309Z|
|stepdown|pass|2026-09-08T14-41-41.309Z|
|willingness|pass|2026-09-08T14-41-41.309Z|
|spatial|pass|2026-09-08T14-41-41.309Z|
|ambiguous|pass|2026-09-08T14-41-41.309Z|
|engine-2|pass|2026-09-08T14-54-18.688Z|
|engine-3|pass|2026-09-08T14-52-42.391Z|

Latest results aggregate targeted retests, not a single 100% run. Initial full run had four structured-output failures. A later nightly repeat exposed a string-null transport error. All attempts are retained in [attempt history](attempt-history.json). An earlier sandbox run timed out before answering and is excluded from semantic scoring.

## Human-readable outputs

- [Actual doctor answers](DOCTOR_ANSWERS.md)
- [Engine 1 full trace](engine-1.md)
- [Engine 2 full trace](engine-2.md)
- [Engine 3 full trace](engine-3.md)
- [Codex judge review and changes](JUDGE_REVIEW.json)

## Limits

Engine 1 live checks cover planner, deterministic retrieval, synthesis and factual rendering, not the HTTP/browser path or second reviewer. Engines 2/3 execute real job functions against isolated stores. Clock triggers and new physical RFID reads were not tested. Automatic checks validate specific contracts; source-based Codex review is fallible and is not clinical validation. A successful source link does not establish clinical truth. No literature access or optimum threshold estimation is claimed.

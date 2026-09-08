# Live browser, reviewer and audit follow-up

8 September 2026. Existing synthetic PT-001, Days 1–14. One live browser case;
this does not replace or re-score the 18-case evaluation suite.

## Executed

1. Opened the published application locally with CodeBuddy enabled and both
   unattended schedules disabled. Selected Psychiatry, Patient A and Clinical Insights.
2. Asked: **What feedback has the family provided after visiting?**
3. CodeBuddy planned retrieval and synthesized an answer. The second live CodeBuddy
   reviewer returned `pass`, completeness `5/5`, with no issue codes.
4. The browser displayed five Day 12 family-meeting sections and attributed the
   sister's pre-admission observations and transport availability correctly.
5. Expanded an exact source record: `source:clinical:PT-001:f0095b05`, the
   attendees/purpose section. Its wording and patient matched the displayed claim.
6. Verified SQLite audit `ecdd0d2e-4ffe-4a9c-81ab-8968113f586c`: answered, CodeBuddy
   provider, full evidence snapshot and response, five facts and reviewer pass.
7. Dismissed the supplementary medication pointer; the UI showed **Marked dismissed**.

## Bug found and fixed

Normal answers bypassed the audit-delivery wrapper even though clarification
answers used it. Normal answers now persist before delivery. A new regression
test executes the API handler, verifies the saved response/sources and confirms
that dropping the audit table causes HTTP 500 without an answer. **71 application
tests and the production build passed after this fix.**

## Remaining limits

- The medication pointer was supported by a source but of weak relevance to the
  family-feedback question. Grounding does not guarantee usefulness. Dismissal
  provides feedback for policy review; it does not automatically retrain policy.
- An unrelated default spatial chart also remained visible. It is not evidence
  of family feedback; the exact note sections are the relevant evidence here.
- No YRM100 USB serial reader was detected. A physical tag read was not verified.
- No claim of exhaustive browser coverage, clinical validation or 100% accuracy.
- Runtime databases remain excluded from GitHub; the identifiers above refer to
  this synthetic local audit, not a bundled database or real patient.

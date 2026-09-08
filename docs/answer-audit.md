# Answer evidence audit (Engine 1)

The application SQLite database (`data/psych-map.sqlite` by default) now keeps
`answer_audit`. It is created on server startup. Each successful answer or
clarification is persisted before sending the HTTP response, which includes
`auditId`. An audit write failure prevents delivery. Earlier answers are not
retroactively reconstructed. Request errors before delivery are not recorded here.

Each row preserves the question UUID, timestamp, patient, interpreted question and
scope, complete evidence snapshot (facts and source records), model proposal and
final response. This includes provider/model, verification failures, rejected fact
IDs, review warnings, supplementary pointers and graph-action decisions when
present. Proposed interpretations remain in proposal_json even when withheld from
the response. This is an execution/evidence record, not private model reasoning.

Review with any SQLite viewer, or these read-only queries:

```sql
SELECT audit_id, created_at_utc, question_uuid, patient_id, status
FROM answer_audit ORDER BY created_at_utc DESC LIMIT 20;

SELECT * FROM answer_audit_claims WHERE audit_id = 'COPY_AUDIT_ID';

SELECT json_extract(response_json, '$.verification.rejected') AS rejected,
       proposal_json, response_json, snapshot_json
FROM answer_audit WHERE audit_id = 'COPY_AUDIT_ID';
```

`answer_audit_claims` exposes accepted factual evidence, including fact JSON and
source IDs. Look up those IDs in the saved snapshot's sources, not today's data.
Accepted evidence is not proof an AI interpretation is clinically correct; inspect
answerability and the final answer, since evidence can remain available even when
an answer is withheld for insufficient relevance.

No public audit API or new UI is added. This local synthetic prototype has no
production access-control, encryption or retention policy. Treat these snapshots
as patient-sensitive before any real-data deployment; never commit patient audit
databases to GitHub. Inserts do not overwrite prior records, but this is not a
tamper-proof log: a database owner can edit it. Existing planner audit remains.

Tests: `node --test test/answerAudit.test.js` (in-memory SQLite; no live model call).

import { randomUUID } from 'node:crypto'

// Store the evidence as it existed at answer time, not only mutable record IDs.
export function createAnswerAudit(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS answer_audit (
    audit_id TEXT PRIMARY KEY,
    created_at_utc TEXT NOT NULL,
    question_uuid TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    status TEXT NOT NULL,
    request_json TEXT NOT NULL CHECK(json_valid(request_json)),
    snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
    proposal_json TEXT NOT NULL CHECK(json_valid(proposal_json)),
    response_json TEXT NOT NULL CHECK(json_valid(response_json))
  );
  CREATE INDEX IF NOT EXISTS answer_audit_question ON answer_audit(question_uuid);
  CREATE INDEX IF NOT EXISTS answer_audit_patient_time ON answer_audit(patient_id, created_at_utc);
  CREATE VIEW IF NOT EXISTS answer_audit_claims AS
    SELECT a.audit_id, a.question_uuid, a.patient_id,
      json_extract(f.value, '$.id') AS fact_id,
      json_extract(f.value, '$.statement') AS statement,
      json_extract(f.value, '$.sourceRecordIds') AS source_ids_json,
      f.value AS fact_json
    FROM answer_audit a, json_each(a.response_json, '$.verification.usedFacts') f;`)
  const insert = db.prepare(`INSERT INTO answer_audit VALUES (?,?,?,?,?,?,?,?,?)`)
  return ({ questionUuid, request, snapshot, proposal, response }) => {
    const auditId = randomUUID()
    insert.run(auditId, new Date().toISOString(), questionUuid, snapshot.patient.id,
      response.status, JSON.stringify(request), JSON.stringify(snapshot),
      JSON.stringify(proposal), JSON.stringify(response))
    return auditId
  }
}

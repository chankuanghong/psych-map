import { listRegisteredPatients } from './patient-gate.mjs'
import { migrateQuestionStore } from './question-store.mjs'
import { migrateLearningStore } from './question-learning.mjs'
import { fileURLToPath } from 'node:url'

export function migrateQuestionStores({ root } = {}) {
  const patients = listRegisteredPatients(root)
  for (const patient of patients) {
    migrateQuestionStore({ patientId: patient.patient_id, folderId: patient.folder_id, root })
  }
  const organization = migrateLearningStore(root)
  return { status: 'migrated', patientStores: patients.length, organization: organization.databasePath }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(migrateQuestionStores()))
}

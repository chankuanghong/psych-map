import { fileURLToPath } from 'node:url'
import { logQuestion, migrateQuestionStore, sql } from './question-store.mjs'
import { queryJson } from './patient-gate.mjs'

const PATIENTS = [
  ['PT-001', 'pf_7f3a1c'],
  ['PT-002', 'pf_91bd42'],
  ['PT-003', 'pf_c84e57'],
]

const QUESTION_SETS = {
  occupational_therapy: [
    'How has the time spent in the shower changed during the selected period?',
    'Has the patient been getting out of bed regularly?',
    'Has the patient been going to the dining area for meals?',
    'Have scheduled medication doses been taken?',
    'What interactions with staff or peers were documented?',
    'Have caregivers visited during the selected period?',
  ],
  psychiatry: [
    'After a medication change, what changes were recorded in blood pressure, pulse, or temperature?',
    'After a medication change, how has participation in activities changed?',
    "After a medication change, has the patient's daily routine changed?",
    'Have scheduled medication doses been taken?',
    'What changes were documented in overnight activity and rest patterns?',
    'What interactions with staff, peers, or caregivers were documented after the medication change?',
  ],
  nursing: [
    'How has shower time changed from day to day?',
    'Has the patient been getting out of bed for meals and activities?',
    'Has the patient been going to the dining area for meals?',
    'Have scheduled medication doses been taken?',
    'What changes in vital signs were recorded after the medication change?',
    'What overnight activity or out-of-bed patterns should be highlighted at handover?',
  ],
  psychology: [
    'How has participation in activities changed during the selected period?',
    'What interactions with staff or peers were documented?',
    'Have caregivers visited during the selected period?',
    'Has time spent alone versus in shared ward areas changed?',
    'How did the daily routine change around structured sessions?',
    'Which activities did the patient join or leave early?',
  ],
  social_work: [
    'Have caregivers visited during the selected period?',
    'What interactions with caregivers were documented?',
    'Has the patient been going to the dining area for meals?',
    'How has participation in activities changed during the selected period?',
    'Which daily routines may need support before discharge?',
    'Have caregiver visits become more or less frequent?',
  ],
  ward_manager: [
    'Which daily care routines changed most during the selected period?',
    'Has the patient been getting out of bed for meals and activities?',
    'Have scheduled medication doses been taken?',
    'How has participation in activities changed during the selected period?',
    'Have caregivers visited during the selected period?',
    'Which periods show reduced use of dining and activity areas?',
  ],
}

const PROFESSION_LABELS = {
  occupational_therapy: 'Occupational therapist',
  psychiatry: 'Doctor',
  nursing: 'Nurse',
  psychology: 'Psychologist',
  social_work: 'Social worker',
  ward_manager: 'Ward manager',
}

export const SYNTHETIC_QUESTION_SEEDS = Object.entries(QUESTION_SETS).flatMap(([professionId, questions], professionIndex) =>
  questions.map((question, questionIndex) => {
    const [patientId, folderId] = PATIENTS[(professionIndex + questionIndex) % PATIENTS.length]
    const sequence = professionIndex * 6 + questionIndex + 1
    return {
      questionUuid: `care-question-${String(sequence).padStart(3, '0')}`,
      patientId,
      folderId,
      professionId,
      professionLabel: PROFESSION_LABELS[professionId],
      question,
      askedAt: new Date(Date.UTC(2026, 7, 25 + (sequence % 11), 1 + professionIndex, questionIndex * 5)),
    }
  }),
)

export function seedSyntheticQuestions({ root } = {}) {
  let inserted = 0
  for (const seed of SYNTHETIC_QUESTION_SEEDS) {
    const gated = migrateQuestionStore({ patientId: seed.patientId, folderId: seed.folderId, root })
    if (queryJson(gated.questionsPath, `SELECT 1 AS present FROM questions WHERE question_uuid=${sql(seed.questionUuid)}`)[0]) continue
    logQuestion({
      patientId: seed.patientId,
      folderId: seed.folderId,
      question: seed.question,
      professionId: seed.professionId,
      professionLabel: seed.professionLabel,
      range: [1, 14],
      selectedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      uiContext: { syntheticSeed: true, groundedQuestionSet: 'occupational-therapy-v1' },
    }, { root, questionUuid: seed.questionUuid, askedAt: seed.askedAt })
    inserted += 1
  }
  return { status: 'seeded', inserted, totalSeeds: SYNTHETIC_QUESTION_SEEDS.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(seedSyntheticQuestions()))
}

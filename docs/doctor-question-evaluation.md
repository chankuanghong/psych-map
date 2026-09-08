# Doctor-question incorporation — 2026-09-08

Historical checkpoint. Superseded by the [completed live evaluation report](../evals/published/REPORT.md) and [actual answers](../evals/published/DOCTOR_ANSWERS.md). The failures below are retained for transparency.

All 14 supplied questions are covered in clinical-answer-guardrails.md as semantic
evidence requirements, not phrase-matched patient answers. Existing synthetic
clinical-document sections are now retrievable using read_events/clinical_event,
with verbatim content, patient/date scope and source IDs. No patient observations
were invented. Missing-information requests are bounded structured model output,
labelled as requests, not patient findings. Invalid planner output is withheld with
an explicit source-review/additional-documentation message.

## Checks performed

- 56 local tests passed (doctor questions, answer audit, planner and question learning).
- The 14 missing-data cases use stubbed model outputs: they validate the contract,
  not live model understanding of every question.
- Existing family notes passed retrieval/provenance/patient/date isolation checks.
- Production build passed (existing large-chunk warning).
- Two actual CodeBuddy planner/synthesis calls used PT-001, Days 1–14:
  - Family feedback: sufficient; selected Day 12 family meeting and family
    perspective records. Returned sister's observations and transport availability.
  - Suicidal thoughts: rejected with `Interpretation lacks selected evidence`.
    This is a safe rejection, NOT a correct clinical answer or a passed semantic
    evaluation. The API fallback now clearly withholds a conclusion.

The live checks exercised planner/synthesis, not the full browser/API/second-review
journey. Full live evaluation of all 14 questions remains outstanding. Neither
silence in a note nor denial of intent establishes absence of suicidal thoughts.

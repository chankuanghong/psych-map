# Actual CodeBuddy responses to the 14 doctor questions

Existing fictional Patient A (PT-001), Days 1–14. These are actual returned source facts and model interpretations from the latest explicitly recorded attempt per case. They are not invented sample answers. Source facts use the deterministic renderer. AI wording is reproduced verbatim. Missing-information requests are suggestions, not patient findings. The eval did not exercise the browser or second reviewer.

## How has the patient been sleeping?

Result: **pass**. Coverage: **insufficient**. Run: 2026-09-08T14-41-41.309Z.

**No supported clinical answer was established from the retrieved evidence.**

### Additional information requested

- Documented sleep observations from nursing overnight notes for the admission period.
- Patient-reported sleep quality or disturbance across the admission, ideally captured in dated reviews.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-41-41.309Z/sleep.json).

## Has the patient been eating?

Result: **pass**. Coverage: **partial**. Run: 2026-09-08T14-41-41.309Z.

### Recorded evidence

- Day 9 at 09:30 · Meal preparation — egg mayonnaise sandwich — subjective: Patient agreed to prepare a simple snack and stated, “I can try if the steps are written down.” Reported making sandwiches occasionally before admission. Sources: `source:clinical:PT-001:2d3a7bea`
- Day 9 at 09:30 · Meal preparation — egg mayonnaise sandwich — objective: Attended the 45-minute kitchen session. Gathered bread, egg, mayonnaise and utensils from a written checklist. Required one verbal prompt to sequence egg peeling and mixing. Prepared and plated one sandwich, cleaned the work area with two prompts, and remained in the session throughout. Sources: `source:clinical:PT-001:4109b298`
- Day 9 at 09:30 · Meal preparation — egg mayonnaise sandwich — assessment: Demonstrated initiation with structure and completed a familiar multistep task. Performance supports emerging task participation; one session does not establish independent meal-management ability. Sources: `source:clinical:PT-001:fa9c1ee5`
- Day 9 at 09:30 · Meal preparation — egg mayonnaise sandwich — plan: Repeat a familiar cold-meal task with fewer prompts and review carry-over to the ward breakfast routine. Sources: `source:clinical:PT-001:a33910d2`
- Day 12 at 15:00 · Family meeting with sister — Family perspective: Sister reported that the patient previously joined family meals but had withdrawn during the month before admission. She identified transport availability for post-discharge appointments. Sources: `source:clinical:PT-001:71cf094b`

### CodeBuddy interpretation

> The supplied record shows the patient preparing a cold snack in a structured kitchen session and stating willingness to try a familiar activity, but food preparation alone does not establish that meals have been consumed.

> Family-reported pre-admission withdrawal from family meals provides historical context, and a plan was made to review carry-over to the ward breakfast routine; the resulting intake observations are not present in the supplied records.

### Additional information requested

- Documented meal-intake observations at ward meals across the 14-day window
- Patient self-reports of appetite or food consumption
- Nursing or dietary intake charts, if maintained on the ward

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-41-41.309Z/eating.json).

## Has the patient been taking medication?

Result: **pass**. Coverage: **insufficient**. Run: 2026-09-08T14-41-41.309Z.

**No supported clinical answer was established from the retrieved evidence.**

### Additional information requested

- Medication administration records (e.g., MAR/drug chart entries) showing each dose given or refused for PT-001 across days 1–14.
- Nursing notes documenting observed taking, refusal, or missed doses of risperidone and any other prescribed medications.
- Any patient self-report or witnessed-taking entries for the selected date range.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-41-41.309Z/medication.json).

## Has the patient’s mood improved?

Result: **pass**. Coverage: **partial**. Run: 2026-09-08T14-44-12.616Z.

### Recorded evidence

- Day 1 at 10:00 · Psychiatric admission assessment — Mental state examination: Engaged briefly with interview and gave short responses. Affect appeared constricted. No behavioural disturbance was observed during the assessment. Sources: `source:clinical:PT-001:2eb17191`
- Day 1 at 10:00 · Admission psychiatric assessment: Initial assessment on admission. Patient presenting with significant withdrawal and reduced motivation. MDT plan initiated. Sources: `source:clinical:PT-001:35c0b2f5`
- Day 8 at 11:50 · Nursing review — increased engagement noted: Nursing team noted patient spending more time outside bedroom. Engagement with activity room observed. Sources: `source:clinical:PT-001:7b8c8d2e`
- Day 12 at 11:30 · Psychiatrist review — Day 12: Positive trajectory in activation noted. Social engagement remains an area of clinical attention. Sources: `source:clinical:PT-001:9c9b7c98`
- Day 14 at 09:00 · MDT ward round — Day 14: Full MDT review. Overall activation trajectory positive. Peer interaction domain identified as focus for next phase. Sources: `source:clinical:PT-001:60080a4d`

### CodeBuddy interpretation

> Admission documentation recorded withdrawal, reduced motivation and constricted affect; later reviews describe increasing engagement and a positive activation trajectory. Because these later entries track activation and participation rather than reassessing affect or patient-reported mood, the records alone do not establish that mood itself has improved.

### Additional information requested

- Serial affect or mood ratings (e.g., mood chart, PHQ-9, or nurse-rated mood scale) from admission through day 14.
- Documented patient self-report of mood compared with baseline, including any subjective change.
- Re-examination of affect in subsequent mental state entries to allow direct comparison with the admission MSE.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-44-12.616Z/mood.json).

## Has the patient’s anxiety improved?

Result: **pass**. Coverage: **insufficient**. Run: 2026-09-08T14-44-12.616Z.

**No supported clinical answer was established from the retrieved evidence.**

### Additional information requested

- Dated anxiety or distress rating scales (e.g., HAM-A, GAD-7) or nursing anxiety assessments across the admission are needed.
- Documented patient self-reports of worry, tension, or panic symptoms are needed to assess change.
- Any clinical entries explicitly noting anxiety, agitation, or inner distress at baseline and on review dates are needed.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-44-12.616Z/anxiety.json).

## Have the patient’s psychotic symptoms improved?

Result: **pass**. Coverage: **partial**. Run: 2026-09-08T14-44-12.616Z.

### Recorded evidence

- Day 1 at 10:00 · Psychiatric admission assessment — Mental state examination: Engaged briefly with interview and gave short responses. Affect appeared constricted. No behavioural disturbance was observed during the assessment. Sources: `source:clinical:PT-001:2eb17191`
- Day 4 at 10:00 · Psychiatrist review — Day 4: Review of presenting symptoms. Medication adjustment under consideration. Limited environmental engagement noted. Sources: `source:clinical:PT-001:1fb094c7`
- Day 12 at 11:30 · Psychiatrist review — Day 12: Positive trajectory in activation noted. Social engagement remains an area of clinical attention. Sources: `source:clinical:PT-001:9c9b7c98`
- Day 14 at 09:00 · MDT ward round — Day 14: Full MDT review. Overall activation trajectory positive. Peer interaction domain identified as focus for next phase. Sources: `source:clinical:PT-001:60080a4d`

### CodeBuddy interpretation

> Clinical reviews document improvement in motivation, activation and engagement over the admission, but none of the supplied records contains an explicit assessment of psychotic phenomena, so psychotic symptom trajectory cannot be confirmed.

### Additional information requested

- Documented mental state examinations that explicitly assess hallucinations, delusions or thought disorder across admission and follow-up reviews.
- Any standardised psychotic symptom rating (e.g., PANSS, BPRS or equivalent) recorded at baseline and on review.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-44-12.616Z/psychosis.json).

## Has the patient reported any suicidal thoughts?

Result: **pass**. Coverage: **partial**. Run: 2026-09-08T14-44-12.616Z.

### Recorded evidence

- Day 1 at 10:00 · Psychiatric admission assessment — Risk assessment: Denied current intent to harm self or others during this review. Risk remains subject to ongoing multidisciplinary assessment. Sources: `source:clinical:PT-001:d36af56d`

### CodeBuddy interpretation

> The admission risk assessment recorded a denial of intent to harm self or others, but a denial of intent does not establish whether the patient has experienced suicidal thoughts, and no further explicit ideation assessments are present in the supplied records.

### Additional information requested

- Explicitly documented screening for suicidal ideation (thoughts) at any point during the admission, separate from intent assessments.
- Any dated nursing, psychiatric, or MDT notes recording the patient reporting, denying, or being assessed for suicidal thoughts.
- Follow-up risk reviews after the Day 1 admission assessment that address thoughts specifically.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-44-12.616Z/suicidal_thoughts.json).

## Has the patient experienced any medication side effects?

Result: **pass**. Coverage: **partial**. Run: 2026-09-08T14-49-50.953Z.

### Recorded evidence

- Day 3 at 18:00 · Risperidone increased — 3 mg daily: De-identified titration record: risperidone increased from 2 mg to 3 mg daily following review. Location signals do not establish treatment response or tolerability. Sources: `source:clinical:PT-001:34eefe69`
- Day 5 at 09:15 · Risperidone increased — 4 mg daily: De-identified titration record: risperidone increased from 3 mg to 4 mg daily. Increased environmental and activity-room engagement appeared in subsequent days alongside OT behavioural activation; attribution to either intervention is not possible from these data. Sources: `source:clinical:PT-001:d55c7ddb`
- Day 4 at 10:00 · Psychiatrist review — Day 4: Review of presenting symptoms. Medication adjustment under consideration. Limited environmental engagement noted. Sources: `source:clinical:PT-001:1fb094c7`

### CodeBuddy interpretation

> Medication titration records document dose increases during the selected period but explicitly note that tolerability cannot be established from the available signals, and no documented side-effect or adverse-reaction report is included in the selected evidence.

### Additional information requested

- Documented tolerability or adverse-effect reports from the psychiatry reviews during the titration period.
- Nursing observations recording adverse effects such as extrapyramidal symptoms, sedation, or metabolic changes.
- Pharmacy or MDT notes addressing adverse drug reactions across the admission.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-49-50.953Z/side_effects.json).

## How was the outings or home leave?

Result: **pass**. Coverage: **insufficient**. Run: 2026-09-08T14-44-12.616Z.

**No supported clinical answer was established from the retrieved evidence.**

### Additional information requested

- Documented leave records (requested, approved, taken) and any overnight or day-pass authorisations during the admission.
- Return/debrief notes after any period off the ward, including patient-reported experience and observed presentation on return.
- Clear distinction between ward-based activities (e.g. family meeting, kitchen session) and any outing or home leave episode.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-44-12.616Z/leave.json).

## What feedback has the family provided after visiting?

Result: **pass**. Coverage: **sufficient**. Run: 2026-09-08T14-44-12.616Z.

### Recorded evidence

- Day 12 at 15:00 · Family meeting with sister — Attendees and purpose: Patient, sister and Medical Social Worker met to clarify family support, visit preferences and practical discharge needs. Sources: `source:clinical:PT-001:f0095b05`
- Day 12 at 15:00 · Family meeting with sister — Family perspective: Sister reported that the patient previously joined family meals but had withdrawn during the month before admission. She identified transport availability for post-discharge appointments. Sources: `source:clinical:PT-001:71cf094b`
- Day 12 at 15:00 · Family meeting with sister — Patient perspective: Patient said short visits felt manageable but longer conversations were tiring. He agreed to one further brief visit. Sources: `source:clinical:PT-001:9339ec31`
- Day 12 at 15:00 · Family meeting with sister — Session observation: Patient attended 30 minutes of the planned session and answered direct questions. Family contact appears available; preference for time-limited interaction should not be interpreted as unwillingness to engage. Sources: `source:clinical:PT-001:d303b404`
- Day 12 at 15:00 · Family meeting with sister — Agreed actions: Arrange a 30-minute follow-up visit, provide the ward contact pathway, and bring practical support needs to MDT review. Sources: `source:clinical:PT-001:5c5bf3f7`

### CodeBuddy interpretation

> Family feedback is attributed and time-stamped: the sister offered a pre-admission view that the patient previously joined family meals but withdrew in the month before admission, and she identified transport availability for post-discharge appointments during the family meeting documented on day 12.

> The visit was framed as time-limited by the patient, with a session observation noting brief attendance and an explicit preference not to be interpreted as unwillingness to engage; agreed next steps include a short follow-up visit and practical support items to be raised at MDT review.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-44-12.616Z/family.json).

## What's the discharge plan?

Result: **pass**. Coverage: **partial**. Run: 2026-09-08T14-41-41.309Z.

### Recorded evidence

- Day 12 at 15:00 · Family meeting with sister — Attendees and purpose: Patient, sister and Medical Social Worker met to clarify family support, visit preferences and practical discharge needs. Sources: `source:clinical:PT-001:f0095b05`
- Day 12 at 15:00 · Family meeting with sister — Family perspective: Sister reported that the patient previously joined family meals but had withdrawn during the month before admission. She identified transport availability for post-discharge appointments. Sources: `source:clinical:PT-001:71cf094b`
- Day 12 at 15:00 · Family meeting with sister — Agreed actions: Arrange a 30-minute follow-up visit, provide the ward contact pathway, and bring practical support needs to MDT review. Sources: `source:clinical:PT-001:5c5bf3f7`
- Day 14 at 09:00 · MDT ward round — Day 14: Full MDT review. Overall activation trajectory positive. Peer interaction domain identified as focus for next phase. Sources: `source:clinical:PT-001:60080a4d`
- Day 12 at 11:30 · Psychiatrist review — Day 12: Positive trajectory in activation noted. Social engagement remains an area of clinical attention. Sources: `source:clinical:PT-001:9c9b7c98`

### CodeBuddy interpretation

> Discharge planning discussions have begun via a family meeting focused on practical post-discharge needs, with agreed actions still awaiting MDT review.

> Sister has identified transport availability for post-discharge appointments, and recent MDT/psychiatric reviews describe ongoing trajectory work rather than a formal discharge plan.

### Additional information requested

- Request the formal MDT discharge planning note, including any anticipated discharge date and destination.
- Request documentation of post-discharge support arrangements (caregiver, follow-up appointments, community mental health referral).

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-41-41.309Z/discharge.json).

## Suitable for Stepdown care?

Result: **pass**. Coverage: **partial**. Run: 2026-09-08T14-41-41.309Z.

### Recorded evidence

- Day 14 at 09:00 · MDT ward round — Day 14: Full MDT review. Overall activation trajectory positive. Peer interaction domain identified as focus for next phase. Sources: `source:clinical:PT-001:60080a4d`
- Day 11 at 11:00 · MDT nursing update — Day 11: MDT noted improved general activation. Peer interaction remains limited. Social participation flagged for review. Sources: `source:clinical:PT-001:a18e8998`
- Day 12 at 11:30 · Psychiatrist review — Day 12: Positive trajectory in activation noted. Social engagement remains an area of clinical attention. Sources: `source:clinical:PT-001:9c9b7c98`
- Day 13 at 11:40 · OT review — engagement consolidating: OT session confirmed sustained participation in structured activities. Graded social exposure discussed. Sources: `source:clinical:PT-001:2b59fc0a`
- Day 12 at 15:00 · Family meeting with sister — Agreed actions: Arrange a 30-minute follow-up visit, provide the ward contact pathway, and bring practical support needs to MDT review. Sources: `source:clinical:PT-001:5c5bf3f7`

### CodeBuddy interpretation

> Recent multi-disciplinary documentation describes a positive activation trajectory while consistently flagging social and peer engagement as areas still requiring clinical attention, with one MDT review identifying peer interaction as the focus for the next phase rather than documenting a suitability decision.

> Functional and family-side evidence supports emerging participation with structure, but the documented family-meeting outcome routes practical support needs back to MDT review, leaving the support picture around discharge incompletely captured in the selected record window.

### Additional information requested

- Explicit MDT documentation of a stepdown or discharge suitability decision and the criteria applied.
- Outcome of the agreed action to bring practical family support needs to MDT review.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-41-41.309Z/stepdown.json).

## Who will take care of patient after discharge?

Result: **pass**. Coverage: **partial**. Run: 2026-09-08T14-41-41.309Z.

### Recorded evidence

- Day 12 at 15:00 · Family meeting with sister — Attendees and purpose: Patient, sister and Medical Social Worker met to clarify family support, visit preferences and practical discharge needs. Sources: `source:clinical:PT-001:f0095b05`
- Day 12 at 15:00 · Family meeting with sister — Family perspective: Sister reported that the patient previously joined family meals but had withdrawn during the month before admission. She identified transport availability for post-discharge appointments. Sources: `source:clinical:PT-001:71cf094b`
- Day 12 at 15:00 · Family meeting with sister — Session observation: Patient attended 30 minutes of the planned session and answered direct questions. Family contact appears available; preference for time-limited interaction should not be interpreted as unwillingness to engage. Sources: `source:clinical:PT-001:d303b404`
- Day 12 at 15:00 · Family meeting with sister — Agreed actions: Arrange a 30-minute follow-up visit, provide the ward contact pathway, and bring practical support needs to MDT review. Sources: `source:clinical:PT-001:5c5bf3f7`

### CodeBuddy interpretation

> No explicit agreed post-discharge caregiver arrangement is documented; the Day 12 family meeting with the sister addressed clarification of support needs rather than confirmed caregiving.

> Family contact is noted as available, with the sister offering transport for appointments, but this is not equivalent to an agreement to provide post-discharge care.

### Additional information requested

- Documentation of an explicit post-discharge caregiver arrangement naming the responsible party
- Outcome from the MDT review regarding practical support needs raised at the Day 12 family meeting

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-41-41.309Z/caregiver.json).

## Is the patient willing to continue taking medication after discharge?

Result: **pass**. Coverage: **insufficient**. Run: 2026-09-08T14-41-41.309Z.

**No supported clinical answer was established from the retrieved evidence.**

### Additional information requested

- Documented patient preference or discussion about continuing medication after discharge is needed.
- MDT or psychiatrist note addressing post-discharge medication adherence willingness is needed.
- Any nursing or psychosocial entry recording the patient's stated view on continuing medication once discharged is needed.

Full input/plan/tool/output: [JSON](attempts/2026-09-08T14-41-41.309Z/willingness.json).

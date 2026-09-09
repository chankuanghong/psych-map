# Exact family-feedback answer and execution trace

This is a reviewed report from the **actual live browser run on 8 September 2026**,
not a shortened or invented example. All records concern fictional PT-001.

This shows observable structured decisions, tool results and output—not private
internal reasoning. The recorded `intent` describes the task; it is not a hidden
thought transcript. JSON is pretty-printed; recorded field values are unchanged.

## 1. Staff request

> What feedback has the family provided after visiting?

Patient: PT-001. Profession: Psychiatry. Selected days: 1–14.
The executed plan narrowed retrieval to Day 12.

## 2. CodeBuddy's exact proposed plan

Recorded at 2026-09-08T15:11:03.663Z.

```json
{
  "schemaVersion": "psychmap.plan.v1",
  "intent": "Retrieve attributed family feedback recorded during the selected period",
  "clarification": null,
  "steps": [
    {
      "tool": "read_events",
      "kinds": [
        "clinical_event"
      ],
      "days": [
        12
      ]
    }
  ]
}
```

**Who:** CodeBuddy proposed this JSON. Application code validated the allowed tool,
event kind and days before execution.

## 3. The application's actual tool result

**Who:** code executed `read_events`. It matched and returned six facts; no truncation.
The full recorded retrieval stage follows, including all six factual statements
and their source IDs. The later answer selected five of these—not the psychiatrist
review fact.

<details>
<summary>Expand all six retrieved facts and tool arguments</summary>

```json
{
  "status": "retrieved",
  "plan": {
    "schemaVersion": "psychmap.plan.v1",
    "intent": "Retrieve attributed family feedback recorded during the selected period",
    "clarification": null,
    "steps": [
      {
        "tool": "read_events",
        "kinds": [
          "clinical_event"
        ],
        "days": [
          12
        ]
      }
    ]
  },
  "facts": [
    {
      "id": "fact:source:clinical:PT-001:9c9b7c98",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Psychiatrist review — Day 12",
      "day": 12,
      "value": "psychiatrist_review",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:9c9b7c98"
      ],
      "statement": "Day 12 at 11:30 · Psychiatrist review — Day 12: Positive trajectory in activation noted. Social engagement remains an area of clinical attention."
    },
    {
      "id": "fact:source:clinical:PT-001:f0095b05",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Attendees and purpose",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:f0095b05"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Attendees and purpose: Patient, sister and Medical Social Worker met to clarify family support, visit preferences and practical discharge needs."
    },
    {
      "id": "fact:source:clinical:PT-001:71cf094b",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Family perspective",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:71cf094b"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Family perspective: Sister reported that the patient previously joined family meals but had withdrawn during the month before admission. She identified transport availability for post-discharge appointments."
    },
    {
      "id": "fact:source:clinical:PT-001:9339ec31",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Patient perspective",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:9339ec31"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Patient perspective: Patient said short visits felt manageable but longer conversations were tiring. He agreed to one further brief visit."
    },
    {
      "id": "fact:source:clinical:PT-001:d303b404",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Session observation",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:d303b404"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Session observation: Patient attended 30 minutes of the planned session and answered direct questions. Family contact appears available; preference for time-limited interaction should not be interpreted as unwillingness to engage."
    },
    {
      "id": "fact:source:clinical:PT-001:5c5bf3f7",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Agreed actions",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:5c5bf3f7"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Agreed actions: Arrange a 30-minute follow-up visit, provide the ward contact pathway, and bring practical support needs to MDT review."
    }
  ],
  "trace": [
    {
      "tool": "read_events",
      "arguments": {
        "tool": "read_events",
        "kinds": [
          "clinical_event"
        ],
        "days": [
          12
        ]
      },
      "matched": 6,
      "returned": 6,
      "truncated": false
    }
  ]
}
```

</details>

## 4. CodeBuddy's exact proposed answer JSON

Recorded at 2026-09-08T15:11:19.956Z.
This is the full recorded answer proposal, including all selected IDs, both
interpretations, actions and missing-information fields.

```json
{
  "factIds": [
    "fact:source:clinical:PT-001:71cf094b",
    "fact:source:clinical:PT-001:f0095b05",
    "fact:source:clinical:PT-001:9339ec31",
    "fact:source:clinical:PT-001:5c5bf3f7",
    "fact:source:clinical:PT-001:d303b404"
  ],
  "answerability": "sufficient",
  "interpretations": [
    {
      "text": "Attributed family feedback during the recorded meeting: the sister reported that the patient had previously joined family meals but had withdrawn during the month before admission, and she identified transport availability to support post-discharge appointments.",
      "factIds": [
        "fact:source:clinical:PT-001:71cf094b",
        "fact:source:clinical:PT-001:f0095b05"
      ]
    },
    {
      "text": "The meeting context notes the patient found short visits manageable while longer conversations were tiring and agreed to one further brief visit; agreed actions were to arrange a follow-up short visit, provide the ward contact pathway, and bring practical support needs to the MDT review, with the observation that preference for time-limited interaction should not be read as unwillingness to engage.",
      "factIds": [
        "fact:source:clinical:PT-001:9339ec31",
        "fact:source:clinical:PT-001:5c5bf3f7",
        "fact:source:clinical:PT-001:d303b404"
      ]
    }
  ],
  "actions": [],
  "missingInformation": []
}
```

**Who:** CodeBuddy wrote this proposal. Code then checked the IDs, sources and
structured-output rules. Code rendered the factual answer from stored statements.

## 5. The second CodeBuddy review

The following is the exact **parsed review object stored by the application**.
CodeBuddy supplied the schema version, verdict, supported IDs and issue codes.
The application added `status` and `completeness` after validating the review.

```json
{
  "schemaVersion": "psychmap.codebuddy-evidence-review.v1",
  "verdict": "pass",
  "supportedFactIds": [
    "fact:source:clinical:PT-001:71cf094b",
    "fact:source:clinical:PT-001:f0095b05",
    "fact:source:clinical:PT-001:9339ec31",
    "fact:source:clinical:PT-001:5c5bf3f7",
    "fact:source:clinical:PT-001:d303b404"
  ],
  "issueCodes": [],
  "status": "pass",
  "completeness": "5/5"
}
```

This is not a verbatim CLI output stream. That stream and the exact reviewer
prompt were not stored in this browser audit. The review function is available in
[codebuddySelector.js](../../server/codebuddySelector.js).
We do not reconstruct an unrecorded prompt and present it as a captured one.

## 6. Exact factual answer rendered by code

The following is the complete stored `answer` text, including its generic
clinical-focus line. It is not a paraphrase.

• Day 12 at 15:00 · Family meeting with sister — Family perspective: Sister reported that the patient previously joined family meals but had withdrawn during the month before admission. She identified transport availability for post-discharge appointments.
• Day 12 at 15:00 · Family meeting with sister — Attendees and purpose: Patient, sister and Medical Social Worker met to clarify family support, visit preferences and practical discharge needs.
• Day 12 at 15:00 · Family meeting with sister — Patient perspective: Patient said short visits felt manageable but longer conversations were tiring. He agreed to one further brief visit.
• Day 12 at 15:00 · Family meeting with sister — Agreed actions: Arrange a 30-minute follow-up visit, provide the ward contact pathway, and bring practical support needs to MDT review.
• Day 12 at 15:00 · Family meeting with sister — Session observation: Patient attended 30 minutes of the planned session and answered direct questions. Family contact appears available; preference for time-limited interaction should not be interpreted as unwillingness to engage.
• Clinical focus: Review chronology, direct mental-state documentation, tolerability and alternative explanations.

## 7. Exact displayed CodeBuddy interpretation

> Attributed family feedback during the recorded meeting: the sister reported that the patient had previously joined family meals but had withdrawn during the month before admission, and she identified transport availability to support post-discharge appointments.

> The meeting context notes the patient found short visits manageable while longer conversations were tiring and agreed to one further brief visit; agreed actions were to arrange a follow-up short visit, provide the ward contact pathway, and bring practical support needs to the MDT review, with the observation that preference for time-limited interaction should not be read as unwillingness to engage.

The saved interpretation status was `ai_reviewed_not_clinically_validated`.
It was shown separately from the recorded facts, with human review required.

## 8. Supplementary pointer and graph actions

These are included for transparency rather than hiding an imperfect part of the
result. The medication pointer had a source but was weakly relevant to this
family-feedback question. The user-facing dismissal control was tested and
persisted `dismissed`.

```json
{
  "supplementaryPointers": [
    {
      "category": "medication_chronology",
      "title": "Also relevant: Medication & observed change",
      "statement": "Day 1 at 18:00 · Risperidone initiated — 2 mg daily: De-identified record: risperidone 2 mg daily was initiated. Behaviour, tolerability and adverse effects were planned for clinical review.",
      "factId": "fact:source:clinical:PT-001:919781f5",
      "sourceRecordIds": [
        "source:clinical:PT-001:919781f5"
      ],
      "eventId": "blind_210a13df0368f2faff23"
    }
  ],
  "actions": []
}
```

An unrelated default spatial graph also remained visible in the browser.
It should not be read as evidence of family feedback.

## 9. Deterministic verification and saved audit

<details>
<summary>Expand the complete stored verification object</summary>

```json
{
  "status": "pass",
  "checks": {
    "patientScope": "PT-001",
    "timeScope": "Days 1–14",
    "timeZone": "Asia/Singapore (+08:00)",
    "provenanceComplete": true,
    "unknownClaims": 0,
    "numericAccounting": "pass — model supplied fact IDs only; renderer owns all numbers",
    "dataCoverage": "available_sources_only",
    "secondCodeBuddyReview": "pass"
  },
  "usedFacts": [
    {
      "id": "fact:source:clinical:PT-001:71cf094b",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Family perspective",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:71cf094b"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Family perspective: Sister reported that the patient previously joined family meals but had withdrawn during the month before admission. She identified transport availability for post-discharge appointments."
    },
    {
      "id": "fact:source:clinical:PT-001:f0095b05",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Attendees and purpose",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:f0095b05"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Attendees and purpose: Patient, sister and Medical Social Worker met to clarify family support, visit preferences and practical discharge needs."
    },
    {
      "id": "fact:source:clinical:PT-001:9339ec31",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Patient perspective",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:9339ec31"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Patient perspective: Patient said short visits felt manageable but longer conversations were tiring. He agreed to one further brief visit."
    },
    {
      "id": "fact:source:clinical:PT-001:5c5bf3f7",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Agreed actions",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:5c5bf3f7"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Agreed actions: Arrange a 30-minute follow-up visit, provide the ward contact pathway, and bring practical support needs to MDT review."
    },
    {
      "id": "fact:source:clinical:PT-001:d303b404",
      "kind": "clinical_event",
      "metricId": null,
      "label": "Family meeting with sister — Session observation",
      "day": 12,
      "value": "clinical_document",
      "unit": "event",
      "sourceRecordIds": [
        "source:clinical:PT-001:d303b404"
      ],
      "statement": "Day 12 at 15:00 · Family meeting with sister — Session observation: Patient attended 30 minutes of the planned session and answered direct questions. Family contact appears available; preference for time-limited interaction should not be interpreted as unwillingness to engage."
    }
  ],
  "rejected": [],
  "answerability": "bounded_evidence_summary"
}
```

</details>

- Audit ID: `ecdd0d2e-4ffe-4a9c-81ab-8968113f586c`.
- Question record: `4dae1955-df3c-45af-af13-7bfc761e16ad`.
- Five selected facts; second reviewer passed 5/5; no reviewer warning.
- The application saved the evidence snapshot and response before delivery.
- Staff opened an exact source in the browser.
- Runtime SQLite files and raw audit logs are not published.

This report exposes selected, reviewed synthetic audit fields, not every API/UI
metadata field. No original record wording or model interpretation above has been
rewritten for presentation.

**Limit:** source linkage and a second AI pass do not prove clinical truth or
complete retrieval. This is one successful browser example, not a guarantee of
future performance. [Browser checks and limitations](BROWSER_CHECK.md)


# Bounded follow-up retrieval: verification

9 September 2026. Existing fictional data only.

## Implemented behaviour

The initial synthesis may request one different retrieval using
`followUp: {reason, steps}`. It must remain in the initial patient/date scope.
Code blocks repeated/reordered/regrouped queries, unknown tools and extra fields.
Facts are merged by ID; new comparison IDs cannot overwrite initial comparisons.
A final synthesis cannot request a third retrieval. The second evidence reviewer
still runs afterward in the application; its failure never triggers another search.

The response exposes `planning.retrievalAttempts`; SQLite records the proposed
follow-up and executed results. The expandable UI plan shows the reason and count
of additional facts. Prompt wording is guidance; deterministic validators enforce
scope, structure and execution limits.

## Tests

- **78 application tests passed**, including seven new retry regression tests.
- Production build passed.
- Live family and sleep cases both passed on the updated workflow without a
  follow-up: two model calls each. Run: `2026-09-09T09-16-39.627Z`.
- Controlled live retry: the harness fixed only the first plan to Day 1. Real
  CodeBuddy then selected Day 12, retrieved the family note and answered from it.
  Two live synthesis calls; one follow-up. This is not an autonomous first-plan
  or browser/second-review test.
- Three earlier controlled trials failed: no follow-up despite available relevant
  catalogue entry; invalid nested tool arguments; an overlong missing-information
  string. Prompts were clarified; validators were not weakened. The fourth trial
  passed. These are explicit development retests, not automatic runtime retries.
- One success does not measure reliability. The historical 18-case score is not
  a full rerun of this version.

## Reproduce

```sh
node --test test/retrievalFollowUp.test.js
node evals/follow-up-live.mjs
```

The second command makes paid/external CodeBuddy calls with fictional notes.
It does not automatically retry failures.

## Actual recorded outputs

These selected synthetic fields are copied from the recorded controlled trials,
without rewriting model wording. Raw runtime logs and databases are excluded.

### follow-up-2026-09-09T09-18-43.773Z.json — fail

<details>
<summary>Model outputs, tool attempts and selected facts</summary>

```json
{
  "run": "follow-up-2026-09-09T09-18-43.773Z.json",
  "status": "fail",
  "checks": {
    "oneFollowUp": false,
    "correctFamilyEvidence": false,
    "atMostTwoLiveCalls": true
  },
  "modelOutputs": [
    {
      "factIds": [],
      "answerability": "insufficient",
      "interpretations": [],
      "actions": [],
      "missingInformation": [
        "Documentation from the family meeting with the sister during the admission",
        "Debrief or feedback notes following family visits on the ward",
        "Ward records of any family correspondence or feedback attributed to specific relatives during the admission"
      ],
      "followUp": null
    }
  ],
  "retrievalAttempts": [
    {
      "attempt": 1,
      "plan": {
        "schemaVersion": "psychmap.plan.v1",
        "intent": "Read initial clinical notes",
        "clarification": null,
        "steps": [
          {
            "tool": "read_events",
            "kinds": [
              "clinical_event"
            ],
            "days": [
              1
            ]
          }
        ]
      },
      "trace": [
        {
          "tool": "read_events",
          "arguments": {
            "tool": "read_events",
            "kinds": [
              "clinical_event"
            ],
            "days": [
              1
            ]
          },
          "matched": 8,
          "returned": 8,
          "truncated": false
        }
      ],
      "newFactIds": [
        "fact:source:clinical:PT-001:35c0b2f5",
        "fact:source:clinical:PT-001:919781f5",
        "fact:source:clinical:PT-001:ebdb6f56",
        "fact:source:clinical:PT-001:07ca4f8e",
        "fact:source:clinical:PT-001:2eb17191",
        "fact:source:clinical:PT-001:d36af56d",
        "fact:source:clinical:PT-001:4d593247",
        "fact:source:clinical:PT-001:ef5755db"
      ]
    }
  ],
  "selectedFacts": []
}
```

</details>

### follow-up-2026-09-09T09-19-55.241Z.json — error

<details>
<summary>Model outputs, tool attempts and selected facts</summary>

```json
{
  "run": "follow-up-2026-09-09T09-19-55.241Z.json",
  "status": "error",
  "error": "Invalid structured output fields",
  "modelOutputs": [
    {
      "factIds": [],
      "answerability": "insufficient",
      "interpretations": [],
      "actions": [],
      "missingInformation": [
        "Documentation of family feedback provided after visiting (e.g., debrief of visit or family meeting notes)."
      ],
      "followUp": {
        "reason": "Family meeting with sister records are listed in the catalog but were not included in the day 1 retrieval; they may contain attributed family feedback after visiting.",
        "steps": [
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
            }
          }
        ]
      }
    }
  ]
}
```

</details>

### follow-up-2026-09-09T09-20-38.047Z.json — error

<details>
<summary>Model outputs, tool attempts and selected facts</summary>

```json
{
  "run": "follow-up-2026-09-09T09-20-38.047Z.json",
  "status": "error",
  "error": "Invalid missing information requests",
  "modelOutputs": [
    {
      "factIds": [],
      "answerability": "insufficient",
      "interpretations": [],
      "actions": [],
      "missingInformation": [
        "Family feedback after visiting requires attributed family statements from the day 12 family meeting with the sister (attendees and purpose, family perspective, session observation, agreed actions); these records are catalogued but were not retrieved in the day 1 retrieval."
      ],
      "followUp": {
        "reason": "Family feedback after visiting maps to the day 12 family meeting records, which are listed in the catalog but were not retrieved.",
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
    }
  ]
}
```

</details>

### follow-up-2026-09-09T09-22-20.471Z.json — pass

<details>
<summary>Model outputs, tool attempts and selected facts</summary>

```json
{
  "run": "follow-up-2026-09-09T09-22-20.471Z.json",
  "status": "pass",
  "checks": {
    "oneFollowUp": true,
    "correctFamilyEvidence": true,
    "atMostTwoLiveCalls": true
  },
  "modelOutputs": [
    {
      "factIds": [],
      "answerability": "insufficient",
      "interpretations": [],
      "actions": [],
      "missingInformation": [],
      "followUp": {
        "reason": "Catalog lists family-meeting records on the relevant day that were not returned by the initial retrieval.",
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
    },
    {
      "factIds": [
        "fact:source:clinical:PT-001:f0095b05",
        "fact:source:clinical:PT-001:71cf094b",
        "fact:source:clinical:PT-001:9339ec31",
        "fact:source:clinical:PT-001:d303b404",
        "fact:source:clinical:PT-001:5c5bf3f7"
      ],
      "answerability": "partial",
      "interpretations": [
        {
          "text": "The only documented family contact during the admission is the day 12 meeting with the sister, who described the patient's pre-admission withdrawal and identified transport availability for post-discharge appointments; the patient agreed to one further brief visit, but no post-visit family debrief is recorded.",
          "factIds": [
            "fact:source:clinical:PT-001:f0095b05",
            "fact:source:clinical:PT-001:71cf094b",
            "fact:source:clinical:PT-001:9339ec31"
          ]
        },
        {
          "text": "Session observation notes family contact appears available and that a preference for time-limited interaction should not be interpreted as unwillingness to engage, with agreed actions to arrange a follow-up visit and bring practical support needs to MDT review.",
          "factIds": [
            "fact:source:clinical:PT-001:d303b404",
            "fact:source:clinical:PT-001:5c5bf3f7"
          ]
        }
      ],
      "actions": [],
      "missingInformation": [
        "Documentation of post-visit family feedback after the follow-up visit agreed at the day 12 family meeting.",
        "Any other documented visits with attributed family feedback during the selected period."
      ],
      "followUp": null
    }
  ],
  "retrievalAttempts": [
    {
      "attempt": 1,
      "plan": {
        "schemaVersion": "psychmap.plan.v1",
        "intent": "Read initial clinical notes",
        "clarification": null,
        "steps": [
          {
            "tool": "read_events",
            "kinds": [
              "clinical_event"
            ],
            "days": [
              1
            ]
          }
        ]
      },
      "trace": [
        {
          "tool": "read_events",
          "arguments": {
            "tool": "read_events",
            "kinds": [
              "clinical_event"
            ],
            "days": [
              1
            ]
          },
          "matched": 8,
          "returned": 8,
          "truncated": false
        }
      ],
      "newFactIds": [
        "fact:source:clinical:PT-001:35c0b2f5",
        "fact:source:clinical:PT-001:919781f5",
        "fact:source:clinical:PT-001:ebdb6f56",
        "fact:source:clinical:PT-001:07ca4f8e",
        "fact:source:clinical:PT-001:2eb17191",
        "fact:source:clinical:PT-001:d36af56d",
        "fact:source:clinical:PT-001:4d593247",
        "fact:source:clinical:PT-001:ef5755db"
      ]
    },
    {
      "attempt": 2,
      "reason": "Catalog lists family-meeting records on the relevant day that were not returned by the initial retrieval.",
      "plan": {
        "schemaVersion": "psychmap.plan.v1",
        "intent": "Catalog lists family-meeting records on the relevant day that were not returned by the initial retrieval.",
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
      ],
      "newFactIds": [
        "fact:source:clinical:PT-001:9c9b7c98",
        "fact:source:clinical:PT-001:f0095b05",
        "fact:source:clinical:PT-001:71cf094b",
        "fact:source:clinical:PT-001:9339ec31",
        "fact:source:clinical:PT-001:d303b404",
        "fact:source:clinical:PT-001:5c5bf3f7"
      ]
    }
  ],
  "selectedFacts": [
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
  ]
}
```

</details>



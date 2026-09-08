# Question learning contract v1

## Patient store: `psychmap.questions.v1`

Location: `simulation/patients/<registry-allowlisted-folder>/questions.sqlite`.

The `questions` table contains `question_uuid`, fixed schema version, folder-constrained `patient_id`, synthetic user/profession, exact UTC and `YYYY-MM-DD HH:mm` Asia/Singapore timestamps, selected range/day JSON, normalized/original question, validated UI-context JSON, and pending/imported/failed state. `clinician_preferences` stores the synthetic user's profession-specific checklist. Migration never rewrites `clinical.sqlite`.

## Central store: `psychmap.question-learning.v1`

Location: `simulation/organization/question-learning.sqlite`.

Tables:

- `intents`: sanitized canonical question, allowlisted category, aggregate count/dates, coverage status.
- `intent_professions`: profession-level count/date.
- `imported_questions`: source UUID and SHA-256 fingerprint, intent, profession/date, new/repeat flag.
- `import_runs` and `import_failures`: aggregate operational status and non-identifying failure codes.

Prohibited centrally: patient/folder IDs, names, diagnoses, raw evidence, answers, and original raw patient questions. Before central insertion, identifiers/known diagnosis terms are redacted and only a conservative non-identifying vocabulary is retained; an empty result becomes a fixed generic intent label.

Exact normalized matches are repeats. Same-category token Jaccard similarity ≥ 0.72 is a near duplicate. Scores 0.45–0.71 are borderline novel. The Markdown catalog is regenerated deterministically from central tables.

## CodeBuddy manifest: `psychmap.codebuddy-manifest.v1`

```json
{
  "schemaVersion": "psychmap.codebuddy-manifest.v1",
  "factIds": ["fact:..."],
  "actions": [
    { "type": "set_day_range", "fromDay": 7, "toDay": 11 },
    { "type": "select_days", "days": [7, 8, 9] },
    { "type": "toggle_metric", "metricId": "visitorMins", "enabled": true },
    { "type": "focus_zone", "zoneId": "visitor_area" }
  ]
}
```

The server accepts no other action type and revalidates all values against the selected patient's available days and fixed metric/zone registries. CodeBuddy cannot submit evidence values, prose, scripts, URLs, filesystem paths, or executable UI code.

## Hospital Admin API

`GET /api/admin` is loopback-only and returns aggregate synthetic totals, profession/category breakdowns, rankings, trends, coverage themes, cross-profession blind spots, catalog growth, scheduler state, and import health. `/api/director` remains a compatibility alias. Neither endpoint returns patient rows or raw questions.

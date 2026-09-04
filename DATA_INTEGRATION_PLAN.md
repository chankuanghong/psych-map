# Psych-MAP data integration plan

## Purpose

This document explains which information is intended to be live during the hackathon and which information is deliberately synthetic. It also identifies what the current repository actually does so that the demo does not overstate its integrations.

The prototype must never imply that its simulated records are live EPIC, scanner, or patient data. Every synthetic record should remain visibly labelled as demonstration data.

## Hackathon data boundary

For the intended hackathon demonstration, **location is the only real-time data source**. Everything that resembles a hospital record remains synthetic.

### Real-time input: location only

A connected RFID, BLE, or proximity-scanner bridge may provide time-stamped presence events such as:

- tag detected in a ward zone;
- entry time and last-seen time;
- transition from one zone to another;
- calculated duration in a zone;
- scanner/device health and signal quality.

This feed supports the live ward map, zone transitions, time in each ward space, and changes in spatial patterns. It does not reveal what a patient was doing, why they entered a space, whether an interaction occurred, or their clinical state.

### Synthetic context: all clinical and administrative records

The following remain fictional for the hackathon:

- patient profiles, diagnoses, admission details and bed assignments;
- ward-register rows and traffic-light states;
- EPIC flowsheet observations, including heart rate and blood pressure;
- medication orders and medication changes;
- MoCA results;
- psychiatric admission notes;
- OT notes and meal-preparation sessions;
- nursing observations and DAV entries;
- psychology and MSW notes, including family sessions;
- activity attendance and staff/peer-contact events;
- FormSG visitor submissions and visitor identity;
- clinical timelines and MDT summaries.

These records provide realistic context around the live spatial signal without requiring access to hospital systems or real patient information.

### Derived information: calculated by Psych-MAP

Psych-MAP deterministically calculates metrics such as daily zone duration, time beyond the assigned cubicle, transitions, period comparisons, and configured signal thresholds. These outputs are neither raw scanner data nor manually authored clinical records; they are reproducible calculations over the available input data.

The AI then explains the selected evidence using cautious clinical language. It does not generate the underlying measurements or decide that a diagnosis or treatment effect has been established.

### Important current-repository limitation

The current local application does **not** yet consume a physical scanner feed. Its location events are also simulated in `src/data/syntheticEvents.js`. Therefore:

- when running the repository as it is now, label location as **Synthetic spatial data**;
- when a scanner bridge is connected for the hackathon, label only that source as **Live location feed**;
- continue labelling EPIC, notes, vitals, medications, assessments and visitor forms as **Synthetic**;
- do not apply a single “live” label to a screen that combines real-time location with synthetic clinical context.

## Hackathon demo data flow

```text
LIVE DURING CONNECTED DEMO                    SYNTHETIC FOR HACKATHON
Scanner / tag location events                 Patient and admission record
          │                                   EPIC flowsheet and medications
          │                                   Clinical notes and DAV entries
          │                                   Activity, interaction and visitors
          └──────────────────┬───────────────────────────┘
                             ↓
                 Deterministic Psych-MAP metrics
                             ↓
              Graphs + evidence source attribution
                             ↓
              AI summary for clinician review
```

If no scanner is connected, the left-hand input is replaced by simulated location events and the entire patient record is synthetic.

## Guiding boundary

Psych-MAP should calculate objective measures with deterministic code and use AI only to select, contextualise, and explain relevant evidence.

```text
Approved source systems
        ↓
Normalised, time-stamped events
        ↓
Deterministic metrics and signal rules
        ↓
Bounded evidence packet for the requested patient and period
        ↓
AI-generated clinical-language summary
        ↓
Clinician review
```

The AI should not query unrestricted hospital records, calculate clinical measures, diagnose, prescribe, or update the source record.

## Hackathon source-of-truth matrix

| Product area | Hackathon treatment | Current repository | Future production hook |
|---|---|---|---|
| Patient identity and encounter | Synthetic | `src/data/patients.js` | Approved ADT interface |
| Ward register | Synthetic | `src/data/wardCensus.js` | ADT/bed-management feed |
| Ward-space presence | Real-time if scanner bridge is connected; otherwise synthetic | `src/data/syntheticEvents.js` currently simulates it | RFID, BLE, access-control or approved scanner feed |
| Staff and peer proximity | Synthetic | `src/data/syntheticEvents.js` | Approved pseudonymised proximity feed |
| Activity attendance | Synthetic | `src/data/syntheticEvents.js` | OT/group attendance system |
| Heart rate and blood pressure | Synthetic | `src/data/syntheticVitals.js` | EPIC flowsheet/FHIR Observation interface |
| Medication changes | Synthetic | `src/data/syntheticEvents.js` | EPIC medication orders/MAR interface |
| MoCA | Synthetic; one result per patient | `src/data/syntheticEpicData.js` | EPIC structured assessment result |
| Clinical timeline summaries | Synthetic | `src/data/syntheticEvents.js` | Approved EPIC event interfaces |
| Detailed clinical documentation | Synthetic | `src/data/syntheticDocumentation.js` | Approved EPIC note/document interface |
| Visitor records | Synthetic | `src/data/syntheticDocumentation.js` | Approved FormSG visitor-registration feed |
| Daily spatial measures | Deterministically derived | `src/data/metricsEngine.js` | Psych-MAP metrics service over live scanner events |
| Signals and evidence packets | Deterministically derived | `src/data/evidenceEngine.js` | Psych-MAP rules/evidence service |
| AI narrative | Live service when configured; fallback otherwise | `POST /api/insight` and `server/geminiApi.js` | Organisation-approved hosted model endpoint |
| MDT brief | Generated from mixed, attributed evidence | `src/components/MDTBrief.jsx` | Psych-MAP evidence and AI services |

## What should be connected in production

### 1. Patient and encounter context

Connect to an approved ADT or equivalent hospital interface for:

- pseudonymised patient identifier;
- current ward and assigned bed/cubicle;
- admission date and encounter status;
- authorised high-level clinical context;
- discharge or transfer state.

The user interface should not depend on names or diagnoses to calculate behavioural signals. Access must follow the clinician's existing authorisation.

### 2. Spatial scanner data

Connect scanners through a server-side ingestion adapter. The browser should receive normalised zone-presence events, not raw device telemetry.

Minimum event contract:

```json
{
  "patient_id": "pseudonymous-id",
  "zone_id": "activity-room",
  "entered_at": "2026-09-04T09:10:00+08:00",
  "exited_at": "2026-09-04T09:42:00+08:00",
  "duration_minutes": 32,
  "source": "approved-spatial-feed",
  "quality": "valid"
}
```

The adapter should handle duplicate scans, missing exit events, impossible transitions, clock drift, device downtime, and confidence/quality flags. Private-space presence must not be translated into claims about sleep, washing, interaction, consent, or activity.

### 3. EPIC flowsheet and structured observations

Connect through the hospital-approved EPIC integration route, such as an interface engine or permitted FHIR resources. The useful minimum is:

- heart rate;
- systolic and diastolic blood pressure;
- observation time;
- MoCA or other explicitly approved structured results;
- medication order or administration changes;
- provenance, author, encounter, and correction status.

Values should be stored with units and source timestamps. Psych-MAP should preserve corrections instead of silently overwriting history.

### 4. EPIC clinical notes

Connect only to note types approved for the use case. For this interface, the valuable outputs are:

- documented DAV episodes and their recorded context;
- observed participation and engagement;
- OT, nursing, psychology, social-work, and psychiatry interventions;
- relevant clinical events and review dates;
- source note reference for clinician verification.

Production answers should link back to the authorised source note or a permitted excerpt. A DAV event must be surfaced only when explicitly documented; it must never be inferred from movement or diagnosis.

### 5. Activity and intervention systems

Where available, connect group schedules, attendance records, and intervention logs. Preserve the difference between:

- scheduled;
- attended;
- participated;
- documented clinical interpretation.

Spatial presence in an activity room is not by itself proof of attendance or participation.

### 6. Identity, roles, and audit

Connect hospital single sign-on and role-based access control. Record:

- who opened a patient record;
- what date range and sources were queried;
- which evidence was sent to the model;
- which model/version generated the answer;
- whether the clinician accepted, edited, or dismissed an insight.

Do not use professional-role customisation to hide contradictory evidence or change signal thresholds.

## What remains synthetic when live location is connected

Even when the hackathon uses a real scanner feed, the following must stay simulated until formal governance, contracts, security review, and hospital-system access are in place:

- all patient demographics and diagnoses;
- all admissions, beds, cubicles, and ward-register rows;
- all staff and peer proximity events;
- all vitals, MoCA scores, medication changes, and flowsheet entries;
- all clinical notes, DAV events, interventions, and outcomes;
- all group attendance and participation records;
- all visitor forms and visitor identities;
- all ward traffic-light states and proactive alerts;
- all frequently asked questions and profession-specific examples.

Synthetic data should demonstrate plausible variation, missing data, contradictory evidence, and non-improvement—not only ideal recovery trajectories. It should never reuse or closely resemble identifiable real cases.

If the scanner bridge is not connected, location movements and zone durations also remain synthetic. Scanner device-test data should use demonstration tags and must not be associated with a real patient.

### Documentation fidelity in the mock record

The synthetic documentation includes dated and signed examples for psychiatric admission assessment, OT intervention, nursing DAV entry, and MSW family work. Each record identifies the discipline, author role, note type, source, date seen, and date signed. Its structure follows the purpose of the record: psychiatric admission notes include history, mental-state examination, risk, impression and plan; OT intervention notes use SOAP; nursing DAV entries document context, observed behaviour, intervention, outcome and handover; and MSW family-session records separate attendees, family and patient perspectives, areas of agreement, and actions. The OT example documents an egg mayonnaise sandwich meal-preparation session with observable task steps and prompting rather than a generic statement that the patient “engaged”.

Synthetic FormSG-style visitor records identify the fictional visitor, relationship, visit purpose, submission time, and check-in/check-out times. These records support visitation context but do not establish the quality or clinical effect of the visit.

## AI and CodeBuddy hooks

### Gemini

The existing `POST /api/insight` endpoint is the AI narrative hook. It should receive only:

- the clinician's question;
- their professional lens;
- the selected patient and date range;
- the bounded evidence packet assembled by deterministic code.

The API key must stay server-side. If Gemini is unavailable, the product should clearly label and show the deterministic fallback rather than inventing an answer.

For a real deployment, replace the developer API configuration with an organisation-approved model environment, data-processing agreement, regional controls, retention policy, monitoring, and prompt/version audit.

### CodeBuddy CLI or another analysis runner

CodeBuddy should be treated as an optional server-side analysis tool, not as a data source and not as a shell exposed to the browser. If included, it should invoke only allow-listed, versioned functions such as:

```text
get_zone_summary(patient_id, period)
get_vital_summary(patient_id, period)
get_activity_participation(patient_id, period)
get_clinical_events(patient_id, period)
compare_periods(patient_id, baseline, recent)
generate_evidence_table(patient_id, period)
```

It should return structured JSON with provenance. It must not receive unrestricted credentials, arbitrary shell instructions, or write access to EPIC. Every calculation used in the UI must remain reproducible without relying on hidden model reasoning.

## Question-to-evidence behaviour

The graph and raw-data panels should remain empty before a clinician asks a question or opens a proactive insight. After a request:

1. Parse the requested patient, measure, and date range.
2. Fetch only the required records from each approved source adapter.
3. Calculate the selected measures deterministically.
4. Highlight the requested period or two comparison periods on the graph.
5. Select the relevant graph series while leaving all space-series controls available.
6. Present evidence in three cross-referenced columns:
   - spatial data;
   - EPIC flowsheet and structured results;
   - EPIC notes and documented clinical events.
7. Send the bounded evidence packet to the AI narrative endpoint.
8. Return citations that let the clinician inspect the underlying authorised record.

Answers to repeated professional questions may be used to improve suggested questions, templates, and retrieval rules. They should not be used to train a model on patient data by default. Aggregate learning requires governance, de-identification, access controls, versioning, and a way for clinicians to report unsafe or low-value suggestions.

## Recommended adapter boundary

Keep the UI independent from vendor-specific APIs by defining source adapters:

```text
PatientAdapter
SpatialEventAdapter
VitalsAdapter
MedicationAdapter
AssessmentAdapter
ClinicalNoteAdapter
ActivityAdapter
```

Each adapter should support the same basic query shape:

```text
patient_id + encounter_id + start_time + end_time + source filters
```

During the hackathon, adapters read the existing synthetic files. In production, the same interfaces can call approved hospital services without rewriting the charts, evidence engine, or MDT views.

## Production safeguards before real data

Do not connect real records until all of the following are defined:

- clinical owner and intended-use statement;
- privacy impact and security assessment;
- role-based access and least-privilege scopes;
- patient identity matching and encounter boundaries;
- encryption, retention, deletion, and backup rules;
- consent and local policy requirements for spatial sensing;
- source provenance and data-quality handling;
- model hosting, logging, and data-use policy;
- clinical validation of metrics and alert thresholds;
- audit trail, incident response, and human review workflow;
- clear labels distinguishing observation, inference, and uncertainty.

## Implementation priority

1. Preserve the current synthetic demo end to end.
2. Introduce adapter interfaces while keeping synthetic adapters as the default.
3. Add source provenance and data-quality fields to every evidence item.
4. Connect one approved source at a time, beginning with read-only structured observations.
5. Validate deterministic calculations against source records.
6. Add authorised note references and audit logs.
7. Enable production AI only after organisational approval.

Until then, the application must continue to state: **Synthetic demonstration data — not for clinical decision-making.**

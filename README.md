# Psych-MAP

![Psych-MAP logo](public/brand/psych-map-logo.png)

**Mapping behavioural change for better psychiatric team decisions.**

Psych-MAP is a hackathon prototype for acute psychiatric wards. It turns synthetic ward-location, activity and nurse-documented clinical-event data into an interpretable longitudinal picture, then uses Google Gemini to translate the calculated evidence into concise, profession-aware MDT responses.

> All people, events and records in this repository are fictional. Psych-MAP is a clinical-support concept, not a diagnostic, prescribing or autonomous risk-assessment system.

## The problem

Meaningful behavioural change is often distributed across shifts, ward spaces, professions and free-text notes. Gradual improvement or deterioration can be difficult to see during a short ward round.

Psych-MAP helps the MDT answer:

- What changed?
- Where and when did it change?
- Which clinical events occurred alongside it?
- What remains uncertain or requires direct clinical review?

## Hackathon demonstration

The polished demo uses one simulated ward and three detailed personas:

- **Patient A — schizophrenia:** participation beyond the assigned cubicle improves, while social engagement remains a separate question.
- **Patient B — OCD:** a 90-day view highlights prolonged morning shower-area presence and its functional impact without inferring ritual content.
- **Patient C — hypomania:** roaming and overnight rest signals worsen, a nurse-documented DAV episode appears on the clinical timeline, and the pattern later settles alongside medication titration. Temporal association is not presented as causation.

The ward overview also includes lightweight fictional records to demonstrate ward-management questions without authoring 37 complete histories.

### Suggested 3–5 minute judge flow

1. Choose a professional lens.
2. Open Patient C from anywhere on the patient row.
3. Drag the date-range handles or move the selected window.
4. Compare the ward heat map, Daily Space Use and Night & 24-hour view.
5. Click the red DAV clinical-event node to inspect the nursing documentation.
6. Ask: **“What was documented during the DAV episode?”**
7. Show that Gemini returns short evidence-grounded bullets with uncertainty and an MDT focus.

## What makes the AI meaningful

Psych-MAP uses a hybrid design:

```text
Synthetic location, activity and clinical events
                       ↓
Deterministic metrics and auditable signal detectors
                       ↓
Bounded evidence packet for selected patient and dates
                       ↓
Same-origin /api/insight endpoint
                       ↓
Google Gemini Developer API
                       ↓
Concise, profession-aware MDT response
```

Deterministic code performs durations, averages, comparisons and threshold detection. Gemini does the work that benefits from language intelligence: selecting relevant supplied evidence, contextualising temporal patterns, expressing uncertainty and translating numerous small signals into readable clinical language.

Gemini is deliberately not asked to perform arithmetic, diagnose, prescribe, determine whether medication worked, or independently classify current risk. If Gemini is unavailable, the interface clearly labels and uses a deterministic fallback so the demo remains usable.

The complete architecture and prompting boundaries are documented in [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md).

## Core features

- Profession-specific lenses for ward management, psychiatry, nursing, occupational therapy, psychology and medical social work
- Interactive From–To date window with draggable ends, draggable middle and independently toggleable days
- Ward blueprint heat map with 75% default zoom, pan and pinch/scroll zoom
- Objective daily space-use values with selectable series
- Separate shower and toilet presence proxies
- Night and 24-hour space-use views
- Medication, nursing, OT, psychiatry, MDT and DAV clinical-event nodes
- Nurse-documented DAV details: observed behaviour, context, response and outcome
- Deterministic proactive signals with supporting evidence
- Gemini-powered patient and ward questions in concise bullet format
- Duration formatting in hours and minutes when values exceed 60 minutes
- Synthetic long-stay and ward-management demonstrations

## Run locally

### Requirements

- Node.js 18 or later
- npm
- Optional: a Gemini API key from Google AI Studio

### Setup

```bash
git clone https://github.com/chankuanghong/psychmap.git
cd psychmap
npm install
cp .env.example .env
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Add your demo key only to the local `.env` file:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Open `http://127.0.0.1:5175/`. If port 5175 is occupied, stop the existing process or choose another port and open the address printed by Vite.

The `.env` file is excluded from Git. Never place a real key in source code or screenshots.

### Production check

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

## Safety and responsible design

- Synthetic data only; do not submit real patient information to a consumer/developer API key.
- Location establishes presence, not sleep, showering, consent, friendship or activity quality.
- DAV episodes come from explicit nursing documentation and are never inferred from movement, diagnosis or proximity.
- A documented historical episode does not by itself determine current risk.
- AI outputs distinguish observations, interpretation, uncertainty and the question for human MDT review.
- Safety/autonomy answers preserve the patient perspective and least-restrictive principle.
- The system does not recommend medication, restrictions, observation levels, restraint or compulsory treatment.

## Technology

- React 18 and Vite
- Tailwind CSS
- Recharts
- Lucide icons
- Google Gemini Developer API through server-side Vite middleware

## Current prototype boundary

RFID/BLE feeds, EHR integration, hospital authentication and real-time infrastructure are simulated future architecture. The hackathon submission prioritises a credible, reviewable end-to-end workflow over unfinished hospital integrations.

## Repository guide

```text
src/data/metricsEngine.js       deterministic daily measures
src/data/evidenceEngine.js      reproducible signal detection and evidence packets
src/data/syntheticEvents.js     fictional movement, activity and clinical events
src/components/                 ward, patient, timeline and AI interfaces
server/geminiApi.js             server-side /api/insight middleware
server/psychMapPrompt.js        Gemini safety and response instructions
AI_ARCHITECTURE.md              AI structure and product boundaries
```

## Submission statement

**Psych-MAP helps psychiatric teams see behavioural patterns that are otherwise hidden between shifts, professions, notes and time—while keeping interpretation accountable to clinicians.**

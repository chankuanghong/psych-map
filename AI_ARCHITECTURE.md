# Psych-MAP AI architecture

## Purpose

Psych-MAP uses AI to translate many small, calculated behavioural signals into concise MDT-readable language. AI does not calculate durations, detect threshold crossings, diagnose, or recommend treatment.

## Professional lenses

At entry, the user selects Ward Management, Psychiatry, Nursing, Occupational Therapy, Psychology, or Medical Social Work. The selection changes suggested questions, emphasis, terminology, and the final MDT focus. It does not change deterministic thresholds, source evidence, the medication record, or contradictory evidence. This keeps one shared MDT record while making the synthesis relevant to each profession.

The Ward Manager lens also supports a ward-level evidence packet. The visible register remains demographic-only, while aggregate participation signals power a separate ward-status chat for underutilisation, declining participation and data-gap questions. Ward insight must not be used to infer motivation, rank patients or evaluate staff performance.

## Data flow

```text
Synthetic location + activity + clinical events
                    ↓
Deterministic metrics engine
                    ↓
Deterministic signal detector
                    ↓
Bounded evidence packet for selected patient + date range
                    ↓
Local POST /api/insight (API key remains server-side)
                    ↓
Google Gemini Developer API
                    ↓
Clinician-readable answer + uncertainty + MDT focus
```

If Gemini is unavailable or the quota is exhausted, the interface returns a visibly labelled deterministic fallback response.

## What talks to what

- The React app sends the clinician question and synthetic evidence packet to the same-origin `/api/insight` endpoint.
- The Vite server middleware in `server/geminiApi.js` reads `GEMINI_API_KEY` from the server environment.
- That middleware calls the Google Gemini Developer API `generateContent` endpoint.
- The browser never receives or stores the Gemini key.
- The default model is configurable with `GEMINI_MODEL`; `.env.example` uses `gemini-3.5-flash-lite` for a free-tier-friendly demo default.

## Model instruction

The complete system instruction is stored in `server/psychMapPrompt.js`. Its core rules are:

1. Use only the supplied evidence packet.
2. Separate observations from interpretation.
3. Use temporal association language and never claim causality.
4. Never infer sleep, washing, interaction, consent, friendship, or private activity from location alone.
5. Never diagnose, prescribe, score compliance, or replace clinical judgement.
6. State when evidence is insufficient.
7. Return only 3–5 short bullets, stay under 110 words, and end with one clinical-focus bullet.
8. Do not expose hidden reasoning.
9. Treat all records as synthetic demonstration data.

## Automatic detection

Automatic detection is deterministic by design. `src/data/evidenceEngine.js` currently detects:

- markedly reduced overnight assigned-cubicle presence;
- prolonged shower-area presence;
- marked neighbouring-cubicle presence;
- substantial change in time beyond the assigned cubicle.
- an explicitly nurse-documented DAV episode inside the selected period.

This approach makes alerts reproducible and auditable. Gemini explains the surfaced signals and answers clinician questions; it does not decide whether a threshold was crossed.

DAV means a documented disturbed, aggressive or violent behavioural episode. It is never inferred from diagnosis, movement, activation or proximity. The evidence packet may include the documented observation, context, nursing response and outcome, but a historical episode does not determine current risk.

## Local demo setup

1. Copy `.env.example` to `.env`.
2. Replace `GEMINI_API_KEY` with a key created in Google AI Studio.
3. Keep `.env` local; it is excluded by `.gitignore`.
4. Run `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`.
5. Ask a question in Ask Psych-MAP. The response label shows the provider/model or the deterministic fallback.

Do not use real patient information with a free consumer/developer API key. The hackathon integration is for synthetic demonstration data only.

# CodeBuddy evaluation dataset and execution traces

All inputs are existing **synthetic demonstration data**, not patient records.
No hidden model reasoning is requested or published. The traces show supplied
inputs, observable structured decisions, application tools, validation, sources,
database effects and outputs. CodeBuddy's built-in tools are disabled; the app
executes its bounded tool selections. A passing source check does not prove a
clinical interpretation correct.

## Reproduce

Use Node 23+ with SQLite support, the prepared simulation fixtures, and an
authenticated CodeBuddy CLI. From the psychmap directory:

```sh
npm test
node evals/run.mjs --live
```

The first command is deterministic/offline. The second makes paid/live model calls
with up to three concurrent questions; it writes a timestamped results directory
here and disposable databases under the OS temporary directory. It does not change
the live demonstration question/policy stores. It reads the existing synthetic
application DB for the weekly case. It exits nonzero if any case fails or errors.
There are no concealed retries or substitutions with canned responses.

## Dataset

`cases.json` defines 14 doctor questions, a spatial numeric comparison, and a
paraphrased ambiguous event question. PT-001 Days 1–14 is the default fixture;
the spatial case uses PT-003 Days 7–11. Each case fixes expected behaviour before
running. `review` contains a human semantic review criterion; it is NOT an
automatically scored assertion. The first 14 are primarily evidence-coverage
tests, not a claim that every requested clinical outcome exists in the fixtures.

Two additional job scenarios in the runner:

|Engine|Fixture|Expected checks|
|---|---|---|
|Nightly learning|Same corridor/cubicle question from two professions|One location_roaming intent; count two; real model classification; repeat scan imports zero; review pending; isolated approval activates and revocation deactivates policy.|
|Weekly research|PT-002 spatial series and existing clinician assessments|Real model windows and bounded alignment review; cited clinician event; review persists; no numeric threshold proposal; patient series unchanged.|

## Outputs

- `REPORT.md`: case results; `summary.json`: machine-readable checks.
- `spatial.md` / `spatial.json`: full Engine 1 trace.
- `engine-2.md` / JSON: classification calls, catalog/decision rows and review state.
- `engine-3.md` / JSON: actual input series, planning/review calls, calculated
  evidence and administrator recommendation.
- Individual doctor-question JSON files include failures and invalid outputs.

Calls and stages are separate: a requested tool is not reported as executed until
the application execution stage exists. Engine 2 exact-match deduplication is
ordinary code, not an AI semantic achievement. Engine 3 narrative templates and
arithmetic are code; window selection and alignment labels are model output.

## Scope and interpretation

A subsequent [live browser follow-up](published/BROWSER_CHECK.md) separately
verified one family-feedback question through the UI, second reviewer and audit
write. It also records a discovered audit-delivery bug, its fix and remaining UX limitations.

The live runner exercises Engine 1's planner, retrieval tools, synthesis and
factual renderer, **not** the HTTP/UI, final audit write or second AI reviewer.
Those boundaries have separate offline tests. Engine 2/3 job functions run for
real, manually, not on an unattended nightly/weekly clock trigger.

An invalid model output safely rejected is still a failed agent case. Network or
CLI failures are errors. A pass means the listed automated assertions passed;
interpretations still need source-by-source human review. One run per case does
not measure repeatability. No literature retrieval or clinical validation is
claimed. Do not replace fixtures with real patient data and publish the results.

No GitHub upload is performed by this runner. Review generated artifacts before
committing them. Authentication details and environment variables are not logged.

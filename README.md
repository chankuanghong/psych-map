# Psych-MAP

**A psychiatric ward demo connecting spatial observations, clinical notes and staff questions, with evidence people can inspect.**

Our hackathon prototype explores how an AI assistant can help a multidisciplinary team understand routines, identify unanswered questions and review whether spatial signals agree with clinician assessments. Every distributed patient case is deliberately fictional.

> Research prototype only. No clinical validation, prescribing, autonomous risk assessment or automatic threshold changes. Location does not establish sleep, eating, medication-taking or recovery.

## Three apps

|App|What to demonstrate|
|---|---|
|Clinician Psych-MAP (`/`)|Ward overview, patient map, spatial trends, notes and source-linked answers with separately labelled AI interpretation.|
|Question Intelligence (`/admin`)|Staff-group/topic heat map, filtered question library, profession-policy decisions and recommendation review.|
|RFID dashboard (port 8765)|Tag detections, selected scanner venue and inferred presence sessions. Explore the UI without hardware.|

## Three CodeBuddy engines

1. **On demand:** interprets questions and proposes JSON plans. Code validates and executes `read_metrics`, `read_events` or `compare_periods`. CodeBuddy synthesises cited results. A further AI review checks the proposed interpretation. Invalid output is withheld. SQLite preserves the answer and its evidence snapshot.
2. **Nightly/manual:** groups de-identified questions, counts repeated intents and proposes profession coverage topics. Administrators approve policies.
3. **Weekly/manual:** selects comparison windows and a clinician assessment. Code calculates spatial means. CodeBuddy proposes an alignment judgement. Administrators keep or ignore recommendations. No automatic threshold change or literature retrieval.

CodeBuddy chooses what to investigate. Code owns retrieval and calculations. People check context and make consequential decisions. Source links establish provenance, not clinical truth.

## Materials

For a software-only demo: Node with `node:sqlite` (Node 24 in CI; local evals used 23), npm, Python 3.9+ and the `sqlite3` command. Optional live AI requires the CodeBuddy CLI, authentication and access to `fast-model`. Obtain the CLI from your event/provider's official instructions; `codebuddy --help` should work. Live AI sends selected evidence externally and consumes account tokens.

For RFID: a supported **YRM100 UHF reader**, suitable antenna/power arrangement, USB serial connection, compatible **UHF tags**, and any required USB adapter/manufacturer driver. Phone NFC tags are not interchangeable with UHF tags. Optional: `python3 -m pip install pyserial`.

One reader is associated with one selected venue. This is not calibrated multi-reader positioning. RSSI is not converted to distance. Vendor SDKs/drivers and actual tag identifiers are not distributed.

## Fresh-clone setup

```sh
git clone https://github.com/chankuanghong/psych-map.git
cd psych-map
npm ci
npm run demo:setup
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Open `http://127.0.0.1:5175/` and `/admin`. Setup generates synthetic SQLite stores, preserves complete existing fixtures and refuses partial fixture rebuilds. No prebuilt database is needed.

In another terminal, start the RFID page, even without a reader:

```sh
python3 rfid-scanner/dashboard.py --allow-missing-reader
```

Open `http://127.0.0.1:8765/`. It shares `data/psych-map.sqlite` with the application. Ctrl-C stops each service.

### Enable AI deliberately

Copy `.env.example` to `.env`. Set `CODEBUDDY_ENABLED=true`; enable the per-engine flags for live scans/research. Restart Vite. Leave schedules disabled until you want the in-process nightly/weekly jobs. Manual buttons run the same jobs.

On macOS, `Launch Psych-MAP Demo.command` starts all services, **enables CodeBuddy and both schedules**, probes the model and opens the views. It consumes tokens and exposes a LAN demo view: use a trusted network and fictional data only. Keep the launcher terminal open. The CLI must already be authenticated.

### Private tag configuration

Only fictitious EPCs are included. Put actual mappings in ignored `rfid-tags.local.json`:

```json
{"YOUR_TAG_EPC":{"name":"Demo volunteer","subject_id":"PT-003"}}
```

```sh
export RFID_TAG_MAP="$PWD/rfid-tags.local.json"
python3 rfid-scanner/dashboard.py --allow-missing-reader
```

Unmapped tags have no patient assignment. Select the scanner venue, present a tag and check a new timestamp. Missing detections are not evidence of a clinical outcome. Check reader status first.

## Evals and actual examples

- [Dataset and methodology](evals/README.md)
- [Results and refinement history](evals/published/REPORT.md)
- [Actual answers to all 14 doctor questions](evals/published/DOCTOR_ANSWERS.md)
- Full execution examples: [Engine 1](evals/published/engine-1.md), [Engine 2](evals/published/engine-2.md), [Engine 3](evals/published/engine-3.md)
- [SQLite evidence audit](docs/answer-audit.md)
- [HTML presentation](Psych-MAP_tested-demo-deck.html)

```sh
npm test
(cd rfid-scanner && python3 -m unittest discover -s tests)
npm run build
npm run eval:live   # external CodeBuddy calls; synthetic evidence only
```

Offline tests/CI need no AI credentials. Live evals use isolated question/review databases and retain failures. Traces contain inputs, plans, application tools and outputs, not private reasoning. Passing selected tests is not clinical validation or a guarantee of future answers.

## Storage and limitations

- `data/psych-map.sqlite`: application records, mapped presence, planner and answer audits.
- `simulation/patients/*`: generated fixtures and patient-scoped questions.
- `simulation/organization/`: question catalogue, review decisions and Markdown mirrors.

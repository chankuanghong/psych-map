# Synthetic patient isolation and question learning

The registry maps public synthetic patient IDs to opaque folder IDs. Every patient operation validates both IDs, canonicalizes the folder, rejects symlinks/path escape, and checks the identity inside `clinical.sqlite` before opening `questions.sqlite`.

## Commands

```bash
npm run simulation:build
npm run questions:migrate
npm run questions:seed-synthetic
npm run questions:run-once
npm run simulation:ask -- PT-003 pf_c84e57 "What was documented during the DAV episode?"
```

`questions:migrate` uses `CREATE TABLE IF NOT EXISTS` and does not modify clinical tables. The seed is idempotent. The one-shot importer discovers patient folders through `registry.sqlite` only.

The optional CodeBuddy commands use `fast-model`, minimal effort, one turn, no tools, `dontAsk`, no session persistence, and deterministically validated JSON. The live engine chooses fact IDs, the nightly engine chooses only an allowlisted category or existing intent ID, and the weekly engine chooses only a bounded signal/assessment alignment class. The application keeps all CodeBuddy and scheduler switches disabled by default.

The organization database and generated catalog live under `simulation/organization/`, outside all patient folders. They contain only de-identified question-learning aggregates. All data is explicitly synthetic.

## Complete manual demo run

Use `npm run demo:jobs` for the showable end-to-end path. It validates synthetic sources, migrates stores, seeds fixed questions, invokes the same import used by the daily worker, rebuilds the catalog, and verifies the queues plus admin aggregates in that exact order. Step-by-step JSON results are printed as it runs. An atomic `.question-learning-job.lock` file shared by the manual flow, one-shot importer, and scheduled worker prevents overlapping runs and is removed on completion.

The nightly question importer runs at 02:00 Asia/Singapore when enabled. The separate adaptive research reviewer runs at 03:00 every Monday and writes suggestions without changing thresholds. Run it manually with `npm run research:run-once`. The data builder, migrations, seeder, worker scenarios, and destructive synthetic replacement command remain manual utilities.

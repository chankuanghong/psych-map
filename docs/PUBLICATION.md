# Publication review

8 September 2026. Prepared from a clean checkout of the requested repository's
existing main branch, preserving its history and original integration-plan files.

Included: source for the clinician/admin/RFID apps, schemas and guardrails, tests,
synthetic fixture generators, setup, reviewed live eval traces/answers, HTML slides
and original existing brand assets. Published clinical examples describe explicitly
fictional PT-001/002/003 records. Model reasoning is not exposed; execution inputs
and outputs are observable bounded CLI/application records.

Excluded: all runtime SQLite databases and sidecars, raw local logs, physical RFID
identifiers, private tag mappings, recordings, screenshots of unrelated content,
local environment/authentication state, vendor SDK installers and archive folders.
The RFID source/tests now use fictitious EPC placeholders; actual mappings come
from an ignored local JSON file. Absolute home paths were removed from published
trace copies. No new license grant for third-party vendor material is implied.

Fresh-checkout rehearsal: npm install from lockfile, safe synthetic bootstrap,
70 application tests and 35 RFID tests passed locally. The bootstrap preserves
complete existing fixtures. Schema paths were adapted to the published layout.
Vite was updated to a patched 6.4 release; npm reported zero dependency advisories
after the update. Dependency scanning is point-in-time and does not establish
production security. The app still lacks production authentication/authorisation.

Live evaluation caveat: latest successful cases are assembled from an initial
full run and targeted retests. Failures and the Codex judge review are retained.
No unattended scheduler trigger or new physical tag read was tested. The live
Engine 1 harness does not claim a full browser/HTTP/second-review test.

The published tree and existing Git history are checked with Gitleaks before push,
alongside file-type and identifier review. No scanner can prove the absence of
every sensitive detail. Keep all real clinical/hardware data local.

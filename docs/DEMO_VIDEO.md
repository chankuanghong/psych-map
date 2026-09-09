# Connected demo video

[Watch the 90-second video](https://chankuanghong.github.io/psych-map/#full-demo)

Recorded on 9 September 2026 using application commit `802b996`.

## Standalone engine videos

- [Engine 1 — Clinical answers](https://chankuanghong.github.io/psych-map/#engine-1) — 38 seconds.
- [Engine 2 — Question intelligence](https://chankuanghong.github.io/psych-map/#engine-2) — 18 seconds.
- [Engine 3 — Weekly research review](https://chankuanghong.github.io/psych-map/#engine-3) — 18 seconds.

These three clips are the reviewed engine sections of the connected demo, each playable independently. The RFID simulation is also embedded on the video page.

| Time | Operation shown | Evidence |
| --- | --- | --- |
| 00:00 | RFID dashboard and shared clinician record | Two simulated visits using the published fictional tag mapping; matching activity-room timestamp in Patient MAP. |
| 00:16 | Clinician asks about family feedback | Live CodeBuddy plan and interpretation, code retrieval, second CodeBuddy evidence review passing 3/3, exact Day 12 note expansion, staff dismissal of a weak extra pointer. |
| 00:54 | Admin scans staff questions | Six family questions grouped first; two existing corridor-question examples from Nursing and Psychology then share one intent with count 2. Staff reject the new topic for Psychiatry. |
| 01:12 | Admin runs weekly research | Code calculates averages; CodeBuddy interprets alignment as unclear. Patient B changes from 176 to 224 minutes/day outside the assigned cubicle. Staff keep the recommendation for review; thresholds remain unchanged. |

## What is live and what is simulated

All patients, clinical records and tag IDs are fictional. The RFID reader was unavailable.
Two closed presence sessions were simulated through the RFID presence code and stored
in the same local database used by the clinician app. They are not physical hardware reads.
The RFID frames remain labeled as simulated.

The clinician and admin operations used real clicks, typing and controls in the Codex
in-app browser. CodeBuddy was called live with synthetic records. No model output or
clinical conclusion was invented. Manual scan and weekly-review buttons ran the jobs;
scheduled jobs were disabled. The video shows a first-pass answer, not a later retrieval-retry feature.

The browser tools did not expose a continuous video recorder. This is an interaction
capture assembled from actual page frames, with reading holds and accelerated waits.
It is not continuous screen recording. The video is silent with simple English captions;
a separate WebVTT caption file is in the release.

The second review passed three selected facts in this take. The earlier published
browser test passed five facts; these are separate runs. A valid citation or AI review
does not establish clinical correctness. The medication pointer was weakly relevant
and was dismissed. The spatial chart next to the family note is unrelated to the family
question, as stated in the captions.

## Publication review

The final H.264 MP4 is 1920 × 1080, 30 fps, 90 seconds. All 2,700 decoded frames were
compared against the allowlisted, visually reviewed browser source states with no
mismatches. All 50 source/caption states were visually inspected. Each chapter clip
was checked frame by frame against its corresponding interval in the main video.
Runtime, layout and contrast checks passed. The poster was inspected separately.

Finished videos are served by GitHub Pages with inline playback. The player requests
that browsers hide download controls and suppresses the video context menu; this
discourages casual saving but cannot prevent downloading public media. Original
release assets remain available. Git contains the player, finished videos, this note,
the README link and the poster. Raw captures, actual EPCs, credentials, SQLite files
and sidecars, clinical exports and unrelated desktop content are not included.

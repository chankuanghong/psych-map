# Psych-MAP Product Decisions

## Professional lenses and medication context

- Professional personalisation is an emphasis layer, not a data filter. All professions receive the same evidence packet and deterministic signals; the selected lens changes questions and synthesis priorities while preserving contradictory evidence.
- Medication timelines use named synthetic prescriptions and explicit doses. Titration events are displayed alongside behavioural changes, but the interface and AI use temporal language and never present those changes as proof of efficacy.
- The ward register is deliberately demographic-only: patient, age, sex, diagnosis and admission days. Participation proxies remain behind the ward insight layer, while Patients A–C expose their detailed evidence through a pop-up and patient map.

## Ward 4B layout and cubicle semantics

The interactive ward view uses the owner's labelled ward sketch as its spatial reference.

- The upper ward contains four separate, non-overlapping cubicles around a central corridor.
- Patient A is assigned to Cubicle #1.
- Presence in Cubicles #2–#4 is represented separately from the assigned cubicle.
- The labelled wet area contains a sink/teeth-brushing area, one toilet, and three individual showers.
- Nursing Counter, Medication Counter, and Consult Room are visible orientation features but are out of bounds and excluded from patient heat data. Consult Room access is supervised and represented through documentation rather than passive heat.
- The lower ward contains Consult Room, Activity Room, Balcony, Dining Area, Dining Area Toilet, Visitor Area, and Entrance.
- Presence in another cubicle is a location signal that may indicate possible social exposure. It must not be described as confirmed interaction or socialising without supporting documentation.
- Shared-space terminology is Dining Area and Balcony; do not reintroduce the generic “Communal Lounge” label.
- Staff contact is presented through clinical documentation rather than proximity/contact graphs.
- “Time beyond Cubicle #1” is calculated from observed non-home location events. Unrecorded waking time is not assumed to be outside the cubicle.
- Floor-plan geometry lives in `src/data/zones.js` using one 760 × 840 coordinate system. Zone shapes must remain disjoint.

The labelled sketch supersedes the earlier unlabelled-layout interpretation. Preserve these names and adjacencies unless the owner supplies a revised ward drawing.

## Prototype AI interaction and status

- Until a secure server-side model is connected, MDT questions use deterministic, data-grounded responses from calculated metrics and clinical-event records. The interface must identify this as a prototype and must not imply a live LLM is present.
- Insight is clinician-led: the patient page presents diagnosis- and pattern-specific MDT questions rather than a generic “run analysis” workflow or an automatic overview panel.
- Front-page improving/declining indicators are behavioural trajectory classifications, not validated clinical outcome scores.
- Automatic signal detection is deterministic and auditable. Gemini is used only to translate the selected evidence packet and answer clinician questions; it does not perform arithmetic or decide whether thresholds were crossed.
- The Gemini key is server-side only. The React client talks to same-origin `/api/insight`, which calls the Google Gemini Developer API. A labelled deterministic fallback preserves the demo when Gemini is unavailable.
- The selected From–To period is shared by the map, charts, night view, evidence packet, Ask Psych-MAP and MDT Brief.
- Day tiles are independent toggles inside the From–To window: clicking adds a day and clicking it again excludes only that day. The handles still define and move the overall window; changing them resets the window to a contiguous selection. Clinical-event nodes may still focus one day to open its documentation context.
- Status rationale must expose the supporting measurements and a clinician-review caveat.
- Sparse records return “Insufficient data” rather than an inferred trajectory.
- AI answers use 3–5 short bullets and display durations above 60 minutes as hours and minutes. Safety/autonomy questions distinguish observed signals, missing patient perspective, uncertainty and least-restrictive MDT review; the AI never determines restrictions or risk status.
- The full rows for demonstration Patients A–C open their overview by mouse or keyboard. Their overview lists expected progress in plain-language points rather than presenting a second set of calculated supporting signals.

## Synthetic personas and time-of-day interpretation

- Patient A demonstrates increasing participation across ward spaces in the context of schizophrenia.
- Patient B demonstrates prolonged morning shower-area occupancy in the context of OCD. Location duration must not be described as proof of washing or compulsive ritual content.
- Patient B uses a 90-day synthetic admission to demonstrate long-stay pattern review. The trajectory peaks around Day 21, introduces a graded routine plan on Day 22, and includes longitudinal reviews through Day 90.
- Patient C demonstrates escalating movement through shared spaces and neighbouring cubicles alongside declining overnight assigned-cubicle presence through Day 7, followed by improvement after medication titration in the context of hypomania. The timing must not be presented as proof of medication effect.
- Patient C includes one synthetic nurse-documented disturbed, aggressive or violent (DAV) episode during the escalation period. DAV is a clinical documentation event with observed behaviour, context, response and outcome; it is never inferred from roaming, diagnosis or proximity data. A documented historical episode does not by itself establish current risk.
- Patient C’s visible escalation is expressed primarily through neighbouring-cubicle visits and rapid movement across Corridor, Visitor Area, Balcony and Dining Area, rather than prolonged Activity Room use. Documentation may record the patient’s stated wish to make friends, but location alone never confirms interaction, consent, friendship or social quality.
- The 00:00–07:00 assigned-cubicle duration is an **overnight rest proxy**, not a measurement of sleep. The interface must prompt review of patient-reported sleep and clinical observations.
- The time-of-day view spans all 24 hours so within-day and between-day patterns can be compared. Synthetic location intervals must not overlap.
- The ward map opens at 75% fit. A selected date window can be moved backward or forward by its own duration to compare equivalent periods without rebuilding the selection.
- From and To dates are direct date inputs; a separate date-entry mode is intentionally avoided.
- After either handle narrows the window, the highlighted date segment itself can be dragged to move the whole window while preserving its duration.
- Daily Space Use displays only the currently selected window and defaults to the full 14-day stay. Shower-area and toilet-area presence are separate series and remain presence proxies, not confirmation of completed self-care.

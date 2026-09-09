# Who builds the answer?

**CodeBuddy chooses and explains. Code retrieves, calculates and checks.
Staff judge the clinical meaning.**

## The flow

```mermaid
flowchart TD
    A["STAFF: Choose a patient and period; ask a question"] --> B["CODE: Check patient/folder match; build scoped evidence snapshot"]
    B --> C["CODEBUDDY 1: Propose a JSON retrieval plan"]
    C --> D{"CODE: Allowed tool, fields, metrics and days?"}
    D -- No --> X["CODE: Withhold invalid answer; explain the limit"]
    D -- Yes --> E["CODE: Run retrieval and calculations; attach fact and source IDs"]
    E --> F["CODEBUDDY 2: Select fact IDs; draft interpretation or request missing information"]
    F --> G{"CODE: Valid IDs, sources and output structure?"}
    G -- No --> X
    G -- Yes --> H["CODE: Render factual text from stored facts, not AI replacement text"]
    H --> I{"CODEBUDDY 3: Evidence review passes?"}
    I -- Yes --> J["CODE: Include labelled AI interpretation"]
    I -- "No or error" --> K["CODE: Withhold interpretation, extra pointers and graph actions; show warning"]
    J --> L["CODE: Save question, snapshot, proposal and response in SQLite"]
    K --> L
    X --> L
    L --> M{"CODE: Audit saved?"}
    M -- No --> N["CODE: Return error; do not deliver answer"]
    M -- Yes --> O["STAFF: Read answer; open exact sources; judge meaning and missing context"]
    classDef ai fill:#eeeafa,stroke:#77619c,color:#201b31;
    classDef code fill:#e3f2f0,stroke:#16877e,color:#153d38;
    classDef person fill:#eaf0fa,stroke:#426fad,color:#18324e;
    class C,F,I ai;
    class B,D,E,G,H,J,K,L,M,N,X code;
    class A,O person;
```

The numbered CodeBuddy boxes are **three calls inside the answer engine**, not
the three product engines. The other engines are question scanning and weekly research.

This diagram shows the answered-question path. A planner can instead ask for
clarification. With no adequate retrieved facts, the app reports missing evidence
and does not run the second reviewer. Early invalid requests are rejected before
this answer-audit flow. A failed review can leave source-backed facts visible.

## Specific example: family feedback

**Question:** “What feedback has the family provided after visiting?”

**Fixture:** Fictional Patient A, Days 1–14. The following uses the actual note and
observed browser answer; JSON below is shortened to explain the mechanism.

### 1. Code prepares the source fact

The Day 12 family note contains:

> Sister reported that the patient previously joined family meals but had withdrawn during the month before admission. She identified transport availability for post-discharge appointments.

Code gives this source the ID `source:clinical:PT-001:71cf094b` and creates a fact
with ID `fact:source:clinical:PT-001:71cf094b`. Its stored statement includes the
date, section title and original wording.

### 2. CodeBuddy selects it and proposes an interpretation

Simplified selection:

```json
{
  "factIds": ["fact:source:clinical:PT-001:71cf094b"]
}
```

One actual interpretation from the browser run was:

> Attributed family feedback during the recorded meeting: the sister reported that the patient had previously joined family meals but had withdrawn during the month before admission, and she identified transport availability to support post-discharge appointments.

The real response selected five family-meeting facts. Each interpretation listed
supporting selected fact IDs. [Full browser result](../evals/published/BROWSER_CHECK.md)

### 3. Code checks; the second AI reviewer reviews

| Proposed output | Who checks it? | What happens? |
| --- | --- | --- |
| An invented fact ID | Code | Rejects it because it is absent from retrieved facts. |
| A fact with an absent source | Code | Rejects it because its source cannot be resolved. |
| The valid family fact ID | Code | Renders the stored statement, with original wording. |
| “The sister will be the caregiver” | AI reviewer and staff | Must assess whether the source supports this. Transport availability does not establish a caregiving agreement. ID checks alone cannot catch every such mistake. |

The observed second review passed **5/5** facts. Code saved the answer and full
evidence snapshot before display. Staff opened an exact source in the browser.

### 4. What the staff member sees

- **Recorded evidence:** date, note section and source text, rendered by code.
- **CodeBuddy interpretation:** a separate explanation, labelled for human review.
- **Exact source:** expandable record with source ID and context.
- **Limitations or information requests:** when the selected evidence is incomplete.

## What about grammar and accuracy?

**Code-generated facts:** templates control the surrounding sentence. Original
note wording is preserved, including imperfect grammar.

**AI interpretation:** CodeBuddy writes natural language. Structure and length
are checked; grammar and meaning are not mathematically guaranteed. A second AI
review is fallible too.

**Deterministic means:** the same snapshot and validated plan produce the same
retrieval and calculations. It does not mean CodeBuddy always selects the same
plan, or that every interpretation is clinically correct.

## The other two engines

| Stage | Question scanner | Weekly researcher |
| --- | --- | --- |
| CodeBuddy proposes | Question category and matching group | Comparison periods and an assessment of agreement with clinician notes |
| Code performs | Validation, counts, deduplication and SQLite writes | Validation, averages and review-record storage |
| Admin decides | Approve or reject a policy topic | Keep or ignore a suggestion and add notes |
| What does not happen automatically | A new group becoming approved clinical policy | A suggestion changing live thresholds |

# Exploration and comparison report formats

Use these formats only when the user asks to save a result. Adapt comparison dimensions to the actual question; do not create empty symmetry for its own sake.

## Exploration report

Path: `synthesis/explorations/YYYY-MM-DD-{topic}.md`

```markdown
---
title: Exploration title
document_type: member-wiki-exploration
status: draft
created: YYYY-MM-DD
topic: ""
members: []
---

# Exploration title

## Question and scope

## Coverage

| Member | Files read | Relevant areas absent | Intentionally not read |
|---|---|---|---|

## Findings by member

## Connections across knowledge

## Evidence ledger

| Finding | Member | File and heading | Type | Date/as-of | Limitation |
|---|---|---|---|---|---|

## Gaps and open questions

## Suggested next exploration

## Decision status

This exploration is not an official team decision.
```

## Comparison report

Path: `synthesis/comparisons/YYYY-MM-DD-{topic}.md`

```markdown
---
title: Comparison title
document_type: member-wiki-comparison
status: draft
created: YYYY-MM-DD
topic: ""
members: []
---

# Comparison title

## Question and scope

## Coverage

| Member | Files read | Position documented? | Limitation |
|---|---|---|---|

## Comparison matrix

| Dimension | Member A | Member B | Member C | Evidence notes |
|---|---|---|---|---|

## Common ground

## Meaningful differences

## Direct contradictions

## Unique contributions

## Missing or insufficiently documented positions

## Evidence ledger

| Finding | Member | File and heading | Type | Date/as-of | Limitation |
|---|---|---|---|---|---|

## Questions for members

## Possible validation or synthesis work

## Decision status

This comparison is not an official team decision.
```

## Knowledge types

Use one of these labels in the evidence ledger:

- `fact`: independently supported factual information;
- `source-claim`: a claim made by a cited source;
- `member-opinion`: the attributed member's judgment or preference;
- `hypothesis`: a proposition awaiting validation;
- `ai-inference`: a connection inferred during exploration and not stated by a member.

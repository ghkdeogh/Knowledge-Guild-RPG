# Idea sharing formats

Use these formats when the corresponding operation writes a file. Omit empty optional sections rather than inventing content.

## Personal idea

Use the location selected from the member's `WIKI_SCHEMA.md`.

```markdown
---
title: Idea title
document_type: personal-idea
author: member-id
status: draft
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: []
shared_as: ""
---

# Idea title

## Trigger or problem

## Idea

## Expected mechanism and value

## Assumptions and evidence

## Uncertainties and risks

## Connections to existing Wiki knowledge

## Desired feedback or validation

## Next action
```

Personal idea status: `draft`, `exploring`, `testing`, `paused`, `superseded`, or `closed`.

## Team-facing idea card

Path: `synthesis/ideas/{idea-id}/idea.md`

```markdown
---
title: Idea title
document_type: shared-idea
idea_id: YYYY-MM-DD-author-short-slug
author: member-id
status: open-for-feedback
shared_at: YYYY-MM-DD
updated: YYYY-MM-DD
source_idea: relative/path/to/personal-idea.md
---

# Idea title

## One-sentence summary

## Problem or opportunity

## Proposed idea

## Why it may matter

## Assumptions and supporting evidence

## Uncertainties and risks

## Feedback requested

## Possible next validation

## Revision history
```

Shared idea status: `open-for-feedback`, `under-review`, `testing`, `ready-for-decision`, `superseded`, or `closed`. `ready-for-decision` is still not an accepted decision.

## Independent feedback

Path: `synthesis/ideas/{idea-id}/feedback/{reviewer-member-id}.md`

```markdown
---
title: Feedback on idea title
document_type: idea-feedback
idea_id: idea-id
reviewer: member-id
reviewed_version: YYYY-MM-DD
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# Feedback by member-id

## My understanding

## What I find valuable

## Concerns and challenged assumptions

## Alternatives or extensions

## Evidence and open questions

## Suggested next step

## Revision history
```

## Feedback comparison

Path: `synthesis/ideas/{idea-id}/comparison.md`

```markdown
---
title: Feedback comparison for idea title
document_type: idea-feedback-comparison
idea_id: idea-id
reviewers: []
status: draft
updated: YYYY-MM-DD
---

# Feedback comparison

## Feedback coverage

## Common ground

## Disagreements

## Unique contributions

## Challenged assumptions

## Evidence gaps and open questions

## Proposed experiments or next actions

## Decision status

No official decision has been made unless a linked document in `decisions/` says otherwise.
```

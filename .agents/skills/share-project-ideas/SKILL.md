---
name: share-project-ideas
description: Capture a project member's idea, prepare an approved team-facing idea card, collect independent feedback from other members, and compare responses without erasing authorship or turning discussion into a decision. Use when someone wants to record, share, review, respond to, or compare project ideas in Wiki³.
---

# Share Project Ideas

Help Wiki³ team members turn informal ideas into traceable collaboration while preserving who thought what.

## Establish context

Read `WIKI_RULES.md` first. Identify the current member's `member-id` before reading or writing personal files. For personal work, read that member's `CONTEXT.md`, `WIKI_SCHEMA.md`, and `wiki/index.md`.

If `WIKI_SCHEMA.md` is missing, do not invent a personal filing structure. Direct the user through `prompts/wiki-init.md` first.

Do not read another member's personal Wiki merely because an idea mentions them. Shared idea cards and feedback files contain the collaboration context. Read personal Wikis from multiple members only when the user explicitly requests a comparison that requires them.

## Choose the operation

Infer the operation from the request, and ask only when it is genuinely ambiguous:

- **Capture:** develop and save the current member's own idea.
- **Share:** publish an approved team-facing version of a captured idea.
- **Feedback:** record the current member's independent response to a shared idea.
- **Compare:** synthesize multiple feedback files while preserving disagreements.
- **Revise:** update the author's personal idea and shared card without erasing history.

Read [references/formats.md](references/formats.md) before writing any idea, share card, feedback, or comparison file.

## Capture an idea

Start from what the user already said. Ask the unanswered questions one at a time:

1. What problem, opportunity, or observation led to the idea?
2. What is the idea and how is it expected to work?
3. Why might it matter to this project or its users?
4. Which assumptions, evidence, or prior experiences support it?
5. What is uncertain, risky, or likely to fail?
6. What feedback, validation, or next action does the author want?

Do not make the user repeat information already provided. Clearly label the author's statements, source-backed facts, and AI-proposed connections.

File the personal idea in the most appropriate location defined by `WIKI_SCHEMA.md`. If no location fits, propose `wiki/ideas/`; create it and update `WIKI_SCHEMA.md` only after the user approves the structural change.

Update the author's `wiki/index.md` and `wiki/log.md`. A personal idea remains the source of truth for the author's evolving thinking.

## Share an idea

Create a concise share card from the personal idea. Exclude private profile details, internal notes, or unrelated personal context. Preserve the author's wording and link back to the personal idea rather than copying its entire contents.

Show the proposed share card to the author and ask them to confirm what will be shared. Only after confirmation, create:

`synthesis/ideas/{idea-id}/idea.md`

Use `{idea-id}` in the form `YYYY-MM-DD-{author-member-id}-{short-slug}`. Create `feedback/` within the idea bundle and ensure it remains tracked when empty.

Shared means visible for team discussion; it does not mean agreed, validated, or officially adopted.

## Record independent feedback

Identify the reviewer's `member-id`. Read the shared `idea.md`, not the author's private Wiki.

Ask for the reviewer's independent view before showing or summarizing other reviewers' feedback when avoiding group anchoring matters. Capture:

- their understanding of the idea;
- what they find valuable or agree with;
- concerns and challenged assumptions;
- alternatives or extensions;
- evidence and questions needed;
- a suggested next step.

Write one file per reviewer:

`synthesis/ideas/{idea-id}/feedback/{reviewer-member-id}.md`

Never merge feedback into the author's voice. Do not overwrite another reviewer's file. If the reviewer already has a file, preserve the earlier view and record the revision date and reason.

## Compare responses

Only compare after the user asks. Read `idea.md` and the selected feedback files, then write or update:

`synthesis/ideas/{idea-id}/comparison.md`

Separate common ground, disagreements, unique contributions, challenged assumptions, evidence gaps, and proposed experiments. Distinguish silence or missing feedback from disagreement.

The comparison is not a team decision. Move anything into `decisions/` only through `prompts/decision.md` after explicit approval is recorded.

## Revise without erasing history

When the author revises an idea, update the personal source page first. In the shared card, add a dated revision note describing what changed and why. Do not rewrite feedback to match the revision; mark which idea version each feedback file reviewed.

If the idea is replaced, link old and new bundles and mark the old one `superseded` rather than deleting it.

## Finish

Report the files created or changed, the current idea status, whose feedback is present or missing, unresolved questions, and the next useful action. Confirm that no personal file belonging to another member was modified.

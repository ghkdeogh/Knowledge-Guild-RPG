---
name: explore-member-wikis
description: Read and explore explicitly selected Wiki³ member Wikis, trace their evidence, compare viewpoints, and identify knowledge gaps without modifying personal spaces or treating absence as disagreement. Use when a user asks to inspect, understand, search, contrast, or synthesize other members' project knowledge.
---

# Explore Member Wikis

Explore member knowledge in a scoped, evidence-backed way while preserving ownership and independent perspectives.

## Establish permission and scope

Read `WIKI_RULES.md` first. Confirm the current user's `member-id` when it matters for distinguishing their perspective.

Other members' personal spaces may be read only when the user explicitly asks to inspect, explore, search, compare, or analyze them. Determine:

- target member IDs;
- topic or question;
- desired operation: explore, compare, trace evidence, or find gaps;
- whether the result should remain in chat or be saved.

If target members are unspecified, list only the available `members/{member-id}/` directory names and ask which ones are in scope. Do not inspect their contents yet. “All members” is an explicit scope when the user says it.

For a broad exploration request, start with an index-level map rather than reading every file. Offer deeper paths after showing what exists.

## Read progressively

For each selected member, use this order:

1. `WIKI_SCHEMA.md` to understand their personal organization, when present.
2. `wiki/index.md` to locate relevant knowledge.
3. Only the Wiki pages relevant to the user's question.
4. `CONTEXT.md` or `PROFILE.md` only when the question concerns the member's overall project view, role, goals, or when a claim cannot be interpreted without that context.
5. `raw/` only when the user asks for source verification or a material claim cannot be evaluated from its cited source metadata.

Never modify, move, rename, or normalize another member's files. Do not read unrelated personal notes merely to make the answer more comprehensive.

If a selected member lacks an index or schema, report the navigation limitation and search only the minimum relevant files. Do not create missing files in their space.

## Choose the operation

### Explore one or more Wikis

Map the relevant areas, summarize what each member currently holds, surface important connections, and suggest useful paths for deeper reading. Keep member attribution on every substantive viewpoint.

### Compare viewpoints

Choose comparison dimensions from the user's question and the material actually present. Separate:

- common ground;
- differences in goals, assumptions, definitions, methods, evidence, or priorities;
- direct contradictions;
- unique contributions;
- missing or insufficiently documented positions;
- questions that would clarify the comparison.

Missing material, an unread file, and an opposing view are three different states. Never turn missing evidence into a conclusion about what a member believes.

### Trace evidence

Follow a claim from a Wiki page to its cited source when needed. Distinguish verified facts, a source's claims, member opinions, hypotheses, and AI-generated inferences. Record relevant dates because financial and market claims may have changed over time.

### Find gaps and opportunities

Identify orphaned topics, uncited claims, unresolved contradictions, missing member viewpoints, concepts with no dedicated page, and promising cross-member connections. Frame these as investigation opportunities, not defects in a person.

## Maintain an evidence ledger

For each important finding, retain:

- member ID;
- file path and relevant heading;
- knowledge type: fact, source claim, member opinion, hypothesis, or AI inference;
- date or `as_of` when relevant;
- confidence or limitation.

Use clickable relative Wiki links in saved documents. In chat, provide enough file attribution for the user to inspect the basis.

Do not quote or copy more personal material than the comparison requires. Paraphrase by default and preserve the original member's meaning.

## Report coverage honestly

State which members and files were read, which expected areas were absent, and what was intentionally left unread. Stop once the question is supported; a request to compare a topic does not authorize an indiscriminate full-repository profile of each person.

## Save only when requested

The default result is a chat response. If the user requests a saved artifact, read [references/report-formats.md](references/report-formats.md) and use:

- exploration: `synthesis/explorations/YYYY-MM-DD-{topic}.md`
- comparison: `synthesis/comparisons/YYYY-MM-DD-{topic}.md`

Saving into `synthesis/` does not make the result a team decision. Never write into a selected member's personal Wiki. Use `prompts/decision.md` only after explicit team approval.

## Finish

Lead with the answer to the user's question, then show attribution, comparison or connections, coverage limitations, and useful next questions. Confirm that no member Wiki was modified.

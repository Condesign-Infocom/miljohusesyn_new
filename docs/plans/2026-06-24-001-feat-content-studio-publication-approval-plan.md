---
title: Restore content-studio approval workflow for editorial publishing
type: feat
status: active
date: 2026-06-24
---

# Restore content-studio approval workflow for editorial publishing

## Overview

Reintroduce an explicit editorial approval path for content-studio items that are currently published immediately when saved. Editors should be able to choose between sending a change for approval and publishing it directly for small, low-risk edits. The implementation should reuse the existing draft/review queue model already present in the content-studio services, while fixing the current gap where "draft" saves still mutate the live content rows.

## Problem Frame

The current content-studio UX and copy are built around direct publishing. Facts, standard content, news, and inline fact editing from checklist context all save as `published` and tell the user that valid changes go live immediately. The codebase still contains editorial draft and review-request concepts, plus a queue loader and approval service, but that workflow is effectively dormant. More importantly, the current save methods update the source `facts`, `standard_content_blocks`, and `public_news_items` rows before any approval step, which means bringing back a visible "Publicera" or approval flow without changing persistence behavior would create false safety: changes marked "for review" could still leak into live content.

The requested outcome is a real approval workflow for larger edits, while keeping a direct-publish option available for typo fixes and similar small edits. The safest interpretation is an explicit user choice between "send for approval" and "publish now", not an automatic classifier for "small" versus "big" edits.

## Requirements Trace

- R1. Editors must be able to save eligible content changes without publishing them immediately.
- R2. Editors must still be able to publish directly from the same editing surfaces for small edits.
- R3. Pending review changes must remain separate from published content until an explicit approval or direct publish action occurs.
- R4. A visible publishing/review surface must return so reviewers can find and approve queued edits.
- R5. Existing content types that already use the editorial draft infrastructure should behave consistently across list, editor, and checklist-inline editing contexts.

## Scope Boundaries

- In scope: fact editors, standard-content editors, news editors, and checklist inline fact editing in `src/lib/components/admin/QuestionFactWorkspace.svelte`.
- In scope: restoring a visible publishing queue/navigation surface for the content types already backed by `editorial_drafts` and `editorial_review_requests`.
- Out of scope: checklist structure mutations such as saving, moving, creating, or deleting groups/questions in `src/routes/admin/content-studio/checklists/[checklistId]/+page.server.ts`. Those writes currently bypass the editorial draft workflow and would need a larger snapshot-staging design.
- Out of scope: automatic heuristics that decide whether an edit is "small enough" to publish. The editor chooses the path explicitly.

### Deferred to Separate Tasks

- Approval gating for checklist structure changes: separate task after this work proves out the staged editorial flow for facts, standard content, and news.
- Dedicated approver-role authorization rules: separate task if the client later wants publish permissions restricted beyond the current content-studio user gate.

## Context & Research

### Relevant Code and Patterns

- `src/lib/server/services/content-studio.ts` already exposes `loadPublishingQueue` and `approvePublishingReview`, and all three content save services accept a `status?: 'draft' | 'in_review' | 'published'` argument even though they currently force `published`.
- `src/lib/server/domain-store/content-studio-repository.ts` already persists `editorial_drafts`, `editorial_draft_revisions`, and `editorial_review_requests`, and already has `createReviewRequest`, `listPublishingQueue`, and `approveReviewRequest`.
- `src/lib/server/services/content-studio.ts` already overlays latest draft payload into editor views via `buildFactEditorDraft`, `buildStandardContentEditorDraft`, and `buildNewsEditorDraft`. That is the key existing pattern that makes staged unpublished revisions feasible.
- `src/routes/admin/content-studio/facts/[factId]/+page.server.ts`, `src/routes/admin/content-studio/standard-content/[blockId]/+page.server.ts`, `src/routes/admin/content-studio/news/[newsId]/+page.server.ts`, and the checklist inline fact save action all currently hardcode direct publish.
- `src/lib/components/admin/ContentStudioNav.svelte` currently has no publishing tab even though prior architecture still references "publishing" as a workflow concept.

### Institutional Learnings

- Reuse the shared content-studio navigation component instead of cloning per-route navigation variants.
- Keep changes tightly scoped to the content-studio route family rather than mechanically editing unrelated admin surfaces.

### External References

- No external research needed. The repo already contains the relevant workflow primitives and patterns for this feature.

## Key Technical Decisions

- Explicit editor choice beats automatic edit-size detection: provide separate "send for approval" and "publish now" actions instead of trying to infer whether an edit is just a typo.
- Approval must be backed by staged persistence, not just alternate button labels: `draft`/`in_review` saves must persist revision payloads without mutating published source rows.
- The restored publishing surface should build on the existing queue model instead of introducing a parallel approval store.
- Checklist inline fact editing should participate in the same publication workflow as full-page fact editing because both already write through `saveFactDraft`.
- Review should be the safer default action in full-page editors, with direct publish still available as an explicit secondary action.

## Open Questions

### Resolved During Planning

- How should "small edits can still go live directly" work?
  - Resolve as explicit dual actions (`send for approval` and `publish now`), not an automatic edit classifier.
- Which surfaces should participate in the restored approval flow?
  - Limit the first pass to facts, standard content, news, and checklist inline fact editing because they already share editorial draft infrastructure.

### Deferred to Implementation

- Whether queue items need richer preview content than title/status in the first pass. The plan assumes at minimum a link back to the editor plus visible status metadata, and implementation can decide whether lightweight previews fit without widening scope.
- Whether repeated "send for approval" on an already pending draft should create a new review request row or update the existing pending request. The plan assumes the workflow should remain single-pending-request-per-draft, but the exact repository rule can be finalized while wiring the save helper.

## Output Structure

    docs/plans/
      2026-06-24-001-feat-content-studio-publication-approval-plan.md
    src/routes/admin/content-studio/publishing/
      +page.server.ts
      +page.svelte

## Implementation Units

- [ ] **Unit 1: Reintroduce staged unpublished revisions in the editorial service layer**

**Goal:** Make `draft` and `in_review` states real by keeping staged changes separate from published source rows until direct publish or approval.

**Requirements:** R1, R2, R3, R5

**Dependencies:** None

**Files:**
- Modify: `src/lib/server/services/content-studio.ts`
- Modify: `src/lib/server/domain-store/content-studio-repository.ts`
- Test: `tests/unit/content-studio.test.ts`

**Approach:**
- Stop hardcoding `nextStatus = 'published'` inside `saveFactDraft`, `saveStandardContentDraft`, and `saveNewsDraft`; instead honor the caller-provided status with a safe default.
- Split "persist revision payload" from "apply payload to published source row". For `draft` and `in_review`, write the new revision and draft status, but do not update `facts`, `standard_content_blocks`, or `public_news_items`.
- Keep editor reload behavior based on `build*EditorDraft(...)` so unpublished revisions still appear inside editors through draft payload overlays.
- When status is `published`, apply the normalized payload to the source row, advance the draft state to `published`, and run the existing publication side effects (cache clearing and, for facts/checklist-linked runtime data, runtime materialization where needed).
- When status is `in_review`, create or refresh a pending review request for the draft using the existing review-request infrastructure.
- Update approval flow so `approvePublishingReview` applies the latest staged revision payload to the source row before flipping the draft status to `published`, then runs the same publish side effects as direct publish.

**Patterns to follow:**
- `src/lib/server/services/content-studio.ts` `buildFactEditorDraft`, `buildStandardContentEditorDraft`, `buildNewsEditorDraft`
- `src/lib/server/domain-store/content-studio-repository.ts` `createDraft`, `appendDraftRevision`, `createReviewRequest`, `approveReviewRequest`

**Test scenarios:**
- Happy path: saving a fact as `in_review` stores the new revision payload and sets draft status to `in_review`, while the published fact row remains unchanged until approval.
- Happy path: publishing a fact directly updates the published fact row, persists a new revision, and keeps the editor on the latest published content.
- Happy path: approving a pending review request applies the latest staged payload to the correct source row and marks the request approved.
- Edge case: resubmitting an already pending draft for approval does not create duplicate visible queue entries for the same draft.
- Error path: invalid fact, standard-content, or news payload still returns validation errors without mutating published rows or queue state.
- Integration: checklist inline fact edits saved for review remain visible in the checklist editor overlay, but do not appear in published content until publish/approval.
- Integration: direct publish and approval both trigger the correct downstream publish side effects for each content kind (`clearPublishedContentCaches`, and any required runtime sync/materialization for fact-backed runtime content).

**Verification:**
- A staged edit can be reopened in the editor with its draft payload intact while the published version remains unchanged elsewhere.
- Approving a queued item makes the staged content visible through the same code path as direct publish.

- [ ] **Unit 2: Restore the publishing queue route and shared navigation entry**

**Goal:** Bring back a visible review surface where pending editorial changes can be found and approved.

**Requirements:** R4, R5

**Dependencies:** Unit 1

**Files:**
- Modify: `src/lib/components/admin/ContentStudioNav.svelte`
- Create: `src/routes/admin/content-studio/publishing/+page.server.ts`
- Create: `src/routes/admin/content-studio/publishing/+page.svelte`
- Modify: `src/routes/admin/content-studio/+page.svelte`
- Test: `tests/unit/content-studio.test.ts`
- Test: `tests/e2e/content-studio-access.spec.ts`

**Approach:**
- Add a `Publicering` nav item in the shared content-studio nav and thread a new `active` variant through the component type.
- Build a publishing route that loads the pending queue via `loadPublishingQueue`, exposes an approve action backed by `approvePublishingReview`, and links each queue row back to its editor surface.
- Update the content-studio overview copy and metrics so they describe approval-first editorial work rather than "publiceras direkt" everywhere.
- Show queue-relevant metadata such as content kind, identifier, validation state, requested time, and approval action in one table/list view.

**Patterns to follow:**
- `src/lib/components/admin/ContentStudioNav.svelte`
- Existing admin page layout patterns in `src/routes/admin/content-studio/facts/+page.svelte` and `src/routes/admin/content-studio/news/+page.svelte`

**Test scenarios:**
- Happy path: a pending review request appears in the publishing queue with the right title, identifier, and content-kind label.
- Happy path: approving a queue item removes it from the pending queue and updates the related draft/editor status to `published`.
- Edge case: an empty queue renders a clear empty state rather than a blank table.
- Error path: approving a missing or already-resolved review request returns a visible form error instead of breaking the page.
- Integration: the `Publicering` nav item is visible from content-studio pages and routes to the queue screen.

**Verification:**
- Reviewers can navigate to a dedicated publishing surface, inspect pending items, and approve them without touching lower-level services directly.

- [ ] **Unit 3: Add dual-action save flows to the affected editors**

**Goal:** Let editors explicitly choose between approval and immediate publication from each eligible editing surface.

**Requirements:** R1, R2, R5

**Dependencies:** Unit 1, Unit 2

**Files:**
- Modify: `src/routes/admin/content-studio/facts/[factId]/+page.server.ts`
- Modify: `src/routes/admin/content-studio/facts/[factId]/+page.svelte`
- Modify: `src/routes/admin/content-studio/standard-content/[blockId]/+page.server.ts`
- Modify: `src/routes/admin/content-studio/standard-content/[blockId]/+page.svelte`
- Modify: `src/routes/admin/content-studio/news/[newsId]/+page.server.ts`
- Modify: `src/routes/admin/content-studio/news/[newsId]/+page.svelte`
- Modify: `src/lib/components/admin/QuestionFactWorkspace.svelte`
- Modify: `src/routes/admin/content-studio/checklists/[checklistId]/+page.server.ts`
- Test: `tests/unit/content-studio.test.ts`
- Test: `tests/e2e/content-studio-editing.spec.ts`

**Approach:**
- Add explicit submit intent to each form, for example via named submit buttons or a hidden `status` field set by button choice.
- Use `in_review` for the safer default action and `published` for the direct-publish action.
- Update route actions to pass the chosen status through instead of hardcoding `published`.
- For checklist inline fact editing, mirror the same dual-action pattern so inline edits are not a bypass around the restored approval workflow.
- Update success copy to distinguish "sent for approval" from "published directly".

**Execution note:** Start with request/response contract coverage in route/service tests before adjusting the editor button wiring, because the persistence semantics are changing in a user-visible workflow.

**Patterns to follow:**
- Existing save action structure in `src/routes/admin/content-studio/facts/[factId]/+page.server.ts`
- Existing modal form pattern in `src/lib/components/admin/QuestionFactWorkspace.svelte`

**Test scenarios:**
- Happy path: choosing "send for approval" from a fact editor returns success copy indicating review submission and leaves the editor showing pending review state.
- Happy path: choosing "publish now" from the same editor publishes immediately and returns the direct-publish success message.
- Happy path: checklist inline fact modal offers both actions and routes them through the same fact workflow semantics.
- Edge case: form validation errors preserve the selected content and do not accidentally publish or enqueue the change.
- Error path: missing content IDs still produce the existing not-found behavior for both actions.
- Integration: standard-content and news editors behave consistently with facts, including success copy, status labels, and no unintended direct publish on review submission.

**Verification:**
- Every eligible editor exposes both paths clearly, and the resulting status matches the chosen action.

- [ ] **Unit 4: Surface draft/review state across list and editor summary UIs**

**Goal:** Make the restored workflow understandable after the save button changes by showing current editorial state instead of direct-publish assumptions.

**Requirements:** R4, R5

**Dependencies:** Unit 1, Unit 3

**Files:**
- Modify: `src/routes/admin/content-studio/facts/+page.svelte`
- Modify: `src/routes/admin/content-studio/facts/[factId]/+page.svelte`
- Modify: `src/routes/admin/content-studio/standard-content/[blockId]/+page.svelte`
- Modify: `src/routes/admin/content-studio/news/[newsId]/+page.svelte`
- Modify: `src/routes/admin/content-studio/+page.svelte`
- Test: `tests/e2e/content-studio-access.spec.ts`

**Approach:**
- Replace "publiceras direkt" instructional copy with workflow-aware language that mentions both approval and direct publish.
- Show `draft`, `väntar på granskning`, and `publicerad` states where users currently only see "publicerad" versus "inte ändrad".
- On overview/list screens, make pending work visible enough that editors know when an item still requires approval.
- Ensure summary panels and helper text remain concise so the UI does not become cluttered after workflow restoration.

**Patterns to follow:**
- Status/summary cards in `src/routes/admin/content-studio/facts/+page.svelte`
- Summary-panel patterns in `src/routes/admin/content-studio/standard-content/[blockId]/+page.svelte` and `src/routes/admin/content-studio/news/[newsId]/+page.svelte`

**Test scenarios:**
- Happy path: a queued fact/news/standard-content edit shows a pending-review state in the relevant editor summary.
- Happy path: overview and list copy no longer promise universal direct publication.
- Edge case: imported items with no editorial draft still render a sensible neutral status.
- Integration: approving a queued item updates both queue visibility and downstream editor/list status labels.

**Verification:**
- Users can tell at a glance whether content is already published, only saved as a draft, or waiting for approval.

## System-Wide Impact

- **Interaction graph:** editor forms -> route actions -> `save*Draft` services -> `editorial_drafts` / `editorial_draft_revisions` / `editorial_review_requests` -> publish side effects (`clearPublishedContentCaches`, runtime materialization where applicable) -> public/admin readers.
- **Error propagation:** validation failures must stop at the route action and return form errors without mutating published content or queue state.
- **State lifecycle risks:** the main risk is partial workflow restoration where UI says "for review" but source rows still change. Unit 1 is explicitly designed to eliminate that mismatch.
- **API surface parity:** facts, standard content, news, and checklist inline fact editing should all use the same explicit status model to avoid a loophole where one editor path still publishes immediately.
- **Integration coverage:** approval must be tested end-to-end enough to prove that unpublished revisions stay in editorial overlays only, then move into published readers only after publish/approval.
- **Unchanged invariants:** checklist structure editing remains on its current immediate-write path in this plan; only content kinds already backed by editorial drafts are being moved back to approval-aware publishing.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Review-mode saves still leak into public content through direct row mutation or cache behavior | Separate staged revision persistence from published-row updates; test that review saves leave published readers unchanged |
| The restored queue becomes visible but unusable because approval does not apply staged content | Make approval responsible for applying the latest revision payload and running publish side effects |
| UI clutter from adding more buttons and status copy | Use one safe primary action and one explicit secondary direct-publish action; keep helper copy short and status-driven |
| Editors assume checklist structure edits are now review-gated too | Update copy and scope only where the restored workflow really applies; keep checklist-structure behavior explicitly out of scope in this pass |

## Documentation / Operational Notes

- Update in-app copy to describe the restored workflow consistently across overview, list, and editor surfaces.
- If client onboarding material exists outside the repo, it will need a short note that "send for approval" is the default path and "publish now" is for intentional direct publication.

## Sources & References

- Related code: `src/lib/server/services/content-studio.ts`
- Related code: `src/lib/server/domain-store/content-studio-repository.ts`
- Related code: `src/lib/components/admin/ContentStudioNav.svelte`
- Related code: `src/lib/components/admin/QuestionFactWorkspace.svelte`
- Related code: `src/routes/admin/content-studio/facts/[factId]/+page.server.ts`
- Related code: `src/routes/admin/content-studio/standard-content/[blockId]/+page.server.ts`
- Related code: `src/routes/admin/content-studio/news/[newsId]/+page.server.ts`

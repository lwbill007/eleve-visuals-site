# ÉLEVÉ OS Workflow Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic, evidence-aware brainstorming, planning, SEO, sales enablement, and ad creative workflows to the authenticated ÉLEVÉ OS Ask AI experience.

**Architecture:** A pure deterministic router selects one compact prompt from a typed workflow registry using the request, current workspace, and recent conversation. The context endpoint emits workflow metadata before existing text events, and the Ask AI panel renders the active workflow without changing its streaming contract.

**Tech Stack:** Next.js App Router, React, TypeScript, Server-Sent Events, Node test runner through `tsx`.

## Global Constraints

- Automatic routing uses no additional AI request.
- Business DNA, page context, memory, and verified evidence remain authoritative.
- Specialized workflows create drafts and plans only; they never send, publish, or mutate.
- Unsupported claims and missing evidence remain explicitly unknown.
- Standard analytical and operational questions retain the existing response behavior.

---

### Task 1: Typed Workflow Registry and Router

**Files:**
- Create: `src/lib/ai/prompts/workflows.ts`
- Create: `src/lib/ai/prompts/workflows.test.ts`

**Interfaces:**
- Produces: `AI_WORKFLOW_MODES`, `AIWorkflowMode`, `AIWorkflowSelection`, `routeAIWorkflow(input)`, and `workflowPrompt(mode)`.
- Consumes: current message, page identifier, and recent user/assistant message content.

- [ ] **Step 1: Write router tests**

Cover brainstorming, planning continuation, SEO audit, sales collateral, ad creative, ordinary status questions, workspace hints, and uncertain-input fallback. Assert that every specialized prompt includes draft-only and evidence constraints.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npx tsx --test src/lib/ai/prompts/workflows.test.ts
```

Expected: failure because the workflow module does not exist.

- [ ] **Step 3: Implement the registry**

Create a dependency-free pure module with:

```ts
export const AI_WORKFLOW_MODES = [
  "standard",
  "brainstorming",
  "writing-plans",
  "seo-audit",
  "sales-enablement",
  "ad-creative",
] as const;

export type AIWorkflowMode = (typeof AI_WORKFLOW_MODES)[number];

export interface AIWorkflowSelection {
  mode: AIWorkflowMode;
  label: string;
  prompt: string;
}
```

Normalize request and recent history, score explicit intent phrases before workspace hints, recognize a recent brainstorming approval as a planning continuation, and default uncertain requests to `standard`.

- [ ] **Step 4: Run router tests**

Run the command from Step 2.

Expected: all tests pass.

---

### Task 2: Typed Stream Metadata

**Files:**
- Create: `src/lib/ai/context-stream.ts`
- Create: `src/lib/ai/context-stream.test.ts`

**Interfaces:**
- Consumes: parsed JSON from a `data:` Server-Sent Event.
- Produces: `parseContextStreamPayload(value)` returning a mode event, text event, error event, or `null`.

- [ ] **Step 1: Write parser tests**

Test valid mode metadata, text, error, unknown modes, malformed objects, and empty payloads.

- [ ] **Step 2: Run tests and verify failure**

```bash
npx tsx --test src/lib/ai/context-stream.test.ts
```

Expected: failure because the parser module does not exist.

- [ ] **Step 3: Implement the parser**

Use runtime checks against `AI_WORKFLOW_MODES`; never trust arbitrary mode or label values from the stream. Preserve the existing `{ text }` event shape.

- [ ] **Step 4: Run parser tests**

Expected: all tests pass.

---

### Task 3: Route Workflow Selection Through Context Chat

**Files:**
- Modify: `src/app/api/admin/ai/context/route.ts`

**Interfaces:**
- Consumes: `routeAIWorkflow({ message, page, history })`.
- Produces: an initial SSE event `{ mode, label }`, followed by unchanged text/error/done events.

- [ ] **Step 1: Select the workflow after history loads**

Pass the current message, current page, and the last six conversation messages to the pure router.

- [ ] **Step 2: Add the selected prompt layer**

Append the selected workflow prompt to the existing charter, cognitive context, page context, and memory. Do not replace existing truth or Business DNA instructions.

- [ ] **Step 3: Emit mode metadata**

At stream start, enqueue:

```ts
data: {"mode":"seo-audit","label":"SEO Audit"}
```

Use the selected values; do not hardcode one workflow.

- [ ] **Step 4: Run workflow and parser tests**

Run both test files together and expect all tests to pass.

---

### Task 4: Render Active Workflow in Ask AI

**Files:**
- Modify: `src/components/admin/ai/AskAIPanel.tsx`

**Interfaces:**
- Consumes: `parseContextStreamPayload`.
- Produces: active workflow state and a compact specialized-workflow badge.

- [ ] **Step 1: Add workflow state**

Initialize to `standard`, reset it when the panel closes and before each request, and update it only from validated mode events.

- [ ] **Step 2: Replace ad hoc event parsing**

Route parsed text events into the existing accumulated response, surface stream error events in the response area, and ignore malformed events without discarding later valid events.

- [ ] **Step 3: Render the indicator**

Show the selected label near the AI response only when mode is not `standard`. Use accessible text and existing ÉLEVÉ visual tokens.

- [ ] **Step 4: Verify the repository**

Run:

```bash
npx tsx --test src/lib/ai/prompts/workflows.test.ts src/lib/ai/context-stream.test.ts
npx tsc --noEmit
npm run build
```

Expected: all tests and type checks pass; production build exits successfully.

---

### Task 5: Commit and Deploy

**Files:**
- Include only the approved workflow integration, its tests, and its design/plan documentation alongside the already-requested pending repository work selected for this deployment.

- [ ] **Step 1: Review repository state**

Run `git status`, staged/unstaged diff, and recent log. Confirm no environment or credential files are included.

- [ ] **Step 2: Commit**

Create one commit describing why ÉLEVÉ OS now routes Admin AI requests through evidence-aware business workflows.

- [ ] **Step 3: Push and verify deployment**

Push the current branch without force. Inspect the configured deployment/check status and report the deployed URL or any definitive blocker.

# ÉLEVÉ OS Automatic Workflow Routing

## Goal

Adapt the useful runtime behaviors from the installed brainstorming, writing-plans, SEO audit, sales enablement, and ad creative skills for the authenticated ÉLEVÉ Admin AI. Requests should automatically receive the right evidence-aware workflow while ordinary analytical and operational questions retain the existing direct-answer behavior.

The Admin AI must remain proposal-only in every adapted workflow. It may recommend actions and create drafts, but it must not execute changes or trigger mutations.

## Activation

The workflow router selects one of:

- `brainstorming`: ideation, feature design, campaign planning, workflow design, content direction, or another request with meaningful creative choices.
- `writing-plans`: an approved direction or sufficiently defined multi-step objective that needs a sequenced implementation plan.
- `seo-audit`: technical SEO, on-page SEO, rankings, indexing, crawlability, metadata, Core Web Vitals, local SEO, or organic traffic diagnosis.
- `sales-enablement`: proposals, decks, one-pagers, objection handling, demo scripts, talk tracks, buyer collateral, or sales playbooks.
- `ad-creative`: paid-ad concepts, copy variations, platform-specific creative, hooks, creative testing, or iteration from ad performance.
- `standard`: direct analytical, operational, and status questions.

A deterministic server-side router will inspect:

- The current user message.
- A small window of recent conversation history.
- Explicit continuation signals in the most recent assistant response.

Ordinary questions, metric explanations, status requests, and direct operational lookups remain in the normal assistant flow.

## Shared Behavior

Every specialized workflow must:

- Use Business DNA, page context, memory, and verified evidence as authoritative inputs.
- Ask only for context that is not already available.
- Label estimates, drafts, assumptions, and unknowns explicitly.
- Never invent analytics, revenue, rankings, testimonials, customer outcomes, or performance.
- Produce reviewable plans or drafts only.
- Never send, publish, mutate, or claim implementation.

## Workflow Behavior

### Brainstorming

The system prompt will require the assistant to:

1. Establish the goal, constraints, and success criteria.
2. Ask one focused question per response.
3. Prefer concise choices when they make the decision easier.
4. Avoid asking for facts already available in page context, memory, or conversation history.
5. Compare two or three viable approaches with trade-offs.
6. Lead with a recommendation and explain why it fits the available evidence.
7. Produce a final actionable proposal only after the user approves the direction.
8. Clearly label assumptions and unknowns.
9. Hand an approved direction to the planning workflow when a sequenced plan is requested.

### Writing plans

The coding-agent-specific repository, worktree, commit, and code instructions will not be copied. ÉLEVÉ OS will instead produce outcome-oriented business plans with:

- Goal, evidence, assumptions, constraints, owners, dependencies, and success measures.
- Ordered phases with concrete deliverables and verification criteria.
- Explicit unknowns rather than invented implementation details.
- Human review before any execution outside the chat.

### SEO audit

The workflow will prioritize crawlability and indexation, technical foundations, on-page quality, content quality, and authority. Every finding must include impact, evidence, fix, and priority. It must state when Search Console, analytics, rendered schema, or performance evidence is unavailable.

### Sales enablement

The workflow will tailor collateral to the buyer, funnel stage, sales motion, and provable outcomes. It may produce proposals, deck outlines, one-pagers, objection handling, demo scripts, playbooks, and buyer cards. Every unsupported proof point must be marked as missing rather than fabricated.

### Ad creative

The workflow will establish platform, format, offer, audience, awareness stage, evidence, and constraints. It will use distinct testable angles, validate platform character limits, cite grounding sources when available, and label all output as draft creative. It must not claim likely performance without measured data.

## Architecture

### Workflow router

A small pure module will classify requests into the six workflow modes. It will use explicit phrase, workspace, and continuation matching rather than another AI request, avoiding additional latency and cost.

### Workflow registry

A registry will map each mode to a compact runtime prompt and user-facing label. The context chat route will append only the selected workflow prompt.

### Stream metadata

The context endpoint will emit an initial Server-Sent Event containing the active workflow mode and label. Existing text events remain unchanged.

### Interface

The Ask AI panel will parse the mode event and display a compact workflow indicator while a specialized mode is active. Closing the panel resets the indicator with the rest of the panel state.

## Data Flow

1. The panel sends the message and page context.
2. The server loads recent conversation history.
3. The router evaluates the message, workspace, and recent history.
4. The selected prompt layer is added to the existing charter, page context, cognitive context, and memory.
5. The server emits the selected mode, then streams the answer.
6. The panel renders the mode indicator and streamed response.
7. Conversation history continues to be persisted through the existing memory mechanism.

## Safety and Error Handling

- Specialized workflows never grant mutation capabilities.
- Existing authentication and rate guards remain unchanged.
- If mode metadata is missing or malformed, the panel defaults to standard mode.
- If routing is uncertain, the system defaults to standard behavior.
- Business claims remain subject to existing evidence and truth requirements.
- Drafts and proposals remain explicitly review-gated.

## Testing

- Unit tests for all specialized modes, ordinary questions, workspace hints, and workflow continuations.
- Route-level tests or focused module tests confirming that the prompt layer is included only when active.
- UI coverage confirming mode-event parsing, indicator rendering, reset behavior, and compatibility with existing text streams.
- Type checking, lint checks, and a production build.

## Success Criteria

- Requests reliably select the appropriate compact workflow.
- Creative requests start a guided, one-question-at-a-time conversation.
- Approved directions can become sequenced business plans.
- SEO, sales, and ad outputs follow their evidence and formatting constraints.
- Normal admin questions still receive direct answers.
- The user sees when brainstorming mode is active.
- Final output is an actionable proposal, never an automatically executed action.
- No additional AI classification call is introduced.

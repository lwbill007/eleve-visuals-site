import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_WORKFLOW_MODES,
  routeAIWorkflow,
  workflowPrompt,
} from "./workflows";

test("routes creative discovery to brainstorming", () => {
  assert.equal(
    routeAIWorkflow({
      message: "Help me brainstorm a new client referral experience",
      page: "marketing",
      history: [],
    }).mode,
    "brainstorming"
  );
});

test("routes an approved brainstorming direction to writing plans", () => {
  assert.equal(
    routeAIWorkflow({
      message: "Yes, use the recommended option",
      page: "marketing",
      history: [
        {
          role: "assistant",
          content:
            "I recommend the partner-led approach. Here are three approaches and their trade-offs. Does this direction look right?",
        },
      ],
    }).mode,
    "writing-plans"
  );
});

test("routes explicit planning requests to writing plans", () => {
  assert.equal(
    routeAIWorkflow({
      message: "Turn this approved campaign direction into a phased implementation plan",
      page: "marketing",
      history: [],
    }).mode,
    "writing-plans"
  );
});

test("routes SEO audits with website workspace context", () => {
  const result = routeAIWorkflow({
    message: "Why are our service pages not ranking? Audit the metadata and indexing.",
    page: "website",
    history: [],
  });
  assert.equal(result.mode, "seo-audit");
  assert.equal(result.label, "SEO Audit");
});

test("routes sales collateral requests", () => {
  assert.equal(
    routeAIWorkflow({
      message: "Create an objection handling one-pager for portrait package leads",
      page: "crm",
      history: [],
    }).mode,
    "sales-enablement"
  );
});

test("routes paid ad creative requests", () => {
  assert.equal(
    routeAIWorkflow({
      message: "Write Meta ad creative variations with three testable hooks",
      page: "marketing",
      history: [],
    }).mode,
    "ad-creative"
  );
});

test("keeps ordinary operational questions in standard mode", () => {
  assert.equal(
    routeAIWorkflow({
      message: "How many unread inquiries are there?",
      page: "bookings",
      history: [],
    }).mode,
    "standard"
  );
});

test("every specialized prompt is evidence-bound and draft-only", () => {
  for (const mode of AI_WORKFLOW_MODES) {
    if (mode === "standard") continue;
    const prompt = workflowPrompt(mode).toLowerCase();
    assert.match(prompt, /evidence/);
    assert.match(prompt, /draft|plan/);
    assert.match(prompt, /never (send|publish|execute|mutate)/);
  }
});

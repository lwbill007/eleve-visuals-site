import assert from "node:assert/strict";
import test from "node:test";
import { parseContextStreamPayload } from "./context-stream";

test("parses validated workflow metadata", () => {
  assert.deepEqual(
    parseContextStreamPayload({
      mode: "seo-audit",
      label: "SEO Audit",
    }),
    { type: "mode", mode: "seo-audit", label: "SEO Audit" }
  );
});

test("parses existing text and error payloads", () => {
  assert.deepEqual(parseContextStreamPayload({ text: "Hello" }), {
    type: "text",
    text: "Hello",
  });
  assert.deepEqual(parseContextStreamPayload({ error: "Unavailable" }), {
    type: "error",
    error: "Unavailable",
  });
});

test("rejects unknown modes and malformed values", () => {
  assert.equal(
    parseContextStreamPayload({ mode: "publisher", label: "Publisher" }),
    null
  );
  assert.equal(parseContextStreamPayload({ mode: "seo-audit", label: "" }), null);
  assert.equal(parseContextStreamPayload(null), null);
  assert.equal(parseContextStreamPayload("text"), null);
  assert.equal(parseContextStreamPayload({}), null);
});

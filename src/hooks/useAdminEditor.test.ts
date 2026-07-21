import assert from "node:assert/strict";
import test from "node:test";
import { resolveAdminSaveCompletion } from "./useAdminEditor";

test("marks the submitted snapshot saved when no edits occurred during save", () => {
  assert.deepEqual(
    resolveAdminSaveCompletion({
      requestId: 2,
      latestRequestId: 2,
      ok: true,
      submittedSnapshot: '{"title":"A"}',
      currentSnapshot: '{"title":"A"}',
    }),
    { savedSnapshot: '{"title":"A"}', status: "saved" }
  );
});

test("keeps newer edits dirty after an older snapshot saves", () => {
  assert.deepEqual(
    resolveAdminSaveCompletion({
      requestId: 2,
      latestRequestId: 2,
      ok: true,
      submittedSnapshot: '{"title":"A"}',
      currentSnapshot: '{"title":"B"}',
    }),
    { savedSnapshot: '{"title":"A"}', status: "dirty" }
  );
});

test("ignores stale completions and reports current failures", () => {
  assert.equal(
    resolveAdminSaveCompletion({
      requestId: 1,
      latestRequestId: 2,
      ok: true,
      submittedSnapshot: "{}",
      currentSnapshot: "{}",
    }),
    null
  );
  assert.deepEqual(
    resolveAdminSaveCompletion({
      requestId: 2,
      latestRequestId: 2,
      ok: false,
      submittedSnapshot: "{}",
      currentSnapshot: "{}",
    }),
    { status: "error" }
  );
});

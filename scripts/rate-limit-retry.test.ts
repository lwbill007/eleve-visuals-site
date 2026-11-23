import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { isRetryableRateLimitError } from "../src/lib/rate-limit";

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("test", { code, clientVersion: "test" });

// The production login failure (2026-11-23): "Transaction API error: Unable to start a transaction in the given time."
assert.equal(isRetryableRateLimitError(known("P2028")), true, "waking database is retried");
assert.equal(isRetryableRateLimitError(known("P2034")), true, "serialization conflict is retried");
assert.equal(isRetryableRateLimitError(known("P2002")), false, "other database errors still fail closed");
assert.equal(isRetryableRateLimitError(new Error("boom")), false, "unknown errors still fail closed");
console.log("rate-limit-retry: 4 passed");

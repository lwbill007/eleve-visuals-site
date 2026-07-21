import assert from "node:assert/strict";
import {
  bookingDetailHref,
  canTransitionOpportunity,
  emailComposerHref,
  staleFirst,
} from "../src/lib/admin-operations";

assert.equal(bookingDetailHref("booking/123"), "/admin/bookings/booking%2F123");
assert.equal(
  emailComposerHref({
    email: "client+test@example.com",
    name: "Test Client",
    templateId: "follow_up_booking",
    source: "booking",
  }),
  "/admin/email?to=client%2Btest%40example.com&name=Test+Client&template=follow_up_booking&source=booking"
);

assert.deepEqual(
  staleFirst([
    { id: "fresh", ageDays: 0, updatedAt: "2026-07-21T12:00:00.000Z" },
    { id: "oldest", ageDays: 8, updatedAt: "2026-07-13T12:00:00.000Z" },
    { id: "stale", ageDays: 3, updatedAt: "2026-07-18T12:00:00.000Z" },
  ]).map((item) => item.id),
  ["oldest", "stale", "fresh"]
);

assert.equal(canTransitionOpportunity("pending", "accepted"), true);
assert.equal(canTransitionOpportunity("pending", "completed"), false);
assert.equal(canTransitionOpportunity("accepted", "completed"), true);
assert.equal(canTransitionOpportunity("completed", "rejected"), false);
assert.equal(canTransitionOpportunity("rejected", "accepted"), false);

console.log("admin operations smoke: ok");

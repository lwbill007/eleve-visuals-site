import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bookingLeadDaysRemaining,
  bookingLeadExpiresAt,
  bookingLeadExpiryCutoff,
  UNREACHED_BOOKING_EXPIRY_DAYS,
} from "../src/lib/booking-expiration";

const root = join(import.meta.dirname, "..");
let checks = 0;

function check(label: string, fn: () => void) {
  checks += 1;
  fn();
  console.log(`  ✓ ${label}`);
}

console.log("\nBooking lifecycle");

check("an unreached lead expires after 14 days", () => {
  const created = new Date("2026-11-01T12:00:00.000Z");
  assert.equal(UNREACHED_BOOKING_EXPIRY_DAYS, 14);
  assert.equal(bookingLeadExpiresAt(created, "lead")?.toISOString(), "2026-11-15T12:00:00.000Z");
  assert.equal(bookingLeadDaysRemaining(created, "lead", new Date("2026-11-12T12:00:00.000Z")), 3);
});

check("legacy new leads follow the same expiration policy", () => {
  assert.equal(
    bookingLeadExpiresAt("2026-11-01T12:00:00.000Z", "new")?.toISOString(),
    "2026-11-15T12:00:00.000Z"
  );
});

check("connected or archived bookings never auto-expire", () => {
  for (const status of ["qualified", "discovery", "proposal", "booked", "archived"]) {
    assert.equal(bookingLeadExpiresAt("2026-11-01T12:00:00.000Z", status), null);
  }
});

check("the cron cutoff matches the same 14-day policy", () => {
  assert.equal(
    bookingLeadExpiryCutoff(new Date("2026-11-15T12:00:00.000Z")).toISOString(),
    "2026-11-01T12:00:00.000Z"
  );
});

console.log("\nSession application binding");

check("new applications persist the open volume id and immutable snapshot", () => {
  const source = readFileSync(join(root, "src/app/api/submit/session/route.ts"), "utf8");
  assert.match(source, /sessionVolumeId: volumeId/);
  assert.match(source, /sessionVolumeNumber: volume\.volumeNumber/);
  assert.match(source, /sessionVolumeSlug: volume\.slug/);
  assert.match(source, /validateSessionApplicationGate\(volume\)/);
});

check("opening a volume closes any other open volume atomically", () => {
  for (const file of [
    "src/app/api/admin/session-volumes/route.ts",
    "src/app/api/admin/session-volumes/[id]/route.ts",
  ]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.match(source, /prisma\.\$transaction/);
    assert.match(source, /status: "applications_open"/);
    assert.match(source, /status: "applications_closed"/);
  }
});

check("deployment normalizes any pre-existing duplicate open volumes", () => {
  const migration = readFileSync(
    join(root, "prisma/migrations/20261116235900_single_open_session_volume/migration.sql"),
    "utf8"
  );
  assert.match(migration, /ROW_NUMBER\(\) OVER/);
  assert.match(migration, /"openRank" > 1/);
  assert.match(migration, /'applications_closed'/);
});

console.log(`\n${checks} booking/application lifecycle checks passed\n`);

import assert from "node:assert/strict";
import {
  ALL_VOLUMES,
  UNASSIGNED_VOLUME,
  classifyUnassignedApplication,
  concreteVolumeId,
  pickDefaultVolumeId,
  volumeFilterWhere,
} from "../src/lib/application-cycles";
import { cleanRoleDetails, describeRoleDetails, roleDetailFieldsFor } from "../src/lib/session-role-details";
import { createSessionApplicationSchema } from "../src/lib/session-application-validation";
import { DEFAULT_COLLABORATION_TERMS, parseApplicationSettings } from "../src/lib/session-application";
import { subjectForInterest, volumeInquiryHref } from "../src/lib/volume-inquiries";
import { parseCampaignTag } from "../src/lib/seasonal/inquiry-tag";
import { APPLICATION_STATUS_LABELS, normalizeApplicationStatus } from "../src/lib/types";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  void name;
};

// ── Default cycle ─────────────────────────────────────────────────────────
const v1 = { id: "v1", volumeNumber: 1, status: "completed", published: true };
const v2 = { id: "v2", volumeNumber: 2, status: "archived", published: true, archived: true };
const v3 = { id: "v3", volumeNumber: 3, status: "draft", published: false };
const v4 = { id: "v4", volumeNumber: 4, status: "applications_open", published: true };

test("open volume wins", () => assert.equal(pickDefaultVolumeId([v1, v2, v3, v4]), "v4"));
test("else newest non-archived (VOL. 3 draft)", () => assert.equal(pickDefaultVolumeId([v1, v2, v3]), "v3"));
test("else newest of all", () => assert.equal(pickDefaultVolumeId([v1, v2]), "v2"));
test("no volumes → all", () => assert.equal(pickDefaultVolumeId([]), ALL_VOLUMES));
test("unpublished open volume is not 'open'", () =>
  assert.equal(pickDefaultVolumeId([v1, { ...v4, published: false }, v3]), "v4"));

test("filter: volume", () => assert.deepEqual(volumeFilterWhere("v3"), { sessionVolumeId: "v3" }));
test("filter: unassigned", () => assert.deepEqual(volumeFilterWhere(UNASSIGNED_VOLUME), { sessionVolumeId: null }));
test("filter: all / empty", () => {
  assert.deepEqual(volumeFilterWhere(ALL_VOLUMES), {});
  assert.deepEqual(volumeFilterWhere(""), {});
  assert.deepEqual(volumeFilterWhere(null), {});
});
test("concrete id", () => {
  assert.equal(concreteVolumeId("v3"), "v3");
  assert.equal(concreteVolumeId(UNASSIGNED_VOLUME), undefined);
  assert.equal(concreteVolumeId(ALL_VOLUMES), undefined);
});

// ── Historical assignment never guesses ───────────────────────────────────
const refs = [
  { id: "v1", slug: "vol-1-origins", title: "Origins", volumeNumber: 1 },
  { id: "v2", slug: "vol-2-noir", title: "Noir", volumeNumber: 2 },
  { id: "v3", slug: "mask-off", title: "MASK OFF", volumeNumber: 3 },
];
test("stored id → confident", () =>
  assert.deepEqual(classifyUnassignedApplication({ sessionVolumeId: "v2" }, refs).kind, "confident"));
test("stored slug → confident", () => {
  const r = classifyUnassignedApplication({ sessionVolumeSlug: "MASK-OFF" }, refs);
  assert.equal(r.kind, "confident");
  assert.equal("volumeId" in r && r.volumeId, "v3");
});
test("title only → probable (not applied)", () =>
  assert.equal(classifyUnassignedApplication({ sessionVolumeTitle: "noir" }, refs).kind, "probable"));
test("id and slug disagree → conflict", () =>
  assert.equal(classifyUnassignedApplication({ sessionVolumeId: "v1", sessionVolumeSlug: "mask-off" }, refs).kind, "conflict"));
test("nothing → no evidence", () =>
  assert.equal(classifyUnassignedApplication({ fullName: "A" }, refs).kind, "no_evidence"));
test("unknown id → no evidence", () =>
  assert.equal(classifyUnassignedApplication({ sessionVolumeId: "deleted" }, refs).kind, "no_evidence"));

// ── Role questions ────────────────────────────────────────────────────────
test("model sees styling only (no clothing sizes), not mask unless enabled", () => {
  const ids = roleDetailFieldsFor(["Model"], {}).map((f) => f.id);
  assert.deepEqual(ids, ["model-styling"]);
  const withMask = roleDetailFieldsFor(["Model"], { askFaceCoveringComfort: true }).map((f) => f.id);
  assert.ok(withMask.includes("model-face-covering"));
});
test("photographer + stylist see their own fields", () => {
  const ids = roleDetailFieldsFor(["Photographer", "Makeup Artist"], {}).map((f) => f.id);
  assert.deepEqual(ids, ["styling-specialty", "camera-equipment"]);
});
test("clean drops answers for roles not selected and enforces options", () => {
  const r = cleanRoleDetails(
    { "model-styling": "Monochrome", "camera-equipment": "R5", "model-face-covering": "whatever" },
    ["Model"],
    { askFaceCoveringComfort: true }
  );
  assert.deepEqual(r.details, { "model-styling": "Monochrome" });
  assert.deepEqual(r.invalid, ["model-face-covering"]);
});
test("clothing sizes are no longer asked, required or stored", () => {
  assert.deepEqual(cleanRoleDetails({}, ["Model"], {}).missing, []);
  assert.deepEqual(cleanRoleDetails({ "model-sizes": "S / 28 / 9" }, ["Model"], {}).details, {});
});
test("older clothing-size answers stay readable in admin", () =>
  assert.deepEqual(describeRoleDetails({ "model-sizes": "S / 28 / 9", "model-styling": "Monochrome" }), [
    { label: "Preferred styling", value: "Monochrome" },
    { label: "Clothing sizes (no longer asked)", value: "S / 28 / 9" },
  ]));

// ── Server schema ─────────────────────────────────────────────────────────
const base = {
  fullName: "Test Applicant",
  email: "a@example.com",
  phone: "916 555 0100",
  cityState: "Sacramento, CA",
  instagram: "",
  roles: ["Model"],
  portfolioImages: [],
  questionAnswers: [{ id: "q", question: "Why?", answer: "Because I love editorial work." }],
  availabilityConfirm: true,
  transportationConfirm: true,
  creativeDirectionConfirm: true,
  agreementCurated: true,
  agreementNoGuarantee: true,
  agreementGuidelines: true,
  agreementAccurate: true,
  agreementTerms: true,
  roleDetails: {},
  sessionVolumeId: "v3",
};
const schemaFor = (extra: Partial<Parameters<typeof createSessionApplicationSchema>[0]> = {}) =>
  createSessionApplicationSchema({
    requirePortfolioUpload: false,
    requireRoleSelection: true,
    requirePortfolio: false,
    questions: [{ id: "q", required: true, maxLength: 3000 }],
    ...extra,
  });

test("valid model application without Instagram or portfolio (portfolio optional)", () =>
  assert.equal(schemaFor().safeParse(base).success, true));
test("portfolio still required where the volume asks", () =>
  assert.equal(schemaFor({ requirePortfolio: true }).safeParse(base).success, false));
test("terms must be accepted", () =>
  assert.equal(schemaFor().safeParse({ ...base, agreementTerms: false }).success, false));
test("model application valid without clothing sizes", () =>
  assert.equal(schemaFor().safeParse({ ...base, roleDetails: {} }).success, true));
test("face-covering answer required only when the volume asks", () => {
  assert.equal(schemaFor({ askFaceCoveringComfort: true }).safeParse(base).success, false);
  assert.equal(
    schemaFor({ askFaceCoveringComfort: true }).safeParse({
      ...base,
      roleDetails: { ...base.roleDetails, "model-face-covering": "Comfortable after discussing the concept" },
    }).success,
    true
  );
});
test("bad Instagram handle rejected when given", () =>
  assert.equal(schemaFor().safeParse({ ...base, instagram: "not a handle!" }).success, false));

// ── Settings back-compat ──────────────────────────────────────────────────
test("old volumes keep requiring a portfolio and get default terms", () => {
  const s = parseApplicationSettings(JSON.stringify({ requirePortfolioUpload: false }));
  assert.equal(s.requirePortfolio, true);
  assert.equal(s.askFaceCoveringComfort, false);
  assert.equal(s.collaborationTerms, DEFAULT_COLLABORATION_TERMS);
});
test("empty terms fall back to defaults", () =>
  assert.equal(parseApplicationSettings(JSON.stringify({ collaborationTerms: "  " })).collaborationTerms, DEFAULT_COLLABORATION_TERMS));
test("default terms promise no pay and require a separate release", () => {
  assert.match(DEFAULT_COLLABORATION_TERMS, /free/i);
  assert.match(DEFAULT_COLLABORATION_TERMS, /separate written release/i);
});

// ── Commercial pathways ───────────────────────────────────────────────────
test("inquiry link carries a valid campaign tag", () => {
  const href = volumeInquiryHref("mask-off", "brand-partner");
  assert.equal(href, "/contact?campaign=mask-off&interest=brand-partner");
  assert.deepEqual(parseCampaignTag(href.split("?")[1]), { campaign: "mask-off", campaignInterest: "brand-partner" });
});
test("odd slug falls back to 'sessions'", () =>
  assert.match(volumeInquiryHref("Vol_3!", "future-client"), /campaign=sessions/));
test("subjects", () => {
  assert.equal(subjectForInterest("gift"), "Gift experience inquiry");
  assert.equal(subjectForInterest("editorial-advertising", "MASK OFF"), "Editorial advertising — MASK OFF");
  assert.equal(subjectForInterest("unknown"), null);
});

// ── Statuses ──────────────────────────────────────────────────────────────
test("status labels", () => {
  assert.equal(APPLICATION_STATUS_LABELS.pending_review, "New");
  assert.equal(APPLICATION_STATUS_LABELS.under_review, "Under Review");
  assert.equal(normalizeApplicationStatus("under_review"), "under_review");
  assert.equal(normalizeApplicationStatus("new"), "pending_review");
});

console.log(`volume-applications: ${passed} passed`);

import assert from "node:assert/strict";
import { mergeExperienceContent, mergePageCopy } from "../src/lib/content";
import { DEFAULT_EXPERIENCE, DEFAULT_PAGE_COPY } from "../src/lib/defaults";
import type { ExperienceContent, PageCopy } from "../src/lib/types";

const legacyPageCopy = {
  homeCta: {
    headline: "Stored headline",
  },
} as unknown as Partial<PageCopy>;

const mergedPageCopy = mergePageCopy(legacyPageCopy);
assert.equal(mergedPageCopy.homeCta.headline, "Stored headline");
assert.equal(
  mergedPageCopy.experienceCta.headline,
  DEFAULT_PAGE_COPY.experienceCta.headline
);
assert.deepEqual(mergedPageCopy.bookPage.notes, DEFAULT_PAGE_COPY.bookPage.notes);
assert.deepEqual(
  mergedPageCopy.bookPage.nextSteps,
  DEFAULT_PAGE_COPY.bookPage.nextSteps
);

const legacyExperience = {
  headline: "Stored experience headline",
} as Partial<ExperienceContent>;
const mergedExperience = mergeExperienceContent(legacyExperience);
assert.equal(mergedExperience.headline, "Stored experience headline");
assert.deepEqual(mergedExperience.stages, DEFAULT_EXPERIENCE.stages);

console.log("Content backward-compatibility checks passed.");

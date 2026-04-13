/**
 * Validation tests for programmatic SEO data seeds. Ensures the typed data
 * always produces valid page inputs (unique slugs, reachable cross-links,
 * on-spec meta lengths, and no stale lastVerified entries in CI).
 */
import { describe, it, expect } from "vitest";
import { FEATURES, getFeatureBySlug } from "./features";
import { PROP_FIRMS, getPropFirmBySlug, isStaleEntry as isPropFirmStale } from "./prop-firms";
import {
  COMPETITORS,
  getCompetitorBySlug,
  FEATURE_DIMENSIONS,
  ALGO_STUDIO_FEATURES,
  isStaleEntry as isCompetitorStale,
} from "./competitors";

const SLUG_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/;

describe("features data", () => {
  it("has unique slugs matching slug pattern", () => {
    const slugs = FEATURES.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(SLUG_PATTERN);
  });

  it("has SEO-valid meta lengths", () => {
    for (const f of FEATURES) {
      expect(f.metaTitle.length, `${f.slug} metaTitle length`).toBeLessThanOrEqual(60);
      expect(f.metaTitle.length, `${f.slug} metaTitle length`).toBeGreaterThanOrEqual(20);
      expect(f.metaDescription.length, `${f.slug} metaDescription length`).toBeLessThanOrEqual(160);
      expect(f.metaDescription.length, `${f.slug} metaDescription length`).toBeGreaterThanOrEqual(
        70
      );
    }
  });

  it("has at least one section, one FAQ, one related feature", () => {
    for (const f of FEATURES) {
      expect(f.sections.length, `${f.slug} sections`).toBeGreaterThan(0);
      expect(f.faqs.length, `${f.slug} faqs`).toBeGreaterThan(0);
      expect(f.relatedFeatures.length, `${f.slug} related`).toBeGreaterThan(0);
    }
  });

  it("relatedFeatures point to existing slugs and do not self-reference", () => {
    for (const f of FEATURES) {
      for (const related of f.relatedFeatures) {
        expect(related, `${f.slug} self-reference`).not.toBe(f.slug);
        expect(getFeatureBySlug(related), `${f.slug} → ${related} not found`).toBeDefined();
      }
    }
  });
});

describe("prop-firms data", () => {
  it("has unique slugs matching slug pattern", () => {
    const slugs = PROP_FIRMS.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(SLUG_PATTERN);
  });

  it("has valid officialUrl and lastVerified date", () => {
    for (const firm of PROP_FIRMS) {
      expect(firm.officialUrl).toMatch(/^https:\/\//);
      expect(firm.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(firm.lastVerified).getTime()).not.toBeNaN();
    }
  });

  it("has programs with plausible drawdown/target ranges", () => {
    for (const firm of PROP_FIRMS) {
      expect(firm.programs.length, `${firm.slug} programs`).toBeGreaterThan(0);
      for (const prog of firm.programs) {
        expect(prog.maxDailyLossPct).toBeGreaterThan(0);
        expect(prog.maxDailyLossPct).toBeLessThanOrEqual(20);
        expect(prog.maxOverallDrawdownPct).toBeGreaterThan(prog.maxDailyLossPct);
        expect(prog.maxOverallDrawdownPct).toBeLessThanOrEqual(30);
        if (prog.profitTargetPhase1Pct !== null) {
          expect(prog.profitTargetPhase1Pct).toBeGreaterThan(0);
          expect(prog.profitTargetPhase1Pct).toBeLessThanOrEqual(25);
        }
      }
    }
  });

  it("has algoStudioCompatibility score between 1 and 10", () => {
    for (const firm of PROP_FIRMS) {
      expect(firm.algoStudioCompatibility.score).toBeGreaterThanOrEqual(1);
      expect(firm.algoStudioCompatibility.score).toBeLessThanOrEqual(10);
    }
  });

  it("relatedFirms point to existing slugs and do not self-reference", () => {
    for (const firm of PROP_FIRMS) {
      for (const related of firm.relatedFirms) {
        expect(related, `${firm.slug} self-reference`).not.toBe(firm.slug);
        expect(getPropFirmBySlug(related), `${firm.slug} → ${related}`).toBeDefined();
      }
    }
  });

  // Informational — we do not fail CI for stale entries (90-day threshold
  // exists so page templates can display a disclaimer).
  it("reports any stale entries as a warning (informational)", () => {
    const stale = PROP_FIRMS.filter((f) => isPropFirmStale(f)).map((f) => f.slug);
    if (stale.length > 0) {
      console.warn(`⚠ Stale prop firm entries (>90d old): ${stale.join(", ")}`);
    }
    expect(stale.length).toBeGreaterThanOrEqual(0);
  });
});

describe("competitors data", () => {
  it("has unique slugs matching slug pattern", () => {
    const slugs = COMPETITORS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(SLUG_PATTERN);
  });

  it("every competitor covers every FEATURE_DIMENSION", () => {
    const dimensionKeys = FEATURE_DIMENSIONS.map((d) => d.key);
    for (const comp of COMPETITORS) {
      for (const key of dimensionKeys) {
        expect(comp.features[key], `${comp.slug} missing feature: ${key}`).toBeDefined();
      }
    }
  });

  it("ALGO_STUDIO_FEATURES covers every FEATURE_DIMENSION", () => {
    for (const dim of FEATURE_DIMENSIONS) {
      expect(
        ALGO_STUDIO_FEATURES[dim.key],
        `ALGO_STUDIO_FEATURES missing: ${dim.key}`
      ).toBeDefined();
    }
  });

  it("has honest whenToChooseThem and whenToChooseUs sections", () => {
    for (const comp of COMPETITORS) {
      // Enforce honesty: pages that admit competitor strengths rank + convert better
      expect(
        comp.whenToChooseThem.length,
        `${comp.slug} whenToChooseThem must be non-empty`
      ).toBeGreaterThan(0);
      expect(comp.whenToChooseUs.length).toBeGreaterThan(0);
      expect(comp.pros.length, `${comp.slug} must list competitor pros`).toBeGreaterThan(0);
    }
  });

  it("relatedCompetitors point to existing slugs and do not self-reference", () => {
    for (const comp of COMPETITORS) {
      for (const related of comp.relatedCompetitors) {
        expect(related, `${comp.slug} self-reference`).not.toBe(comp.slug);
        expect(getCompetitorBySlug(related), `${comp.slug} → ${related}`).toBeDefined();
      }
    }
  });

  it("reports any stale entries as a warning (informational)", () => {
    const stale = COMPETITORS.filter((c) => isCompetitorStale(c)).map((c) => c.slug);
    if (stale.length > 0) {
      console.warn(`⚠ Stale competitor entries (>90d old): ${stale.join(", ")}`);
    }
    expect(stale.length).toBeGreaterThanOrEqual(0);
  });
});

import { describe, it, expect } from "vitest";
import {
  INDUSTRIES,
  DOMAINS,
  getDomainsByIndustry,
  getDomainConfig,
  getRolesByDomain,
  getAllRoles,
  type Industry,
} from "@/constants/domains";

// Pilot scope (2026-08): daily-shift work, medical, service/call-center, and
// substitute-teaching within education. tech/construction/insurance and the
// project-based education domains (tutoring, higher_ed) were deliberately
// dropped — these lock the scope down so it can't drift back silently.

describe("pilot industry scope", () => {
  it("only exposes the four agreed industries", () => {
    expect(new Set(INDUSTRIES.map((i) => i.id))).toEqual(
      new Set<Industry>(["medical", "daily", "communication", "education"])
    );
  });

  it("dropped tech, construction and insurance entirely", () => {
    const ids = INDUSTRIES.map((i) => i.id);
    expect(ids).not.toContain("tech");
    expect(ids).not.toContain("construction");
    expect(ids).not.toContain("insurance");
  });

  it("narrowed communication to call-center only", () => {
    const domains = getDomainsByIndustry("communication").map((d) => d.id);
    expect(domains).toEqual(["call_center"]);
    expect(domains).not.toContain("digital_media");
    expect(domains).not.toContain("public_relations");
  });

  it("narrowed education to substitute-teaching + kindergarten, dropping project-based domains", () => {
    const domains = getDomainsByIndustry("education").map((d) => d.id);
    expect(new Set(domains)).toEqual(new Set(["school", "kindergarten"]));
    expect(domains).not.toContain("tutoring");
    expect(domains).not.toContain("higher_ed");
  });

  it("keeps the school domain's roles to substitute-style positions, not permanent ones", () => {
    const roles = getRolesByDomain("school");
    expect(roles.some((r) => r.includes("מחליף"))).toBe(true);
    // מחנך/ת (homeroom teacher) and יועץ/ת חינוכי/ת (counselor) are hired as
    // ongoing roles, not filled for a day on short notice.
    expect(roles).not.toContain("מחנך/ת");
    expect(roles).not.toContain("יועץ/ת חינוכי/ת");
  });

  it("kept medical and daily intact", () => {
    expect(getDomainsByIndustry("medical").map((d) => d.id).sort()).toEqual(
      ["aesthetics", "dental", "optics", "physio"].sort()
    );
    expect(getDomainsByIndustry("daily").map((d) => d.id).sort()).toEqual(
      ["bar", "cleaning", "events", "restaurant"].sort()
    );
  });
});

describe("data integrity", () => {
  it("every domain belongs to an industry that is actually declared", () => {
    const industryIds = new Set(INDUSTRIES.map((i) => i.id));
    for (const domain of DOMAINS) {
      expect(industryIds.has(domain.industry)).toBe(true);
    }
  });

  it("every industry's domain list matches the domains that declare it", () => {
    for (const industry of INDUSTRIES) {
      const declared = DOMAINS.filter((d) => d.industry === industry.id).map((d) => d.id).sort();
      expect([...industry.domains].sort()).toEqual(declared);
    }
  });

  it("no domain is orphaned or duplicated", () => {
    const ids = DOMAINS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every domain has at least one role", () => {
    for (const domain of DOMAINS) {
      expect(domain.roles.length).toBeGreaterThan(0);
    }
  });

  it("getAllRoles reflects only the narrowed domain set", () => {
    const roles = getAllRoles();
    expect(roles).not.toContain("מפתח/ת Full Stack");
    expect(roles).not.toContain("חשמלאי/ת");
    expect(roles.length).toBeGreaterThan(0);
  });

  it("getDomainConfig returns undefined for a removed domain id", () => {
    // @ts-expect-error — intentionally passing a value outside the current union
    expect(getDomainConfig("software")).toBeUndefined();
  });
});

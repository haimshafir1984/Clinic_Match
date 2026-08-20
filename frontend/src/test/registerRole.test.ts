import { describe, it, expect } from "vitest";
import { readRoleFromQuery } from "@/pages/Register";

// The landing page links in with ?role=worker / ?role=business — if these
// stop mapping, those CTAs silently fall back to asking again.
describe("readRoleFromQuery", () => {
  it("maps the worker aliases the landing page uses", () => {
    expect(readRoleFromQuery("?role=worker")).toBe("STAFF");
    expect(readRoleFromQuery("?role=staff")).toBe("STAFF");
  });

  it("maps the business aliases the landing page uses", () => {
    expect(readRoleFromQuery("?role=business")).toBe("CLINIC");
    expect(readRoleFromQuery("?role=clinic")).toBe("CLINIC");
  });

  it("ignores an absent, empty or unknown role", () => {
    expect(readRoleFromQuery("")).toBeNull();
    expect(readRoleFromQuery("?foo=bar")).toBeNull();
    expect(readRoleFromQuery("?role=")).toBeNull();
    expect(readRoleFromQuery("?role=admin")).toBeNull();
  });

  it("still finds role alongside other params", () => {
    expect(readRoleFromQuery("?utm_source=fb&role=worker")).toBe("STAFF");
  });
});

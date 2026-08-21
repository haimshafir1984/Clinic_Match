import { describe, it, expect } from "vitest";
import { calculateProfileCompletion } from "@/lib/profileCompletion";

describe("profile completion after registration", () => {
  it("treats a freshly registered worker (positions[] only) as complete", () => {
    const result = calculateProfileCompletion({
      name: "דנה כהן", role: "worker",
      position: null, required_position: null,
      positions: ["סייעת שיניים"],
      city: null, preferred_area: "תל אביב",
    });
    expect(result.missingRequiredFields).toEqual([]);
    expect(result.isComplete).toBe(true);
  });

  it("treats a freshly registered clinic as complete", () => {
    const result = calculateProfileCompletion({
      name: "מרפאת לוי", role: "clinic",
      position: null, required_position: "סייעת שיניים",
      positions: ["סייעת שיניים"],
      city: "חיפה", preferred_area: null,
    });
    expect(result.isComplete).toBe(true);
  });

  it("still flags a genuinely empty profile", () => {
    const result = calculateProfileCompletion({
      name: "", role: "worker", position: null,
      required_position: null, positions: [], city: null, preferred_area: null,
    });
    expect(result.isComplete).toBe(false);
    expect(result.missingRequiredFields).toContain("name");
    expect(result.missingRequiredFields).toContain("position");
  });
});

describe("multi-location support", () => {
  it("treats a worker with only cities[] (no legacy city/preferred_area) as complete", () => {
    const result = calculateProfileCompletion({
      name: "דנה כהן", role: "worker",
      position: null, required_position: null, positions: ["סייעת שיניים"],
      city: null, preferred_area: null, cities: ["תל אביב", "רמת גן"],
    });
    expect(result.missingRequiredFields).toEqual([]);
    expect(result.isComplete).toBe(true);
  });

  it("still flags a profile with no location in any of the three shapes", () => {
    const result = calculateProfileCompletion({
      name: "דנה כהן", role: "worker",
      position: null, required_position: null, positions: ["סייעת שיניים"],
      city: null, preferred_area: null, cities: [],
    });
    expect(result.missingRequiredFields).toContain("preferred_area");
    expect(result.isComplete).toBe(false);
  });

  it("does not double-count city/preferred_area as two separate completed fields", () => {
    // Regression guard: city and preferred_area both derive from the same
    // `cities` array now, so counting both toward the percentage would
    // inflate it by one field's worth for every profile.
    const worker = calculateProfileCompletion({
      name: "דנה", role: "worker", position: "סייעת", cities: ["תל אביב"],
    });
    const locationFields = worker.filledFields.filter((f) => f === "city" || f === "preferred_area");
    expect(locationFields).toEqual(["preferred_area"]);

    const clinic = calculateProfileCompletion({
      name: "מרפאה", role: "clinic", required_position: "סייעת", cities: ["חיפה"],
    });
    const clinicLocationFields = clinic.filledFields.filter((f) => f === "city" || f === "preferred_area");
    expect(clinicLocationFields).toEqual(["city"]);
  });
});

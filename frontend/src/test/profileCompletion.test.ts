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

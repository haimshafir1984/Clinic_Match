import { describe, it, expect, beforeEach } from "vitest";
import { DRAFT_KEY, loadRegistrationDraft, saveRegistrationDraft, clearRegistrationDraft } from "@/pages/Register";

// The draft is what survives a reload mid-registration (item 6 of the
// shorten-registration effort) — if save/load/clear ever drift apart, a
// user's half-filled form silently reappears empty or, worse, stale.
describe("registration draft persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing has been saved yet", () => {
    expect(loadRegistrationDraft()).toBeNull();
  });

  it("round-trips whatever was saved", () => {
    const draft = {
      email: "worker@example.com",
      role: "STAFF" as const,
      name: "דנה כהן",
      positions: ["אחות/אח"],
      workplaceDomain: "dental" as const,
      industry: "medical" as const,
      cities: ["תל אביב"],
    };
    saveRegistrationDraft(draft);
    expect(loadRegistrationDraft()).toEqual(draft);
  });

  it("clear removes the saved draft", () => {
    saveRegistrationDraft({ email: "x@example.com" });
    clearRegistrationDraft();
    expect(loadRegistrationDraft()).toBeNull();
  });

  it("does not throw on corrupted stored JSON, and falls back to null", () => {
    localStorage.setItem(DRAFT_KEY, "{not valid json");
    expect(loadRegistrationDraft()).toBeNull();
  });
});

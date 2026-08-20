import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EmptyState } from "@/components/swipe/EmptyState";

afterEach(cleanup);

const renderState = (props: Parameters<typeof EmptyState>[0]) =>
  render(<MemoryRouter><EmptyState {...props} /></MemoryRouter>);

describe("swipe EmptyState", () => {
  it("tells a brand-new user why there is nothing, not that they finished", () => {
    renderState({ onRefresh: () => {}, totalAvailable: 0, hasSwipedAny: false });
    expect(screen.getByText(/עדיין אין התאמות עבורך/)).toBeTruthy();
    expect(screen.queryByText(/עברת על כל ההתאמות/)).toBeNull();
    // and offers a way out rather than a dead end
    expect(screen.getByText(/הרחבת אזור החיפוש/)).toBeTruthy();
  });

  it("congratulates only once the user actually swiped through cards", () => {
    renderState({ onRefresh: () => {}, totalAvailable: 5, hasSwipedAny: true });
    expect(screen.getByText(/עברת על כל ההתאמות/)).toBeTruthy();
  });

  it("blames the filter, not the supply, when a search excluded everything", () => {
    renderState({
      onRefresh: () => {}, onClearFilters: () => {},
      hasActiveFilters: true, totalAvailable: 12, hasSwipedAny: false,
    });
    expect(screen.getByText(/אין תוצאות לחיפוש הזה/)).toBeTruthy();
    expect(screen.getByText(/12 פרופילים זמינים/)).toBeTruthy();
    expect(screen.getByText(/ניקוי החיפוש/)).toBeTruthy();
  });

  it("does not claim a filter problem when there is genuinely no supply", () => {
    renderState({
      onRefresh: () => {}, onClearFilters: () => {},
      hasActiveFilters: true, totalAvailable: 0, hasSwipedAny: false,
    });
    expect(screen.getByText(/עדיין אין התאמות עבורך/)).toBeTruthy();
  });
});

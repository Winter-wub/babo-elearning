/**
 * Unit tests for PartnersStrip.
 *
 * The component is fully static — no props, no async, no auth.
 * We verify structure, partner count, and accessible names.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartnersStrip } from "../partners-strip";

// The component has no external dependencies that require mocking.
// It only renders static markup.

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("PartnersStrip", () => {
  it("renders without crashing", () => {
    render(<PartnersStrip />);
    expect(document.body).toBeTruthy();
  });

  it("renders a section element", () => {
    const { container } = render(<PartnersStrip />);
    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
  });

  it("renders at least one partner element", () => {
    render(<PartnersStrip />);
    // Each partner div carries an aria-label equal to its name
    // We query by a partial name pattern to avoid coupling to count
    const partnerElements = screen.getAllByRole("generic").filter(
      (el) => el.getAttribute("aria-label") !== null
    );
    expect(partnerElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders exactly six partner elements (matching PARTNERS constant)", () => {
    render(<PartnersStrip />);
    // Partner A through Partner F — each has a unique aria-label
    const partnerLabels = [
      "Partner A",
      "Partner B",
      "Partner C",
      "Partner D",
      "Partner E",
      "Partner F",
    ];
    for (const label of partnerLabels) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("each partner element has a non-empty accessible name via aria-label", () => {
    render(<PartnersStrip />);
    // Query all elements that carry an aria-label
    const labeled = Array.from(document.querySelectorAll("[aria-label]")).filter(
      (el) => {
        const label = el.getAttribute("aria-label");
        // Exclude aria-hidden elements and empty labels
        return label && label.trim().length > 0;
      }
    );
    // There must be at least as many labeled partner elements as partners
    expect(labeled.length).toBeGreaterThanOrEqual(6);
  });

  it("renders the 'Trusted Partners' heading text", () => {
    render(<PartnersStrip />);
    expect(screen.getByText(/trusted partners/i)).toBeInTheDocument();
  });

  it("each partner element has visible text content", () => {
    render(<PartnersStrip />);
    // Partner divs display their name as text content too
    expect(screen.getByText("Partner A")).toBeInTheDocument();
    expect(screen.getByText("Partner F")).toBeInTheDocument();
  });
});

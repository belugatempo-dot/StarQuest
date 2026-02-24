import { render } from "@testing-library/react";
import Starfield from "@/components/ui/Starfield";

describe("Starfield", () => {
  it("renders the starfield container with aria-hidden", () => {
    const { container } = render(<Starfield />);
    const root = container.firstElementChild as HTMLElement;

    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("has pointer-events: none to not block interactions", () => {
    const { container } = render(<Starfield />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.style.pointerEvents).toBe("none");
  });

  it("renders bright stars (2px golden dots)", () => {
    const { container } = render(<Starfield />);
    const brightStars = container.querySelectorAll(
      '[style*="width: 2px"][style*="background-color: rgb(255, 212, 59)"]'
    );

    // Should have 40 bright stars
    expect(brightStars.length).toBe(40);
  });

  it("renders dim stars (1px white dots)", () => {
    const { container } = render(<Starfield />);
    const dimStars = container.querySelectorAll(
      '[style*="width: 1px"][style*="background-color: rgba(255, 255, 255, 0.5)"]'
    );

    // Should have 60 dim stars
    expect(dimStars.length).toBe(60);
  });

  it("renders nebula patches with blur effect", () => {
    const { container } = render(<Starfield />);
    const nebulae = container.querySelectorAll(
      '[style*="filter: blur(80px)"]'
    );

    // Should have 3 nebula patches
    expect(nebulae.length).toBe(3);
  });

  it("applies twinkle animation to stars", () => {
    const { container } = render(<Starfield />);
    const firstBrightStar = container.querySelector(
      '[style*="width: 2px"]'
    ) as HTMLElement;

    expect(firstBrightStar.style.animation).toContain("twinkle");
    expect(firstBrightStar.style.animation).toContain("alternate");
  });

  it("uses fixed positioning for viewport coverage", () => {
    const { container } = render(<Starfield />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");
  });

  it("generates deterministic star positions (SSR-safe)", () => {
    const { container: first } = render(<Starfield />);
    const { container: second } = render(<Starfield />);

    const firstStars = first.querySelectorAll('[style*="width: 2px"]');
    const secondStars = second.querySelectorAll('[style*="width: 2px"]');

    // Same positions on repeated renders
    expect(firstStars[0]?.getAttribute("style")).toBe(
      secondStars[0]?.getAttribute("style")
    );
    expect(firstStars[5]?.getAttribute("style")).toBe(
      secondStars[5]?.getAttribute("style")
    );
  });
});

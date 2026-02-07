import { render, screen, fireEvent } from "@testing-library/react";
import ChildNav from "@/components/child/ChildNav";

// Mock router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/en/app",
}));

// Mock Supabase
const mockSignOut = jest.fn().mockResolvedValue({});
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}));

describe("ChildNav", () => {
  const mockUser = { id: "child-1", name: "Alice", role: "child" as const, family_id: "fam-1" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders brand name", () => {
    render(<ChildNav user={mockUser} locale="en" />);
    expect(screen.getByText("brand.name")).toBeInTheDocument();
  });

  it("renders user name", () => {
    render(<ChildNav user={mockUser} locale="en" />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("renders navigation items", () => {
    render(<ChildNav user={mockUser} locale="en" />);
    expect(screen.getAllByText("dashboard.title").length).toBeGreaterThan(0);
    expect(screen.getAllByText("common.quests").length).toBeGreaterThan(0);
    expect(screen.getAllByText("common.rewards").length).toBeGreaterThan(0);
    expect(screen.getAllByText("common.activities").length).toBeGreaterThan(0);
    expect(screen.getAllByText("common.profile").length).toBeGreaterThan(0);
  });

  it("renders logout button", () => {
    render(<ChildNav user={mockUser} locale="en" />);
    expect(screen.getByText("common.logout")).toBeInTheDocument();
  });

  it("calls signOut on logout click", async () => {
    render(<ChildNav user={mockUser} locale="en" />);
    fireEvent.click(screen.getByText("common.logout"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("renders links with correct hrefs", () => {
    render(<ChildNav user={mockUser} locale="en" />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/en/app");
    expect(hrefs).toContain("/en/app/quests");
    expect(hrefs).toContain("/en/app/rewards");
    expect(hrefs).toContain("/en/app/history");
    expect(hrefs).toContain("/en/app/profile");
  });

  it("has mobile and desktop nav sections", () => {
    const { container } = render(<ChildNav user={mockUser} locale="en" />);
    // Desktop nav is hidden on mobile (md:flex)
    const desktopNav = container.querySelector(".md\\:flex");
    expect(desktopNav).toBeInTheDocument();
    // Mobile nav is visible (md:hidden)
    const mobileNav = container.querySelector(".md\\:hidden");
    expect(mobileNav).toBeInTheDocument();
  });
});

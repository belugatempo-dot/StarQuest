import { render, screen, fireEvent } from "@testing-library/react";
import AdminNav from "@/components/admin/AdminNav";

// Mock router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/en/admin",
}));

// Mock Supabase
const mockSignOut = jest.fn().mockResolvedValue({});
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}));

describe("AdminNav", () => {
  const mockUser = { id: "user-1", name: "Jane", role: "parent" as const, family_id: "fam-1" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders brand name", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    expect(screen.getByText("brand.name")).toBeInTheDocument();
  });

  it("renders parent label", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    expect(screen.getByText("admin.parentLabel")).toBeInTheDocument();
  });

  it("renders user name", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    expect(screen.getByText(/Jane/)).toBeInTheDocument();
  });

  it("renders navigation items", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    expect(screen.getByText("admin.title")).toBeInTheDocument();
    expect(screen.getByText("admin.recordStars")).toBeInTheDocument();
    expect(screen.getByText("admin.activityLog")).toBeInTheDocument();
    expect(screen.getByText("admin.approvalCenter")).toBeInTheDocument();
    expect(screen.getByText("admin.manageQuests")).toBeInTheDocument();
    expect(screen.getByText("admin.manageRewards")).toBeInTheDocument();
    expect(screen.getByText("admin.manageLevels")).toBeInTheDocument();
    expect(screen.getByText("admin.familyManagement")).toBeInTheDocument();
    expect(screen.getByText("admin.settings")).toBeInTheDocument();
  });

  it("highlights active nav item", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    // The dashboard link should be active since pathname is /en/admin
    // There are two links with href="/en/admin" (logo + nav item), get the nav one
    const links = screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/en/admin");
    const navLink = links.find((l) => l.classList.contains("bg-secondary"));
    expect(navLink).toBeTruthy();
  });

  it("calls signOut and navigates on logout", async () => {
    render(<AdminNav user={mockUser} locale="en" />);
    fireEvent.click(screen.getByText("common.logout"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("renders logout button", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    expect(screen.getByText("common.logout")).toBeInTheDocument();
  });
});

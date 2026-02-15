import { render, screen, fireEvent } from "@testing-library/react";
import AdminNav from "@/components/admin/AdminNav";

// Mock router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/en/admin/activity",
}));

// Mock Supabase
const mockSignOut = jest.fn().mockResolvedValue({});
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}));

// Mock SettingsDrawer
jest.mock("@/components/admin/SettingsDrawer", () => {
  return function MockSettingsDrawer({ familyId, parentEmail, locale }: any) {
    return <div data-testid="settings-drawer">SettingsDrawer</div>;
  };
});

describe("AdminNav", () => {
  const mockUser = { id: "user-1", name: "Jane", role: "parent" as const, family_id: "fam-1", email: "jane@test.com" };

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

  it("renders navigation items (without Family, Approve, Settings tabs)", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    expect(screen.getByText("admin.activityLog")).toBeInTheDocument();
    expect(screen.getByText("admin.title")).toBeInTheDocument();
    expect(screen.getByText("admin.recordStars")).toBeInTheDocument();
    expect(screen.getByText("admin.manageQuests")).toBeInTheDocument();
    expect(screen.getByText("admin.manageRewards")).toBeInTheDocument();
    expect(screen.getByText("admin.manageLevels")).toBeInTheDocument();
    // Removed tabs
    expect(screen.queryByText("admin.familyManagement")).not.toBeInTheDocument();
    expect(screen.queryByText("admin.approvalCenter")).not.toBeInTheDocument();
    expect(screen.queryByText("admin.settings")).not.toBeInTheDocument();
  });

  it("highlights active nav item", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    // pathname is /en/admin/activity, so Activity Log should be active
    const links = screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/en/admin/activity");
    const navLink = links.find((l) => l.classList.contains("bg-secondary"));
    expect(navLink).toBeTruthy();
  });

  it("logo links to activity page", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    const logoLink = screen.getAllByRole("link").find(
      (l) => l.getAttribute("href") === "/en/admin/activity" && l.querySelector(".text-2xl")
    );
    expect(logoLink).toBeTruthy();
  });

  it("renders settings drawer", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    expect(screen.getByTestId("settings-drawer")).toBeInTheDocument();
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

  it("dashboard tab links to /admin/dashboard", () => {
    render(<AdminNav user={mockUser} locale="en" />);
    const dashboardLink = screen.getByText("admin.title").closest("a");
    expect(dashboardLink).toHaveAttribute("href", "/en/admin/dashboard");
  });
});

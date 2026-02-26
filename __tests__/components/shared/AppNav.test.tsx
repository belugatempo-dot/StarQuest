import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AppNav from "@/components/shared/AppNav";

// Mock router
const mockPush = jest.fn();
let mockPathname = "/en/dashboard";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
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

// Mock LanguageSwitcher
jest.mock("@/components/ui/LanguageSwitcher", () => {
  return function MockLanguageSwitcher() {
    return <div data-testid="language-switcher">LanguageSwitcher</div>;
  };
});

describe("AppNav", () => {
  const parentUser = {
    id: "user-1",
    name: "Jane",
    role: "parent" as const,
    family_id: "fam-1",
    email: "jane@test.com",
  };

  const childUser = {
    id: "child-1",
    name: "Alice",
    role: "child" as const,
    family_id: "fam-1",
    email: "alice@test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/en/dashboard";
  });

  // ---- Basic rendering ----

  it("renders brand name", () => {
    render(<AppNav user={parentUser} locale="en" />);
    expect(screen.getByText("brand.name")).toBeInTheDocument();
  });

  it("renders user name with wave emoji", () => {
    render(<AppNav user={parentUser} locale="en" />);
    expect(screen.getByText(/Jane/)).toBeInTheDocument();
  });

  it("renders logout button", () => {
    render(<AppNav user={parentUser} locale="en" />);
    expect(screen.getByText("common.logout")).toBeInTheDocument();
  });

  it("renders language switcher", () => {
    render(<AppNav user={parentUser} locale="en" />);
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  // ---- Navigation items ----

  it("renders all 5 nav items with correct hrefs", () => {
    render(<AppNav user={parentUser} locale="en" />);

    const expectedPaths = [
      "/en/activities",
      "/en/dashboard",
      "/en/quests",
      "/en/rewards",
      "/en/profile",
    ];

    for (const path of expectedPaths) {
      const links = screen.getAllByRole("link").filter(
        (l) => l.getAttribute("href") === path
      );
      // Each nav item appears twice: desktop + mobile
      expect(links.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("renders nav labels using i18n keys", () => {
    render(<AppNav user={parentUser} locale="en" />);
    // Each label appears twice (desktop + mobile)
    expect(screen.getAllByText("common.starCalendar")).toHaveLength(2);
    expect(screen.getAllByText("dashboard.title")).toHaveLength(2);
    expect(screen.getAllByText("common.quests")).toHaveLength(2);
    expect(screen.getAllByText("common.rewards")).toHaveLength(2);
    expect(screen.getAllByText("common.profile")).toHaveLength(2);
  });

  // ---- Active state highlighting ----

  it("highlights active nav item for current path", () => {
    mockPathname = "/en/quests";
    render(<AppNav user={parentUser} locale="en" />);

    const questLinks = screen.getAllByRole("link").filter(
      (l) => l.getAttribute("href") === "/en/quests"
    );
    const activeLink = questLinks.find((l) =>
      l.className.includes("bg-primary")
    );
    expect(activeLink).toBeTruthy();
  });

  it("highlights dashboard for dashboard path", () => {
    mockPathname = "/en/dashboard";
    render(<AppNav user={parentUser} locale="en" />);

    const dashLinks = screen.getAllByRole("link").filter(
      (l) => l.getAttribute("href") === "/en/dashboard"
    );
    const activeLink = dashLinks.find((l) =>
      l.className.includes("bg-primary")
    );
    expect(activeLink).toBeTruthy();
  });

  it("does not highlight non-active nav items", () => {
    mockPathname = "/en/dashboard";
    render(<AppNav user={parentUser} locale="en" />);

    const questLinks = screen.getAllByRole("link").filter(
      (l) => l.getAttribute("href") === "/en/quests"
    );
    const inactiveLink = questLinks.find((l) =>
      l.className.includes("bg-primary")
    );
    expect(inactiveLink).toBeFalsy();
  });

  // ---- Parent-specific features ----

  it("shows parent badge for parent role", () => {
    render(<AppNav user={parentUser} locale="en" />);
    expect(screen.getByText("admin.parentLabel")).toBeInTheDocument();
  });

  it("renders SettingsDrawer for parent role", () => {
    render(<AppNav user={parentUser} locale="en" />);
    expect(screen.getByTestId("settings-drawer")).toBeInTheDocument();
  });

  // ---- Child-specific features ----

  it("does not show parent badge for child role", () => {
    render(<AppNav user={childUser} locale="en" />);
    expect(screen.queryByText("admin.parentLabel")).not.toBeInTheDocument();
  });

  it("does not render SettingsDrawer for child role", () => {
    render(<AppNav user={childUser} locale="en" />);
    expect(screen.queryByTestId("settings-drawer")).not.toBeInTheDocument();
  });

  // ---- Logout ----

  it("calls signOut and navigates to login on logout", async () => {
    render(<AppNav user={parentUser} locale="en" />);
    fireEvent.click(screen.getByText("common.logout"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
    expect(mockPush).toHaveBeenCalledWith("/en/login");
  });

  // ---- zh-CN locale ----

  it("produces correct link paths for zh-CN locale", () => {
    render(<AppNav user={parentUser} locale="zh-CN" />);

    const expectedPaths = [
      "/zh-CN/activities",
      "/zh-CN/dashboard",
      "/zh-CN/quests",
      "/zh-CN/rewards",
      "/zh-CN/profile",
    ];

    for (const path of expectedPaths) {
      const links = screen.getAllByRole("link").filter(
        (l) => l.getAttribute("href") === path
      );
      expect(links.length).toBeGreaterThanOrEqual(2);
    }
  });

  // ---- Logo link ----

  it("logo links to activities page", () => {
    render(<AppNav user={parentUser} locale="en" />);
    const logoLink = screen.getAllByRole("link").find(
      (l) =>
        l.getAttribute("href") === "/en/activities" &&
        l.querySelector(".text-2xl")
    );
    expect(logoLink).toBeTruthy();
  });
});

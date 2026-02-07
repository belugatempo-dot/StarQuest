const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockSignOut = jest.fn();
const mockRedirect = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockImplementation(() =>
    Promise.resolve({
      auth: { getUser: (...args: any[]) => mockGetUser(...args), signOut: (...args: any[]) => mockSignOut(...args) },
      from: (...args: any[]) => mockFrom(...args),
    })
  ),
}));

jest.mock("next/navigation", () => ({
  redirect: (...args: any[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

import { getUser, requireAuth, requireParent, signOut } from "@/lib/auth";

describe("lib/auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUser", () => {
    it("returns null when no auth user", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const result = await getUser();
      expect(result).toBeNull();
    });

    it("returns user data when authenticated", async () => {
      const mockUser = { id: "user-1", name: "Jane", role: "parent", family_id: "fam-1" };
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await getUser();
      expect(result).toEqual(mockUser);
      expect(mockFrom).toHaveBeenCalledWith("users");
    });

    it("returns null on database error", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
          }),
        }),
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await getUser();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Error fetching user:", expect.any(Object));
      consoleSpy.mockRestore();
    });
  });

  describe("requireAuth", () => {
    it("returns user when authenticated", async () => {
      const mockUser = { id: "user-1", name: "Jane", role: "parent", family_id: "fam-1" };
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await requireAuth("en");
      expect(result).toEqual(mockUser);
    });

    it("redirects to login when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(requireAuth("en")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/en/login");
    });

    it("uses default locale when not specified", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/en/login");
    });
  });

  describe("requireParent", () => {
    it("returns user when user is parent", async () => {
      const mockUser = { id: "user-1", name: "Jane", role: "parent", family_id: "fam-1" };
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await requireParent("en");
      expect(result).toEqual(mockUser);
    });

    it("uses default locale when not specified", async () => {
      const mockUser = { id: "child-1", name: "Alice", role: "child", family_id: "fam-1" };
      mockGetUser.mockResolvedValue({ data: { user: { id: "child-1" } } });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      await expect(requireParent()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/en/app");
    });

    it("redirects to /app when user is child", async () => {
      const mockUser = { id: "child-1", name: "Alice", role: "child", family_id: "fam-1" };
      mockGetUser.mockResolvedValue({ data: { user: { id: "child-1" } } });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      await expect(requireParent("en")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/en/app");
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut and redirects", async () => {
      mockSignOut.mockResolvedValue({});

      await expect(signOut("en")).rejects.toThrow("NEXT_REDIRECT");
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/en/login");
    });

    it("uses default locale when not specified", async () => {
      mockSignOut.mockResolvedValue({});

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/en/login");
    });
  });
});

import { renderHook, act, waitFor } from "@testing-library/react";

const mockGetUser = jest.fn();
const mockFromChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
};
const mockFrom = jest.fn().mockReturnValue(mockFromChain);
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  }),
}));

import { useUser } from "@/hooks/useUser";

describe("useUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it("starts with loading=true and user=null", () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useUser());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("returns user data when authenticated", async () => {
    const mockUser = { id: "user-1", name: "Jane", role: "parent", family_id: "fam-1" };
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFromChain.maybeSingle.mockResolvedValue({ data: mockUser, error: null });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it("returns null when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it("handles database error gracefully", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFromChain.maybeSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching user:", expect.any(Object));
    consoleSpy.mockRestore();
  });

  it("subscribes to auth state changes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    renderHook(() => useUser());

    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  it("unsubscribes on unmount", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { unmount } = renderHook(() => useUser());
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("clears user when auth session ends", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate auth state change callback with no session
    const callback = mockOnAuthStateChange.mock.calls[0][0];
    act(() => {
      callback("SIGNED_OUT", null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("refetches user when auth session starts", async () => {
    const mockUser = { id: "user-1", name: "Jane", role: "parent", family_id: "fam-1" };
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFromChain.maybeSingle.mockResolvedValue({ data: mockUser, error: null });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate auth state change callback with session
    const callback = mockOnAuthStateChange.mock.calls[0][0];
    await act(async () => {
      callback("SIGNED_IN", { user: { id: "user-1" } });
    });

    // Called at least twice: initial fetch + refetch on auth change
    expect(mockGetUser.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

import { render, screen } from "@testing-library/react";
import ChildRedemptionList from "@/components/child/ChildRedemptionList";

// Mock dependencies
jest.mock("@/lib/localization", () => ({
  getRewardName: (reward: any, locale: string) =>
    locale === "zh-CN" ? reward?.name_zh || reward?.name_en : reward?.name_en || "Unknown",
}));

jest.mock("@/lib/date-utils", () => ({
  formatDateTime: () => "Jan 15, 10:00 AM",
}));

describe("ChildRedemptionList", () => {
  const makeRedemption = (overrides: any = {}) => ({
    id: "red-1",
    family_id: "fam-1",
    child_id: "child-1",
    reward_id: "rew-1",
    stars_spent: 10,
    status: "pending",
    child_note: null,
    parent_response: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2025-06-15T10:00:00Z",
    rewards: {
      name_en: "Ice Cream",
      name_zh: "冰淇淋",
      icon: "🍦",
      category: "food",
    },
    ...overrides,
  });

  it("returns null when no redemptions", () => {
    const { container } = render(<ChildRedemptionList redemptions={[]} locale="en" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders heading", () => {
    render(<ChildRedemptionList redemptions={[makeRedemption()]} locale="en" />);
    expect(screen.getByText("rewards.myRequests")).toBeInTheDocument();
  });

  it("renders reward name", () => {
    render(<ChildRedemptionList redemptions={[makeRedemption()]} locale="en" />);
    expect(screen.getByText("Ice Cream")).toBeInTheDocument();
  });

  it("renders stars spent", () => {
    render(<ChildRedemptionList redemptions={[makeRedemption()]} locale="en" />);
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it("renders reward icon", () => {
    render(<ChildRedemptionList redemptions={[makeRedemption()]} locale="en" />);
    expect(screen.getByText("🍦")).toBeInTheDocument();
  });

  it("renders default icon when reward has no icon", () => {
    render(
      <ChildRedemptionList
        redemptions={[makeRedemption({ rewards: { name_en: "Toy", name_zh: null, icon: null, category: null } })]}
        locale="en"
      />
    );
    expect(screen.getByText("🎁")).toBeInTheDocument();
  });

  it("renders pending status badge", () => {
    render(<ChildRedemptionList redemptions={[makeRedemption({ status: "pending" })]} locale="en" />);
    expect(screen.getByText("status.pending")).toBeInTheDocument();
  });

  it("renders approved status badge", () => {
    render(<ChildRedemptionList redemptions={[makeRedemption({ status: "approved" })]} locale="en" />);
    expect(screen.getByText("status.approved")).toBeInTheDocument();
  });

  it("renders rejected status badge", () => {
    render(<ChildRedemptionList redemptions={[makeRedemption({ status: "rejected" })]} locale="en" />);
    expect(screen.getByText("status.rejected")).toBeInTheDocument();
  });

  it("renders fulfilled status badge", () => {
    render(<ChildRedemptionList redemptions={[makeRedemption({ status: "fulfilled" })]} locale="en" />);
    expect(screen.getByText("rewards.fulfilled")).toBeInTheDocument();
  });

  it("renders child note when present", () => {
    render(
      <ChildRedemptionList
        redemptions={[makeRedemption({ child_note: "Please give me chocolate" })]}
        locale="en"
      />
    );
    expect(screen.getByText(/Please give me chocolate/)).toBeInTheDocument();
  });

  it("does not render child note when null", () => {
    render(<ChildRedemptionList redemptions={[makeRedemption({ child_note: null })]} locale="en" />);
    expect(screen.queryByText(/quests.note/)).not.toBeInTheDocument();
  });

  it("shows rejection reason for rejected requests", () => {
    render(
      <ChildRedemptionList
        redemptions={[makeRedemption({ status: "rejected", parent_response: "Not enough stars" })]}
        locale="en"
      />
    );
    expect(screen.getByText(/Not enough stars/)).toBeInTheDocument();
  });

  it("does not show rejection reason for non-rejected requests", () => {
    render(
      <ChildRedemptionList
        redemptions={[makeRedemption({ status: "approved", parent_response: "Some response" })]}
        locale="en"
      />
    );
    expect(screen.queryByText(/admin.rejectionReason/)).not.toBeInTheDocument();
  });

  it("returns null badge for unknown status", () => {
    render(
      <ChildRedemptionList
        redemptions={[makeRedemption({ status: "unknown_status" as any })]}
        locale="en"
      />
    );
    // Should render the redemption row but no status badge text
    expect(screen.getByText("Ice Cream")).toBeInTheDocument();
    expect(screen.queryByText("status.pending")).not.toBeInTheDocument();
    expect(screen.queryByText("status.approved")).not.toBeInTheDocument();
    expect(screen.queryByText("status.rejected")).not.toBeInTheDocument();
    expect(screen.queryByText("rewards.fulfilled")).not.toBeInTheDocument();
  });

  it("applies default styling for fulfilled status", () => {
    const { container } = render(
      <ChildRedemptionList
        redemptions={[makeRedemption({ status: "fulfilled" })]}
        locale="en"
      />
    );
    const redemptionRow = container.querySelector('[class*="bg-gray-50"]');
    expect(redemptionRow).toBeInTheDocument();
  });

  it("renders multiple redemptions", () => {
    const redemptions = [
      makeRedemption({ id: "red-1" }),
      makeRedemption({ id: "red-2", rewards: { name_en: "Toy", name_zh: "玩具", icon: "🧸", category: "toys" } }),
    ];
    render(<ChildRedemptionList redemptions={redemptions} locale="en" />);
    expect(screen.getByText("Ice Cream")).toBeInTheDocument();
    expect(screen.getByText("Toy")).toBeInTheDocument();
  });
});

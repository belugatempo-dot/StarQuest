import { typedUpdate, typedInsert } from "@/lib/supabase/helpers";

describe("lib/supabase/helpers", () => {
  const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn() });
  const mockInsert = jest.fn().mockReturnValue({ select: jest.fn() });
  const mockFrom = jest.fn().mockReturnValue({
    update: mockUpdate,
    insert: mockInsert,
  });
  const mockSupabase = { from: mockFrom } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("typedUpdate", () => {
    it("calls supabase.from(table).update(data)", () => {
      typedUpdate(mockSupabase, "quests", { name_en: "New name" });
      expect(mockFrom).toHaveBeenCalledWith("quests");
      expect(mockUpdate).toHaveBeenCalledWith({ name_en: "New name" });
    });

    it("returns the result of update()", () => {
      const result = typedUpdate(mockSupabase, "quests", { name_en: "Test" });
      expect(result).toEqual({ eq: expect.any(Function) });
    });

    it("works with different tables", () => {
      typedUpdate(mockSupabase, "rewards", { name_en: "Prize" } as any);
      expect(mockFrom).toHaveBeenCalledWith("rewards");
    });
  });

  describe("typedInsert", () => {
    it("calls supabase.from(table).insert(data)", () => {
      typedInsert(mockSupabase, "quests", {
        family_id: "fam-1",
        name_en: "New quest",
        stars: 5,
        type: "bonus",
        scope: "self",
        category: "study",
        is_active: true,
      } as any);
      expect(mockFrom).toHaveBeenCalledWith("quests");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name_en: "New quest" })
      );
    });

    it("returns the result of insert()", () => {
      const result = typedInsert(mockSupabase, "quests", {
        family_id: "fam-1",
        name_en: "Test",
        stars: 5,
        type: "bonus",
        scope: "self",
        category: "study",
        is_active: true,
      } as any);
      expect(result).toEqual({ select: expect.any(Function) });
    });

    it("handles array data", () => {
      typedInsert(mockSupabase, "quests", [
        { family_id: "fam-1", name_en: "Q1", stars: 5, type: "bonus", scope: "self", category: "study", is_active: true },
        { family_id: "fam-1", name_en: "Q2", stars: 3, type: "duty", scope: "self", category: "study", is_active: true },
      ] as any);
      expect(mockInsert).toHaveBeenCalledWith(expect.any(Array));
    });
  });
});

import { isDemoWriteError } from "@/lib/demo/demo-error";

describe("isDemoWriteError", () => {
  it("returns true for PostgreSQL RLS error code 42501", () => {
    expect(isDemoWriteError({ code: "42501" })).toBe(true);
  });

  it("returns true when message contains 'row-level security'", () => {
    expect(
      isDemoWriteError({
        message: "new row violates row-level security policy for table",
      })
    ).toBe(true);
  });

  it("returns true when both code and message match", () => {
    expect(
      isDemoWriteError({
        code: "42501",
        message: "row-level security violation",
      })
    ).toBe(true);
  });

  it("returns false for null", () => {
    expect(isDemoWriteError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDemoWriteError(undefined)).toBe(false);
  });

  it("returns false for non-RLS error codes", () => {
    expect(isDemoWriteError({ code: "23505" })).toBe(false);
  });

  it("returns false for unrelated error messages", () => {
    expect(isDemoWriteError({ message: "connection refused" })).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isDemoWriteError({})).toBe(false);
  });

  it("returns false for object with only unrelated fields", () => {
    expect(isDemoWriteError({ code: "PGRST116" })).toBe(false);
  });
});

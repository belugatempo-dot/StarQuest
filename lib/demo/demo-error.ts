/**
 * Demo write error detection.
 * When RLS blocks a write for demo users, PostgreSQL returns error code 42501
 * (insufficient_privilege). This helper detects that specific pattern.
 */

export function isDemoWriteError(error: {
  code?: string;
  message?: string;
} | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "42501" ||
    (typeof error.message === "string" &&
      error.message.includes("row-level security"))
  );
}

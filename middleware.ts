import createIntlMiddleware from "next-intl/middleware";
import { locales } from "./i18n/config";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  // Step 1: Handle i18n - get the intl response
  const intlResponse = intlMiddleware(request);

  // Step 2: Update Supabase session with the intl response
  const response = await updateSession(request, intlResponse);

  return response;
}

export const config = {
  matcher: ["/", "/(zh-CN|en)/:path*"],
};

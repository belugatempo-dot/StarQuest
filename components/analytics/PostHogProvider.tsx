"use client";

import dynamic from "next/dynamic";

const PostHogProviderInner = dynamic(
  () => import("./PostHogProviderInner"),
  { ssr: false }
);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProviderInner>{children}</PostHogProviderInner>;
}

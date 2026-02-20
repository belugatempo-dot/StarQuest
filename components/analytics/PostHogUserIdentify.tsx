"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

interface PostHogUserIdentifyProps {
  user: {
    id: string;
    role: "parent" | "child";
    family_id: string | null;
    locale?: string;
    email?: string | null;
    name?: string | null;
  };
}

export function PostHogUserIdentify({ user }: PostHogUserIdentifyProps) {
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog || !user) return;

    if (user.role === "parent") {
      // Parents: full identification with PII
      posthog.identify(user.id, {
        role: user.role,
        family_id: user.family_id,
        locale: user.locale,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      });
      // Enable session recordings for parents
      posthog.startSessionRecording();
    } else {
      // Children: anonymized identification — NO email, NO name
      posthog.identify(user.id, {
        role: user.role,
        family_id: user.family_id,
        locale: user.locale,
      });
      // Explicitly disable session recordings for children
      posthog.stopSessionRecording();
    }

    // Group by family for family-level analytics
    if (user.family_id) {
      posthog.group("family", user.family_id);
    }
  }, [posthog, user]);

  return null;
}

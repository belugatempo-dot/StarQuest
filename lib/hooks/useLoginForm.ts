import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { trackLogin, trackLoginFailed } from "@/lib/analytics/events";

type UserRecord = { role: string; family_id: string | null };

export interface UseLoginFormReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loading: boolean;
  error: string | null;
  showResendButton: boolean;
  showRegistrationLink: boolean;
  handleLogin: () => Promise<void>;
}

export function useLoginForm(locale: string): UseLoginFormReturn {
  const t = useTranslations();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendButton, setShowResendButton] = useState(false);
  const [showRegistrationLink, setShowRegistrationLink] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setShowRegistrationLink(false);

    const supabase = createClient();

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      trackLoginFailed(
        signInError.message.includes("Email not confirmed")
          ? "email_not_confirmed"
          : "invalid_credentials"
      );
      if (signInError.message.includes("Email not confirmed")) {
        setError(t("auth.emailNotVerified"));
        setShowResendButton(true);
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: userData, error: userError } = (await supabase
        .from("users")
        .select("role, family_id")
        .eq("id", data.user.id)
        .maybeSingle()) as { data: UserRecord | null; error: any };

      if (userError) {
        setError(t("auth.userRecordNotFound"));
        setShowRegistrationLink(true);
        setLoading(false);
        return;
      }

      if (!userData?.family_id) {
        setError(t("auth.familySetupRequired"));
        setLoading(false);
        return;
      }

      const role = userData?.role;
      trackLogin(role, locale);

      window.location.href = `/${locale}/activities`;
      return;
    } else {
      setError(t("auth.loginFailed"));
    }

    setLoading(false);
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    showResendButton,
    showRegistrationLink,
    handleLogin,
  };
}

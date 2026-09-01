"use client";

import { LockKeyhole, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppearanceMenu } from "@/components/v2/AppearanceMenu";
import { LanguageMenu } from "@/components/v2/LanguageMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/contexts/AccountContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";

export function LoginScreen() {
  const { t } = useTranslation();
  const { refresh } = useAccount();
  const { publicInfo } = usePublicInfo();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauthEnabled = Boolean(publicInfo?.oauth_enable ?? publicInfo?.o_auth_enabled);
  const oauthProvider = publicInfo?.oauth_provider || publicInfo?.o_auth_provider || "OAuth";
  const passwordEnabled = !publicInfo?.disable_password_login;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          ...(twoFactor ? { "2fa_code": twoFactor.trim() } : {}),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (body?.message === "2FA code is required") {
          setRequiresTwoFactor(true);
          setError(t("atlas.login.twoFactorRequired"));
          return;
        }
        throw new Error(body?.message || t("atlas.login.failed"));
      }
      await refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t("atlas.login.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="atlas-login-shell">
      <div className="atlas-login-tools right-4 top-4 flex items-center gap-1 rounded-md border border-white/10 bg-black/20 p-1 text-white backdrop-blur-md">
        <AppearanceMenu />
        <LanguageMenu />
      </div>

      <section className="atlas-login-panel" aria-labelledby="login-title">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-white/10">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 id="login-title" className="truncate text-xl font-semibold">
              {publicInfo?.sitename || "Komari"}
            </h1>
            <p className="text-sm text-white/60">{t("atlas.login.privateConsole")}</p>
          </div>
        </div>

        {passwordEnabled && (
          <form className="space-y-4" onSubmit={submit}>
            <label className="block space-y-1.5 text-sm">
              <span className="text-white/70">{t("login.username")}</span>
              <Input
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="border-white/15 bg-black/20 text-white placeholder:text-white/35"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-white/70">{t("login.password")}</span>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border-white/15 bg-black/20 text-white placeholder:text-white/35"
              />
            </label>
            {requiresTwoFactor && (
              <label className="block space-y-1.5 text-sm">
                <span className="text-white/70">{t("login.two_factor")}</span>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFactor}
                  onChange={(event) => setTwoFactor(event.target.value)}
                  className="border-white/15 bg-black/20 text-white placeholder:text-white/35"
                />
              </label>
            )}
            {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isSubmitting || !username.trim() || !password}
            >
              <LogIn className="h-4 w-4" />
              {isSubmitting ? t("atlas.login.signingIn") : t("login.title")}
            </Button>
          </form>
        )}

        {oauthEnabled && (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => window.location.assign("/api/oauth")}
          >
            {t("login.login_with", { provider: oauthProvider })}
          </Button>
        )}
      </section>
    </main>
  );
}

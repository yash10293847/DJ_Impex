"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { loginAdminAction, type AuthState } from "@/app/actions/admin-auth";
import { ChangePasswordModal } from "@/components/admin/ChangePasswordModal";
import { WeaveArt } from "@/components/ui/WeaveArt";

export function AdminLoginForm() {
  const [attempt, setAttempt] = useState(0);
  return <AdminLoginContent key={attempt} onRestart={() => setAttempt((value) => value + 1)} />;
}

function AdminLoginContent({ onRestart }: { onRestart: () => void }) {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(loginAdminAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  return (
    <div className="bg-mist relative flex min-h-dvh w-full flex-col justify-between overflow-x-hidden text-[#0f172a]">
      {/* Animated / Ambient Luxury Fabric Weave Background */}
      <WeaveArt pattern="lace" tone="mist" scale={1.6} intensity={0.16} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,255,255,0.85)_0%,rgba(238,241,246,0.65)_100%)]"
      />

      {/* Top Header Branding with Enriched Large DJI Logo */}
      <header className="relative z-10 px-6 py-4 sm:px-8 sm:py-5">
        <Link href="/" className="group inline-flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
            <Image
              src="/images/logos/dji-logo-transparent.png"
              alt="D J Impex"
              width={64}
              height={64}
              priority
              className="h-11 w-auto object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105 sm:h-13"
            />
          </div>
          <div>
            <span className="text-navy block font-sans text-2xl font-bold tracking-tight">D J Impex</span>
            <span className="text-slate block text-xs font-semibold tracking-wide">
              Nabeen<sup className="text-[0.65em]">®</sup> Admin Portal
            </span>
          </div>
        </Link>
      </header>

      {/* Centered Fit-to-Screen Luxury Login Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-2 sm:px-6">
        <div className="w-full max-w-[420px] rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_16px_40px_rgba(13,23,51,0.08)] backdrop-blur-md transition-all sm:p-8">
          {/* Card Header with Seamless Emblem (Square Border Removed) */}
          <div className="text-center">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <Image
                src="/images/logos/dji-logo-transparent.png"
                alt="D J Impex"
                width={52}
                height={52}
                priority
                className="h-11 w-auto object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
              />
            </div>
            <h1 className="text-navy text-2xl font-bold tracking-tight">
              {state.needsMfa ? "Verify it’s you" : "Welcome back"}
            </h1>
            <p className="text-slate mt-1 text-xs">
              {state.needsMfa
                ? "Enter a code from your authenticator to finish signing in."
                : "Sign in to manage images, fabrics and site content"}
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="mt-5 space-y-4">
            {state?.error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
              >
                {state.error}
              </div>
            ) : null}

            {state.needsMfa ? (
              <div className="space-y-3">
                <input type="hidden" name="step" value="mfa" />
                <label
                  htmlFor="admin-mfa-code"
                  className="text-slate block text-xs font-semibold tracking-wide uppercase"
                >
                  {useRecoveryCode ? "Recovery code" : "Authenticator code"}
                </label>
                <input
                  key={String(useRecoveryCode)}
                  id="admin-mfa-code"
                  name="code"
                  type="text"
                  required
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode={useRecoveryCode ? "text" : "numeric"}
                  maxLength={useRecoveryCode ? 35 : 6}
                  pattern={useRecoveryCode ? "[a-fA-F0-9-]{32,35}" : "[0-9]{6}"}
                  placeholder={useRecoveryCode ? "Enter an unused recovery code" : "6-digit code"}
                  className="text-navy focus:ring-navy/20 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:ring-2"
                />
                <p className="text-slate text-xs">
                  Verification expires after five minutes. Each code can be used once.
                </p>
                <button
                  type="button"
                  onClick={() => setUseRecoveryCode((value) => !value)}
                  className="text-navy text-xs font-medium underline"
                >
                  {useRecoveryCode ? "Use authenticator instead" : "Use a recovery code instead"}
                </button>
                <div>
                  <button type="button" onClick={onRestart} className="text-slate text-xs underline">
                    Start sign-in again
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-email"
                    className="text-slate block text-xs font-semibold tracking-wide uppercase"
                  >
                    Email Address
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    name="email"
                    required
                    maxLength={254}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="Enter your admin email"
                    className="text-navy focus:border-navy focus:ring-navy/20 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-xs transition placeholder:text-slate-400 focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-password"
                    className="text-slate block text-xs font-semibold tracking-wide uppercase"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      maxLength={256}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      className="text-navy focus:border-navy focus:ring-navy/20 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm shadow-xs transition placeholder:text-slate-400 focus:ring-2 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-navy absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-slate-400 transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-controls="admin-password"
                    >
                      {showPassword ? (
                        <Eye size={16} aria-hidden="true" />
                      ) : (
                        <EyeOff size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <label className="text-slate flex cursor-pointer items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      name="remember"
                      defaultChecked
                      className="text-navy focus:ring-navy/20 size-4 rounded border-slate-300"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-navy cursor-pointer font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isPending}
              className="bg-navy hover:bg-navy-soft mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>{state.needsMfa ? "Verify and sign in" : "Sign In"}</span>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-5 border-t border-slate-100 pt-3.5 text-center text-xs text-slate-400">
            <p className="flex items-center justify-center gap-1.5">
              <Lock size={12} aria-hidden="true" />
              <span>Protected administrator session</span>
            </p>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 py-3.5 text-center text-xs text-slate-400">
        <p>
          © {new Date().getFullYear()} D J Impex &amp; Co. ·{" "}
          <Link href="/" className="hover:text-navy font-medium transition">
            Back to Website
          </Link>
        </p>
      </footer>

      {/* Password Reset Modal */}
      <ChangePasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        redirectTo="/admin/images"
      />
    </div>
  );
}

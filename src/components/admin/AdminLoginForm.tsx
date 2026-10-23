"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { loginAdminAction, type AuthState } from "@/app/actions/admin-auth";
import { ChangePasswordModal } from "@/components/admin/ChangePasswordModal";
import { WeaveArt } from "@/components/ui/WeaveArt";

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    loginAdminAction,
    {}
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  return (
    <div className="relative h-dvh max-h-dvh w-full overflow-hidden bg-mist text-[#0f172a] flex flex-col justify-between">
      {/* Animated / Ambient Luxury Fabric Weave Background */}
      <WeaveArt pattern="lace" tone="mist" scale={1.6} intensity={0.16} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,255,255,0.85)_0%,rgba(238,241,246,0.65)_100%)]"
      />

      {/* Top Header Branding with Enriched Large DJI Logo */}
      <header className="relative z-10 px-6 py-4 sm:px-8 sm:py-5">
        <Link href="/" className="inline-flex items-center gap-3.5 group">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center shrink-0">
            <Image
              src="/images/logos/dji-logo-transparent.png"
              alt="D J Impex"
              width={64}
              height={64}
              priority
              className="h-11 sm:h-13 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
            />
          </div>
          <div>
            <span className="block font-sans text-2xl font-bold tracking-tight text-navy">
              D J Impex
            </span>
            <span className="block text-xs font-semibold text-slate tracking-wide">
              Nabeen<sup className="text-[0.65em]">®</sup> Admin Portal
            </span>
          </div>
        </Link>
      </header>

      {/* Centered Fit-to-Screen Luxury Login Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-2 sm:px-6">
        <div className="w-full max-w-[420px] rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-8 shadow-[0_16px_40px_rgba(13,23,51,0.08)] backdrop-blur-md transition-all">
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
            <h1 className="text-2xl font-bold tracking-tight text-navy">
              Welcome back
            </h1>
            <p className="mt-1 text-xs text-slate">
              Sign in to manage images, fabrics and site content
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="mt-5 space-y-4">
            {state?.error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium"
              >
                {state.error}
              </div>
            ) : null}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="block text-xs font-semibold uppercase tracking-wide text-slate">
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition shadow-xs"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="block text-xs font-semibold uppercase tracking-wide text-slate">
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-navy placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy transition cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  className="size-4 rounded border-slate-300 text-navy focus:ring-navy/20"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="font-medium text-navy hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isPending}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-navy hover:bg-navy-soft py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isPending ? (
                <>
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign In</span>
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
          <Link href="/" className="hover:text-navy transition font-medium">
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

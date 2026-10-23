"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { changeAdminPasswordAction, type AuthState } from "@/app/actions/admin-auth";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectTo?: string;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
  redirectTo = "/admin/images",
}: ChangePasswordModalProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    changeAdminPasswordAction,
    {}
  );

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        onSuccess?.();
        if (redirectTo) {
          router.push(redirectTo);
          router.refresh();
        }
        onClose();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state?.success, onSuccess, onClose, redirectTo, router]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-line/80 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
          aria-label="Close dialog"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#52968e]/10 text-[#52968e]">
            <KeyRound size={22} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="change-password-title"
              className="font-sans text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl"
            >
              Reset Administrator Password
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Verify your current password to set a new administrator password.
            </p>
          </div>
        </div>

        {/* Success Message */}
        {state?.success ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 animate-in fade-in">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span>Password updated successfully! Redirecting…</span>
            </div>
          </div>
        ) : (
          /* Change Password Form */
          <form action={formAction} className="mt-6 space-y-4">
            {state?.error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              >
                {state.error}
              </div>
            ) : null}

            {/* Current (Old) Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="modal-old-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Current (Old) Password
              </label>
              <div className="relative">
                <input
                  id="modal-old-password"
                  type={showOldPassword ? "text" : "password"}
                  name="oldPassword"
                  required
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#52968e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#52968e]/20 transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  aria-label={showOldPassword ? "Hide password" : "Show password"}
                >
                  {showOldPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="modal-new-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="modal-new-password"
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#52968e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#52968e]/20 transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="modal-confirm-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="modal-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  minLength={8}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#52968e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#52968e]/20 transition dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Hint / Backup recovery note */}
            <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Note:</span> Changing your password requires a signed-in session and your current password. If you have forgotten it, contact the site owner for recovery.
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#52968e] px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-[#437d76] disabled:opacity-70 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Updating…</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

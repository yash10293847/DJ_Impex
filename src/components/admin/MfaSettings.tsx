"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import {
  beginMfaEnrollmentAction,
  confirmMfaEnrollmentAction,
  manageMfaAction,
  type MfaManageState,
  type MfaSetupState,
} from "@/app/actions/admin-mfa";

const inputClass =
  "mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
const buttonClass =
  "rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-700";

function Message({ error, success }: MfaManageState) {
  return (
    <>
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {success}
        </p>
      )}
    </>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  function download() {
    const blob = new Blob(
      [
        "D J Impex — MFA recovery codes\nKeep these private. Each code works once, together with your password.\n\n" +
          codes.join("\n"),
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dj-impex-recovery-codes.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-slate-900">
      <h3 className="font-semibold">Save your recovery codes</h3>
      <p className="text-sm">
        If you lose your phone, use one of these codes with your password. Each works once. These codes are
        shown only here; keep them in your password manager or another safe place.
      </p>
      <ul className="space-y-1 overflow-x-auto font-mono text-xs" aria-label="Single-use recovery codes">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <button type="button" onClick={download} className="text-sm font-semibold underline">
        Download recovery codes
      </button>
    </section>
  );
}

function Enrollment() {
  const [setupState, startAction, starting] = useActionState<MfaSetupState, FormData>(
    beginMfaEnrollmentAction,
    {},
  );
  const [confirmState, confirmAction, confirming] = useActionState<MfaManageState, FormData>(
    confirmMfaEnrollmentAction,
    {},
  );
  const [restart, setRestart] = useState(false);
  const setup = !restart && !starting ? setupState.setup : undefined;
  return (
    <div className="space-y-5">
      {!setup && (
        <form
          action={(data) => {
            setRestart(false);
            startAction(data);
          }}
          className="space-y-4"
        >
          <Message error={setupState.error} />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Use an authenticator app on your phone. Confirm your current password to begin. Your current login
            stays active until setup is complete.
          </p>
          <label className="block text-sm font-medium">
            Current password
            <input
              className={inputClass}
              type="password"
              name="password"
              required
              maxLength={256}
              autoComplete="current-password"
            />
          </label>
          <button className={buttonClass} disabled={starting}>
            {starting ? "Preparing setup…" : "Set up authenticator"}
          </button>
        </form>
      )}
      {setup && (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold">1. Add D J Impex to your authenticator</h3>
            <p className="text-sm">
              Scan this QR code using your authenticator app. This setup expires after 10 minutes. Do not
              share the QR code or setup key.
            </p>
            <Image
              src={setup.qrCode}
              unoptimized
              width={256}
              height={256}
              alt="Private QR code for enrolling your D J Impex authenticator"
              className="rounded-xl border border-slate-200 bg-white"
            />
            <details>
              <summary className="cursor-pointer text-sm underline">
                Can’t scan? Enter a setup key instead
              </summary>
              <p className="mt-2 rounded-lg bg-slate-100 p-3 font-mono text-sm break-all text-slate-900">
                {setup.manualKey}
              </p>
              <p className="mt-2 text-xs">Choose time-based codes, 6 digits, 30 seconds, SHA-1.</p>
            </details>
          </div>
          <RecoveryCodes codes={setup.recoveryCodes} />
          <form action={confirmAction} className="space-y-4">
            <h3 className="font-semibold">2. Verify and enable MFA</h3>
            <Message error={confirmState.error} />
            <label className="block text-sm font-medium">
              Code from your authenticator
              <input
                className={inputClass}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                placeholder="6-digit code"
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" name="savedRecoveryCodes" required />I saved my recovery
              codes somewhere safe.
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enabling MFA signs out other browsers. This browser stays signed in with a new protected
              session.
            </p>
            <button className={buttonClass} disabled={confirming}>
              {confirming ? "Verifying…" : "Enable MFA"}
            </button>
            <button
              type="button"
              className="ml-4 text-sm underline"
              disabled={confirming}
              onClick={() => setRestart(true)}
            >
              Restart setup
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function Management({ recoveryCount }: { recoveryCount: number }) {
  const [state, action, pending] = useActionState<MfaManageState, FormData>(manageMfaAction, {});
  const [operation, setOperation] = useState("recovery");
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        MFA is enabled. You have {state.recoveryCodes?.length ?? recoveryCount} unused recovery codes. New
        recovery codes replace your previous codes.
      </p>
      <Message {...state} />
      {state.recoveryCodes && <RecoveryCodes codes={state.recoveryCodes} />}
      <form action={action} className="space-y-4">
        <label className="block text-sm font-medium">
          Security action
          <select
            className={inputClass}
            name="operation"
            value={operation}
            onChange={(event) => setOperation(event.target.value)}
          >
            <option value="recovery">Generate new recovery codes</option>
            <option value="disable">Disable MFA</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Current password
          <input
            className={inputClass}
            type="password"
            name="password"
            maxLength={256}
            required
            autoComplete="current-password"
          />
        </label>
        <label className="block text-sm font-medium">
          Fresh authenticator code or unused recovery code
          <input
            className={inputClass}
            name="code"
            maxLength={35}
            required
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
        {operation === "disable" && (
          <p className="text-sm text-red-700 dark:text-red-300">
            Disabling MFA allows password-only sign-in again. Set up your replacement authenticator
            immediately if you are changing phones.
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This action signs out your other sessions.
        </p>
        <button className={buttonClass} disabled={pending}>
          {pending
            ? "Saving…"
            : operation === "disable"
              ? "Verify and disable MFA"
              : "Verify and generate codes"}
        </button>
      </form>
    </div>
  );
}

export function MfaSettings({ enabled, recoveryCount }: { enabled: boolean; recoveryCount: number }) {
  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h1 className="text-2xl font-bold">Account security</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Protect your admin login with an authenticator and recovery codes.
        </p>
      </div>
      {enabled ? <Management recoveryCount={recoveryCount} /> : <Enrollment />}
    </section>
  );
}

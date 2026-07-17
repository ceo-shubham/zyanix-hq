"use client";
import { useState, useTransition } from "react";
import { setNewPasswordAction } from "@/app/actions/auth";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordInput({
  name, placeholder, label,
}: { name: string; placeholder: string; label: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          required
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50"
        />
        <button
          type="button"
          onMouseDown={() => setShow(true)}
          onMouseUp={() => setShow(false)}
          onMouseLeave={() => setShow(false)}
          onTouchStart={() => setShow(true)}
          onTouchEnd={() => setShow(false)}
          tabIndex={-1}
          aria-label={show ? "Hide" : "Show"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg select-none"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

export default function SetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await setNewPasswordAction(fd);
      if (result?.error) setError(result.error);
      // success → server redirects, component unmounts
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <PasswordInput
        name="newPassword"
        label="New Password"
        placeholder="At least 8 characters"
      />
      <PasswordInput
        name="confirmPassword"
        label="Confirm Password"
        placeholder="Type it again"
      />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-red-500 shrink-0">⚠</span>
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-3 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Requirements</p>
        <p className="text-xs text-gray-500">• Minimum 8 characters</p>
        <p className="text-xs text-gray-500">• Both fields must match</p>
        <p className="text-xs text-gray-500">• Only you will know this password</p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold text-sm py-3 rounded-xl transition-all duration-200 shadow-sm"
      >
        {isPending ? "Saving…" : "Set Password & Continue →"}
      </button>
    </form>
  );
}

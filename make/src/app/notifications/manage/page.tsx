"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback, Suspense } from "react";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-sm font-body text-foreground/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-gold/60" : "bg-surface"} border border-gold-dim/30`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${checked ? "translate-x-5 bg-gold" : "bg-foreground/40"}`}
        />
      </button>
    </label>
  );
}

function ManageForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [notifyLaunch, setNotifyLaunch] = useState(true);
  const [notifyReplaced, setNotifyReplaced] = useState(false);
  const [notifyClaimable, setNotifyClaimable] = useState(false);
  const [wallet, setWallet] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = useCallback(async () => {
    if (!token) {
      setErrorMsg("Missing preferences token.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          notifyLaunch,
          notifyReplaced,
          notifyClaimable,
          wallet: wallet.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed.");
      }

      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, [token, notifyLaunch, notifyReplaced, notifyClaimable, wallet]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-surface-raised border border-gold-dim/20 p-8 space-y-6">
        <h1 className="font-display text-2xl text-gold text-center">
          Notification Preferences
        </h1>

        {status === "done" ? (
          <p className="text-gold text-sm font-body text-center">
            Your preferences have been updated.
          </p>
        ) : (
          <>
            <div className="space-y-1 border-b border-gold-dim/10 pb-4">
              <Toggle
                label="Launch announcements"
                checked={notifyLaunch}
                onChange={setNotifyLaunch}
              />
              <Toggle
                label="Slot displaced alerts"
                checked={notifyReplaced}
                onChange={setNotifyReplaced}
              />
              <Toggle
                label="SOL claimable alerts"
                checked={notifyClaimable}
                onChange={setNotifyClaimable}
              />
            </div>

            {(notifyReplaced || notifyClaimable) && (
              <div className="space-y-2">
                <label className="text-xs font-body text-foreground/60">
                  Wallet address (required for slot/claimable alerts)
                </label>
                <input
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="Your Solana wallet address"
                  className="w-full px-3 py-2 bg-surface border border-gold-dim/20 text-sm font-body text-foreground/90 placeholder:text-foreground/30 focus:outline-none focus:border-gold/50"
                />
              </div>
            )}

            {status === "error" && (
              <p className="text-red-400 text-sm font-body">{errorMsg}</p>
            )}

            <button
              onClick={handleSave}
              disabled={status === "loading"}
              className="w-full px-4 py-3 text-sm font-body font-medium border border-gold-dim/30 text-foreground/80 hover:border-gold hover:text-gold transition-colors cursor-pointer disabled:opacity-50"
            >
              {status === "loading" ? "Saving..." : "Save Preferences"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function ManagePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-foreground/50 text-sm font-body">Loading...</p>
        </main>
      }
    >
      <ManageForm />
    </Suspense>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function NotificationSignup({
  title = "Get Launch & Slot Alerts",
}: {
  title?: string;
}) {
  const { publicKey } = useWallet();
  const wallet = useMemo(() => publicKey?.toBase58() ?? "", [publicKey]);

  const [email, setEmail] = useState("");
  const [notifyLaunch, setNotifyLaunch] = useState(true);
  const [notifyReplaced, setNotifyReplaced] = useState(Boolean(wallet));
  const [notifyClaimable, setNotifyClaimable] = useState(Boolean(wallet));
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setState("submitting");
    try {
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          wallet: wallet || undefined,
          notifyLaunch,
          notifyReplaced,
          notifyClaimable,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Failed to subscribe.",
        );
      }
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to subscribe.");
    }
  };

  return (
    <div className="bg-surface-raised/50 border border-gold-dim/20 p-4 sm:p-5 space-y-3">
      <p className="font-display text-foreground/80 font-semibold text-xs uppercase tracking-wider">
        {title}
      </p>
      <p className="text-xs text-foreground/50 font-body leading-relaxed">
        Get notified at launch, when your slot is displaced, and when your SOL is
        claimable.
      </p>

      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === "submitting"}
        className="w-full bg-black/30 border border-gold-dim/30 text-foreground font-body text-sm px-3 py-2 focus:outline-none focus:border-gold/50 disabled:opacity-60"
      />

      {wallet && (
        <p className="text-[11px] text-foreground/35 font-body">
          Wallet: {wallet.slice(0, 4)}...{wallet.slice(-4)}
        </p>
      )}

      <div className="space-y-1.5 text-xs font-body text-foreground/70">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyLaunch}
            onChange={(e) => setNotifyLaunch(e.target.checked)}
            disabled={state === "submitting"}
          />
          Launch announcements
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyReplaced}
            onChange={(e) => setNotifyReplaced(e.target.checked)}
            disabled={state === "submitting"}
          />
          Slot replaced notifications (requires wallet)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyClaimable}
            onChange={(e) => setNotifyClaimable(e.target.checked)}
            disabled={state === "submitting"}
          />
          SOL claimable notifications (requires wallet)
        </label>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={state === "submitting"}
        className="w-full btn-gold font-display tracking-wide text-sm py-2 disabled:opacity-60"
      >
        {state === "submitting" ? "Saving..." : "Notify Me"}
      </button>

      {state === "success" && (
        <p className="text-xs text-green-400 font-body">
          Saved. We will notify you based on your selected preferences.
        </p>
      )}
      {error && <p className="text-xs text-red-400 font-body">{error}</p>}
      {!wallet && (notifyReplaced || notifyClaimable) && (
        <p className="text-[11px] text-yellow-300/70 font-body">
          Connect your wallet to enable slot-specific notifications.
        </p>
      )}
    </div>
  );
}

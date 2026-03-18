"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback, Suspense } from "react";

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleUnsubscribe = useCallback(async () => {
    if (!token) {
      setErrorMsg("Missing unsubscribe token.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unsubscribe failed.");
      }

      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-surface-raised border border-gold-dim/20 p-8 space-y-6 text-center">
        <h1 className="font-display text-2xl text-gold">Unsubscribe</h1>

        {status === "idle" && (
          <>
            <p className="text-foreground/70 text-sm font-body">
              Click below to unsubscribe from all Solazzo email notifications.
            </p>
            <button
              onClick={handleUnsubscribe}
              className="w-full px-4 py-3 text-sm font-body font-medium border border-gold-dim/30 text-foreground/80 hover:border-gold hover:text-gold transition-colors cursor-pointer"
            >
              Confirm Unsubscribe
            </button>
          </>
        )}

        {status === "loading" && (
          <p className="text-foreground/50 text-sm font-body">Processing...</p>
        )}

        {status === "done" && (
          <p className="text-gold text-sm font-body">
            You have been unsubscribed from all Solazzo notifications.
          </p>
        )}

        {status === "error" && (
          <p className="text-red-400 text-sm font-body">{errorMsg}</p>
        )}
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-foreground/50 text-sm font-body">Loading...</p>
        </main>
      }
    >
      <UnsubscribeForm />
    </Suspense>
  );
}

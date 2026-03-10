"use client";

import { useState, useCallback } from "react";

export function useComingSoon() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const show = useCallback((msg = "This feature is coming soon.") => {
    setMessage(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), 3000);
  }, []);

  return { visible, message, show };
}

export function ComingSoonToast({
  visible,
  message,
}: {
  visible: boolean;
  message: string;
}) {
  if (!visible) return null;
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
      <div className="bg-surface-raised border border-gold-dim/30 px-5 py-3 shadow-lg flex items-center gap-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gold flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <p className="text-sm font-body text-foreground/80">{message}</p>
      </div>
    </div>
  );
}

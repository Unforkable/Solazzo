"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const [showToast, setShowToast] = useState(false);
  const pathname = usePathname();

  const handleConnect = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-gold-dim/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-lg font-display font-bold tracking-wide text-foreground hover:text-gold transition-colors"
            >
              SOLAZZO
            </Link>
            <Link
              href="/gallery"
              className={`text-xs font-body tracking-wide transition-colors hidden sm:block ${
                pathname === "/gallery"
                  ? "text-gold"
                  : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              Gallery
            </Link>
          </div>
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-4 py-2 text-xs font-body font-medium border border-gold-dim/30 text-foreground/80 hover:border-gold hover:text-gold transition-colors cursor-pointer rounded-sm"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M22 10H18a2 2 0 0 0 0 4h4" />
            </svg>
            Connect Wallet
          </button>
        </div>
      </nav>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
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
            <p className="text-sm font-body text-foreground/80">
              Wallet connection coming soon. Join the waitlist.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

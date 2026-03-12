"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function Navbar() {
  const pathname = usePathname();
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnect = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const walletLabel =
    connected && publicKey
      ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
      : "Connect Wallet";

  return (
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
          <Link
            href="/leaderboard"
            className={`text-xs font-body tracking-wide transition-colors hidden sm:block ${
              pathname === "/leaderboard"
                ? "text-gold"
                : "text-foreground/40 hover:text-foreground/70"
            }`}
          >
            Leaderboard
          </Link>
        </div>
        <button
          onClick={handleConnect}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-body font-medium border transition-colors cursor-pointer rounded-sm ${
            connected
              ? "border-gold/50 text-gold hover:border-gold"
              : "border-gold-dim/30 text-foreground/80 hover:border-gold hover:text-gold"
          }`}
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
          {walletLabel}
        </button>
      </div>
    </nav>
  );
}

"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { Transaction, PublicKey } from "@solana/web3.js";
import type { GalleryEntry, GalleryTraitRoll } from "@/lib/gallery-store";
import {
  fetchProtocolConfig,
  fetchLowestSlotInfo,
  fetchSlotBook,
  fetchClaimableBalance,
  buildDisplaceLowestIx,
  buildClaimWithdrawIx,
  type ProtocolConfigAccount,
  type LowestSlotInfo,
} from "@/lib/onchain/client";
import { SOL_DECIMALS } from "@/lib/onchain/constants";

const STAGE_NAMES: Record<number, string> = {
  1: "Humble Believer",
  2: "Rising Confidence",
  3: "Established Wealth",
  4: "Maximum Excess",
  5: "Reflective Maturity",
};

const STAGE_THRESHOLDS = [200, 400, 600, 800];

function priceToStage(price: number): number {
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (price < STAGE_THRESHOLDS[i]) return i + 1;
  }
  return 5;
}

const RARITY_COLORS: Record<string, string> = {
  Common: "#8a7f72",
  Uncommon: "#7ab87a",
  Rare: "#6a9fd8",
  Legendary: "#c9a84c",
};

type SortOption = "highest" | "lowest" | "slot";

function BaroqueFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full" style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}>
      <div className="p-[3px] bg-gradient-to-b from-[#8B7441] via-[#5C4A28] to-[#3A2E18]">
        <div className="p-[4px] sm:p-[6px] bg-gradient-to-b from-[#C9A84C] via-[#A07B3A] to-[#7A5C2E]">
          <div className="p-[3px] sm:p-[4px] bg-[#1a1408]">
            <div className="p-[4px] sm:p-[6px] bg-gradient-to-b from-[#7A5C2E] via-[#A07B3A] to-[#C9A84C]">
              <div className="p-[2px] sm:p-[3px] bg-gradient-to-b from-[#3A2E18] via-[#5C4A28] to-[#8B7441]">
                <div
                  className="bg-[#0d0a04]"
                  style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.7)" }}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / SOL_DECIMALS;
}

// ── Displacement Modal ───────────────────────────────────────────────

type DisplaceStep = "idle" | "loading" | "ready" | "signing" | "confirming" | "success" | "error";

function DisplacementModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const { connection } = useConnection();
  const router = useRouter();

  const [step, setStep] = useState<DisplaceStep>("idle");
  const [config, setConfig] = useState<ProtocolConfigAccount | null>(null);
  const [lowest, setLowest] = useState<(LowestSlotInfo & { owner: PublicKey }) | null>(null);
  const [firstOpenSlot, setFirstOpenSlot] = useState<number | null>(null);
  const [lockInput, setLockInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  // Fetch on-chain state on open
  const fetchState = useCallback(async () => {
    setStep("loading");
    setErrorMsg(null);
    try {
      const [cfg, low, slotBook] = await Promise.all([
        fetchProtocolConfig(connection),
        fetchLowestSlotInfo(connection),
        fetchSlotBook(connection),
      ]);
      setConfig(cfg);
      setLowest(low);
      const firstOpen = slotBook.occupied.findIndex((isOccupied) => !isOccupied);
      setFirstOpenSlot(firstOpen >= 0 ? firstOpen : null);

      if (!low) {
        setErrorMsg("No occupied slots found.");
        setStep("error");
        return;
      }

      if (cfg.isSettled) {
        setErrorMsg("Protocol has settled. Displacement is no longer possible.");
        setStep("error");
        return;
      }

      if (cfg.isPaused) {
        setErrorMsg("Protocol is paused. Try again later.");
        setStep("error");
        return;
      }

      if (cfg.slotsFilled < cfg.slotCount) {
        setErrorMsg(`Only ${cfg.slotsFilled}/${cfg.slotCount} slots filled. Claim an empty slot instead.`);
        setStep("error");
        return;
      }

      // Pre-fill min lock
      const minRequired = low.lockedLamports + cfg.minIncrementLamports;
      setLockInput(lamportsToSol(minRequired).toString());
      setStep("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to fetch on-chain state.");
      setStep("error");
    }
  }, [connection]);

  useEffect(() => {
    if (connected) {
      fetchState();
    }
  }, [connected, fetchState]);

  const minRequiredLamports = useMemo(() => {
    if (!config || !lowest) return BigInt(0);
    const minByIncrement = lowest.lockedLamports + config.minIncrementLamports;
    return minByIncrement > config.minLockLamports ? minByIncrement : config.minLockLamports;
  }, [config, lowest]);

  const lockSol = parseFloat(lockInput) || 0;
  const lockLamports = BigInt(Math.round(lockSol * SOL_DECIMALS));
  const feeSol = config ? lamportsToSol(config.displacementFeeLamports) : 0;
  const totalCostSol = lockSol + feeSol;
  const isAmountValid = lockLamports >= minRequiredLamports;
  const isSelfDisplace = publicKey && lowest?.owner ? publicKey.equals(lowest.owner) : false;

  const handleDisplace = useCallback(async () => {
    if (!publicKey || !sendTransaction || !config || !lowest) return;

    // Refetch freshest state to prevent stale-data race
    setStep("loading");
    setErrorMsg(null);
    try {
      const [freshConfig, freshLowest] = await Promise.all([
        fetchProtocolConfig(connection),
        fetchLowestSlotInfo(connection),
      ]);

      if (!freshLowest) {
        setErrorMsg("No occupied slots found.");
        setStep("error");
        return;
      }

      setConfig(freshConfig);
      setLowest(freshLowest);

      // Re-validate after refresh
      const freshMinRequired = freshLowest.lockedLamports + freshConfig.minIncrementLamports;
      const effectiveMin = freshMinRequired > freshConfig.minLockLamports ? freshMinRequired : freshConfig.minLockLamports;

      if (lockLamports < effectiveMin) {
        const newMin = lamportsToSol(effectiveMin);
        setLockInput(newMin.toString());
        setErrorMsg(`Minimum increased to ${newMin} SOL. The lowest lock changed since you opened this modal. Review and try again.`);
        setStep("ready");
        return;
      }

      if (publicKey.equals(freshLowest.owner)) {
        setErrorMsg("You cannot displace yourself.");
        setStep("ready");
        return;
      }

      if (freshConfig.isSettled) {
        setErrorMsg("Protocol has settled.");
        setStep("error");
        return;
      }

      if (freshConfig.isPaused) {
        setErrorMsg("Protocol is paused.");
        setStep("error");
        return;
      }

      // Build tx
      setStep("signing");
      const ix = buildDisplaceLowestIx(
        publicKey,
        freshLowest.slotId,
        freshLowest.lockedLamports,
        lockLamports,
        freshConfig.treasuryAccount,
        freshLowest.owner,
      );

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);

      setStep("confirming");
      const result = await connection.confirmTransaction(sig, "confirmed");
      if (result.value.err) {
        throw new Error("Transaction failed on-chain.");
      }

      setTxSig(sig);
      setStep("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed.";

      if (msg.includes("User rejected") || msg.includes("rejected")) {
        setErrorMsg("Transaction cancelled.");
        setStep("ready");
        return;
      }

      // On-chain expected-state mismatch (race): refetch and let user retry.
      // Anchor custom error codes: 6019 = ExpectedLowestMismatch (0x1783),
      // 6020 = ExpectedLowestLockMismatch (0x1784).
      if (
        msg.includes("0x1783") || // 6019 ExpectedLowestMismatch
        msg.includes("0x1784") || // 6020 ExpectedLowestLockMismatch
        msg.includes("ExpectedLowestMismatch") ||
        msg.includes("ExpectedLowestLockMismatch")
      ) {
        setErrorMsg("The lowest slot changed while you were signing. Refreshing...");
        setStep("loading");
        setTimeout(() => fetchState(), 500);
        return;
      }

      // Map other known Anchor errors to friendly messages
      const anchorErrors: Record<string, string> = {
        "0x1782": "All slots must be filled before displacement.",  // 6018 CollectionNotFull
        "0x1785": "Lock too low. Must exceed lowest + minimum increment.", // 6021 InsufficientDisplacementIncrement
        "0x1786": "You cannot displace yourself.", // 6022 SelfDisplacementNotAllowed
        "0x1787": "Claimable balance owner mismatch.", // 6023 ClaimableBalanceOwnerMismatch
        "0x1780": "Lock amount is below the minimum.", // 6016 LockBelowMinimum
        "0x177b": "Protocol is paused.", // 6011 ProtocolPaused
        "0x177c": "Protocol is already settled.", // 6012 ProtocolSettled
      };

      let friendlyMsg = msg;
      for (const [code, friendly] of Object.entries(anchorErrors)) {
        if (msg.includes(code)) {
          friendlyMsg = friendly;
          break;
        }
      }

      setErrorMsg(friendlyMsg);
      setStep("ready");
    }
  }, [publicKey, sendTransaction, connection, config, lowest, lockLamports, fetchState]);

  return (
    <div
      className="fixed inset-0 z-[55] overflow-y-auto"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-surface-raised border border-gold-dim/30 p-6 sm:p-8 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-display font-bold text-foreground">
              Displace Lowest Slot
            </h3>
            <button
              onClick={onClose}
              className="text-muted hover:text-gold transition-colors cursor-pointer text-sm font-body min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              Close
            </button>
          </div>

          {/* Wallet gate */}
          {!connected ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-foreground/60 font-body">
                Connect your Solana wallet to displace the lowest slot.
              </p>
              <button
                onClick={() => openWalletModal(true)}
                className="btn-gold font-display tracking-wide py-3 px-8 cursor-pointer"
              >
                Connect Wallet
              </button>
            </div>
          ) : step === "loading" ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              <p className="text-sm text-foreground/50 font-body mt-3">Fetching on-chain state...</p>
            </div>
          ) : step === "error" ? (
            <div className="space-y-4">
              <p className="text-sm text-red-400 font-body">{errorMsg}</p>
              {firstOpenSlot !== null && errorMsg?.includes("Claim an empty slot instead.") && (
                <button
                  onClick={() => {
                    onClose();
                    router.push("/?from=displace");
                  }}
                  className="btn-gold font-display tracking-wide w-full cursor-pointer"
                >
                  Go To Auto-Claim (next open #{firstOpenSlot})
                </button>
              )}
              <button
                onClick={fetchState}
                className="btn-ghost font-display tracking-wide w-full cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : step === "success" ? (
            <div className="space-y-4 text-center">
              <div className="text-3xl">&#9876;</div>
              <p className="text-base font-display font-bold text-gold">Displacement successful</p>
              <p className="text-sm text-foreground/60 font-body">
                You now hold Slot #{lowest?.slotId} with {lockSol} SOL locked.
              </p>
              {txSig && (
                <p className="text-xs text-foreground/40 font-body break-all">
                  Tx: {txSig.slice(0, 12)}...{txSig.slice(-8)}
                </p>
              )}
              <button
                onClick={() => { onClose(); onSuccess(); }}
                className="btn-gold font-display tracking-wide w-full cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            /* step === "ready" | "signing" | "confirming" */
            <div className="space-y-5">
              {/* Current lowest info */}
              {lowest && config && (
                <div className="bg-black/30 border border-gold-dim/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/40 font-body">Current lowest slot</span>
                    <span className="text-sm font-display text-foreground">#{lowest.slotId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/40 font-body">Current lock</span>
                    <span className="text-sm font-display text-gold">
                      &#9678; {lamportsToSol(lowest.lockedLamports)} SOL
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/40 font-body">Minimum to displace</span>
                    <span className="text-sm font-display text-foreground">
                      &#9678; {lamportsToSol(minRequiredLamports)} SOL
                    </span>
                  </div>
                </div>
              )}

              {/* Lock amount input */}
              <div>
                <label className="block text-xs text-foreground/40 font-body mb-2">
                  Your lock amount (SOL)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={lamportsToSol(minRequiredLamports)}
                    step="0.1"
                    value={lockInput}
                    onChange={(e) => {
                      setLockInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    disabled={step !== "ready"}
                    className="w-full bg-black/30 border border-gold-dim/30 text-foreground font-display text-sm px-4 py-3 pr-14 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors placeholder:text-muted/30 disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted/50 font-display">
                    SOL
                  </span>
                </div>
                {!isAmountValid && lockInput && (
                  <p className="text-xs text-red-400 font-body mt-1">
                    Minimum is {lamportsToSol(minRequiredLamports)} SOL
                  </p>
                )}
              </div>

              {/* Cost breakdown */}
              {config && (
                <div className="bg-black/30 border border-gold-dim/20 p-4 space-y-1.5">
                  <p className="text-xs text-foreground/40 font-body uppercase tracking-wider mb-2">
                    Transaction summary
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/50 font-body">Lock to vault</span>
                    <span className="text-sm font-display text-foreground">{lockSol} SOL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/50 font-body">Displacement fee to treasury</span>
                    <span className="text-sm font-display text-foreground">{feeSol} SOL</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gold-dim/15 pt-1.5 mt-1.5">
                    <span className="text-xs text-foreground/60 font-body font-medium">Total from wallet</span>
                    <span className="text-sm font-display font-bold text-gold">{totalCostSol} SOL</span>
                  </div>
                  <p className="text-[10px] text-foreground/30 font-body mt-2 leading-relaxed">
                    The displaced holder&apos;s full principal is credited to their claimable balance for withdrawal.
                    Your lock is held in the protocol vault until settlement (SOL hits $1,000 or Mar 16, 2030 UTC) or displacement.
                  </p>
                </div>
              )}

              {/* Self-displacement warning */}
              {isSelfDisplace && (
                <p className="text-sm text-red-400 font-body">
                  You own the lowest slot. You cannot displace yourself.
                </p>
              )}

              {/* Error */}
              {errorMsg && (
                <p className="text-sm text-red-400 font-body">{errorMsg}</p>
              )}

              {/* CTA */}
              <button
                onClick={handleDisplace}
                disabled={
                  step !== "ready" ||
                  !isAmountValid ||
                  isSelfDisplace ||
                  false
                }
                className="w-full btn-gold font-display tracking-wide text-base py-3.5 disabled:opacity-50 cursor-pointer"
              >
                {step === "signing" && "Sign in your wallet..."}
                {step === "confirming" && "Confirming on-chain..."}
                {step === "ready" && (
                  isAmountValid
                    ? `Displace &#8212; Lock ${lockSol} SOL`
                    : "Enter a valid amount"
                )}
              </button>

              <p className="text-[11px] text-foreground/30 font-body text-center">
                Connected: {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Withdraw Banner ──────────────────────────────────────────────────

function WithdrawBanner() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [claimableLamports, setClaimableLamports] = useState<bigint | null>(null);
  const [withdrawStep, setWithdrawStep] = useState<"idle" | "signing" | "confirming" | "done">("idle");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawTxSig, setWithdrawTxSig] = useState<string | null>(null);

  const checkBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setClaimableLamports(null);
      return;
    }
    try {
      const cb = await fetchClaimableBalance(connection, publicKey);
      setClaimableLamports(cb && cb.claimableLamports > BigInt(0) ? cb.claimableLamports : null);
    } catch {
      setClaimableLamports(null);
    }
  }, [connection, publicKey, connected]);

  useEffect(() => {
    checkBalance();
  }, [checkBalance]);

  const handleWithdraw = useCallback(async () => {
    if (!publicKey || !sendTransaction || !claimableLamports) return;

    setWithdrawStep("signing");
    setWithdrawError(null);
    try {
      const ix = buildClaimWithdrawIx(publicKey);
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);

      setWithdrawStep("confirming");
      const result = await connection.confirmTransaction(sig, "confirmed");
      if (result.value.err) {
        throw new Error("Withdraw transaction failed on-chain.");
      }

      setWithdrawTxSig(sig);
      setWithdrawStep("done");
      setClaimableLamports(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Withdraw failed.";
      if (msg.includes("User rejected") || msg.includes("rejected")) {
        setWithdrawError("Transaction cancelled.");
      } else {
        setWithdrawError(msg);
      }
      setWithdrawStep("idle");
    }
  }, [publicKey, sendTransaction, connection, claimableLamports]);

  if (!connected || claimableLamports === null) {
    // Show success message briefly after withdraw
    if (withdrawTxSig && withdrawStep === "done") {
      return (
        <div className="bg-green-900/30 border border-green-500/30 p-4 sm:p-5 mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm font-body text-green-400">
              Withdraw successful. Tx: {withdrawTxSig.slice(0, 8)}...
            </p>
            <button
              onClick={() => setWithdrawTxSig(null)}
              className="text-xs text-green-400/60 hover:text-green-400 cursor-pointer font-body"
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  const solAmount = lamportsToSol(claimableLamports);

  return (
    <div className="bg-gold/10 border border-gold/30 p-4 sm:p-5 mb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-gold/70 font-body uppercase tracking-wider mb-1">
            Claimable Balance
          </p>
          <p className="text-base font-display font-bold text-gold">
            &#9678; {solAmount} SOL available to withdraw
          </p>
          <p className="text-xs text-foreground/40 font-body mt-1">
            You were displaced from a slot. Your full principal is ready for withdrawal.
          </p>
        </div>
        <button
          onClick={handleWithdraw}
          disabled={withdrawStep !== "idle"}
          className="btn-gold font-display tracking-wide flex-shrink-0 py-3 px-6 disabled:opacity-50 cursor-pointer"
        >
          {withdrawStep === "signing" && "Sign in wallet..."}
          {withdrawStep === "confirming" && "Confirming..."}
          {withdrawStep === "idle" && `Withdraw ${solAmount} SOL`}
        </button>
      </div>
      {withdrawError && (
        <p className="text-sm text-red-400 font-body mt-2">{withdrawError}</p>
      )}
    </div>
  );
}

// ── Collection Lightbox ──────────────────────────────────────────────

function CollectionLightbox({
  entry,
  onClose,
  currentStage,
  onChallenge,
}: {
  entry: GalleryEntry & { slot: number };
  onClose: () => void;
  currentStage: number;
  onChallenge: () => void;
}) {
  const currentConviction = entry.conviction ?? 0;
  const [zoomedStage, setZoomedStage] = useState<number | null>(null);

  // Mobile swipe carousel state
  const [carouselIdx, setCarouselIdx] = useState(currentStage - 1);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
    if (dx > dy && dx > 10) swipingRef.current = true;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    touchStartRef.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && carouselIdx < 4) setCarouselIdx((p) => p + 1);
    if (dx > 0 && carouselIdx > 0) setCarouselIdx((p) => p - 1);
  }, [carouselIdx]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        onClick={onClose}
      >
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
        <div className="relative min-h-full flex items-start sm:items-center justify-center p-3 pt-5 sm:p-8">
          <div
            className="relative w-full max-w-6xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-base sm:text-lg font-display font-bold text-foreground">
                  Slot #{entry.slot}
                </span>
                {currentConviction > 0 && (
                  <span className="text-xs sm:text-sm font-body text-gold">
                    &#9678; {currentConviction.toFixed(1)} locked
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-muted hover:text-gold transition-colors cursor-pointer text-sm font-body min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                Close
              </button>
            </div>

            {/* Mobile: Swipeable carousel */}
            <div className="sm:hidden">
              <div
                className="overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${carouselIdx * 100}%)` }}
                >
                  {entry.portraits.map((url, i) => {
                    const stage = i + 1;
                    const traits = entry.traits?.[i];
                    const visible = traits
                      ? Object.values(traits.rolls).filter((r: GalleryTraitRoll) => !r.isNothing)
                      : [];

                    return (
                      <div key={stage} className="w-full flex-shrink-0 px-2">
                        <div
                          className="cursor-pointer"
                          onClick={() => setZoomedStage(stage)}
                        >
                          <BaroqueFrame>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Stage ${stage}`}
                              className="w-full aspect-square object-cover"
                            />
                          </BaroqueFrame>
                        </div>
                        <div className="mt-3 text-center">
                          <p className={`text-sm font-display font-semibold ${stage === currentStage ? "text-gold" : "text-foreground"}`}>
                            {stage}. {STAGE_NAMES[stage]}
                            {stage === currentStage && " (current)"}
                          </p>
                          {visible.length > 0 && (
                            <div className="mt-1.5 space-y-px">
                              {visible.map((r: GalleryTraitRoll) => (
                                <p
                                  key={r.category}
                                  className="text-xs leading-tight"
                                  style={{ color: RARITY_COLORS[r.rarity] ?? "#8a7f72" }}
                                >
                                  {r.itemName}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Dots */}
              <div className="flex justify-center gap-2 mt-4">
                {entry.portraits.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselIdx(i)}
                    className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                      i === carouselIdx ? "bg-gold" : "bg-foreground/20"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Desktop: 5-column grid */}
            <div className="hidden sm:grid sm:grid-cols-5 gap-4">
              {entry.portraits.map((url, i) => {
                const stage = i + 1;
                const traits = entry.traits?.[i];
                const visible = traits
                  ? Object.values(traits.rolls).filter((r: GalleryTraitRoll) => !r.isNothing)
                  : [];

                return (
                  <div key={stage}>
                    <div
                      className={`cursor-pointer transition-all duration-200 hover:scale-[1.03] ${
                        stage === currentStage ? "ring-1 ring-gold/40 ring-offset-2 ring-offset-black" : ""
                      }`}
                      onClick={() => setZoomedStage(stage)}
                    >
                      <BaroqueFrame>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Stage ${stage}`}
                          className="w-full aspect-square object-cover"
                        />
                      </BaroqueFrame>
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-xs font-display font-semibold ${stage === currentStage ? "text-gold" : "text-foreground/80"}`}>
                        {stage}. {STAGE_NAMES[stage]}
                        {stage === currentStage && " (current)"}
                      </p>
                      {visible.length > 0 && (
                        <div className="mt-1 space-y-px">
                          {visible.map((r: GalleryTraitRoll) => (
                            <p
                              key={r.category}
                              className="text-[10px] leading-tight"
                              style={{ color: RARITY_COLORS[r.rarity] ?? "#8a7f72" }}
                            >
                              {r.itemName}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Challenge / Takeover section */}
            <div className="mt-6 border-t border-gold-dim/20 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs text-foreground/40 font-body uppercase tracking-wider mb-1">
                  Displace the lowest slot
                </p>
                <p className="text-sm text-foreground/60 font-body">
                  Lock more SOL than the current lowest holder to take their position.
                  The protocol always displaces the lowest-locked slot, not this one specifically.
                  The displaced holder gets their full SOL back.
                </p>
              </div>
              <button
                onClick={onChallenge}
                className="btn-ghost font-display tracking-wide flex-shrink-0 gap-2"
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
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
                Displace Lowest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zoomed single portrait */}
      {zoomedStage !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-8"
          onClick={() => setZoomedStage(null)}
        >
          <div className="absolute inset-0 bg-black/95" />
          <div className="relative max-w-2xl w-full animate-fade-in">
            <BaroqueFrame>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.portraits[zoomedStage - 1]}
                alt={`Stage ${zoomedStage}`}
                className="w-full object-contain"
              />
            </BaroqueFrame>
            <p className="text-center mt-3 font-display text-foreground/80 text-base sm:text-lg">
              {zoomedStage}. {STAGE_NAMES[zoomedStage]}
            </p>
            {/* Prev/Next arrows */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none px-1 sm:-mx-12">
              {zoomedStage > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setZoomedStage(zoomedStage - 1); }}
                  className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-black/60 hover:bg-black/80 text-foreground/60 hover:text-gold transition-colors cursor-pointer rounded-full"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}
              {zoomedStage <= 1 && <span />}
              {zoomedStage < 5 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setZoomedStage(zoomedStage + 1); }}
                  className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-black/60 hover:bg-black/80 text-foreground/60 hover:text-gold transition-colors cursor-pointer rounded-full"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function GalleryPage() {
  return (
    <Suspense>
      <GalleryContent />
    </Suspense>
  );
}

function GalleryContent() {
  const [collections, setCollections] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<(GalleryEntry & { slot: number }) | null>(null);
  const [sliderPrice, setSliderPrice] = useState(127);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>("highest");
  const [showDisplace, setShowDisplace] = useState(false);
  const currentStage = priceToStage(sliderPrice);
  const searchParams = useSearchParams();
  const newId = searchParams.get("new");
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  const enrichEntries = useCallback((items: GalleryEntry[]) => {
    const byTime = [...items].sort((a, b) => a.publishedAt - b.publishedAt);
    return byTime.map((entry, i) => ({
      ...entry,
      slot: entry.slot ?? i + 1,
    }));
  }, []);

  const fetchCollections = useCallback(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => {
        const items = data.collections ?? [];
        setCollections(items);
      })
      .catch(() => setError("Failed to load gallery."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCollections();

    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
      .then((res) => res.json())
      .then((data) => {
        const price = data?.solana?.usd;
        if (typeof price === "number") {
          setSolPrice(price);
          setSliderPrice(price);
        }
      })
      .catch(() => {});
  }, [fetchCollections]);

  // Enrich entries with derived slot numbers (oldest = slot 1)
  const entries = useMemo(() => enrichEntries(collections), [collections, enrichEntries]);

  // Auto-open lightbox for newly published collection (?new=<id>).
  // State adjustment during render — avoids setState-in-effect and refs-during-render lint violations.
  // autoOpened state guards one-time trigger; survives lightbox close without re-triggering.
  if (newId && !autoOpened && entries.length > 0) {
    const match = entries.find((c) => c.id === newId);
    if (match) {
      setAutoOpened(true);
      setSelected(match);
    }
  }

  // Scroll to highlighted entry
  useEffect(() => {
    if (newId && highlightedRef.current) {
      setTimeout(() => highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
  }, [newId, loading]);

  // Stats
  const stats = useMemo(() => {
    const convictions = entries
      .map((e) => e.conviction ?? 0)
      .filter((c) => c > 0);
    return {
      floor: convictions.length > 0 ? Math.min(...convictions) : null,
      total: convictions.reduce((a, b) => a + b, 0),
    };
  }, [entries]);

  // Sorted entries
  const sorted = useMemo(() => {
    const items = [...entries];
    switch (sort) {
      case "highest":
        return items.sort((a, b) => (b.conviction ?? 0) - (a.conviction ?? 0) || a.slot - b.slot);
      case "lowest":
        return items.sort((a, b) => (a.conviction ?? 0) - (b.conviction ?? 0) || a.slot - b.slot);
      case "slot":
        return items.sort((a, b) => a.slot - b.slot);
      default:
        return items;
    }
  }, [entries, sort]);

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: "highest", label: "Highest Conviction" },
    { key: "lowest", label: "Lowest Conviction" },
    { key: "slot", label: "Slot #" },
  ];

  const handleChallenge = useCallback(() => {
    setSelected(null); // close lightbox
    setShowDisplace(true);
  }, []);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm text-muted hover:text-gold transition-colors font-body mb-4 inline-block"
          >
            &larr; Portrait Studio
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-wide text-foreground">
                THE GALLERY
              </h1>
              {!loading && (
                <div className="mt-2">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-sm font-body text-foreground/70">
                      {entries.length} <span className="text-muted/40">/ 1,000 claimed</span>
                    </span>
                    {solPrice !== null && (
                      <span className="text-xs text-muted/30 font-body">
                        SOL ${solPrice.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <div className="h-1 w-48 sm:w-64 bg-surface-raised rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold-dim to-gold rounded-full transition-all duration-700"
                      style={{ width: `${Math.max((entries.length / 1000) * 100, 0.5)}%` }}
                    />
                  </div>
                </div>
              )}
              {loading && (
                <p className="text-muted/40 text-sm mt-1 font-body">Loading...</p>
              )}
            </div>
          </div>
        </div>

        {/* Withdraw banner */}
        {!loading && <WithdrawBanner />}

        {/* Stats */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-5 text-center">
              <p className="text-muted/50 text-[10px] sm:text-xs font-body uppercase tracking-wider mb-1">
                Floor Conviction
              </p>
              <p className="text-lg sm:text-2xl font-display font-bold text-foreground">
                {stats.floor != null ? (
                  <>
                    <span className="text-gold">&#9678;</span> {stats.floor.toFixed(1)}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-5 text-center">
              <p className="text-muted/50 text-[10px] sm:text-xs font-body uppercase tracking-wider mb-1">
                Total Conviction Locked
              </p>
              <p className="text-lg sm:text-2xl font-display font-bold text-foreground">
                {stats.total > 0 ? (
                  <>
                    <span className="text-gold">&#9678;</span>{" "}
                    {stats.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="bg-surface-raised/50 border border-gold-dim/20 p-3 sm:p-5 text-center">
              <p className="text-muted/50 text-[10px] sm:text-xs font-body uppercase tracking-wider mb-1">
                Slots Available
              </p>
              <p className="text-lg sm:text-2xl font-display font-bold text-foreground">
                {(1000 - entries.length).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Price slider */}
        {!loading && entries.length > 0 && (() => {
          const settled = sliderPrice >= 1000;
          return (
            <div className={`mb-8 border p-4 sm:p-6 transition-all duration-700 ${
              settled
                ? "bg-gold/10 border-gold/40 shadow-[0_0_30px_rgba(201,168,76,0.15)]"
                : "bg-surface-raised/50 border-gold-dim/20"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mb-3">
                <p className={`text-xs font-body uppercase tracking-wider transition-colors duration-500 ${
                  settled ? "text-gold" : "text-muted/50"
                }`}>
                  {settled ? "Settlement reached" : "What if SOL hits..."}
                </p>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`text-lg sm:text-xl font-display font-bold transition-colors duration-500 ${
                    settled ? "text-gold animate-shimmer" : "text-foreground"
                  }`}>
                    ${sliderPrice.toFixed(0)}
                  </span>
                  <span className={`text-xs sm:text-sm font-display transition-colors duration-500 ${
                    settled ? "text-gold-bright" : "text-gold"
                  }`}>
                    {settled ? "Settled" : STAGE_NAMES[currentStage]}
                  </span>
                  {solPrice !== null && Math.abs(sliderPrice - solPrice) > 5 && (
                    <button
                      onClick={() => setSliderPrice(solPrice)}
                      className="text-[10px] text-muted/40 font-body border border-gold-dim/20 px-2 py-0.5 hover:text-gold hover:border-gold/50 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Slider track with $1k marker */}
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={1200}
                  step={1}
                  value={sliderPrice}
                  onChange={(e) => setSliderPrice(Number(e.target.value))}
                  className={`w-full h-1.5 appearance-none cursor-pointer outline-none transition-all duration-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer ${
                    settled
                      ? "bg-gold/30 [&::-webkit-slider-thumb]:bg-gold-bright [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(226,201,126,0.6)] [&::-moz-range-thumb]:bg-gold-bright"
                      : "bg-gold-dim/30 [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(201,168,76,0.4)] [&::-moz-range-thumb]:bg-gold"
                  }`}
                />
                {/* $1,000 milestone marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${(1000 / 1200) * 100}%` }}
                >
                  <div className={`w-px h-4 transition-colors duration-500 ${
                    settled ? "bg-gold" : "bg-gold-dim/50"
                  }`} />
                </div>
              </div>

              {/* Scale labels */}
              <div className="relative mt-1.5 h-4">
                {[
                  { price: 0, label: "$0" },
                  { price: 200, label: "$200" },
                  { price: 400, label: "$400" },
                  { price: 600, label: "$600" },
                  { price: 800, label: "$800" },
                  { price: 1000, label: "$1k" },
                  { price: 1200, label: "$1.2k" },
                ].map(({ price, label }, i, arr) => (
                  <span
                    key={price}
                    className={`absolute font-body transition-colors duration-500 ${
                      price === 1000
                        ? `text-[11px] font-medium ${settled ? "text-gold" : "text-gold-dim"}`
                        : "text-[10px] text-muted/40"
                    }`}
                    style={{
                      left: `${(price / 1200) * 100}%`,
                      transform:
                        i === 0
                          ? "none"
                          : i === arr.length - 1
                            ? "translateX(-100%)"
                            : "translateX(-50%)",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Settlement banner */}
              {settled && (
                <div className="mt-4 pt-4 border-t border-gold/30 animate-fade-in">
                  <p className="text-base sm:text-lg font-display font-bold text-gold leading-snug">
                    Settlement reached &mdash; you made it.
                  </p>
                  <p className="text-sm text-foreground/60 font-body mt-1.5 leading-relaxed">
                    SOL crossed the $1,000 threshold. All locked SOL is now
                    available for withdrawal. Your portraits remain permanently
                    in the collection at their final stage. Conviction rewarded.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Sort controls */}
        {!loading && entries.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-xs text-muted/30 font-body mr-1">Sort</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`text-xs font-body px-3 py-1.5 border transition-colors cursor-pointer min-h-[36px] ${
                  sort === opt.key
                    ? "border-gold text-gold bg-gold/10"
                    : "border-gold-dim/20 text-muted/60 hover:text-gold hover:border-gold/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-20 sm:py-28 max-w-md mx-auto">
            <p className="text-xl sm:text-2xl font-display font-bold text-foreground/80 mb-3">
              1,000 empty frames.
            </p>
            <p className="text-muted/50 text-sm font-body leading-relaxed mb-6">
              The gallery is waiting. Every slot that gets claimed is one fewer
              slot that&rsquo;s available. No one has moved yet &mdash; which
              means every position is open.
            </p>
            <Link
              href="/"
              className="btn-gold font-display tracking-wide"
            >
              Claim your slot &rarr;
            </Link>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center py-24 font-body">{error}</p>
        )}

        {/* Grid */}
        {sorted.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {sorted.map((entry, idx) => {
              const coverUrl = entry.portraits[currentStage - 1] ?? entry.portraits[0];
              const legendaryCount = entry.traits
                ? entry.traits.reduce(
                    (sum, t) =>
                      sum +
                      Object.values(t.rolls).filter(
                        (r: GalleryTraitRoll) => r.rarity === "Legendary" && !r.isNothing,
                      ).length,
                    0,
                  )
                : 0;

              return (
                <div
                  key={entry.id}
                  ref={entry.id === newId ? highlightedRef : undefined}
                  className={`gallery-panel cursor-pointer group ${entry.id === newId ? "ring-1 ring-gold/50 ring-offset-2 ring-offset-black" : ""}`}
                  style={{ animationDelay: `${idx * 80}ms` }}
                  onClick={() => setSelected(entry)}
                >
                  <div className="relative transition-transform duration-300 group-hover:scale-[1.02]">
                    <BaroqueFrame>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt={`Slot #${entry.slot}`}
                        className="w-full aspect-square object-cover"
                      />
                    </BaroqueFrame>
                    <span className="absolute top-3 left-3 bg-black/70 text-foreground/80 text-[10px] font-display font-semibold px-2 py-0.5 backdrop-blur-sm">
                      #{entry.slot}
                    </span>
                  </div>
                  <div className="mt-2 px-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted/40 font-body">
                        {timeAgo(entry.publishedAt)}
                      </span>
                      {entry.conviction != null && entry.conviction > 0 ? (
                        <span className="text-[11px] text-gold font-body">
                          &#9678; {entry.conviction.toFixed(1)}
                        </span>
                      ) : legendaryCount > 0 ? (
                        <span className="text-[11px] text-gold/60 font-body">
                          {legendaryCount} legendary
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <CollectionLightbox
          entry={selected}
          onClose={() => setSelected(null)}
          currentStage={currentStage}
          onChallenge={handleChallenge}
        />
      )}

      {/* Displacement Modal */}
      {showDisplace && (
        <DisplacementModal
          onClose={() => setShowDisplace(false)}
          onSuccess={() => {
            setShowDisplace(false);
            fetchCollections();
          }}
        />
      )}
    </main>
  );
}

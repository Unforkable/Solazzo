"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { STAGE_NAMES, STAGE_PRICES, type StageNumber } from "@/lib/prompt";
import type { TraitManifest, TraitRoll } from "@/lib/traits/types";
import { savePortraits, loadPortraits, clearPortraits, saveClaimMeta, loadClaimMeta, type ClaimMeta } from "@/lib/storage";
import {
  isSlotOccupied,
  hasClaimableBalance,
  buildClaimInstructions,
  fetchClaimableBalance,
  buildClaimWithdrawIx,
  fetchSlotBook,
} from "@/lib/onchain/client";
import { MIN_LOCK_SOL, MAX_SLOT_ID, SOL_DECIMALS } from "@/lib/onchain/constants";

type AppStage = "intro" | "capture" | "preview" | "gallery" | "commit" | "locked";
type CaptureMode = "upload" | "camera";
type ClaimStep = "idle" | "preflight" | "signing" | "confirming" | "authorizing" | "publishing";

const LOCK_PRESETS = [1, 2, 5, 10];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALL_STAGES: StageNumber[] = [1, 2, 3, 4, 5];

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

const RARITY_COLORS: Record<string, string> = {
  Common: "#8a7f72",
  Uncommon: "#7ab87a",
  Rare: "#6a9fd8",
  Legendary: "#c9a84c",
};

function TraitSummary({ manifest }: { manifest: TraitManifest }) {
  const visible = Object.values(manifest.rolls).filter(
    (r: TraitRoll) => !r.isNothing,
  );
  if (visible.length === 0) return null;
  return (
    <div className="mt-1 space-y-px">
      {visible.map((r: TraitRoll) => (
        <p key={r.category} className="text-[10px] leading-tight text-muted/60">
          <span style={{ color: RARITY_COLORS[r.rarity] ?? "#8a7f72" }}>
            {r.itemName}
          </span>
        </p>
      ))}
    </div>
  );
}

function PromptModal({
  manifest,
  initialPrompt,
  onClose,
  onSaveAndRegenerate,
}: {
  manifest: TraitManifest;
  initialPrompt: string;
  onClose: () => void;
  onSaveAndRegenerate: (editedPrompt: string) => void;
}) {
  const [text, setText] = useState(initialPrompt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] bg-surface-raised border border-gold-dim/30 flex flex-col rounded-t-2xl sm:rounded-none animate-slide-up sm:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted/30" />
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <p className="text-xs text-muted/60 mb-3 font-body">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] font-semibold mr-2">
              {manifest.stage}
            </span>
            {STAGE_NAMES[manifest.stage]}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-64 bg-black/30 border border-muted/20 text-xs text-foreground/80 font-mono leading-relaxed p-3 resize-y focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
          />
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="btn-ghost text-xs min-h-[44px] px-4"
          >
            Close
          </button>
          <button
            onClick={() => onSaveAndRegenerate(text)}
            className="btn-gold text-xs min-h-[44px] px-4"
          >
            Save &amp; Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

function compressImage(file: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1024;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/png",
        0.9,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function compressForStorage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      // Preserve aspect ratio: center-crop to square before downscaling.
      const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = Math.floor((img.naturalWidth - srcSize) / 2);
      const sy = Math.floor((img.naturalHeight - srcSize) / 2);
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, 512, 512);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Failed to compress"));
    img.src = dataUrl;
  });
}

/* Paintbrush SVG for loading state */
function PaintbrushIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gold/60"
    >
      <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
      <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
      <path d="M14.5 17.5 4.5 15" />
    </svg>
  );
}

function ShareButton({
  portrait,
  stage,
  manifest,
}: {
  portrait: string;
  stage: StageNumber;
  manifest: TraitManifest | null;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const buildShareText = () => {
    let text = `My Solazzo portrait — Stage ${stage}: ${STAGE_NAMES[stage]}`;
    if (manifest) {
      const legendaries = Object.values(manifest.rolls)
        .filter((r: TraitRoll) => r.rarity === "Legendary" && !r.isNothing);
      if (legendaries.length > 0) {
        text += ` — ${legendaries.map((r: TraitRoll) => r.itemName).join(", ")}`;
      }
    }
    text += "\n#Solazzo";
    return text;
  };

  const toFile = async (): Promise<File> => {
    const res = await fetch(portrait);
    const blob = await res.blob();
    return new File([blob], `solazzo-stage-${stage}.jpg`, { type: "image/jpeg" });
  };

  const handleShare = async () => {
    try {
      const file = await toFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Solazzo", text: buildShareText() });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    setShowMenu(true);
  };

  const shareToX = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank", "noopener");
    setShowMenu(false);
  };

  const copyImage = async () => {
    try {
      const img = new Image();
      img.src = portrait;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject()), "image/png"),
      );
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const a = document.createElement("a");
      a.href = portrait;
      a.download = `solazzo-stage-${stage}.jpg`;
      a.click();
    }
    setShowMenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleShare}
        className="text-xs text-muted/50 hover:text-gold transition-colors cursor-pointer min-h-[44px] font-body"
      >
        {copied ? "Copied!" : "Share"}
      </button>
      {showMenu && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1a1408] border border-gold-dim/30 py-1 min-w-[160px] z-50 animate-fade-in shadow-lg">
          <button
            onClick={shareToX}
            className="w-full px-4 py-3 text-left text-xs text-foreground/80 hover:bg-gold/10 hover:text-gold transition-colors font-body flex items-center gap-2 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share to X
          </button>
          <button
            onClick={copyImage}
            className="w-full px-4 py-3 text-left text-xs text-foreground/80 hover:bg-gold/10 hover:text-gold transition-colors font-body flex items-center gap-2 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy image
          </button>
        </div>
      )}
    </div>
  );
}

function WebcamCapture({ onCapture, onBack }: { onCapture: (blob: Blob) => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1024 }, height: { ideal: 1024 } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setReady(true);
      })
      .catch(() => setCamError("Could not access camera. Please allow camera permissions or use file upload."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(1024, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 1024, 1024);

    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/png",
    );
  }, [onCapture]);

  if (camError) {
    return (
      <div className="space-y-4">
        <p className="text-red-400 text-sm font-body">{camError}</p>
        <button onClick={onBack} className="text-sm text-muted hover:text-gold transition-colors cursor-pointer min-h-[44px] font-body">
          &larr; Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-muted hover:text-gold transition-colors cursor-pointer min-h-[44px] font-body">
        &larr; Back
      </button>
      <div className="aspect-square w-full max-w-[400px] mx-auto overflow-hidden bg-black/50 relative border border-gold-dim/20">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted text-sm font-body">Starting camera…</p>
          </div>
        )}
      </div>
      {ready && (
        <div className="flex justify-center">
          <button
            onClick={capture}
            className="btn-gold"
          >
            Take Photo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Slot Browser ─────────────────────────────────────────────────────

const SLOTS_TOTAL = 1000;
const PAGE_SIZE = 100;

function SlotBrowser({
  selectedSlot,
  onSelect,
  connection,
}: {
  selectedSlot: number | null;
  onSelect: (slotId: number) => void;
  connection: import("@solana/web3.js").Connection;
}) {
  const [occupied, setOccupied] = useState<boolean[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(SLOTS_TOTAL / PAGE_SIZE);

  const loadOccupancy = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const slotBook = await fetchSlotBook(connection);
      setOccupied(slotBook.occupied);
    } catch {
      setFetchError("Failed to load slot availability.");
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    loadOccupancy();
  }, [loadOccupancy]);

  // Jump to the page containing the selected slot
  useEffect(() => {
    if (selectedSlot !== null) {
      const targetPage = Math.floor(selectedSlot / PAGE_SIZE);
      setPage(targetPage);
    }
  }, [selectedSlot]);

  const pageStart = page * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, SLOTS_TOTAL);

  const stats = useMemo(() => {
    if (!occupied) return { available: 0, filled: 0 };
    const filled = occupied.filter(Boolean).length;
    return { available: SLOTS_TOTAL - filled, filled };
  }, [occupied]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground/40 font-body">
            {occupied ? `${stats.available} available` : "Loading..."}
          </span>
          {/* Legend */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-foreground/30 font-body">
              <span className="w-2 h-2 bg-gold/20 border border-gold-dim/30 inline-block" />
              open
            </span>
            <span className="flex items-center gap-1 text-[10px] text-foreground/30 font-body">
              <span className="w-2 h-2 bg-foreground/5 border border-foreground/10 inline-block" />
              taken
            </span>
            <span className="flex items-center gap-1 text-[10px] text-foreground/30 font-body">
              <span className="w-2 h-2 bg-gold border border-gold inline-block" />
              selected
            </span>
          </div>
        </div>
        <button
          onClick={loadOccupancy}
          disabled={loading}
          className="text-[10px] text-muted/40 font-body border border-gold-dim/20 px-2 py-0.5 hover:text-gold hover:border-gold/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {fetchError && (
        <p className="text-xs text-red-400 font-body">{fetchError}</p>
      )}

      {/* Grid */}
      {occupied && (
        <>
          <div className="grid grid-cols-10 gap-[3px]">
            {Array.from({ length: pageEnd - pageStart }, (_, i) => {
              const slotId = pageStart + i;
              const isOccupied = occupied[slotId] ?? false;
              const isSelected = selectedSlot === slotId;

              return (
                <button
                  key={slotId}
                  onClick={() => {
                    if (!isOccupied) onSelect(slotId);
                  }}
                  disabled={isOccupied}
                  title={isOccupied ? `Slot #${slotId} (occupied)` : `Slot #${slotId}`}
                  className={`aspect-square flex items-center justify-center text-[9px] sm:text-[10px] font-display transition-all ${
                    isSelected
                      ? "bg-gold text-background border border-gold font-bold"
                      : isOccupied
                        ? "bg-foreground/5 border border-foreground/10 text-foreground/15 cursor-not-allowed"
                        : "bg-gold/10 border border-gold-dim/30 text-foreground/50 hover:border-gold/60 hover:bg-gold/20 hover:text-foreground cursor-pointer"
                  }`}
                >
                  {slotId}
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`min-w-[36px] min-h-[32px] px-2 py-1 text-[10px] font-body border transition-colors cursor-pointer ${
                  page === i
                    ? "border-gold text-gold bg-gold/10"
                    : "border-gold-dim/20 text-muted/40 hover:text-gold hover:border-gold/50"
                }`}
              >
                {i * PAGE_SIZE}&ndash;{Math.min((i + 1) * PAGE_SIZE - 1, SLOTS_TOTAL - 1)}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Loading skeleton */}
      {loading && !occupied && (
        <div className="grid grid-cols-10 gap-[3px]">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <div key={i} className="aspect-square bg-foreground/5 border border-foreground/10 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}

function WithdrawBanner() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [claimableLamports, setClaimableLamports] = useState<bigint | null>(null);
  const [withdrawStep, setWithdrawStep] = useState<"idle" | "signing" | "confirming" | "done">("idle");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawTxSig, setWithdrawTxSig] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey || !connected) {
      setClaimableLamports(null);
      return;
    }
    fetchClaimableBalance(connection, publicKey)
      .then((cb) => {
        setClaimableLamports(cb && cb.claimableLamports > BigInt(0) ? cb.claimableLamports : null);
      })
      .catch(() => setClaimableLamports(null));
  }, [connection, publicKey, connected]);

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
      if (result.value.err) throw new Error("Withdraw transaction failed on-chain.");

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
    if (withdrawTxSig && withdrawStep === "done") {
      return (
        <div className="bg-green-900/30 border border-green-500/30 p-4 mb-6 animate-fade-in max-w-md mx-auto">
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

  const solAmount = Number(claimableLamports) / SOL_DECIMALS;

  return (
    <div className="bg-gold/10 border border-gold/30 p-4 mb-6 animate-fade-in max-w-md mx-auto">
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gold/70 font-body uppercase tracking-wider mb-1">
            Claimable Balance
          </p>
          <p className="text-base font-display font-bold text-gold">
            &#9678; {solAmount} SOL available to withdraw
          </p>
          <p className="text-xs text-foreground/40 font-body mt-1">
            You were displaced. Your full principal is ready for withdrawal.
          </p>
        </div>
        <button
          onClick={handleWithdraw}
          disabled={withdrawStep !== "idle"}
          className="w-full btn-gold font-display tracking-wide py-3 disabled:opacity-50 cursor-pointer"
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

export default function PortraitStudio() {
  const [appStage, setAppStage] = useState<AppStage>("intro");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [portraits, setPortraits] = useState<(string | null)[]>([null, null, null, null, null]);
  const [traitManifests, setTraitManifests] = useState<(TraitManifest | null)[]>([null, null, null, null, null]);
  const [generatingStages, setGeneratingStages] = useState<Set<number>>(new Set());
  const [stageErrors, setStageErrors] = useState<(string | null)[]>([null, null, null, null, null]);
  const [error, setError] = useState<string | null>(null);
  const [promptViewStage, setPromptViewStage] = useState<number | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<number, string>>({});
  const [lightboxStage, setLightboxStage] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lockAmount, setLockAmount] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [focusedStage, setFocusedStage] = useState<StageNumber>(1);
  const [slotIdInput, setSlotIdInput] = useState<string>("");
  const [claimStep, setClaimStep] = useState<ClaimStep>("idle");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimTxSig, setClaimTxSig] = useState<string | null>(null);
  const [claimMeta, setClaimMeta] = useState<ClaimMeta | null>(null);

  const compressedRef = useRef<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const swipeTouchStart = useRef<number>(0);
  const swipeTouchEnd = useRef<number>(0);
  const router = useRouter();
  const { publicKey, connected, sendTransaction, signMessage } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const { connection } = useConnection();

  // Auto-advance focused stage to whichever is currently generating
  useEffect(() => {
    if (generatingStages.size > 0) {
      const current = ALL_STAGES.find((s) => generatingStages.has(s));
      if (current) setFocusedStage(current);
    }
  }, [generatingStages]);

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    swipeTouchStart.current = e.targetTouches[0].clientX;
    swipeTouchEnd.current = e.targetTouches[0].clientX;
  }, []);

  const handleSwipeMove = useCallback((e: React.TouchEvent) => {
    swipeTouchEnd.current = e.targetTouches[0].clientX;
  }, []);

  const handleSwipeEnd = useCallback(() => {
    const diff = swipeTouchStart.current - swipeTouchEnd.current;
    if (Math.abs(diff) > 50) {
      setFocusedStage((prev) => {
        if (diff > 0 && prev < 5) return (prev + 1) as StageNumber;
        if (diff < 0 && prev > 1) return (prev - 1) as StageNumber;
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    const saved = loadPortraits();
    if (saved) {
      setPortraits(saved.portraits);
      if (saved.traits) setTraitManifests(saved.traits);
      setAppStage("locked");
      const meta = loadClaimMeta();
      if (meta) setClaimMeta(meta);
    }
  }, []);

  const handleFile = useCallback((file: Blob) => {
    setError(null);
    if (file instanceof File) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please upload a JPEG, PNG, or WebP image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("Image must be under 10 MB.");
        return;
      }
    }
    setPreviewUrl(URL.createObjectURL(file));
    compressedRef.current = file;
    setAppStage("preview");
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const generateStage = useCallback(async (stage: StageNumber, customPrompt?: string) => {
    const raw = compressedRef.current;
    if (!raw) return;

    setGeneratingStages((prev) => new Set(prev).add(stage));
    setPortraits((prev) => {
      const next = [...prev];
      next[stage - 1] = null;
      return next;
    });
    setStageErrors((prev) => {
      const next = [...prev];
      next[stage - 1] = null;
      return next;
    });

    try {
      const compressed = await compressImage(raw);
      const formData = new FormData();
      formData.append("image", compressed, "selfie.png");
      formData.append("stage", String(stage));
      if (customPrompt) {
        formData.append("customPrompt", customPrompt);
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
        headers: process.env.NEXT_PUBLIC_INTERNAL_TEST_KEY
          ? { "x-internal-test-key": process.env.NEXT_PUBLIC_INTERNAL_TEST_KEY }
          : undefined,
      });
      const data = await res.json();

      if (!res.ok) {
        setStageErrors((prev) => {
          const next = [...prev];
          next[stage - 1] = data.error ?? "Failed";
          return next;
        });
        return;
      }

      setPortraits((prev) => {
        const next = [...prev];
        next[stage - 1] = `data:image/png;base64,${data.image}`;
        return next;
      });
      if (data.traits) {
        setTraitManifests((prev) => {
          const next = [...prev];
          next[stage - 1] = { ...data.traits, stage, prompt: data.prompt };
          return next;
        });
      } else if (customPrompt) {
        setTraitManifests((prev) => {
          const next = [...prev];
          const existing = next[stage - 1];
          if (existing) {
            next[stage - 1] = { ...existing, prompt: customPrompt };
          }
          return next;
        });
      }
    } catch {
      setStageErrors((prev) => {
        const next = [...prev];
        next[stage - 1] = "Network error";
        return next;
      });
    } finally {
      setGeneratingStages((prev) => {
        const next = new Set(prev);
        next.delete(stage);
        return next;
      });
    }
  }, []);

  const generateAll = useCallback(async () => {
    setPortraits([null, null, null, null, null]);
    setStageErrors([null, null, null, null, null]);
    setAppStage("gallery");

    for (const stage of ALL_STAGES) {
      await generateStage(stage);
    }
  }, [generateStage]);

  const claimAndPublish = useCallback(async () => {
    if (!publicKey || !sendTransaction || !connection) return;

    const allDone = portraits.every((p) => p !== null);
    if (!allDone || claimStep !== "idle") return;

    const parsedSlotId = parseInt(slotIdInput, 10);
    if (isNaN(parsedSlotId) || parsedSlotId < 0 || parsedSlotId > MAX_SLOT_ID) {
      setClaimError("Slot ID must be 0\u2013999.");
      return;
    }

    if (lockAmount < MIN_LOCK_SOL) {
      setClaimError(`Minimum lock is ${MIN_LOCK_SOL} SOL.`);
      return;
    }

    if (!signMessage) {
      setClaimError("Your wallet does not support message signing. Please use a wallet like Phantom or Solflare.");
      return;
    }

    setClaimStep("preflight");
    setClaimError(null);
    setError(null);

    try {
      // 1. Pre-flight: check if slot is available
      const occupied = await isSlotOccupied(connection, parsedSlotId);
      if (occupied) {
        setClaimError(`Slot #${parsedSlotId} is already claimed. Try a different slot.`);
        setClaimStep("idle");
        return;
      }

      // 2. Check if ClaimableBalance PDA exists
      const hasCB = await hasClaimableBalance(connection, publicKey);

      // 3. Cache a local recovery draft before any wallet/on-chain interaction.
      // This prevents users from losing portraits if tx/publish fails mid-flow.
      const compressed: string[] = [];
      for (const p of portraits) {
        compressed.push(await compressForStorage(p!));
      }
      const validTraits = traitManifests.filter((t): t is TraitManifest => t !== null);
      savePortraits(compressed, validTraits.length === 5 ? validTraits : undefined);

      // 4. Build transaction
      setClaimStep("signing");
      const lockLamports = BigInt(Math.round(lockAmount * SOL_DECIMALS));
      const instructions = buildClaimInstructions(
        publicKey,
        parsedSlotId,
        lockLamports,
        !hasCB,
      );
      const tx = new Transaction().add(...instructions);

      // 5. Send via wallet
      const sig = await sendTransaction(tx, connection);

      // 6. Confirm
      setClaimStep("confirming");
      const result = await connection.confirmTransaction(sig, "confirmed");
      if (result.value.err) {
        throw new Error("Transaction failed on-chain.");
      }

      setClaimTxSig(sig);

      // 7. Request publish challenge and sign it
      setClaimStep("authorizing");

      const walletAddr = publicKey.toBase58();
      const challengeRes = await fetch("/api/gallery/publish/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.NEXT_PUBLIC_INTERNAL_TEST_KEY && {
            "x-internal-test-key": process.env.NEXT_PUBLIC_INTERNAL_TEST_KEY,
          }),
        },
        body: JSON.stringify({
          wallet: walletAddr,
          slotId: parsedSlotId,
          claimTxSig: sig,
        }),
      });

      if (!challengeRes.ok) {
        const errData = await challengeRes.json().catch(() => ({ error: "Failed to get publish authorization." }));
        throw new Error(errData.error || "Failed to get publish authorization.");
      }

      const { challengeMessage, challengeToken } = await challengeRes.json();

      // Sign the challenge message with wallet
      const messageBytes = new TextEncoder().encode(challengeMessage);
      const sigBytes = await signMessage(messageBytes);
      const walletSignature = bs58.encode(sigBytes);

      // 8. Publish with auth proof
      setClaimStep("publishing");
      savePortraits(compressed, validTraits.length === 5 ? validTraits : undefined);

      let galleryId: string | null = null;
      try {
        const res = await fetch("/api/gallery/publish", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.NEXT_PUBLIC_INTERNAL_TEST_KEY && {
              "x-internal-test-key": process.env.NEXT_PUBLIC_INTERNAL_TEST_KEY,
            }),
          },
          body: JSON.stringify({
            portraits: compressed,
            traits: validTraits.length === 5 ? validTraits : undefined,
            conviction: lockAmount,
            wallet: walletAddr,
            slotId: parsedSlotId,
            claimTxSig: sig,
            challengeToken,
            walletSignature,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          galleryId = data.id;
        } else {
          const errData = await res.json().catch(() => ({ error: "Gallery publish failed." }));
          const meta: ClaimMeta = { wallet: walletAddr, slotId: parsedSlotId, lockSol: lockAmount, claimTxSig: sig, publishStatus: "local-only" };
          saveClaimMeta(meta);
          setClaimMeta(meta);
          setPortraits(compressed);
          setClaimError(`Slot claimed on-chain but gallery publish failed: ${errData.error}`);
          setAppStage("locked");
          setClaimStep("idle");
          return;
        }
      } catch (pubErr) {
        console.warn("Publish failed:", pubErr);
        const meta: ClaimMeta = { wallet: walletAddr, slotId: parsedSlotId, lockSol: lockAmount, claimTxSig: sig, publishStatus: "local-only" };
        saveClaimMeta(meta);
        setClaimMeta(meta);
        setPortraits(compressed);
        setClaimError("Slot claimed on-chain but gallery publish failed. Your collection is saved locally.");
        setAppStage("locked");
        setClaimStep("idle");
        return;
      }

      // 9. Download zip (optional)
      try {
        const { default: JSZipLib } = await import("jszip");
        const zip = new JSZipLib();
        for (let i = 0; i < compressed.length; i++) {
          const base64 = compressed[i].split(",")[1];
          if (base64) {
            zip.file(`solazzo-stage-${i + 1}.jpg`, base64, { base64: true });
          }
        }
        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "solazzo-collection.zip";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } catch {
        // Non-blocking
      }

      // 10. Persist claim metadata & redirect
      const publishStatus = galleryId ? "published" : "local-only";
      const meta: ClaimMeta = { wallet: walletAddr, slotId: parsedSlotId, lockSol: lockAmount, claimTxSig: sig, publishStatus };
      saveClaimMeta(meta);
      setClaimMeta(meta);

      setClaimStep("idle");
      if (galleryId) {
        router.push(`/gallery?new=${galleryId}`);
      } else {
        setPortraits(compressed);
        setAppStage("locked");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed.";
      // User rejected wallet prompt
      if (msg.includes("User rejected") || msg.includes("rejected")) {
        setClaimError("Transaction cancelled.");
      } else {
        setClaimError(msg);
      }
      setClaimStep("idle");
    }
  }, [publicKey, sendTransaction, signMessage, connection, portraits, traitManifests, slotIdInput, lockAmount, claimStep, router]);

  const reset = useCallback(() => {
    clearPortraits();
    setPortraits([null, null, null, null, null]);
    setTraitManifests([null, null, null, null, null]);
    setStageErrors([null, null, null, null, null]);
    setGeneratingStages(new Set());
    setPreviewUrl(null);
    setError(null);
    setClaimMeta(null);
    compressedRef.current = null;
    setAppStage("intro");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const repick = useCallback(() => {
    setPreviewUrl(null);
    setError(null);
    compressedRef.current = null;
    setAppStage("capture");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const completedCount = portraits.filter((p) => p !== null).length;
  const allComplete = completedCount === 5;
  const isGenerating = generatingStages.size > 0;

  return (
    <main className={`min-h-screen flex justify-center px-4 py-10 sm:px-6 sm:py-16 ${appStage === "intro" || appStage === "commit" ? "items-start" : "items-center"}`}>
      <div className={`w-full ${appStage === "gallery" || appStage === "locked" ? "max-w-[1200px]" : appStage === "commit" ? "max-w-[720px]" : "max-w-[640px]"}`}>
        {/* ── Intro / Onboarding ── */}
        {appStage === "intro" && (
          <div className="animate-fade-in">
            {/* Hero */}
            <div className="text-center pt-8 sm:pt-16 pb-14 sm:pb-20">
              <h1 className="text-5xl sm:text-6xl font-display font-bold tracking-wide text-foreground hover:animate-shimmer transition-all duration-500 cursor-default">
                SOLAZZO
              </h1>
              <div className="w-24 h-px mx-auto mt-5 bg-gradient-to-r from-transparent via-gold to-transparent" />
              <p className="text-lg sm:text-xl text-foreground font-display mt-6 max-w-lg mx-auto leading-snug">
                The bet is simple. SOL hits $1,000 or the clock runs out &mdash; you get every coin back.
              </p>
              <p className="text-foreground/60 text-base font-body mt-4 max-w-md mx-auto leading-relaxed">
                While you wait, your face gets painted into five Baroque oil
                portraits that evolve as the price climbs. One for each stage of
                the ride.
              </p>
              <button
                onClick={() => setAppStage("capture")}
                className="btn-gold font-display tracking-wide mt-8"
              >
                Create Your Portraits
              </button>
            </div>

            {/* How it works */}
            <div className="border-t border-gold-dim/30 pt-10 pb-12 sm:pb-16">
              <p className="text-xs uppercase tracking-[0.2em] text-gold font-body text-center mb-4">
                Here&rsquo;s how it works
              </p>
              <p className="text-foreground/50 text-base font-body text-center max-w-md mx-auto leading-relaxed mb-8">
                You lock SOL. Not spend it &mdash; lock it. The contract holds
                your coins and paints you into the collection. As SOL moves, your
                portrait transforms. When SOL crosses $1,000 &mdash; or at
                protocol end date (Mar 16, 2030 UTC) &mdash; every single SOL
                goes back to its owner. No fees. No catch. Just conviction with
                a receipt.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto text-center">
                <div className="py-3 sm:py-4">
                  <p className="text-xl sm:text-2xl font-display font-bold text-foreground">Lock</p>
                  <p className="text-xs text-foreground/40 font-body mt-1">
                    Commit SOL to a slot
                  </p>
                </div>
                <div className="py-3 sm:py-4 border-x border-gold-dim/20">
                  <p className="text-xl sm:text-2xl font-display font-bold text-foreground">Hold</p>
                  <p className="text-xs text-foreground/40 font-body mt-1">
                    Watch it evolve
                  </p>
                </div>
                <div className="py-3 sm:py-4">
                  <p className="text-xl sm:text-2xl font-display font-bold text-gold">Settle</p>
                  <p className="text-xs text-foreground/40 font-body mt-1">
                    Get every SOL back
                  </p>
                </div>
              </div>
            </div>

            {/* The Five Stages */}
            <div className="border-t border-gold-dim/30 pt-10 pb-12 sm:pb-16">
              <p className="text-xs uppercase tracking-[0.2em] text-gold font-body text-center mb-4">
                Five stages &mdash; One journey
              </p>
              <p className="text-foreground/50 text-base font-body text-center max-w-md mx-auto leading-relaxed mb-8">
                Every $200 move in SOL advances the entire collection. Your
                portrait starts humble and ends wise. The five stages mirror what
                every believer actually goes through.
              </p>
              <div className="space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-5 sm:gap-3 max-w-2xl mx-auto">
                {ALL_STAGES.map((stage) => (
                  <div
                    key={stage}
                    className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-1.5 sm:text-center px-4 py-3 sm:py-4 sm:px-2 bg-surface-raised/50 border border-gold-dim/15"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center text-gold text-sm font-display font-bold">
                      {stage}
                    </span>
                    <div className="sm:mt-1">
                      <p className="text-sm sm:text-xs font-display font-semibold text-foreground leading-tight">
                        {STAGE_NAMES[stage]}
                      </p>
                      <p className="text-xs sm:text-[11px] text-foreground/40 font-body mt-0.5">
                        {STAGE_PRICES[stage]} SOL
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scarcity */}
            <div className="border-t border-gold-dim/30 pt-10 pb-12 sm:pb-16">
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 max-w-lg mx-auto">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-3xl sm:text-4xl font-display font-bold text-foreground">
                    1,000
                  </p>
                  <p className="text-sm text-foreground/50 font-body mt-1">
                    slots total. That&rsquo;s it. There will never be 1,001.
                  </p>
                </div>
                <div className="hidden sm:block w-px bg-gold-dim/30" />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-3xl sm:text-4xl font-display font-bold text-gold">
                    $1,000
                  </p>
                  <p className="text-sm text-foreground/50 font-body mt-1">
                    SOL target &mdash; or Mar 16, 2030. Hit either and every locker gets made whole.
                  </p>
                </div>
              </div>
              <p className="text-foreground/40 text-sm font-body text-center mt-8 max-w-md mx-auto leading-relaxed">
                Someone can always outbid you for your slot &mdash; but even then, you
                get your full SOL back instantly. You don&rsquo;t lose money here.
                You lose position.
              </p>
            </div>

            {/* CTA */}
            <div className="border-t border-gold-dim/30 pt-10 pb-4 flex flex-col items-center gap-5">
              <p className="text-foreground/60 text-base font-body text-center max-w-xs leading-relaxed">
                Preview your five portraits for free. No wallet needed &mdash; just a selfie.
              </p>
              <button
                onClick={() => setAppStage("capture")}
                className="btn-gold font-display tracking-wide text-base px-8 py-3"
              >
                Create Your Portraits
              </button>
              <Link
                href="/gallery"
                className="text-sm text-foreground/40 hover:text-gold transition-colors font-body"
              >
                Browse the Gallery
              </Link>
            </div>
          </div>
        )}

        {/* ── Capture ── */}
        {appStage === "capture" && (
          <div className="space-y-6 animate-stage-enter">
            <button
              onClick={() => setAppStage("intro")}
              className="text-sm text-muted hover:text-gold transition-colors cursor-pointer min-h-[44px] font-body"
            >
              &larr; Back
            </button>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-gold-dim/20 pb-px">
              <button
                onClick={() => setCaptureMode("upload")}
                className={`text-sm pb-2 border-b-2 transition-colors cursor-pointer min-h-[44px] font-body ${
                  captureMode === "upload"
                    ? "border-gold text-gold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Upload photo
              </button>
              <button
                onClick={() => setCaptureMode("camera")}
                className={`text-sm pb-2 border-b-2 transition-colors cursor-pointer min-h-[44px] font-body ${
                  captureMode === "camera"
                    ? "border-gold text-gold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Take photo
              </button>
            </div>

            {captureMode === "upload" ? (
              <div className="space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`drop-zone p-12 text-center ${dragOver ? "drag-over" : ""}`}
                >
                  {/* Upload icon */}
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-4 text-gold/40"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-muted text-sm font-body">
                    <span className="hidden sm:inline">Drag &amp; drop a selfie here, or click to browse</span>
                    <span className="sm:hidden">Tap to choose a photo</span>
                  </p>
                  <p className="text-muted/40 text-xs mt-2 font-body">
                    JPEG, PNG, or WebP — max 10 MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            ) : (
              <WebcamCapture
                onCapture={(blob) => handleFile(blob)}
                onBack={() => setCaptureMode("upload")}
              />
            )}

            {error && <p className="text-red-400 text-sm font-body">{error}</p>}
          </div>
        )}

        {/* ── Preview ── */}
        {appStage === "preview" && previewUrl && (
          <div className="space-y-6 animate-stage-enter">
            <button
              onClick={repick}
              className="text-sm text-muted hover:text-gold transition-colors cursor-pointer min-h-[44px] font-body"
            >
              &larr; Choose different photo
            </button>
            <div className="max-w-[400px] mx-auto">
              <BaroqueFrame>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Your selfie"
                  className="w-full aspect-square object-cover"
                />
              </BaroqueFrame>
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-muted/60 text-xs font-body">
                5 unique Baroque portraits will be generated from this photo
              </p>
              <button
                onClick={generateAll}
                className="btn-gold font-display tracking-wide"
              >
                Generate All 5 Portraits
              </button>
              {error && <p className="text-red-400 text-sm font-body">{error}</p>}
            </div>
          </div>
        )}

        {/* ── Gallery (generating + results) ── */}
        {appStage === "gallery" && (
          <div className={`space-y-8 animate-stage-enter ${allComplete ? "pb-20 sm:pb-0" : ""}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">Your Solazzo Collection</h2>
                <p className="text-muted text-sm mt-1 font-body">
                  {isGenerating
                    ? `${completedCount} of 5 portraits complete…`
                    : allComplete
                      ? "All portraits complete"
                      : `${completedCount} of 5 portraits complete`}
                </p>
              </div>
              {allComplete && (
                <button
                  onClick={() => setAppStage("commit")}
                  className="btn-gold font-display tracking-wide hidden sm:inline-flex"
                >
                  Lock In Collection
                </button>
              )}
            </div>

            {/* Gold progress bar */}
            {isGenerating && (
              <div className="progress-bar">
                <div style={{ width: `${(completedCount / 5) * 100}%` }} />
              </div>
            )}

            {/* ── Mobile: single portrait + thumbnail strip ── */}
            <div className="sm:hidden">
              <div
                onTouchStart={handleSwipeStart}
                onTouchMove={handleSwipeMove}
                onTouchEnd={handleSwipeEnd}
              >
                {(() => {
                  const idx = focusedStage - 1;
                  const portrait = portraits[idx];
                  const stageError = stageErrors[idx];
                  const generating = generatingStages.has(focusedStage);
                  return (
                    <div className="max-w-[360px] mx-auto">
                      <BaroqueFrame>
                        <div className="relative">
                          {portrait ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={portrait}
                                alt={`Stage ${focusedStage}: ${STAGE_NAMES[focusedStage]}`}
                                className="aspect-square w-full object-cover animate-fade-in cursor-pointer"
                                onClick={() => setLightboxStage(focusedStage)}
                              />
                              {traitManifests[idx] && (
                                <button
                                  onClick={() => setPromptViewStage(focusedStage)}
                                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-gold/60 hover:text-gold text-[10px] font-mono px-2 py-1 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                                  title="View prompt"
                                >
                                  {"{…}"}
                                </button>
                              )}
                            </>
                          ) : generating ? (
                            <div className="aspect-square flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                              <div className="animate-brush-stroke absolute inset-0 bg-gradient-to-r from-gold-dim/10 via-gold/5 to-transparent" />
                              <PaintbrushIcon />
                              <p className="text-gold/50 text-xs text-center px-2 font-body">Painting…</p>
                            </div>
                          ) : stageError ? (
                            <div className="aspect-square flex items-center justify-center">
                              <p className="text-red-400 text-xs text-center px-2 font-body">{stageError}</p>
                            </div>
                          ) : (
                            <div className="aspect-square flex items-center justify-center">
                              <p className="text-muted/30 text-xs font-body">Waiting…</p>
                            </div>
                          )}
                        </div>
                      </BaroqueFrame>
                      <div className="mt-3 text-center">
                        <p className="text-sm font-display font-semibold text-foreground/80 leading-tight">
                          {focusedStage}. {STAGE_NAMES[focusedStage]}
                        </p>
                        <p className="text-[11px] text-muted/40 font-body mt-0.5">
                          {STAGE_PRICES[focusedStage]}
                        </p>
                        {traitManifests[idx] && <TraitSummary manifest={traitManifests[idx]} />}
                        {!generating && (portrait || stageError) && (
                          <div className="flex items-center justify-center gap-3 mt-1">
                            <button
                              onClick={() => generateStage(focusedStage)}
                              className="text-xs text-muted/50 hover:text-gold transition-colors cursor-pointer min-h-[44px] font-body"
                            >
                              {stageError ? "Retry" : "Regenerate"}
                            </button>
                            {portrait && (
                              <ShareButton portrait={portrait} stage={focusedStage} manifest={traitManifests[idx]} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-2 mt-5 justify-center">
                {ALL_STAGES.map((stage) => {
                  const idx = stage - 1;
                  const portrait = portraits[idx];
                  const generating = generatingStages.has(stage);
                  const isFocused = stage === focusedStage;
                  return (
                    <button
                      key={stage}
                      onClick={() => setFocusedStage(stage)}
                      className={`w-14 h-14 flex-shrink-0 border-2 transition-all duration-300 overflow-hidden ${
                        isFocused
                          ? "border-gold shadow-[0_0_8px_rgba(201,168,76,0.3)]"
                          : "border-gold-dim/20 opacity-60"
                      }`}
                    >
                      {portrait ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={portrait} alt={`Stage ${stage}`} className="w-full h-full object-cover" />
                      ) : generating ? (
                        <div className="w-full h-full bg-surface-raised flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-gold/40 animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-surface-raised flex items-center justify-center">
                          <span className="text-[10px] text-muted/30 font-display">{stage}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Desktop: grid view ── */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {ALL_STAGES.map((stage) => {
                const idx = stage - 1;
                const portrait = portraits[idx];
                const stageError = stageErrors[idx];
                const generating = generatingStages.has(stage);

                return (
                  <div
                    key={stage}
                    className={`gallery-panel ${stage === 5 ? "sm:col-span-2 lg:col-span-1 max-w-none" : ""}`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <BaroqueFrame>
                      <div className="relative">
                        {portrait ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={portrait}
                              alt={`Stage ${stage}: ${STAGE_NAMES[stage]}`}
                              className="aspect-square w-full object-cover animate-fade-in cursor-pointer"
                              onClick={() => setLightboxStage(stage)}
                            />
                            {traitManifests[idx] && (
                              <button
                                onClick={() => setPromptViewStage(stage)}
                                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-gold/60 hover:text-gold text-[10px] font-mono px-2 py-1 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="View prompt"
                              >
                                {"{…}"}
                              </button>
                            )}
                          </>
                        ) : generating ? (
                          <div className="aspect-square flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                            <div className="animate-brush-stroke absolute inset-0 bg-gradient-to-r from-gold-dim/10 via-gold/5 to-transparent" />
                            <PaintbrushIcon />
                            <p className="text-gold/50 text-xs text-center px-2 font-body">Painting…</p>
                          </div>
                        ) : stageError ? (
                          <div className="aspect-square flex items-center justify-center">
                            <p className="text-red-400 text-xs text-center px-2 font-body">{stageError}</p>
                          </div>
                        ) : (
                          <div className="aspect-square flex items-center justify-center">
                            <p className="text-muted/30 text-xs font-body">Waiting…</p>
                          </div>
                        )}
                      </div>
                    </BaroqueFrame>
                    <div className="mt-3 text-center">
                      <p className="text-sm font-display font-semibold text-foreground/80 leading-tight">
                        {stage}. {STAGE_NAMES[stage]}
                      </p>
                      <p className="text-[11px] text-muted/40 font-body mt-0.5">
                        {STAGE_PRICES[stage]}
                      </p>
                      {traitManifests[idx] && <TraitSummary manifest={traitManifests[idx]} />}
                      {!generating && (portrait || stageError) && (
                        <div className="flex items-center justify-center gap-3 mt-1">
                          <button
                            onClick={() => generateStage(stage)}
                            className="text-xs text-muted/50 hover:text-gold transition-colors cursor-pointer min-h-[44px] font-body"
                          >
                            {stageError ? "Retry" : "Regenerate"}
                          </button>
                          {portrait && (
                            <ShareButton portrait={portrait} stage={stage} manifest={traitManifests[idx]} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!allComplete && !isGenerating && (
              <div className="flex justify-center">
                <button
                  onClick={repick}
                  className="text-sm text-muted hover:text-gold transition-colors cursor-pointer min-h-[44px] font-body"
                >
                  &larr; Try a different photo
                </button>
              </div>
            )}

            {/* Sticky mobile CTA when all portraits are done */}
            {allComplete && (
              <div className="fixed bottom-0 left-0 right-0 sm:hidden z-30 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-5 px-4">
                <button
                  onClick={() => setAppStage("commit")}
                  className="btn-gold font-display tracking-wide w-full"
                >
                  Lock In Collection
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Commit (choose SOL amount + claim on-chain) ── */}
        {appStage === "commit" && (
          <div className="animate-stage-enter space-y-8">
            <button
              onClick={() => setAppStage("gallery")}
              className="text-sm text-muted hover:text-gold transition-colors cursor-pointer min-h-[44px] font-body"
            >
              &larr; Back to portraits
            </button>

            <WithdrawBanner />

            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                Lock your SOL
              </h2>
              <p className="text-base text-foreground/50 font-body mt-3 max-w-md mx-auto leading-relaxed">
                Choose how much SOL to lock with your collection.
                You get every coin back when SOL crosses $1,000 or at protocol end date (Mar 16, 2030 UTC).
              </p>
            </div>

            {/* Portrait preview strip */}
            <div className="flex gap-2 justify-center">
              {ALL_STAGES.map((stage) => {
                const portrait = portraits[stage - 1];
                return (
                  <div key={stage} className="w-14 h-14 sm:w-16 sm:h-16 border border-gold-dim/30 overflow-hidden">
                    {portrait && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={portrait} alt={`Stage ${stage}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Wallet gate */}
            {!connected ? (
              <div className="bg-surface-raised/50 border border-gold-dim/20 p-6 sm:p-8 max-w-md mx-auto text-center space-y-4">
                <p className="text-sm text-foreground/60 font-body leading-relaxed">
                  Connect your Solana wallet to claim a slot on-chain.
                </p>
                <button
                  onClick={() => openWalletModal(true)}
                  className="btn-gold font-display tracking-wide text-base py-3 px-8 cursor-pointer"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Slot browser */}
                <div className="bg-surface-raised/50 border border-gold-dim/20 p-4 sm:p-6 max-w-md mx-auto">
                  <p className="text-xs uppercase tracking-[0.2em] text-gold font-body mb-4 text-center">
                    Choose your slot
                  </p>
                  <SlotBrowser
                    selectedSlot={(() => { const n = parseInt(slotIdInput, 10); return Number.isInteger(n) && n >= 0 && n <= 999 ? n : null; })()}
                    onSelect={(id) => {
                      setSlotIdInput(String(id));
                      setClaimError(null);
                    }}
                    connection={connection}
                  />
                  {/* Manual slot input fallback */}
                  <div className="mt-4 pt-3 border-t border-gold-dim/15">
                    <label className="block text-xs text-foreground/40 font-body mb-1.5">
                      Or enter slot number
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      step="1"
                      placeholder="e.g. 42"
                      value={slotIdInput}
                      onChange={(e) => {
                        setSlotIdInput(e.target.value);
                        setClaimError(null);
                      }}
                      className="w-full bg-black/30 border border-gold-dim/30 text-foreground font-display text-sm px-4 py-2.5 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors placeholder:text-muted/30"
                    />
                  </div>
                </div>

                {/* Amount selector */}
                <div className="bg-surface-raised/50 border border-gold-dim/20 p-5 sm:p-8 max-w-md mx-auto">
                  <p className="text-xs uppercase tracking-[0.2em] text-gold font-body mb-5 text-center">
                    Your conviction
                  </p>

                  {/* Preset buttons */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {LOCK_PRESETS.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => {
                          setLockAmount(amount);
                          setCustomAmount("");
                        }}
                        className={`py-3 text-sm font-display font-semibold transition-all cursor-pointer ${
                          lockAmount === amount && !customAmount
                            ? "bg-gold text-background border border-gold"
                            : "bg-transparent text-foreground/70 border border-gold-dim/30 hover:border-gold/50 hover:text-foreground"
                        }`}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Custom amount (min 1)"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        const val = parseFloat(e.target.value);
                        if (val >= MIN_LOCK_SOL) setLockAmount(val);
                      }}
                      onFocus={() => {
                        if (!customAmount) setCustomAmount(String(lockAmount));
                      }}
                      className="w-full bg-black/30 border border-gold-dim/30 text-foreground font-display text-sm px-4 py-3 pr-14 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors placeholder:text-muted/30"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted/50 font-display">
                      SOL
                    </span>
                  </div>

                  {/* Points earning rate */}
                  <div className="mt-4 pt-4 border-t border-gold-dim/15">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground/40 font-body">Solazzo Points per day</span>
                      <span className="text-sm font-display font-bold text-gold">
                        {(lockAmount * 24).toFixed(0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-foreground/40 font-body">Points after 30 days</span>
                      <span className="text-sm font-display font-semibold text-foreground/70">
                        {(lockAmount * 720).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/30 font-body mt-2 leading-relaxed">
                      Points = SOL &times; Hours. They accrue while you hold your slot and can never be erased.
                      {lockAmount >= 5 && " Serious conviction."}
                      {lockAmount >= 10 && " Legendary tier."}
                    </p>
                  </div>
                </div>

                {/* Transaction disclosure */}
                <div className="bg-surface-raised/30 border border-gold-dim/15 p-4 max-w-md mx-auto">
                  <p className="text-xs text-foreground/50 font-body leading-relaxed space-y-1">
                    <span className="block">
                      &bull; Lock <span className="text-gold font-display font-semibold">{lockAmount} SOL</span>{" "}
                      in Slot <span className="text-gold font-display font-semibold">#{slotIdInput || "?"}</span>
                    </span>
                    <span className="block">&bull; Funds are transferred to the protocol vault on-chain.</span>
                    <span className="block">&bull; Non-custodial: your SOL is returned if you are displaced, when SOL reaches $1,000, or at protocol end date (Mar 16, 2030 UTC).</span>
                    <span className="block">&bull; No admin can access your locked funds.</span>
                  </p>
                </div>

                {/* Objections */}
                <div className="max-w-md mx-auto space-y-3">
                  <details className="group border border-gold-dim/15 bg-surface-raised/30">
                    <summary className="px-4 py-3 cursor-pointer text-sm font-body text-foreground/70 hover:text-foreground transition-colors flex items-center justify-between">
                      What if SOL never hits $1,000?
                      <span className="text-gold-dim/40 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                    </summary>
                    <p className="px-4 pb-3 text-sm text-foreground/40 font-body leading-relaxed">
                      Your SOL unlocks when SOL hits $1,000 or at the protocol
                      end date (Mar 16, 2030 UTC), whichever comes first.
                      Your portraits remain yours regardless.
                      No admin keys, no backdoors.
                    </p>
                  </details>
                  <details className="group border border-gold-dim/15 bg-surface-raised/30">
                    <summary className="px-4 py-3 cursor-pointer text-sm font-body text-foreground/70 hover:text-foreground transition-colors flex items-center justify-between">
                      What if I lose access to my wallet?
                      <span className="text-gold-dim/40 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                    </summary>
                    <p className="px-4 pb-3 text-sm text-foreground/40 font-body leading-relaxed">
                      Your locked SOL and portraits are soulbound &mdash; tied to
                      your wallet, non-transferable. If you lose access, those are
                      gone. However, your Solazzo Points token can be freely sent
                      and traded.
                    </p>
                  </details>
                  <details className="group border border-gold-dim/15 bg-surface-raised/30">
                    <summary className="px-4 py-3 cursor-pointer text-sm font-body text-foreground/70 hover:text-foreground transition-colors flex items-center justify-between">
                      Can someone take my slot?
                      <span className="text-gold-dim/40 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                    </summary>
                    <p className="px-4 pb-3 text-sm text-foreground/40 font-body leading-relaxed">
                      Only once all 1,000 slots are filled. After that, anyone can
                      outbid the lowest slot. If you&rsquo;re displaced, you get
                      your full SOL back instantly. You don&rsquo;t lose money
                      &mdash; you lose position.
                    </p>
                  </details>
                </div>

                {/* Claim CTA */}
                <div className="max-w-md mx-auto">
                  <button
                    onClick={claimAndPublish}
                    disabled={claimStep !== "idle" || !slotIdInput || lockAmount < MIN_LOCK_SOL}
                    className="w-full btn-gold font-display tracking-wide text-base py-3.5 disabled:opacity-50"
                  >
                    {claimStep === "preflight" && "Checking slot..."}
                    {claimStep === "signing" && "Sign in your wallet..."}
                    {claimStep === "confirming" && "Confirming on-chain..."}
                    {claimStep === "authorizing" && "Authorize publish in wallet..."}
                    {claimStep === "publishing" && "Publishing to gallery..."}
                    {claimStep === "idle" &&
                      (slotIdInput
                        ? `Claim Slot #${slotIdInput} \u2014 Lock ${lockAmount} SOL`
                        : "Enter a slot number")}
                  </button>
                  <p className="text-[11px] text-foreground/30 font-body mt-2 text-center">
                    Connected: {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                  </p>
                </div>

                {/* ── Position Summary (existing claim) ── */}
                {claimMeta && (
                  <div className="bg-surface-raised/50 border border-gold-dim/20 px-4 py-3 max-w-md mx-auto space-y-1 text-sm font-body">
                    <p className="font-display text-foreground/80 font-semibold text-xs uppercase tracking-wider mb-2">Previous Claim</p>
                    <p className="text-muted/70">Wallet: <span className="text-foreground/80 font-mono">{claimMeta.wallet.slice(0, 4)}…{claimMeta.wallet.slice(-4)}</span></p>
                    <p className="text-muted/70">Slot: <span className="text-foreground/80">#{claimMeta.slotId}</span></p>
                    <p className="text-muted/70">Locked: <span className="text-foreground/80">{claimMeta.lockSol} SOL</span></p>
                    <p className="text-muted/70">Tx: <span className="text-foreground/80 font-mono">{claimMeta.claimTxSig.slice(0, 8)}…{claimMeta.claimTxSig.slice(-8)}</span></p>
                    <p className="text-muted/70">Status: <span className={claimMeta.publishStatus === "published" ? "text-green-400" : "text-yellow-400"}>{claimMeta.publishStatus === "published" ? "Published" : "Local Only"}</span></p>
                  </div>
                )}

                {claimError && (
                  <p className="text-red-400 text-sm text-center font-body max-w-md mx-auto">{claimError}</p>
                )}
              </>
            )}

            {error && <p className="text-red-400 text-sm text-center font-body">{error}</p>}
          </div>
        )}

        {/* ── Locked ── */}
        {appStage === "locked" && (
          <div className="space-y-8 animate-celebration">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">Your Solazzo Collection</h2>
                <p className="text-gold text-sm mt-1 font-display tracking-wide">Locked &amp; Saved</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const { default: JSZipLib } = await import("jszip");
                      const zip = new JSZipLib();
                      for (let i = 0; i < portraits.length; i++) {
                        const p = portraits[i];
                        if (!p) continue;
                        const base64 = p.split(",")[1];
                        if (base64) zip.file(`solazzo-stage-${i + 1}.jpg`, base64, { base64: true });
                      }
                      const blob = await zip.generateAsync({ type: "blob" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "solazzo-collection.zip";
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                    } catch {
                      // Fallback: download individually
                      for (let i = 0; i < portraits.length; i++) {
                        const p = portraits[i];
                        if (!p) continue;
                        const a = document.createElement("a");
                        a.href = p;
                        a.download = `solazzo-stage-${i + 1}.jpg`;
                        a.click();
                        await new Promise((r) => setTimeout(r, 300));
                      }
                    }
                  }}
                  className="btn-gold font-display tracking-wide"
                >
                  Download All
                </button>
                <Link
                  href="/gallery"
                  className="btn-ghost font-display tracking-wide"
                >
                  View Gallery
                </Link>
              </div>
            </div>

            {/* ── Wallet mismatch warning ── */}
            {claimMeta && connected && publicKey && publicKey.toBase58() !== claimMeta.wallet && (
              <div className="bg-yellow-900/30 border border-yellow-600/40 px-4 py-3 text-sm text-yellow-200 font-body">
                Connected wallet ({publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}) differs from the wallet that claimed this slot ({claimMeta.wallet.slice(0, 4)}…{claimMeta.wallet.slice(-4)}).
              </div>
            )}

            {/* ── Position Summary ── */}
            {claimMeta && (
              <div className="bg-surface-raised border border-gold-dim/20 px-4 py-3 space-y-1 text-sm font-body">
                <p className="font-display text-foreground/80 font-semibold text-xs uppercase tracking-wider mb-2">Position Summary</p>
                <p className="text-muted/70">Wallet: <span className="text-foreground/80 font-mono">{claimMeta.wallet.slice(0, 4)}…{claimMeta.wallet.slice(-4)}</span></p>
                <p className="text-muted/70">Slot: <span className="text-foreground/80">#{claimMeta.slotId}</span></p>
                <p className="text-muted/70">Locked: <span className="text-foreground/80">{claimMeta.lockSol} SOL</span></p>
                <p className="text-muted/70">Tx: <span className="text-foreground/80 font-mono">{claimMeta.claimTxSig.slice(0, 8)}…{claimMeta.claimTxSig.slice(-8)}</span></p>
                <p className="text-muted/70">Status: <span className={claimMeta.publishStatus === "published" ? "text-green-400" : "text-yellow-400"}>{claimMeta.publishStatus === "published" ? "Published" : "Local Only"}</span></p>
              </div>
            )}

            {/* ── Mobile: single portrait + thumbnail strip ── */}
            <div className="sm:hidden">
              <div
                onTouchStart={handleSwipeStart}
                onTouchMove={handleSwipeMove}
                onTouchEnd={handleSwipeEnd}
              >
                {(() => {
                  const idx = focusedStage - 1;
                  const portrait = portraits[idx];
                  return (
                    <div className="max-w-[360px] mx-auto">
                      <BaroqueFrame>
                        <div className="relative">
                          {portrait && (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={portrait}
                                alt={`Stage ${focusedStage}: ${STAGE_NAMES[focusedStage]}`}
                                className="aspect-square w-full object-cover cursor-pointer"
                                onClick={() => setLightboxStage(focusedStage)}
                              />
                              {traitManifests[idx] && (
                                <button
                                  onClick={() => setPromptViewStage(focusedStage)}
                                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-gold/60 hover:text-gold text-[10px] font-mono px-2 py-1 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                                  title="View prompt"
                                >
                                  {"{…}"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </BaroqueFrame>
                      <div className="mt-3 text-center">
                        <p className="text-sm font-display font-semibold text-foreground/80 leading-tight">
                          {focusedStage}. {STAGE_NAMES[focusedStage]}
                        </p>
                        <p className="text-[11px] text-muted/40 font-body mt-0.5">
                          {STAGE_PRICES[focusedStage]}
                        </p>
                        {traitManifests[idx] && <TraitSummary manifest={traitManifests[idx]} />}
                        {portrait && (
                          <div className="flex items-center justify-center gap-3 mt-1">
                            <a
                              href={portrait}
                              download={`solazzo-stage-${focusedStage}.jpg`}
                              className="text-xs text-muted/50 hover:text-gold transition-colors inline-flex items-center justify-center min-h-[44px] font-body"
                            >
                              Download
                            </a>
                            <ShareButton portrait={portrait} stage={focusedStage} manifest={traitManifests[idx]} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-2 mt-5 justify-center">
                {ALL_STAGES.map((stage) => {
                  const idx = stage - 1;
                  const portrait = portraits[idx];
                  const isFocused = stage === focusedStage;
                  return (
                    <button
                      key={stage}
                      onClick={() => setFocusedStage(stage)}
                      className={`w-14 h-14 flex-shrink-0 border-2 transition-all duration-300 overflow-hidden ${
                        isFocused
                          ? "border-gold shadow-[0_0_8px_rgba(201,168,76,0.3)]"
                          : "border-gold-dim/20 opacity-60"
                      }`}
                    >
                      {portrait ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={portrait} alt={`Stage ${stage}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-raised flex items-center justify-center">
                          <span className="text-[10px] text-muted/30 font-display">{stage}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Desktop: grid view ── */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {ALL_STAGES.map((stage) => {
                const idx = stage - 1;
                const portrait = portraits[idx];
                return (
                  <div
                    key={stage}
                    className={`gallery-panel ${stage === 5 ? "sm:col-span-2 lg:col-span-1 max-w-none" : ""}`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <BaroqueFrame>
                      <div className="relative">
                        {portrait && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={portrait}
                              alt={`Stage ${stage}: ${STAGE_NAMES[stage]}`}
                              className="aspect-square w-full object-cover cursor-pointer"
                              onClick={() => setLightboxStage(stage)}
                            />
                            {traitManifests[idx] && (
                              <button
                                onClick={() => setPromptViewStage(stage)}
                                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-gold/60 hover:text-gold text-[10px] font-mono px-2 py-1 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="View prompt"
                              >
                                {"{…}"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </BaroqueFrame>
                    <div className="mt-3 text-center">
                      <p className="text-sm font-display font-semibold text-foreground/80 leading-tight">
                        {stage}. {STAGE_NAMES[stage]}
                      </p>
                      <p className="text-[11px] text-muted/40 font-body mt-0.5">
                        {STAGE_PRICES[stage]}
                      </p>
                      {traitManifests[idx] && <TraitSummary manifest={traitManifests[idx]} />}
                      {portrait && (
                        <div className="flex items-center justify-center gap-3 mt-1">
                          <a
                            href={portrait}
                            download={`solazzo-stage-${stage}.jpg`}
                            className="text-xs text-muted/50 hover:text-gold transition-colors inline-flex items-center justify-center min-h-[44px] font-body"
                          >
                            Download
                          </a>
                          <ShareButton portrait={portrait} stage={stage} manifest={traitManifests[idx]} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-6">
              <Link
                href="/gallery"
                className="text-sm text-muted/50 hover:text-gold transition-colors min-h-[44px] inline-flex items-center font-body"
              >
                Browse Gallery
              </Link>
              <button
                onClick={reset}
                className="text-sm text-muted/50 hover:text-red-400 transition-colors cursor-pointer min-h-[44px] font-body"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Global error */}
        {error && appStage === "gallery" && (
          <p className="text-red-400 text-sm text-center mt-4 font-body">{error}</p>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxStage !== null && portraits[lightboxStage - 1] && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-8"
          onClick={() => setLightboxStage(null)}
        >
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
          <div className="relative max-w-3xl w-full animate-fade-in">
            <BaroqueFrame>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portraits[lightboxStage - 1]!}
                alt={`Stage ${lightboxStage}: ${STAGE_NAMES[lightboxStage as StageNumber]}`}
                className="w-full object-contain"
              />
            </BaroqueFrame>
            <p className="text-center mt-3 sm:mt-4 font-display text-foreground/80 text-base sm:text-lg">
              {lightboxStage}. {STAGE_NAMES[lightboxStage as StageNumber]}
            </p>
            <div className="flex justify-center mt-2 sm:mt-3" onClick={(e) => e.stopPropagation()}>
              <ShareButton
                portrait={portraits[lightboxStage - 1]!}
                stage={lightboxStage as StageNumber}
                manifest={traitManifests[lightboxStage - 1]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Claim tx confirmation toast */}
      {claimTxSig && appStage === "locked" && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
          <div className="bg-surface-raised border border-gold-dim/30 px-5 py-3 shadow-lg">
            <p className="text-sm font-body text-foreground/80">
              Slot claimed on-chain. Tx: {claimTxSig.slice(0, 8)}...
            </p>
          </div>
        </div>
      )}

      {promptViewStage !== null && traitManifests[promptViewStage - 1] && (
        <PromptModal
          manifest={traitManifests[promptViewStage - 1]!}
          initialPrompt={
            editedPrompts[promptViewStage] ??
            traitManifests[promptViewStage - 1]!.prompt
          }
          onClose={() => setPromptViewStage(null)}
          onSaveAndRegenerate={(editedPrompt) => {
            setEditedPrompts((prev) => ({ ...prev, [promptViewStage]: editedPrompt }));
            setPromptViewStage(null);
            generateStage(promptViewStage as StageNumber, editedPrompt);
          }}
        />
      )}
    </main>
  );
}

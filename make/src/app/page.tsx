"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { STAGE_NAMES, STAGE_PRICES, type StageNumber } from "@/lib/prompt";
import type { TraitManifest, TraitRoll } from "@/lib/traits/types";
import { savePortraits, loadPortraits, clearPortraits } from "@/lib/storage";

type AppStage = "intro" | "capture" | "preview" | "gallery" | "locked";
type CaptureMode = "upload" | "camera";

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
      ctx.drawImage(img, 0, 0, 512, 512);
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
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const compressedRef = useRef<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadPortraits();
    if (saved) {
      setPortraits(saved.portraits);
      if (saved.traits) setTraitManifests(saved.traits);
      setAppStage("locked");
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

      const res = await fetch("/api/generate", { method: "POST", body: formData });
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
      generateStage(stage);
      if (stage < 5) await new Promise((r) => setTimeout(r, 500));
    }
  }, [generateStage]);

  const lockIn = useCallback(async () => {
    const allDone = portraits.every((p) => p !== null);
    if (!allDone) return;

    try {
      const compressed = await Promise.all(
        portraits.map((p) => compressForStorage(p!)),
      );
      const validTraits = traitManifests.filter((t): t is TraitManifest => t !== null);
      savePortraits(compressed, validTraits.length === 5 ? validTraits : undefined);
      setPortraits(compressed);
      setAppStage("locked");
    } catch {
      setError("Failed to save portraits. Please try again.");
    }
  }, [portraits, traitManifests]);

  const reset = useCallback(() => {
    clearPortraits();
    setPortraits([null, null, null, null, null]);
    setTraitManifests([null, null, null, null, null]);
    setStageErrors([null, null, null, null, null]);
    setGeneratingStages(new Set());
    setPreviewUrl(null);
    setError(null);
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

  const publishToGallery = useCallback(async () => {
    if (publishing || published) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/gallery/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portraits,
          traits: traitManifests.filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Publish failed");
      setPublished(true);
    } catch {
      setError("Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  }, [portraits, traitManifests, publishing, published]);

  const completedCount = portraits.filter((p) => p !== null).length;
  const allComplete = completedCount === 5;
  const isGenerating = generatingStages.size > 0;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className={`w-full ${appStage === "gallery" || appStage === "locked" ? "max-w-[1200px]" : "max-w-[640px]"}`}>
        {/* ── Intro ── */}
        {appStage === "intro" && (
          <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
            <div className="space-y-5">
              <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-wide text-foreground hover:animate-shimmer transition-all duration-500 cursor-default">
                SOLAZZO
              </h1>
              <div className="w-24 h-px mx-auto bg-gradient-to-r from-transparent via-gold to-transparent" />
              <p className="text-muted leading-relaxed max-w-md mx-auto font-body">
                Upload a selfie. Receive five Baroque oil portraits tracing the
                Solazzo journey — from humble believer to reflective maturity.
              </p>
            </div>
            <button
              onClick={() => setAppStage("capture")}
              className="btn-gold font-display tracking-wide"
            >
              Create Your Portraits
            </button>
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
                    Drag &amp; drop a selfie here, or click to browse
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
          <div className="space-y-8 animate-stage-enter">
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
                  onClick={lockIn}
                  className="btn-gold font-display tracking-wide"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-4">
              {ALL_STAGES.map((stage) => {
                const idx = stage - 1;
                const portrait = portraits[idx];
                const stageError = stageErrors[idx];
                const generating = generatingStages.has(stage);

                return (
                  <div
                    key={stage}
                    className="gallery-panel"
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
                    for (let i = 0; i < portraits.length; i++) {
                      const p = portraits[i];
                      if (!p) continue;
                      const a = document.createElement("a");
                      a.href = p;
                      a.download = `solazzo-stage-${i + 1}.jpg`;
                      a.click();
                      await new Promise((r) => setTimeout(r, 300));
                    }
                  }}
                  className="btn-gold font-display tracking-wide"
                >
                  Download All
                </button>
                {published ? (
                  <Link
                    href="/gallery"
                    className="btn-ghost font-display tracking-wide"
                  >
                    View Gallery
                  </Link>
                ) : (
                  <button
                    onClick={publishToGallery}
                    disabled={publishing}
                    className="btn-ghost font-display tracking-wide disabled:opacity-50"
                  >
                    {publishing ? "Publishing..." : "Publish to Gallery"}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-4">
              {ALL_STAGES.map((stage) => {
                const idx = stage - 1;
                const portrait = portraits[idx];
                return (
                  <div
                    key={stage}
                    className="gallery-panel"
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
          className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-8"
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
            <p className="text-center mt-4 font-display text-foreground/80 text-lg">
              {lightboxStage}. {STAGE_NAMES[lightboxStage as StageNumber]}
            </p>
            <div className="flex justify-center mt-3" onClick={(e) => e.stopPropagation()}>
              <ShareButton
                portrait={portraits[lightboxStage - 1]!}
                stage={lightboxStage as StageNumber}
                manifest={traitManifests[lightboxStage - 1]}
              />
            </div>
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

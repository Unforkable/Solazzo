"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
    <div className="w-full">
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
  Common: "#888",
  Uncommon: "#4ade80",
  Rare: "#60a5fa",
  Legendary: "#facc15",
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
          <span style={{ color: RARITY_COLORS[r.rarity] ?? "#888" }}>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative max-w-2xl w-full max-h-[80vh] bg-[#1a1408] border border-muted/30 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex-1 overflow-auto">
          <p className="text-xs text-muted/60 mb-3">
            Stage {manifest.stage} — {STAGE_NAMES[manifest.stage]}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-64 bg-black/30 border border-muted/20 text-xs text-muted/80 font-mono leading-relaxed p-3 resize-y focus:outline-none focus:border-muted/40"
          />
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="text-xs text-muted/60 hover:text-foreground transition-colors cursor-pointer px-4 py-2"
          >
            Close
          </button>
          <button
            onClick={() => onSaveAndRegenerate(text)}
            className="text-xs text-foreground border border-muted/30 hover:border-foreground/40 transition-colors cursor-pointer px-4 py-2"
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

    // Mirror horizontally for selfie feel
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
        <p className="text-red-400 text-sm">{camError}</p>
        <button onClick={onBack} className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer">
          &larr; Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer">
        &larr; Back
      </button>
      <div className="aspect-square w-full max-w-[400px] mx-auto overflow-hidden bg-black/50 relative">
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
            <p className="text-muted text-sm">Starting camera…</p>
          </div>
        )}
      </div>
      {ready && (
        <div className="flex justify-center">
          <button
            onClick={capture}
            className="border border-muted/30 px-6 py-3 text-sm text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
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

  const compressedRef = useRef<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore locked portraits on mount
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
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const generateStage = useCallback(async (stage: StageNumber, customPrompt?: string) => {
    const raw = compressedRef.current;
    if (!raw) return;

    setGeneratingStages((prev) => new Set(prev).add(stage));
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
        // Update prompt in existing manifest without overwriting trait rolls
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
      // Stagger requests by 500ms to avoid rate limit bursts
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
  }, [portraits]);

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

  const completedCount = portraits.filter((p) => p !== null).length;
  const allComplete = completedCount === 5;
  const isGenerating = generatingStages.size > 0;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className={`w-full ${appStage === "gallery" || appStage === "locked" ? "max-w-[1200px]" : "max-w-[640px]"}`}>
        {/* ── Intro ── */}
        {appStage === "intro" && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                SOLAZZO
              </h1>
              <p className="text-muted leading-relaxed">
                Upload a selfie. Receive five Baroque oil portraits tracing the
                Solazzo journey — from humble believer to reflective maturity.
              </p>
            </div>
            <button
              onClick={() => setAppStage("capture")}
              className="border border-muted/30 px-6 py-3 text-sm text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
            >
              Create your portraits
            </button>
          </div>
        )}

        {/* ── Capture ── */}
        {appStage === "capture" && (
          <div className="space-y-6">
            <button
              onClick={() => setAppStage("intro")}
              className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              &larr; Back
            </button>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-muted/20 pb-px">
              <button
                onClick={() => setCaptureMode("upload")}
                className={`text-sm pb-2 border-b-2 transition-colors cursor-pointer ${
                  captureMode === "upload"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Upload photo
              </button>
              <button
                onClick={() => setCaptureMode("camera")}
                className={`text-sm pb-2 border-b-2 transition-colors cursor-pointer ${
                  captureMode === "camera"
                    ? "border-foreground text-foreground"
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
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted/30 hover:border-foreground/30 transition-colors p-12 text-center cursor-pointer"
                >
                  <p className="text-muted text-sm">
                    Drag &amp; drop a selfie here, or click to browse
                  </p>
                  <p className="text-muted/60 text-xs mt-2">
                    JPEG, PNG, or WebP — max 10 MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
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

            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* ── Preview ── */}
        {appStage === "preview" && previewUrl && (
          <div className="space-y-6">
            <button
              onClick={repick}
              className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              &larr; Choose different photo
            </button>
            <div className="aspect-square w-full max-w-[400px] mx-auto overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Your selfie"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={generateAll}
                className="border border-muted/30 px-6 py-3 text-sm text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
              >
                Generate All 5 Portraits
              </button>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {/* ── Gallery (generating + results) ── */}
        {appStage === "gallery" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Your Solazzo Collection</h2>
                <p className="text-muted text-sm mt-1">
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
                  className="border border-muted/30 px-5 py-2.5 text-sm text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
                >
                  Lock In
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                              className="aspect-square w-full object-cover animate-fade-in"
                            />
                            {traitManifests[idx] && (
                              <button
                                onClick={() => setPromptViewStage(stage)}
                                className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-muted/60 hover:text-foreground text-[10px] font-mono px-1.5 py-0.5 transition-colors cursor-pointer"
                                title="View prompt"
                              >
                                {"{…}"}
                              </button>
                            )}
                          </>
                        ) : generating ? (
                          <div className="aspect-square flex items-center justify-center animate-pulse-frame">
                            <p className="text-muted text-xs text-center px-2">Painting…</p>
                          </div>
                        ) : stageError ? (
                          <div className="aspect-square flex items-center justify-center">
                            <p className="text-red-400 text-xs text-center px-2">{stageError}</p>
                          </div>
                        ) : (
                          <div className="aspect-square flex items-center justify-center">
                            <p className="text-muted/40 text-xs">Waiting…</p>
                          </div>
                        )}
                      </div>
                    </BaroqueFrame>
                    <div className="mt-2 text-center">
                      <p className="text-xs text-muted/80 leading-tight">
                        {stage}. {STAGE_NAMES[stage]}{" "}
                        <span className="text-[10px] text-muted/40">{STAGE_PRICES[stage]}</span>
                      </p>
                      {traitManifests[idx] && <TraitSummary manifest={traitManifests[idx]} />}
                      {!generating && (portrait || stageError) && (
                        <button
                          onClick={() => generateStage(stage)}
                          className="text-xs text-muted/50 hover:text-foreground transition-colors cursor-pointer mt-1"
                        >
                          {stageError ? "Retry" : "Regenerate"}
                        </button>
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
                  className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  &larr; Try a different photo
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Locked ── */}
        {appStage === "locked" && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Your Solazzo Collection</h2>
                <p className="text-muted text-sm mt-1">Locked &amp; saved</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    portraits.forEach((p, i) => {
                      if (!p) return;
                      const a = document.createElement("a");
                      a.href = p;
                      a.download = `solazzo-stage-${i + 1}.jpg`;
                      a.click();
                    });
                  }}
                  className="border border-muted/30 px-5 py-2.5 text-sm text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
                >
                  Download All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                              className="aspect-square w-full object-cover"
                            />
                            {traitManifests[idx] && (
                              <button
                                onClick={() => setPromptViewStage(stage)}
                                className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-muted/60 hover:text-foreground text-[10px] font-mono px-1.5 py-0.5 transition-colors cursor-pointer"
                                title="View prompt"
                              >
                                {"{…}"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </BaroqueFrame>
                    <div className="mt-2 text-center">
                      <p className="text-xs text-muted/80 leading-tight">
                        {stage}. {STAGE_NAMES[stage]}{" "}
                        <span className="text-[10px] text-muted/40">{STAGE_PRICES[stage]}</span>
                      </p>
                      {traitManifests[idx] && <TraitSummary manifest={traitManifests[idx]} />}
                      {portrait && (
                        <a
                          href={portrait}
                          download={`solazzo-stage-${stage}.jpg`}
                          className="text-xs text-muted/50 hover:text-foreground transition-colors mt-1 inline-block"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center">
              <button
                onClick={reset}
                className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Global error */}
        {error && appStage === "gallery" && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}
      </div>

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

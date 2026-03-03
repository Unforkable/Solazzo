"use client";

import { useState, useRef, useCallback } from "react";

type Stage = "intro" | "upload" | "preview" | "generating" | "result";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function BaroqueFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[512px]">
      {/* Outer carved edge */}
      <div className="p-[3px] bg-gradient-to-b from-[#8B7441] via-[#5C4A28] to-[#3A2E18]">
        {/* Outer gilded rail */}
        <div className="p-[6px] bg-gradient-to-b from-[#C9A84C] via-[#A07B3A] to-[#7A5C2E]">
          {/* Shadow channel */}
          <div className="p-[4px] bg-[#1a1408]">
            {/* Inner gilded rail */}
            <div className="p-[6px] bg-gradient-to-b from-[#7A5C2E] via-[#A07B3A] to-[#C9A84C]">
              {/* Inner carved edge */}
              <div className="p-[3px] bg-gradient-to-b from-[#3A2E18] via-[#5C4A28] to-[#8B7441]">
                {/* Innermost shadow lip */}
                <div
                  className="bg-[#0d0a04]"
                  style={{
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.7)",
                  }}
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

function compressImage(file: File): Promise<Blob> {
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
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(blob);
        },
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

export default function PortraitStudio() {
  const [stage, setStage] = useState<Stage>("intro");
  const [selfie, setSelfie] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be under 10 MB.");
      return;
    }

    setSelfie(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStage("preview");
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

  const generate = useCallback(async () => {
    if (!selfie) return;

    setStage("generating");
    setError(null);

    try {
      const compressed = await compressImage(selfie);
      const formData = new FormData();
      formData.append("image", compressed, "selfie.png");

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStage("preview");
        return;
      }

      setPortraitUrl(`data:image/png;base64,${data.image}`);
      setStage("result");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStage("preview");
    }
  }, [selfie]);

  const reset = useCallback(() => {
    setSelfie(null);
    setPreviewUrl(null);
    setPortraitUrl(null);
    setError(null);
    setStage("intro");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const repick = useCallback(() => {
    setSelfie(null);
    setPreviewUrl(null);
    setError(null);
    setStage("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[640px]">
        {/* ── Intro ── */}
        {stage === "intro" && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                SOLAZZO
              </h1>
              <p className="text-muted leading-relaxed">
                Upload a selfie. Receive a Baroque oil portrait painted in the
                Solazzo style — dramatic chiaroscuro, visible brushwork, the
                quiet dignity of a humble believer.
              </p>
            </div>
            <button
              onClick={() => setStage("upload")}
              className="border border-muted/30 px-6 py-3 text-sm text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
            >
              Create your portrait
            </button>
          </div>
        )}

        {/* ── Upload ── */}
        {stage === "upload" && (
          <div className="space-y-6">
            <button
              onClick={() => setStage("intro")}
              className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              &larr; Back
            </button>
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
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* ── Preview ── */}
        {stage === "preview" && previewUrl && (
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
                onClick={generate}
                className="border border-muted/30 px-6 py-3 text-sm text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
              >
                Generate Portrait
              </button>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {/* ── Generating ── */}
        {stage === "generating" && (
          <div className="flex flex-col items-center gap-6 py-12">
            <BaroqueFrame>
              <div className="aspect-square flex items-center justify-center animate-pulse-frame">
                <p className="text-muted text-sm">Painting your portrait…</p>
              </div>
            </BaroqueFrame>
            <p className="text-muted/60 text-xs">
              This usually takes 15–30 seconds
            </p>
          </div>
        )}

        {/* ── Result ── */}
        {stage === "result" && portraitUrl && (
          <div className="space-y-6 animate-fade-in">
            <BaroqueFrame>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portraitUrl}
                alt="Your Solazzo portrait"
                className="aspect-square w-full object-cover"
              />
            </BaroqueFrame>
            <div className="flex flex-col items-center gap-3">
              <a
                href={portraitUrl}
                download="solazzo-portrait.png"
                className="border border-muted/30 px-6 py-3 text-sm text-foreground hover:border-foreground/40 transition-colors"
              >
                Download Portrait
              </a>
              <button
                onClick={reset}
                className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Try another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

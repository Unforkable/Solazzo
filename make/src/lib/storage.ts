import type { TraitManifest } from "./traits/types";

const STORAGE_KEY = "solazzo-portraits";

export interface LockedPortraitSet {
  portraits: string[]; // 5 data URLs
  traits?: TraitManifest[]; // 5 trait manifests (optional for backward compat)
  lockedAt: number;
}

export function savePortraits(
  portraits: string[],
  traits?: TraitManifest[],
): void {
  const data: LockedPortraitSet = {
    portraits,
    traits,
    lockedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function loadPortraits(): LockedPortraitSet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as LockedPortraitSet;
    if (!Array.isArray(data.portraits) || data.portraits.length !== 5) return null;
    if (data.portraits.some((p) => typeof p !== "string" || !p.startsWith("data:"))) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearPortraits(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // fail silently
  }
}

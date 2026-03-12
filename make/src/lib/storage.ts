import type { TraitManifest } from "./traits/types";

const STORAGE_KEY = "solazzo-portraits";
const CLAIM_META_KEY = "solazzo-claim-meta";

export interface LockedPortraitSet {
  portraits: string[]; // 5 data URLs
  traits?: TraitManifest[]; // 5 trait manifests (optional for backward compat)
  lockedAt: number;
}

export interface ClaimMeta {
  wallet: string;
  slotId: number;
  lockSol: number;
  claimTxSig: string;
  publishStatus: "published" | "local-only";
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
    localStorage.removeItem(CLAIM_META_KEY);
  } catch {
    // fail silently
  }
}

export function saveClaimMeta(meta: ClaimMeta): void {
  try {
    localStorage.setItem(CLAIM_META_KEY, JSON.stringify(meta));
  } catch {
    // fail silently
  }
}

export function loadClaimMeta(): ClaimMeta | null {
  try {
    const raw = localStorage.getItem(CLAIM_META_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ClaimMeta;
    if (
      typeof data.wallet !== "string" ||
      typeof data.slotId !== "number" ||
      typeof data.lockSol !== "number" ||
      typeof data.claimTxSig !== "string" ||
      (data.publishStatus !== "published" && data.publishStatus !== "local-only")
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

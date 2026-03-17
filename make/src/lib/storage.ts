import type { TraitManifest } from "./traits/types";

const STORAGE_KEY = "solazzo-portraits";
const CLAIM_META_KEY = "solazzo-claim-meta";
const CLAIM_HISTORY_KEY = "solazzo-claim-history";
const MAX_CLAIM_HISTORY = 20;

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

// ── Claim history ──────────────────────────────────────────────────

export interface ClaimHistoryEntry {
  wallet: string;
  slotId: number;
  lockSol: number;
  claimTxSig: string;
  publishStatus: "published" | "local-only";
  timestamp: number;
}

export function saveClaimToHistory(meta: ClaimMeta): void {
  try {
    const history = loadClaimHistory();
    // Dedupe by claimTxSig
    const exists = history.some((h) => h.claimTxSig === meta.claimTxSig);
    if (exists) {
      // Update publish status if changed
      const updated = history.map((h) =>
        h.claimTxSig === meta.claimTxSig
          ? { ...h, publishStatus: meta.publishStatus }
          : h,
      );
      localStorage.setItem(CLAIM_HISTORY_KEY, JSON.stringify(updated));
      return;
    }
    const entry: ClaimHistoryEntry = {
      ...meta,
      timestamp: Date.now(),
    };
    const updated = [entry, ...history].slice(0, MAX_CLAIM_HISTORY);
    localStorage.setItem(CLAIM_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // fail silently
  }
}

export function loadClaimHistory(): ClaimHistoryEntry[] {
  try {
    const raw = localStorage.getItem(CLAIM_HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (h: unknown): h is ClaimHistoryEntry =>
        typeof h === "object" &&
        h !== null &&
        typeof (h as ClaimHistoryEntry).wallet === "string" &&
        typeof (h as ClaimHistoryEntry).slotId === "number" &&
        typeof (h as ClaimHistoryEntry).claimTxSig === "string" &&
        typeof (h as ClaimHistoryEntry).timestamp === "number",
    );
  } catch {
    return [];
  }
}

export function clearClaimHistory(): void {
  try {
    localStorage.removeItem(CLAIM_HISTORY_KEY);
  } catch {
    // fail silently
  }
}

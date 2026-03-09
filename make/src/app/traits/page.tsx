"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────────────────────────

type StageNumber = 1 | 2 | 3 | 4 | 5;
type RarityTier = "Common" | "Uncommon" | "Rare" | "Legendary";

interface TraitItem {
  id: string;
  name: string;
  stages: StageNumber[] | "all";
  weight: number;
  rarity: RarityTier;
  fragment: string;
  isNothing?: boolean;
  tags?: string[];
}

interface TraitCategoryDef {
  id: string;
  displayName: string;
  type: "mandatory" | "optional" | "mood";
  items: TraitItem[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<RarityTier, string> = {
  Common: "#8a7f72",
  Uncommon: "#7ab87a",
  Rare: "#6a9fd8",
  Legendary: "#c9a84c",
};

const STAGES: StageNumber[] = [1, 2, 3, 4, 5];
const RARITIES: RarityTier[] = ["Common", "Uncommon", "Rare", "Legendary"];
const PW_KEY = "trait-editor-pw";

// ── Page ────────────────────────────────────────────────────────────────────

export default function TraitEditorPage() {
  const [phase, setPhase] = useState<"loading" | "login" | "editor">(
    "loading",
  );
  const [categories, setCategories] = useState<TraitCategoryDef[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(new Set<string>());
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageNumber | null>(null);
  const [rarityFilter, setRarityFilter] = useState<RarityTier | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loginError, setLoginError] = useState(false);

  const passwordRef = useRef("");

  // ── Auth helper ─────────────────────────────────────────────────────────

  const fetchWithAuth = useCallback(
    (url: string, options?: RequestInit) => {
      const headers = new Headers(options?.headers);
      if (passwordRef.current) {
        headers.set("x-editor-password", passwordRef.current);
      }
      return fetch(url, { ...options, headers });
    },
    [],
  );

  // ── Initial load + auth ─────────────────────────────────────────────────

  useEffect(() => {
    const saved = sessionStorage.getItem(PW_KEY) || "";
    passwordRef.current = saved;

    const headers: HeadersInit = {};
    if (saved) headers["x-editor-password"] = saved;

    fetch("/api/traits", { headers }).then(async (res) => {
      if (res.ok) {
        setCategories(await res.json());
        setPhase("editor");
      } else {
        sessionStorage.removeItem(PW_KEY);
        passwordRef.current = "";
        setPhase("login");
      }
    });
  }, []);

  const handleLogin = async (pw: string) => {
    setLoginError(false);
    const res = await fetch("/api/traits", {
      headers: { "x-editor-password": pw },
    });
    if (res.ok) {
      passwordRef.current = pw;
      sessionStorage.setItem(PW_KEY, pw);
      setCategories(await res.json());
      setPhase("editor");
    } else {
      setLoginError(true);
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────

  const saveRef = useRef<() => void>(undefined);
  saveRef.current = async () => {
    if (dirty.size === 0 || saving) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetchWithAuth("/api/traits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categories),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const { mode } = await res.json();
      setDirty(new Set());

      if (mode === "github") {
        setSaveMsg("Committed to GitHub — deploying...");
        setTimeout(() => setSaveMsg(null), 8000);
      } else {
        setSaveMsg("Saved");
        setTimeout(() => setSaveMsg(null), 3000);
        // Re-fetch after dev server recompiles
        setTimeout(async () => {
          try {
            const fresh = await fetchWithAuth("/api/traits");
            if (fresh.ok) setCategories(await fresh.json());
          } catch {
            /* best-effort */
          }
        }, 1500);
      }
    } catch (e: unknown) {
      setSaveMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Keyboard shortcut (Cmd+S) ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveRef.current?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Unsaved changes warning ────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.size > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty.size]);

  // ── Item updater ───────────────────────────────────────────────────────

  const updateItem = (
    catId: string,
    itemId: string,
    updates: Partial<TraitItem>,
  ) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, ...updates };
          }),
        };
      }),
    );
    setDirty((prev) => new Set(prev).add(`${catId}:${itemId}`));
  };

  // ── Collapse toggle ───────────────────────────────────────────────────

  const toggleCollapse = (catId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // ── Filtering ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          if (
            stageFilter !== null &&
            item.stages !== "all" &&
            !item.stages.includes(stageFilter)
          )
            return false;
          if (rarityFilter !== null && item.rarity !== rarityFilter)
            return false;
          if (search) {
            const q = search.toLowerCase();
            if (
              !item.name.toLowerCase().includes(q) &&
              !item.fragment.toLowerCase().includes(q) &&
              !item.id.toLowerCase().includes(q)
            )
              return false;
          }
          return true;
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, stageFilter, rarityFilter, search]);

  const totalShown = filtered.reduce((s, c) => s + c.items.length, 0);
  const totalAll = categories.reduce((s, c) => s + c.items.length, 0);

  // ── Render: loading ────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted font-display text-xl">Loading...</p>
      </div>
    );
  }

  // ── Render: login ──────────────────────────────────────────────────────

  if (phase === "login") {
    return <LoginScreen onLogin={handleLogin} error={loginError} />;
  }

  // ── Render: editor ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      {/* ── Header ── */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-gold-dim/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted hover:text-foreground text-sm transition-colors"
            >
              &larr;
            </Link>
            <h1 className="font-display text-2xl text-gold tracking-wider">
              TRAIT EDITOR
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && (
              <span
                className={`text-sm ${saveMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}
              >
                {saveMsg}
              </span>
            )}
            <button
              onClick={() => saveRef.current?.()}
              disabled={dirty.size === 0 || saving}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                dirty.size > 0
                  ? "btn-gold"
                  : "bg-surface text-muted border border-surface-raised cursor-not-allowed"
              }`}
            >
              {saving
                ? "Saving..."
                : dirty.size > 0
                  ? `Save ${dirty.size} change${dirty.size !== 1 ? "s" : ""}`
                  : "No changes"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <input
            type="text"
            placeholder="Search traits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-surface border border-gold-dim/30 px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-gold w-64"
          />

          {/* Stage filter */}
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted mr-1">Stage:</span>
            <FilterButton
              active={stageFilter === null}
              onClick={() => setStageFilter(null)}
            >
              All
            </FilterButton>
            {STAGES.map((s) => (
              <FilterButton
                key={s}
                active={stageFilter === s}
                onClick={() => setStageFilter(stageFilter === s ? null : s)}
              >
                {s}
              </FilterButton>
            ))}
          </div>

          {/* Rarity filter */}
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted mr-1">Rarity:</span>
            <FilterButton
              active={rarityFilter === null}
              onClick={() => setRarityFilter(null)}
            >
              All
            </FilterButton>
            {RARITIES.map((r) => (
              <FilterButton
                key={r}
                active={rarityFilter === r}
                onClick={() =>
                  setRarityFilter(rarityFilter === r ? null : r)
                }
                color={RARITY_COLORS[r]}
              >
                {r}
              </FilterButton>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">
          {totalShown === totalAll
            ? `${totalAll} traits`
            : `${totalShown} of ${totalAll} traits shown`}
          {" · "}
          {categories.length} categories
        </p>
      </div>

      {/* ── Categories ── */}
      <div className="max-w-5xl mx-auto px-4 space-y-4">
        {filtered.map((cat) => (
          <div
            key={cat.id}
            className="border border-gold-dim/20 bg-surface/50"
          >
            {/* Category header */}
            <button
              onClick={() => toggleCollapse(cat.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-raised/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-gold-dim text-sm">
                  {collapsed.has(cat.id) ? "\u25B6" : "\u25BC"}
                </span>
                <span className="font-display text-lg text-gold-bright tracking-wide">
                  {cat.displayName.toUpperCase()}
                </span>
                <span className="text-xs text-muted px-2 py-0.5 border border-gold-dim/20">
                  {cat.type}
                </span>
              </div>
              <span className="text-sm text-muted">
                {cat.items.length} item{cat.items.length !== 1 ? "s" : ""}
              </span>
            </button>

            {/* Items */}
            {!collapsed.has(cat.id) && (
              <div className="border-t border-gold-dim/10 px-4 py-2 space-y-2">
                {cat.items.map((item) => (
                  <TraitCard
                    key={item.id}
                    item={item}
                    catId={cat.id}
                    isDirty={dirty.has(`${cat.id}:${item.id}`)}
                    onUpdate={updateItem}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Login screen ────────────────────────────────────────────────────────────

function LoginScreen({
  onLogin,
  error,
}: {
  onLogin: (pw: string) => void;
  error: boolean;
}) {
  const [pw, setPw] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin(pw);
        }}
        className="w-80 space-y-4"
      >
        <h1 className="font-display text-3xl text-gold tracking-wider text-center">
          TRAIT EDITOR
        </h1>
        <p className="text-sm text-muted text-center">
          Enter password to continue
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
          placeholder="Password"
          className="w-full bg-surface border border-gold-dim/30 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-gold"
        />
        {error && (
          <p className="text-red-400 text-xs text-center">Wrong password</p>
        )}
        <button type="submit" className="w-full btn-gold">
          Enter
        </button>
      </form>
    </div>
  );
}

// ── Filter button ───────────────────────────────────────────────────────────

function FilterButton({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  const activeColor = color || "#c9a84c";
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 border text-xs transition-colors"
      style={{
        borderColor: active ? activeColor : "rgba(139,116,65,0.3)",
        color: active ? activeColor : "#7a7168",
        backgroundColor: active ? `${activeColor}18` : "transparent",
      }}
    >
      {children}
    </button>
  );
}

// ── Trait card ───────────────────────────────────────────────────────────────

function TraitCard({
  item,
  catId,
  isDirty,
  onUpdate,
}: {
  item: TraitItem;
  catId: string;
  isDirty: boolean;
  onUpdate: (
    catId: string,
    itemId: string,
    updates: Partial<TraitItem>,
  ) => void;
}) {
  const update = (updates: Partial<TraitItem>) =>
    onUpdate(catId, item.id, updates);

  return (
    <div
      className="pl-3 py-2 pr-2 bg-surface/80"
      style={{ borderLeft: `3px solid ${RARITY_COLORS[item.rarity]}` }}
    >
      {/* Top row: name, stages, weight, rarity */}
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        {isDirty && (
          <span
            className="w-2 h-2 rounded-full bg-gold inline-block shrink-0"
            title="Modified"
          />
        )}

        {/* Name */}
        <input
          type="text"
          value={item.name}
          onChange={(e) => update({ name: e.target.value })}
          className="bg-transparent border-b border-transparent hover:border-gold-dim/30 focus:border-gold text-foreground text-sm font-medium focus:outline-none min-w-[180px] flex-1"
        />

        {/* Stages */}
        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          {STAGES.map((s) => {
            const active =
              item.stages === "all" || item.stages.includes(s);
            return (
              <button
                key={s}
                onClick={() => {
                  if (item.stages === "all") {
                    update({
                      stages: STAGES.filter(
                        (x) => x !== s,
                      ) as StageNumber[],
                    });
                  } else if (item.stages.includes(s)) {
                    const next = item.stages.filter((x) => x !== s);
                    if (next.length === 0) return;
                    update({ stages: next as StageNumber[] });
                  } else {
                    const next = [...item.stages, s].sort() as StageNumber[];
                    update({
                      stages: next.length === 5 ? "all" : next,
                    });
                  }
                }}
                className={`w-5 h-5 text-[10px] border transition-colors ${
                  active
                    ? "border-gold/60 text-gold bg-gold/15"
                    : "border-gold-dim/20 text-muted/50"
                }`}
                title={`Stage ${s}`}
              >
                {s}
              </button>
            );
          })}
          <button
            onClick={() =>
              update({ stages: item.stages === "all" ? [1] : "all" })
            }
            className={`px-1 h-5 text-[10px] border ml-0.5 transition-colors ${
              item.stages === "all"
                ? "border-gold/60 text-gold bg-gold/15"
                : "border-gold-dim/20 text-muted/50"
            }`}
          >
            all
          </button>
        </div>

        {/* Weight */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted">w:</span>
          <input
            type="number"
            value={item.weight}
            onChange={(e) =>
              update({ weight: parseInt(e.target.value) || 0 })
            }
            className="bg-transparent border-b border-transparent hover:border-gold-dim/30 focus:border-gold text-foreground text-xs w-10 text-center focus:outline-none"
          />
        </div>

        {/* Rarity */}
        <select
          value={item.rarity}
          onChange={(e) =>
            update({ rarity: e.target.value as RarityTier })
          }
          className="bg-surface text-xs border border-gold-dim/20 px-1 py-0.5 focus:outline-none focus:border-gold cursor-pointer"
          style={{ color: RARITY_COLORS[item.rarity] }}
        >
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Fragment textarea */}
      {!item.isNothing ? (
        <textarea
          value={item.fragment}
          onChange={(e) => update({ fragment: e.target.value })}
          rows={3}
          className="w-full bg-background/60 border border-gold-dim/15 px-2 py-1.5 text-xs text-foreground/90 leading-relaxed resize-y focus:outline-none focus:border-gold/50 placeholder:text-muted"
          placeholder="Fragment text..."
        />
      ) : (
        <p className="text-xs text-muted italic">
          Nothing roll (no fragment)
        </p>
      )}

      {/* Tags (read-only) */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-muted">tags:</span>
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 bg-burgundy/30 text-foreground/70 border border-burgundy/40"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

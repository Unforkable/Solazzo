"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

/** Well-known Solana genesis hashes. */
const GENESIS_HASHES: Record<string, string> = {
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d": "mainnet-beta",
  EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG: "devnet",
  "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY": "testnet",
};

export type SolanaNetwork =
  | "mainnet-beta"
  | "devnet"
  | "testnet"
  | "localnet"
  | "unknown";

export interface NetworkGuard {
  /** Verified network name derived from genesis hash. */
  network: SolanaNetwork;
  /** True while the genesis hash fetch is in flight. */
  loading: boolean;
  /** True when connected to mainnet-beta (real funds at risk). */
  isMainnet: boolean;
  /** Non-null if the genesis hash fetch failed. */
  error: string | null;
}

/**
 * Verify the actual Solana network by fetching the genesis hash.
 * URL-based heuristics ("devnet" in the URL) are unreliable for
 * custom RPC providers — this is the ground truth.
 */
export function useNetworkGuard(): NetworkGuard {
  const { connection } = useConnection();
  const [network, setNetwork] = useState<SolanaNetwork>("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    connection
      .getGenesisHash()
      .then((hash) => {
        if (cancelled) return;
        const known = GENESIS_HASHES[hash];
        if (known) {
          setNetwork(known as SolanaNetwork);
        } else if (
          connection.rpcEndpoint.includes("127.0.0.1") ||
          connection.rpcEndpoint.includes("localhost")
        ) {
          setNetwork("localnet");
        } else {
          setNetwork("unknown");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setNetwork("unknown");
        setError(
          `Failed to verify network: ${err instanceof Error ? err.message : String(err)}`,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connection]);

  return { network, loading, isMainnet: network === "mainnet-beta", error };
}

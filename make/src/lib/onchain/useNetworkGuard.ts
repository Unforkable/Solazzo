"use client";

import { useEffect, useReducer } from "react";
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

type State = { network: SolanaNetwork; loading: boolean; error: string | null };

type Action =
  | { type: "reset" }
  | { type: "resolved"; network: SolanaNetwork }
  | { type: "failed"; error: string };

const initialState: State = { network: "unknown", loading: true, error: null };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return initialState;
    case "resolved":
      return { network: action.network, loading: false, error: null };
    case "failed":
      return { network: "unknown", loading: false, error: action.error };
  }
}

/**
 * Verify the actual Solana network by fetching the genesis hash.
 * URL-based heuristics ("devnet" in the URL) are unreliable for
 * custom RPC providers — this is the ground truth.
 */
export function useNetworkGuard(): NetworkGuard {
  const { connection } = useConnection();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;

    connection
      .getGenesisHash()
      .then((hash) => {
        if (cancelled) return;
        const known = GENESIS_HASHES[hash];
        let network: SolanaNetwork;
        if (known) {
          network = known as SolanaNetwork;
        } else if (
          connection.rpcEndpoint.includes("127.0.0.1") ||
          connection.rpcEndpoint.includes("localhost")
        ) {
          network = "localnet";
        } else {
          network = "unknown";
        }
        dispatch({ type: "resolved", network });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        dispatch({
          type: "failed",
          error: `Failed to verify network: ${err instanceof Error ? err.message : String(err)}`,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [connection]);

  return {
    network: state.network,
    loading: state.loading,
    isMainnet: state.network === "mainnet-beta",
    error: state.error,
  };
}

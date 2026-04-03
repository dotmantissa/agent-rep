import { useState, useCallback } from "react";
import { readContract, writeContract } from "@/lib/genlayer";
import type { CalldataEncodable } from "genlayer-js/types";

// Store private key in memory only (never persisted)
let _privateKey: `0x${string}` | null = null;

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback((privateKey: `0x${string}`) => {
    _privateKey = privateKey;
    // Derive address from private key (simplified - use first 20 bytes as demo)
    // In production, use proper key derivation
    import("genlayer-js").then(({ createAccount }) => {
      const account = createAccount(privateKey);
      setAddress(account.address);
      setConnected(true);
    });
  }, []);

  const disconnect = useCallback(() => {
    _privateKey = null;
    setAddress(null);
    setConnected(false);
  }, []);

  return { address, connected, connect, disconnect, getKey: () => _privateKey };
}

export function useContractRead() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async (functionName: string, args: CalldataEncodable[] = []) => {
    setLoading(true);
    setError(null);
    try {
      const result = await readContract(functionName, args);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Read failed";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { read, loading, error };
}

export function useContractWrite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const write = useCallback(
    async (functionName: string, args: CalldataEncodable[] = [], value: bigint = 0n) => {
      if (!_privateKey) {
        setError("Wallet not connected");
        return null;
      }
      setLoading(true);
      setError(null);
      setTxHash(null);
      try {
        const receipt = await writeContract(_privateKey, functionName, args, value);
        setTxHash(receipt?.hash || null);
        return receipt;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Write failed";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { write, loading, error, txHash };
}

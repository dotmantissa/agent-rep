import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { createAccount } from "genlayer-js";

const STORAGE_KEY = "agentrep_wallet";

interface WalletContextType {
  address: string | null;
  connected: boolean;
  privateKey: `0x${string}` | null;
  connect: (key: `0x${string}`) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  privateKey: null,
  connect: () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<`0x${string}` | null>(null);
  const [connected, setConnected] = useState(false);

  // Restore session on mount
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        const key = stored as `0x${string}`;
        const account = createAccount(key);
        setPrivateKey(key);
        setAddress(account.address);
        setConnected(true);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const connect = useCallback((key: `0x${string}`) => {
    const account = createAccount(key);
    setPrivateKey(key);
    setAddress(account.address);
    setConnected(true);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Storage unavailable
    }
  }, []);

  const disconnect = useCallback(() => {
    setPrivateKey(null);
    setAddress(null);
    setConnected(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
  }, []);

  return (
    <WalletContext.Provider value={{ address, connected, privateKey, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  return useContext(WalletContext);
}

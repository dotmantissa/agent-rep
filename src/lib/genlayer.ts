import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { CalldataEncodable } from "genlayer-js/types";
import { TransactionStatus } from "genlayer-js/types";

export const CONTRACT_ADDRESS = "0x21Cc5ba5564A4d82f1D42f1Ea871CDC47e44f943" as const;

const STUDIO_RPC_URL = "https://studio.genlayer.com/api";

// Read-only client (no wallet needed)
export const readClient = createClient({
  chain: studionet,
  endpoint: STUDIO_RPC_URL,
});

// Create a write client with a connected account
export function createWriteClient(privateKey: `0x${string}`) {
  const account = createAccount(privateKey);
  return createClient({
    chain: studionet,
    endpoint: STUDIO_RPC_URL,
    account,
  });
}

// Helper to read contract
export async function readContract(functionName: string, args: CalldataEncodable[] = []) {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  });
  // View methods return JSON strings
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }
  return result;
}

// Helper to write contract
export async function writeContract(
  privateKey: `0x${string}`,
  functionName: string,
  args: CalldataEncodable[] = [],
  value: bigint = 0n
) {
  const client = createWriteClient(privateKey);
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.FINALIZED,
  });
  return receipt;
}

// Faucet: fund an account with GEN tokens via sim_fundAccount RPC
export async function requestFaucet(address: string, amount: number = 10000000000000000000): Promise<boolean> {
  try {
    const response = await fetch(STUDIO_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "sim_fundAccount",
        params: [address, amount],
      }),
    });
    const data = await response.json();
    return !!data.result && !data.error;
  } catch {
    return false;
  }
}

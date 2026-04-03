import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useWalletContext } from "@/components/WalletProvider";
import { generatePrivateKey } from "genlayer-js";
import { requestFaucet } from "@/lib/genlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Menu, X, Wallet, LogOut, Copy, Check, KeyRound, Plus, Droplets, Loader2 } from "lucide-react";

const NAV_ITEMS = [
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Explorer", to: "/explorer" },
  { label: "Tasks", to: "/tasks" },
] as const;

export function Navbar() {
  const { connected, address, connect, disconnect } = useWalletContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "import" | "created">("choose");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [backedUp, setBackedUp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);
  const location = useLocation();

  const handleConnect = () => {
    if (keyInput.startsWith("0x") && keyInput.length >= 66) {
      connect(keyInput as `0x${string}`);
      setKeyInput("");
      setDialogOpen(false);
      resetDialog();
    }
  };

  const handleCreate = () => {
    const pk = generatePrivateKey();
    setGeneratedKey(pk);
    setMode("created");
    setBackedUp(false);
    setCopied(false);
  };

  const handleConfirmCreated = () => {
    if (generatedKey) {
      connect(generatedKey as `0x${string}`);
      setDialogOpen(false);
      resetDialog();
    }
  };

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFaucet = async () => {
    if (!address) return;
    setFaucetLoading(true);
    setFaucetMsg(null);
    const success = await requestFaucet(address);
    setFaucetMsg(success ? "10 $GEN received!" : "Faucet request failed");
    setFaucetLoading(false);
    setTimeout(() => setFaucetMsg(null), 3000);
  };

  const resetDialog = () => {
    setMode("choose");
    setGeneratedKey(null);
    setBackedUp(false);
    setCopied(false);
    setKeyInput("");
  };

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-neon">
            <Shield className="h-3.5 w-3.5 text-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            Agent<span className="text-primary">Rep</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-0.5 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                location.pathname === item.to
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Faucet button */}
          {connected && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
                onClick={handleFaucet}
                disabled={faucetLoading}
              >
                {faucetLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Droplets className="h-3.5 w-3.5" />
                )}
                Faucet
              </Button>
              {faucetMsg && (
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                  {faucetMsg}
                </span>
              )}
            </div>
          )}

          {connected && address ? (
            <div className="flex items-center gap-1.5">
              <Link to="/profile">
                <Button variant="outline" size="sm" className="font-mono text-xs h-8">
                  <Wallet className="mr-1.5 h-3 w-3" />
                  {truncateAddress(address)}
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={disconnect} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
              <DialogTrigger asChild>
                <Button variant="neon" size="sm" className="h-8">
                  Connect Wallet
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {mode === "choose" ? "Connect Wallet" : mode === "import" ? "Import Wallet" : "Back Up Your Key"}
                  </DialogTitle>
                </DialogHeader>
                <WalletDialogBody
                  mode={mode}
                  setMode={setMode}
                  keyInput={keyInput}
                  setKeyInput={setKeyInput}
                  handleConnect={handleConnect}
                  handleCreate={handleCreate}
                  handleConfirmCreated={handleConfirmCreated}
                  handleCopyKey={handleCopyKey}
                  generatedKey={generatedKey}
                  backedUp={backedUp}
                  setBackedUp={setBackedUp}
                  copied={copied}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden rounded-md p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border md:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {connected && (
              <button
                onClick={handleFaucet}
                disabled={faucetLoading}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary w-full text-left"
              >
                {faucetLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Droplets className="h-3.5 w-3.5" />
                )}
                {faucetMsg || "Get Faucet Tokens"}
              </button>
            )}
            {connected && address ? (
              <>
                <Link
                  to="/profile"
                  className="block rounded-md px-3 py-2 text-sm font-mono text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  {truncateAddress(address)}
                </Link>
                <button
                  onClick={() => { disconnect(); setMobileOpen(false); }}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
                <DialogTrigger asChild>
                  <Button variant="neon" size="sm" className="mt-2 w-full">
                    Connect Wallet
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {mode === "choose" ? "Connect Wallet" : mode === "import" ? "Import Wallet" : "Back Up Your Key"}
                    </DialogTitle>
                  </DialogHeader>
                  <WalletDialogBody
                    mode={mode}
                    setMode={setMode}
                    keyInput={keyInput}
                    setKeyInput={setKeyInput}
                    handleConnect={handleConnect}
                    handleCreate={handleCreate}
                    handleConfirmCreated={handleConfirmCreated}
                    handleCopyKey={handleCopyKey}
                    generatedKey={generatedKey}
                    backedUp={backedUp}
                    setBackedUp={setBackedUp}
                    copied={copied}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

interface WalletDialogBodyProps {
  mode: "choose" | "import" | "created";
  setMode: (m: "choose" | "import" | "created") => void;
  keyInput: string;
  setKeyInput: (v: string) => void;
  handleConnect: () => void;
  handleCreate: () => void;
  handleConfirmCreated: () => void;
  handleCopyKey: () => void;
  generatedKey: string | null;
  backedUp: boolean;
  setBackedUp: (v: boolean) => void;
  copied: boolean;
}

function WalletDialogBody({
  mode,
  setMode,
  keyInput,
  setKeyInput,
  handleConnect,
  handleCreate,
  handleConfirmCreated,
  handleCopyKey,
  generatedKey,
  backedUp,
  setBackedUp,
  copied,
}: WalletDialogBodyProps) {
  if (mode === "choose") {
    return (
      <div className="space-y-3 pt-2">
        <p className="text-sm text-muted-foreground">
          Create a new GenLayer wallet or import an existing one.
        </p>
        <Button variant="neon" className="w-full gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Create New Wallet
        </Button>
        <Button variant="outline" className="w-full gap-2" onClick={() => setMode("import")}>
          <KeyRound className="h-4 w-4" />
          Import Private Key
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Your key is stored locally and never sent to any server.
        </p>
      </div>
    );
  }

  if (mode === "import") {
    return (
      <div className="space-y-4 pt-2">
        <p className="text-sm text-muted-foreground">
          Enter your GenLayer private key to connect.
        </p>
        <Input
          placeholder="0x..."
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          type="password"
          className="font-mono text-sm"
        />
        <Button
          variant="neon"
          className="w-full"
          onClick={handleConnect}
          disabled={!keyInput.startsWith("0x") || keyInput.length < 66}
        >
          Connect
        </Button>
        <button
          onClick={() => setMode("choose")}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      </div>
    );
  }

  // mode === "created"
  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-sm font-medium text-destructive">
          ⚠ Save this private key now — you won't see it again!
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          If you lose this key, you lose access to your wallet and all on-chain reputation.
        </p>
      </div>

      <div className="relative">
        <div className="rounded-lg border border-border bg-muted p-3 pr-12 font-mono text-xs break-all select-all">
          {generatedKey}
        </div>
        <button
          onClick={handleCopyKey}
          className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
        <input
          type="checkbox"
          checked={backedUp}
          onChange={(e) => setBackedUp(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-foreground">
          I have saved my private key in a secure location
        </span>
      </label>

      <Button
        variant="neon"
        className="w-full"
        onClick={handleConfirmCreated}
        disabled={!backedUp}
      >
        Continue to AgentRep
      </Button>
    </div>
  );
}

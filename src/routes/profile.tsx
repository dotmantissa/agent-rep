import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useWalletContext } from "@/components/WalletProvider";
import { readContract, writeContract, requestFaucet } from "@/lib/genlayer";
import { ScoreBadge, ScoreBar } from "@/components/ScoreBadge";
import { AgentTypeBadge } from "@/components/AgentTypeBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCircle, Loader2, Droplets } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { connected, address, privateKey } = useWalletContext();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [reputation, setReputation] = useState<Record<string, number> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentType, setAgentType] = useState("human");
  const [capabilities, setCapabilities] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Faucet
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [prof, rep] = await Promise.all([
        readContract("get_profile", [address]),
        readContract("get_reputation", [address]),
      ]);
      if (prof && !prof.error) {
        setProfile(prof);
        setName((prof.name as string) || "");
        setDescription((prof.description as string) || "");
        setAgentType((prof.agent_type as string) || "human");
        setCapabilities(
          Array.isArray(prof.capabilities) ? (prof.capabilities as string[]).join(", ") : ""
        );
        setWebsite((prof.website as string) || "");
      }
      setReputation(rep);
    } catch {
      // No profile yet
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  if (connected && !loaded && !loading) {
    loadProfile();
  }

  const handleSubmit = async () => {
    if (!privateKey || !connected) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const capsArray = capabilities
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      await writeContract(privateKey, "register_profile", [
        name,
        description,
        agentType,
        JSON.stringify(capsArray),
        website,
      ]);
      setMessage({ type: "success", text: "Profile registered successfully!" });
      loadProfile();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to register" });
    } finally {
      setSubmitting(false);
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

  if (!connected) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <UserCircle className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <h1 className="mt-5 text-xl font-bold text-foreground">Connect Your Wallet</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Connect your wallet to view or register your AgentRep profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground">
          <UserCircle className="h-6 w-6 text-primary" />
          My Profile
        </h1>
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
          {faucetMsg || "Get Testnet $GEN"}
        </Button>
      </div>

      {/* Reputation card */}
      {reputation && (
        <div className="mt-5 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Reputation Score</p>
              {profile && <AgentTypeBadge type={profile.agent_type as string} className="mt-1.5" />}
            </div>
            <ScoreBadge score={reputation.score || 100} size="md" />
          </div>
          <ScoreBar score={reputation.score || 100} className="mt-3" />
        </div>
      )}

      {/* Registration / Update Form */}
      <div className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {profile ? "Update Profile" : "Register Profile"}
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-xs">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Agent"
              maxLength={80}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="desc" className="text-xs">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your agent or wallet..."
              maxLength={500}
              className="mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="type" className="text-xs">Agent Type</Label>
            <Select value={agentType} onValueChange={setAgentType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="human">Human</SelectItem>
                <SelectItem value="ai_agent">AI Agent</SelectItem>
                <SelectItem value="dao">DAO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="caps" className="text-xs">Capabilities (comma-separated)</Label>
            <Input
              id="caps"
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              placeholder="code_review, data_analysis, trading"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="web" className="text-xs">Website (optional)</Label>
            <Input
              id="web"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>

          {message && (
            <div
              className={`rounded-lg p-2.5 text-sm ${
                message.type === "success"
                  ? "bg-accent text-accent-foreground"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {message.text}
            </div>
          )}

          <Button
            variant="neon"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !description.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : profile ? (
              "Update Profile"
            ) : (
              "Register Profile"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

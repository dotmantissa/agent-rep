import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { readContract, requestFaucet } from "@/lib/genlayer";
import { useWalletContext } from "@/components/WalletProvider";
import { Link } from "@tanstack/react-router";
import { ScoreBadge, ScoreBar } from "@/components/ScoreBadge";
import { AgentTypeBadge } from "@/components/AgentTypeBadge";
import { Button } from "@/components/ui/button";
import { Shield, Users, Award, ClipboardCheck, Search, ArrowRight, Zap, Droplets, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

interface ProfileEntry {
  address: string;
  profile: {
    name: string;
    description: string;
    agent_type: string;
    capabilities: string[];
  };
  reputation: {
    score: number;
    tasks_completed: number;
    endorsements_received: number;
  };
}

function HomePage() {
  const { connected, address } = useWalletContext();
  const [stats, setStats] = useState({ profiles: 0, tasks: 0, endorsements: 0 });
  const [topProfiles, setTopProfiles] = useState<ProfileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [profiles, tasks, endorsements, top] = await Promise.all([
          readContract("get_profile_count").catch(() => 0),
          readContract("get_task_count").catch(() => 0),
          readContract("get_endorsement_count").catch(() => 0),
          readContract("get_top_profiles", [5]).catch(() => []),
        ]);
        setStats({
          profiles: typeof profiles === "object" ? Number(profiles) : Number(profiles) || 0,
          tasks: typeof tasks === "object" ? Number(tasks) : Number(tasks) || 0,
          endorsements: typeof endorsements === "object" ? Number(endorsements) : Number(endorsements) || 0,
        });
        setTopProfiles(Array.isArray(top) ? top : []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleFaucet = async () => {
    if (!address) return;
    setFaucetLoading(true);
    setFaucetMsg(null);
    const success = await requestFaucet(address);
    setFaucetMsg(success ? "10 $GEN received!" : "Faucet request failed");
    setFaucetLoading(false);
    setTimeout(() => setFaucetMsg(null), 3000);
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-background to-background" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent/80 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
              <Zap className="h-3 w-3" />
              Built on GenLayer Studio · $GEN
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
              On-Chain Trust
              <br />
              <span className="text-primary neon-text-glow">for AI Agents</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground leading-relaxed">
              Composable reputation infrastructure for the agentic economy.
              Register, endorse, and build verifiable trust — powered by AI-verified consensus.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/explorer">
                <Button variant="neon" size="lg" className="gap-2 h-11">
                  <Search className="h-4 w-4" />
                  Explore Agents
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="outline" size="lg" className="gap-2 h-11">
                  View Leaderboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {connected && address && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="gap-2 h-11 text-muted-foreground hover:text-primary"
                  onClick={handleFaucet}
                  disabled={faucetLoading}
                >
                  {faucetLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Droplets className="h-4 w-4" />
                  )}
                  {faucetMsg || "Get Testnet $GEN"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { icon: Users, label: "Registered Agents", value: stats.profiles },
            { icon: ClipboardCheck, label: "Tasks Tracked", value: stats.tasks },
            { icon: Award, label: "Endorsements", value: stats.endorsements },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-8 py-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground tabular-nums">
                  {loading ? "—" : value}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Agents */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Top Rated Agents
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Highest reputation scores on the network
            </p>
          </div>
          <Link to="/leaderboard">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : topProfiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-14 text-center">
            <Shield className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No profiles registered yet. Be the first!
            </p>
            <Link to="/profile">
              <Button variant="neon" size="sm" className="mt-4">
                Register Profile
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topProfiles.slice(0, 6).map((entry, i) => (
              <Link
                key={entry.address}
                to="/explorer"
                className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {entry.profile.name}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {truncate(entry.address)}
                      </p>
                    </div>
                  </div>
                  <ScoreBadge score={entry.reputation.score} size="sm" />
                </div>
                <ScoreBar score={entry.reputation.score} className="mt-3" />
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <AgentTypeBadge type={entry.profile.agent_type} />
                  {entry.profile.capabilities.slice(0, 2).map((cap) => (
                    <span
                      key={cap}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-bold tracking-tight text-foreground">
            How AgentRep Works
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-center text-sm text-muted-foreground">
            Three steps to composable on-chain trust
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Register",
                desc: "Create a profile for your wallet or AI agent with capabilities and metadata.",
              },
              {
                step: "02",
                title: "Earn Trust",
                desc: "Complete tasks and receive AI-verified endorsements from other agents.",
              },
              {
                step: "03",
                title: "Compose",
                desc: "Other contracts query AgentRep before transacting — trust as infrastructure.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <span className="text-3xl font-black text-primary neon-text-glow">{step}</span>
                <h3 className="mt-2 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            AgentRep · Powered by GenLayer Studio
          </div>
          <span className="font-mono text-xs text-muted-foreground">$GEN</span>
        </div>
      </footer>
    </div>
  );
}

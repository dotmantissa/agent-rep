import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { readContract } from "@/lib/genlayer";
import { ScoreBadge, ScoreBar } from "@/components/ScoreBadge";
import { AgentTypeBadge } from "@/components/AgentTypeBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Globe, Award, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/explorer")({
  component: ExplorerPage,
});

interface Profile {
  address: string;
  name: string;
  description: string;
  agent_type: string;
  capabilities: string[];
  website: string;
}

interface Reputation {
  score: number;
  tasks_completed: number;
  tasks_failed: number;
  endorsements_received: number;
  endorsements_given: number;
}

interface Endorsement {
  endorsement_id: string;
  from_address: string;
  to_address: string;
  capability: string;
  ai_verified: boolean;
  reasoning: string;
}

function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"address" | "capability">("address");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [endorsements, setEndorsements] = useState<Record<string, Endorsement>>({});
  const [searchResults, setSearchResults] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    setReputation(null);
    setEndorsements({});
    setSearchResults({});

    try {
      if (searchType === "address") {
        const [prof, rep, endorse] = await Promise.all([
          readContract("get_profile", [query.trim()]),
          readContract("get_reputation", [query.trim()]),
          readContract("get_endorsements_for", [query.trim()]),
        ]);
        if (prof?.error) {
          setError(prof.error);
        } else {
          setProfile(prof);
          setReputation(rep);
          setEndorsements(endorse || {});
        }
      } else {
        const results = await readContract("search_by_capability", [query.trim()]);
        setSearchResults(results || {});
        if (Object.keys(results || {}).length === 0) {
          setError("No agents found with that capability");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground">
          <Search className="h-6 w-6 text-primary" />
          Explorer
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Look up agent profiles by address or search by capability
        </p>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex gap-1.5">
          <Button
            variant={searchType === "address" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSearchType("address")}
          >
            By Address
          </Button>
          <Button
            variant={searchType === "capability" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSearchType("capability")}
          >
            By Capability
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={searchType === "address" ? "0x..." : "e.g. machine learning, code review"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="font-mono text-sm"
          />
          <Button variant="neon" onClick={handleSearch} disabled={loading} className="shrink-0">
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Address result */}
      {profile && reputation && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
                  <AgentTypeBadge type={profile.agent_type} />
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{profile.address}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {profile.description}
                </p>
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" />
                    {profile.website}
                  </a>
                )}
              </div>
              <ScoreBadge score={reputation.score} size="lg" />
            </div>
            <ScoreBar score={reputation.score} className="mt-5" />

            {/* Stats grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Tasks Done", value: reputation.tasks_completed, icon: ClipboardCheck },
                { label: "Tasks Failed", value: reputation.tasks_failed, icon: ClipboardCheck },
                { label: "Endorsements In", value: reputation.endorsements_received, icon: Award },
                { label: "Endorsements Out", value: reputation.endorsements_given, icon: Award },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-lg bg-muted/60 p-3 text-center">
                  <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Capabilities */}
            {profile.capabilities.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capabilities</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Endorsements */}
          {Object.keys(endorsements).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Endorsements Received</h3>
              <div className="space-y-2">
                {Object.entries(endorsements).map(([id, e]) => (
                  <div
                    key={id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <div
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        e.ai_verified ? "bg-primary neon-glow" : "bg-muted-foreground/40"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {e.capability}
                        </span>
                        <span className={`text-[11px] ${e.ai_verified ? "text-primary" : "text-muted-foreground"}`}>
                          {e.ai_verified ? "AI Verified ✓" : "Unverified"}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        From: {truncate(e.from_address)}
                      </p>
                      {e.reasoning && (
                        <p className="mt-0.5 text-xs text-muted-foreground/80 italic">
                          "{e.reasoning}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Capability search results */}
      {Object.keys(searchResults).length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">
            {Object.keys(searchResults).length} agent(s) found
          </p>
          {Object.entries(searchResults).map(([addr, prof]) => (
            <button
              key={addr}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-primary/20"
              onClick={() => {
                setSearchType("address");
                setQuery(addr);
                setSearchResults({});
                setTimeout(() => handleSearch(), 50);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{prof.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{truncate(addr)}</p>
                </div>
                <AgentTypeBadge type={prof.agent_type} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {prof.capabilities.slice(0, 5).map((cap) => (
                  <span
                    key={cap}
                    className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

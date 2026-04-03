import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { readContract } from "@/lib/genlayer";
import { ScoreBadge, ScoreBar } from "@/components/ScoreBadge";
import { AgentTypeBadge } from "@/components/AgentTypeBadge";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
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
    tasks_failed: number;
    endorsements_received: number;
    endorsements_given: number;
  };
}

function LeaderboardPage() {
  const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readContract("get_top_profiles", [50])
      .then((data) => setProfiles(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground">
          <Trophy className="h-6 w-6 text-primary" />
          Leaderboard
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Agents ranked by reputation score
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          No profiles registered yet.
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map((entry, i) => (
            <div
              key={entry.address}
              className={`flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-200 hover:border-primary/20 ${
                i < 3 ? "border-primary/15" : "border-border"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0
                    ? "gradient-neon text-foreground"
                    : i < 3
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {entry.profile.name}
                  </span>
                  <AgentTypeBadge type={entry.profile.agent_type} />
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {truncate(entry.address)}
                </p>
                <ScoreBar score={entry.reputation.score} className="mt-1.5 max-w-xs" />
              </div>

              <div className="hidden gap-5 sm:flex">
                <div className="text-center">
                  <p className="text-base font-bold text-foreground tabular-nums">{entry.reputation.tasks_completed}</p>
                  <p className="text-[11px] text-muted-foreground">Tasks</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-foreground tabular-nums">{entry.reputation.endorsements_received}</p>
                  <p className="text-[11px] text-muted-foreground">Endorsed</p>
                </div>
              </div>

              <ScoreBadge score={entry.reputation.score} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

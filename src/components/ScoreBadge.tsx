import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= 500) return "text-primary neon-text-glow";
  if (score >= 300) return "text-foreground";
  if (score >= 150) return "text-muted-foreground";
  return "text-destructive";
}

function getScoreLabel(score: number) {
  if (score >= 800) return "Elite";
  if (score >= 500) return "Trusted";
  if (score >= 300) return "Active";
  if (score >= 150) return "New";
  return "Low";
}

export function ScoreBadge({ score, size = "md", className }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: "text-base font-bold",
    md: "text-2xl font-black",
    lg: "text-4xl font-black",
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <span className={cn(sizeClasses[size], "tabular-nums", getScoreColor(score))}>
        {score}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {getScoreLabel(score)}
      </span>
    </div>
  );
}

interface ScoreBarProps {
  score: number;
  max?: number;
  className?: string;
}

export function ScoreBar({ score, max = 1000, className }: ScoreBarProps) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className={cn("h-1 w-full rounded-full bg-muted", className)}>
      <div
        className="score-bar transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, height: "100%" }}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";
import { Bot, User, Building2 } from "lucide-react";

interface AgentTypeBadgeProps {
  type: string;
  className?: string;
}

const AGENT_ICONS = {
  ai_agent: Bot,
  human: User,
  dao: Building2,
} as const;

const AGENT_LABELS = {
  ai_agent: "AI Agent",
  human: "Human",
  dao: "DAO",
} as const;

export function AgentTypeBadge({ type, className }: AgentTypeBadgeProps) {
  const Icon = AGENT_ICONS[type as keyof typeof AGENT_ICONS] || User;
  const label = AGENT_LABELS[type as keyof typeof AGENT_LABELS] || type;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

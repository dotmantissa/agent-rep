import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useWalletContext } from "@/components/WalletProvider";
import { readContract, writeContract } from "@/lib/genlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardCheck, Plus, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

interface Task {
  task_id: string;
  poster: string;
  assignee: string;
  description: string;
  criteria: string;
  deliverable_url: string | null;
  status: string;
  outcome_reasoning: string | null;
}

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle; color: string }> = {
  OPEN: { icon: Clock, color: "text-muted-foreground" },
  ACCEPTED: { icon: Clock, color: "text-primary" },
  SUBMITTED: { icon: Clock, color: "text-chart-2" },
  VERIFYING: { icon: Loader2, color: "text-chart-4" },
  COMPLETED: { icon: CheckCircle, color: "text-primary" },
  FAILED: { icon: XCircle, color: "text-destructive" },
};

function TasksPage() {
  const { connected, address, privateKey } = useWalletContext();
  const [tasksAssigned, setTasksAssigned] = useState<Record<string, Task>>({});
  const [tasksPosted, setTasksPosted] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  // Post task form
  const [assignee, setAssignee] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Submit deliverable
  const [submitTaskId, setSubmitTaskId] = useState<string | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState("");

  const loadTasks = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [assigned, posted] = await Promise.all([
        readContract("get_tasks_for", [address]),
        readContract("get_tasks_by", [address]),
      ]);
      setTasksAssigned(assigned || {});
      setTasksPosted(posted || {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && address) loadTasks();
  }, [connected, address]);

  const handlePostTask = async () => {
    if (!privateKey) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await writeContract(privateKey, "post_task", [assignee, description, criteria]);
      setMessage({ type: "success", text: "Task posted!" });
      setPostOpen(false);
      setAssignee("");
      setDescription("");
      setCriteria("");
      loadTasks();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDeliverable = async (taskId: string) => {
    if (!privateKey || !deliverableUrl) return;
    setSubmitting(true);
    try {
      await writeContract(privateKey, "submit_task", [taskId, deliverableUrl]);
      setSubmitTaskId(null);
      setDeliverableUrl("");
      loadTasks();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    if (!privateKey) return;
    try {
      await writeContract(privateKey, "accept_task", [taskId]);
      loadTasks();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed" });
    }
  };

  const handleVerifyTask = async (taskId: string) => {
    if (!privateKey) return;
    try {
      await writeContract(privateKey, "verify_task", [taskId]);
      loadTasks();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed" });
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  const renderTask = (task: Task, perspective: "assignee" | "poster") => {
    const style = STATUS_STYLES[task.status] || STATUS_STYLES.OPEN;
    const Icon = style.icon;
    const isMyTask = address?.toLowerCase() === task.assignee.toLowerCase();

    return (
      <div
        key={task.task_id}
        className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-border/80"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Icon className={`h-3.5 w-3.5 ${style.color} ${task.status === "VERIFYING" ? "animate-spin" : ""}`} />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {task.status}
              </span>
              <span className="text-[11px] text-muted-foreground/60">#{task.task_id}</span>
            </div>
            <p className="mt-1.5 text-sm text-foreground leading-relaxed">{task.description}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {perspective === "assignee" ? `From: ${truncate(task.poster)}` : `Assigned: ${truncate(task.assignee)}`}
            </p>
          </div>
        </div>

        {task.outcome_reasoning && (
          <p className="mt-2.5 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground italic">
            AI: "{task.outcome_reasoning}"
          </p>
        )}

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {task.status === "OPEN" && isMyTask && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAcceptTask(task.task_id)}>
              Accept Task
            </Button>
          )}
          {(task.status === "OPEN" || task.status === "ACCEPTED") && isMyTask && (
            submitTaskId === task.task_id ? (
              <div className="flex w-full gap-2">
                <Input
                  placeholder="https://deliverable-url.com"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  className="text-sm h-8"
                />
                <Button
                  size="sm"
                  variant="neon"
                  className="h-8"
                  onClick={() => handleSubmitDeliverable(task.task_id)}
                  disabled={submitting}
                >
                  Submit
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="neon"
                className="h-7 text-xs"
                onClick={() => setSubmitTaskId(task.task_id)}
              >
                Submit Deliverable
              </Button>
            )
          )}
          {task.status === "SUBMITTED" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleVerifyTask(task.task_id)}>
              Trigger AI Verification
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!connected) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <h1 className="mt-5 text-xl font-bold text-foreground">Connect Your Wallet</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Connect your wallet to view and manage tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Tasks
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage tasks assigned to you or posted by you
          </p>
        </div>
        <Dialog open={postOpen} onOpenChange={setPostOpen}>
          <DialogTrigger asChild>
            <Button variant="neon" size="sm" className="gap-1.5 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Post Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post a New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Assignee Address</Label>
                <Input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="0x..."
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What needs to be done..."
                  className="mt-1"
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <div>
                <Label className="text-xs">Completion Criteria</Label>
                <Textarea
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  placeholder="How will success be measured..."
                  className="mt-1"
                  rows={3}
                  maxLength={1000}
                />
              </div>
              {message && (
                <div className={`rounded-lg p-2.5 text-sm ${message.type === "success" ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive"}`}>
                  {message.text}
                </div>
              )}
              <Button variant="neon" className="w-full" onClick={handlePostTask} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Post Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Assigned to me */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Assigned to Me</h2>
            {Object.keys(tasksAssigned).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No tasks assigned to you yet.
              </p>
            ) : (
              <div className="space-y-2">
                {Object.values(tasksAssigned).map((t) => renderTask(t, "assignee"))}
              </div>
            )}
          </div>

          {/* Posted by me */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Posted by Me</h2>
            {Object.keys(tasksPosted).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                You haven't posted any tasks yet.
              </p>
            ) : (
              <div className="space-y-2">
                {Object.values(tasksPosted).map((t) => renderTask(t, "poster"))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import type { WorkflowRunData, NodeRunData } from "@/types/nodes";
import { formatTimestamp, formatDuration, truncate, cn } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, Clock, CheckCircle2,
  XCircle, Loader2, History, RefreshCw,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const config = {
    success: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/25", label: "success" },
    failed: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/25", label: "failed" },
    partial: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/25", label: "partial" },
    running: { bg: "bg-purple/15", text: "text-purple-light", border: "border-purple/25", label: "running" },
  }[status] ?? { bg: "bg-bg-tertiary", text: "text-text-muted", border: "border-border-primary", label: status };

  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", config.bg, config.text, config.border)}>
      {config.label}
    </span>
  );
}

function NodeStatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />;
  if (status === "failed") return <XCircle size={12} className="text-red-400 flex-shrink-0" />;
  return <Loader2 size={12} className="text-purple spin flex-shrink-0" />;
}

function nodeTypeLabel(type: string): string {
  const map: Record<string, string> = {
    textNode: "Text Node",
    uploadImageNode: "Upload Image",
    uploadVideoNode: "Upload Video",
    llmNode: "LLM Node",
    cropImageNode: "Crop Image",
    extractFrameNode: "Extract Frame",
  };
  return map[type] ?? type;
}

function nodeOutput(nr: NodeRunData): string {
  const out = nr.outputs as Record<string, unknown>;
  const val = out?.output ?? out?.url ?? "";
  if (typeof val === "string") return truncate(val, 55);
  return JSON.stringify(val).slice(0, 55);
}

function RunEntry({
  run,
  index,
  expanded,
  onToggle,
}: {
  run: WorkflowRunData;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const totalRuns = useWorkflowStore((s) => s.runs.length);
  const runNumber = totalRuns - index;

  return (
    <div className={cn("border-b border-border-secondary/50 transition-colors", expanded && "bg-bg-tertiary/40")}>
      {/* Run header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 hover:bg-bg-hover transition-colors group"
      >
        <div className="flex items-center gap-2 mb-1">
          {expanded
            ? <ChevronDown size={11} className="text-text-muted flex-shrink-0" />
            : <ChevronRight size={11} className="text-text-muted flex-shrink-0" />
          }
          <span className="text-[11px] font-semibold text-text-primary">Run #{runNumber}</span>
          <StatusBadge status={run.status} />
          {run.status === "running" && (
            <Loader2 size={11} className="text-purple spin ml-auto" />
          )}
        </div>
        <div className="flex items-center gap-3 pl-4">
          <span className="text-[10px] text-text-muted">{formatTimestamp(run.createdAt)}</span>
          {run.duration > 0 && (
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock size={9} />
              {formatDuration(run.duration)}
            </span>
          )}
          <span className="text-[10px] bg-bg-tertiary border border-border-primary px-1.5 py-0.5 rounded text-text-muted">
            {run.scope}
          </span>
        </div>
      </button>

      {/* Expanded node details */}
      {expanded && run.nodeRuns && run.nodeRuns.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5 fade-in">
          {run.nodeRuns.map((nr) => (
            <div
              key={nr.id}
              className="bg-bg-primary/60 border border-border-secondary/60 rounded-lg p-2 space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <NodeStatusIcon status={nr.status} />
                <span className="text-[11px] font-medium text-text-secondary flex-1 truncate">
                  {nodeTypeLabel(nr.nodeType)}
                </span>
                <span className="text-[10px] text-text-muted flex-shrink-0">
                  {formatDuration(nr.duration)}
                </span>
              </div>

              {nr.status === "success" && nodeOutput(nr) && (
                <p className="text-[10px] text-text-muted pl-4 font-mono break-all leading-relaxed">
                  └ {nodeOutput(nr)}
                </p>
              )}

              {nr.status === "failed" && nr.error && (
                <p className="text-[10px] text-red-400 pl-4 break-all leading-relaxed">
                  └ Error: {truncate(nr.error, 60)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && (!run.nodeRuns || run.nodeRuns.length === 0) && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-text-muted italic">No node details available yet</p>
        </div>
      )}
    </div>
  );
}

export default function RightSidebar() {
  const { runs, workflowId, setRuns } = useWorkflowStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRuns = useCallback(async () => {
    if (!workflowId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/runs?workflowId=${workflowId}`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }, [workflowId, setRuns]);

  // Auto-refresh while any run is "running"
  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === "running");
    if (!hasRunning) return;
    const timer = setInterval(fetchRuns, 3000);
    return () => clearInterval(timer);
  }, [runs, fetchRuns]);

  return (
    <aside className="w-60 flex flex-col bg-bg-secondary border-l border-border-secondary flex-shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border-secondary flex-shrink-0">
        <div className="flex items-center gap-2">
          <History size={14} className="text-text-muted" />
          <span className="text-sm font-semibold text-text-primary">History</span>
          {runs.length > 0 && (
            <span className="text-[10px] bg-bg-tertiary border border-border-primary rounded px-1.5 py-0.5 text-text-muted">
              {runs.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchRuns}
          disabled={refreshing}
          className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-md hover:bg-bg-tertiary"
          title="Refresh history"
        >
          <RefreshCw size={13} className={refreshing ? "spin" : ""} />
        </button>
      </div>

      {/* Run list */}
      <div className="flex-1 overflow-y-auto">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-primary flex items-center justify-center">
              <History size={18} className="text-text-dim" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">No runs yet</p>
              <p className="text-[10px] text-text-muted mt-1">Click "Run All" to execute your workflow</p>
            </div>
          </div>
        ) : (
          runs.map((run, i) => (
            <RunEntry
              key={run.id}
              run={run}
              index={i}
              expanded={expandedId === run.id}
              onToggle={() => setExpandedId(expandedId === run.id ? null : run.id)}
            />
          ))
        )}
      </div>

      {/* Footer stats */}
      {runs.length > 0 && (
        <div className="border-t border-border-secondary px-4 py-2.5 flex-shrink-0 flex items-center gap-3">
          <div className="text-[10px] text-text-muted flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {runs.filter((r) => r.status === "success").length} ok
          </div>
          <div className="text-[10px] text-text-muted flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {runs.filter((r) => r.status === "failed").length} failed
          </div>
          <div className="text-[10px] text-text-muted flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            {runs.filter((r) => r.status === "partial").length} partial
          </div>
        </div>
      )}
    </aside>
  );
}

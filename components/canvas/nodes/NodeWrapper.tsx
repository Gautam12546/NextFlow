"use client";

import { memo, type ReactNode } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { NodeStatus } from "@/types/nodes";

interface Props {
  id: string;
  title: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  children: ReactNode;
  minWidth?: number;
}

function statusClass(status: NodeStatus | undefined): string {
  if (status === "running") return "node-running";
  if (status === "success") return "node-success";
  if (status === "error") return "node-error";
  return "";
}

export const NodeWrapper = memo(function NodeWrapper({
  id, title, icon, iconBg, iconColor, children, minWidth = 240,
}: Props) {
  const { removeNode, executionStatus } = useWorkflowStore();
  const status = executionStatus[id];

  return (
    <div
      className={cn(
        "bg-bg-tertiary border border-border-primary rounded-xl shadow-xl overflow-visible transition-all duration-300",
        statusClass(status)
      )}
      style={{ minWidth, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-secondary/60">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <span className="text-xs font-semibold text-text-primary flex-1 leading-none">{title}</span>

        {/* Status dot */}
        {status && status !== "idle" && (
          <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
            status === "running" ? "bg-purple animate-pulse" :
            status === "success" ? "bg-green-500" : "bg-red-500"
          )} />
        )}

        <button
          onClick={() => removeNode(id)}
          className="text-text-dim hover:text-red-400 transition-colors ml-1 flex-shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">{children}</div>
    </div>
  );
});

// Field label
export function FieldLabel({ children, connected }: { children: ReactNode; connected?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{children}</span>
      {connected && (
        <span className="text-[9px] bg-purple/20 text-purple border border-purple/30 px-1 rounded">connected</span>
      )}
    </div>
  );
}

// Run button
export function RunButton({
  onClick, loading, disabled, label = "Run Node",
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        "w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all mt-2",
        loading || disabled
          ? "bg-purple/20 text-purple/50 cursor-not-allowed border border-purple/20"
          : "bg-purple/20 hover:bg-purple/30 text-purple border border-purple/40 hover:border-purple/60"
      )}
    >
      {loading ? (
        <>
          <span className="w-3 h-3 border-2 border-purple/30 border-t-purple rounded-full spin" />
          Running...
        </>
      ) : (
        <>▶ {label}</>
      )}
    </button>
  );
}

// Output display
export function OutputPanel({ output, error }: { output?: string; error?: string }) {
  if (!output && !error) return null;
  return (
    <div className={cn(
      "mt-2 p-2 rounded-md border text-[10px] leading-relaxed max-h-24 overflow-y-auto fade-in font-mono",
      error
        ? "bg-red-950/30 border-red-800/40 text-red-300"
        : "bg-bg-primary/60 border-border-primary text-green-300"
    )}>
      {error ? `⚠ ${error}` : output}
    </div>
  );
}

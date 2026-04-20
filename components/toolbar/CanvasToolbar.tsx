"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import {
  Save, Play, Undo2, Redo2, Download, Upload,
  LayoutDashboard, Loader2, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import LoadSampleButton from "@/components/canvas/SampleWorkflow";

export default function CanvasToolbar() {
  const {
    workflowId, workflowName, nodes, edges, isRunning,
    setWorkflowName, undo, redo, past, future,
    prependRun, setIsRunning, setExecutionStatus, setNodeOutput, updateRun,
  } = useWorkflowStore();

  const { fitView } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);

  async function handleSave() {
    if (!workflowId) return;
    setSaving(true);
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workflowName, nodes, edges }),
      });
      toast.success("Workflow saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleRun(scope: "full" | "partial" | "single" = "full") {
    if (!workflowId || isRunning) return;
    setIsRunning(true);

    // Reset statuses
    nodes.forEach((n) => setExecutionStatus(n.id, "idle"));

    try {
      // Create run record
      const createRes = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, scope }),
      });
      const run = await createRes.json();
      prependRun(run);

      // Trigger execution
      const execRes = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, scope }),
      });
      const { runId } = await execRes.json();

      toast.success("Workflow started!");

      // Poll for completion
      pollRunStatus(runId);
    } catch {
      toast.error("Failed to start workflow");
      setIsRunning(false);
    }
  }

  async function pollRunStatus(runId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        const run = await res.json();

        // Update node statuses based on nodeRuns
        for (const nr of run.nodeRuns || []) {
          setExecutionStatus(nr.nodeId, nr.status === "running" ? "running" : nr.status === "success" ? "success" : "error");
          if (nr.outputs) setNodeOutput(nr.nodeId, nr.outputs);
        }

        updateRun(run);

        if (run.status !== "running") {
          clearInterval(interval);
          setIsRunning(false);
          if (run.status === "success") toast.success("Workflow completed!");
          else if (run.status === "failed") toast.error("Workflow failed");
          else toast("Workflow partially completed", { icon: "⚠️" });
        }
      } catch {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 1500);
  }

  function handleExport() {
    const data = JSON.stringify({ name: workflowName, nodes, edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported!");
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.nodes && data.edges) {
          useWorkflowStore.getState().loadWorkflow(data.nodes, data.edges);
          if (data.name) setWorkflowName(data.name);
          toast.success("Workflow imported!");
        }
      } catch {
        toast.error("Invalid workflow file");
      }
    };
    input.click();
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary border-b border-border-secondary flex-shrink-0 h-12">
      {/* Logo / Back */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 mr-2 text-text-muted hover:text-text-primary transition-colors"
      >
        <LayoutDashboard size={16} />
      </Link>

      <div className="w-px h-5 bg-border-primary" />

      {/* Workflow Name */}
      {editingName ? (
        <input
          autoFocus
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          onBlur={() => { setEditingName(false); handleSave(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { setEditingName(false); handleSave(); } }}
          className="bg-bg-tertiary border border-purple/60 rounded-md px-2 py-1 text-sm text-text-primary outline-none min-w-0 w-40"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="text-sm font-medium text-text-primary hover:text-purple transition-colors truncate max-w-[180px]"
        >
          {workflowName}
        </button>
      )}

      <div className="w-px h-5 bg-border-primary" />

      {/* Undo / Redo */}
      <button
        onClick={undo}
        disabled={past.length === 0}
        title="Undo"
        className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 transition-all"
      >
        <Undo2 size={15} />
      </button>
      <button
        onClick={redo}
        disabled={future.length === 0}
        title="Redo"
        className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 transition-all"
      >
        <Redo2 size={15} />
      </button>

      <div className="w-px h-5 bg-border-primary" />

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-primary transition-all"
      >
        {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
        Save
      </button>

      {/* Export / Import */}
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-primary transition-all"
      >
        <Download size={13} />
        Export
      </button>
      <button
        onClick={handleImport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-primary transition-all"
      >
        <Upload size={13} />
        Import
      </button>

      <LoadSampleButton />

      <div className="w-px h-5 bg-border-primary" />

      {/* Fit View */}
      <button
        onClick={() => fitView({ padding: 0.1, duration: 400 })}
        className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all text-xs"
        title="Fit view"
      >
        ⊡
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Run Button */}
      <button
        onClick={() => handleRun("full")}
        disabled={isRunning || nodes.length === 0}
        className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
          isRunning
            ? "bg-purple/50 text-white/70 cursor-not-allowed"
            : "bg-purple hover:bg-purple-dark text-white shadow-lg shadow-purple/20"
        )}
      >
        {isRunning ? (
          <>
            <Loader2 size={14} className="spin" />
            Running...
          </>
        ) : (
          <>
            <Play size={14} fill="white" />
            Run All
          </>
        )}
      </button>
    </div>
  );
}

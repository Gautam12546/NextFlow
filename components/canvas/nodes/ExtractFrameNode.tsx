"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps, useEdges } from "@xyflow/react";
import { NodeWrapper, FieldLabel, RunButton, OutputPanel } from "./NodeWrapper";
import { useWorkflowStore } from "@/store/workflowStore";
import type { ExtractFrameNodeData } from "@/types/nodes";
import { Film } from "lucide-react";
import toast from "react-hot-toast";

export default memo(function ExtractFrameNode({ id, data }: NodeProps) {
  const { updateNodeData, workflowId, setExecutionStatus, setNodeOutput } = useWorkflowStore();
  const d = data as ExtractFrameNodeData;
  const edges = useEdges();
  const [loading, setLoading] = useState(false);

  const connectedHandles = new Set(
    edges.filter((e) => e.target === id).map((e) => e.targetHandle)
  );

  async function handleRun() {
    if (!workflowId) return;
    setLoading(true);
    setExecutionStatus(id, "running");
    const start = Date.now();

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, scope: "single", selectedNodeIds: [id] }),
      });
      const { runId } = await res.json();

      const poll = setInterval(async () => {
        const runRes = await fetch(`/api/runs/${runId}`);
        const run = await runRes.json();
        const nodeRun = run.nodeRuns?.find((nr: { nodeId: string }) => nr.nodeId === id);
        if (nodeRun && nodeRun.status !== "running") {
          clearInterval(poll);
          setLoading(false);
          if (nodeRun.status === "success") {
            const output = (nodeRun.outputs as { output?: string }).output || "";
            updateNodeData(id, { output });
            setNodeOutput(id, nodeRun.outputs as Record<string, unknown>);
            setExecutionStatus(id, "success");
            toast.success("Frame extracted!");
          } else {
            setExecutionStatus(id, "error");
            toast.error("Frame extraction failed: " + nodeRun.error);
          }
        }
        if (Date.now() - start > 120000) { clearInterval(poll); setLoading(false); }
      }, 1500);
    } catch {
      setLoading(false);
      setExecutionStatus(id, "error");
      toast.error("Failed to run frame extraction");
    }
  }

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        id="video_url"
        style={{ top: "40%" }}
        title="Video URL (video)"
      />

      <NodeWrapper
        id={id}
        title="Extract Frame"
        icon={<Film size={12} />}
        iconBg="rgba(232,121,249,0.15)"
        iconColor="#e879f9"
        minWidth={240}
      >
        <FieldLabel connected={connectedHandles.has("video_url")}>Video URL</FieldLabel>
        <input
          className="node-input"
          placeholder="https://... (mp4, mov, webm)"
          value={d.videoUrl || ""}
          onChange={(e) => updateNodeData(id, { videoUrl: e.target.value })}
          disabled={connectedHandles.has("video_url")}
        />

        <FieldLabel>Timestamp</FieldLabel>
        <input
          className="node-input"
          placeholder="0 (seconds) or 50%"
          value={d.timestamp || ""}
          onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
        />
        <p className="text-[10px] text-text-muted">Enter seconds (e.g. 5.2) or percentage (e.g. 50%)</p>

        <RunButton onClick={handleRun} loading={loading} label="Extract Frame" />

        {d.output && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border-primary fade-in">
            <img src={d.output} alt="Extracted frame" className="w-full object-cover" style={{ maxHeight: 100 }} />
          </div>
        )}

        {d.error && <OutputPanel error={d.error as string} />}
      </NodeWrapper>

      <Handle type="source" position={Position.Right} id="output" style={{ top: "50%" }} />
    </div>
  );
});

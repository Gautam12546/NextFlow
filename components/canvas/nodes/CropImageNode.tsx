"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps, useEdges } from "@xyflow/react";
import { NodeWrapper, FieldLabel, RunButton, OutputPanel } from "./NodeWrapper";
import { useWorkflowStore } from "@/store/workflowStore";
import type { CropImageNodeData } from "@/types/nodes";
import { Crop } from "lucide-react";
import toast from "react-hot-toast";

export default memo(function CropImageNode({ id, data }: NodeProps) {
  const { updateNodeData, workflowId, setExecutionStatus, setNodeOutput } = useWorkflowStore();
  const d = data as CropImageNodeData;
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
            toast.success("Image cropped!");
          } else {
            setExecutionStatus(id, "error");
            toast.error("Crop failed: " + nodeRun.error);
          }
        }
        if (Date.now() - start > 120000) { clearInterval(poll); setLoading(false); }
      }, 1500);
    } catch {
      setLoading(false);
      setExecutionStatus(id, "error");
      toast.error("Failed to run crop");
    }
  }

  function numInput(label: string, field: keyof CropImageNodeData, defaultVal: number) {
    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <input
          type="number"
          min={0}
          max={100}
          className="node-input"
          value={(d[field] as number) ?? defaultVal}
          onChange={(e) => updateNodeData(id, { [field]: parseFloat(e.target.value) || 0 })}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        id="image_url"
        style={{ top: "50%" }}
        title="Image URL (image)"
      />

      <NodeWrapper
        id={id}
        title="Crop Image"
        icon={<Crop size={12} />}
        iconBg="rgba(251,146,60,0.15)"
        iconColor="#fb923c"
        minWidth={240}
      >
        <FieldLabel connected={connectedHandles.has("image_url")}>Image URL</FieldLabel>
        <input
          className="node-input"
          placeholder="https://..."
          value={d.imageUrl || ""}
          onChange={(e) => updateNodeData(id, { imageUrl: e.target.value })}
          disabled={connectedHandles.has("image_url")}
        />

        <div className="grid grid-cols-2 gap-2 mt-1">
          {numInput("X %", "xPercent", 0)}
          {numInput("Y %", "yPercent", 0)}
          {numInput("Width %", "widthPercent", 100)}
          {numInput("Height %", "heightPercent", 100)}
        </div>

        <RunButton onClick={handleRun} loading={loading} label="Crop Image" />

        {d.output && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border-primary fade-in">
            <img src={d.output} alt="Cropped" className="w-full object-cover" style={{ maxHeight: 100 }} />
          </div>
        )}

        {d.error && <OutputPanel error={d.error as string} />}
      </NodeWrapper>

      <Handle type="source" position={Position.Right} id="output" style={{ top: "50%" }} />
    </div>
  );
});

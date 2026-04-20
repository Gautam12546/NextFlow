"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps, useEdges } from "@xyflow/react";
import { NodeWrapper, FieldLabel, RunButton, OutputPanel } from "./NodeWrapper";
import { useWorkflowStore } from "@/store/workflowStore";
import type { LLMNodeData } from "@/types/nodes";
import { GEMINI_MODELS } from "@/types/nodes";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default memo(function LLMNode({ id, data }: NodeProps) {
  const { updateNodeData, workflowId, setExecutionStatus, setNodeOutput } = useWorkflowStore();
  const d = data as LLMNodeData;
  const edges = useEdges();
  const [loading, setLoading] = useState(false);

  // Check which handles are connected
  const connectedHandles = new Set(
    edges.filter((e) => e.target === id).map((e) => e.targetHandle)
  );

  async function handleRunSingle() {
    if (!workflowId) return;
    setLoading(true);
    setExecutionStatus(id, "running");

    const start = Date.now();
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          scope: "single",
          selectedNodeIds: [id],
        }),
      });
      const { runId } = await res.json();

      // Poll for this specific node
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
            toast.success("LLM completed!");
          } else {
            setExecutionStatus(id, "error");
            updateNodeData(id, { error: nodeRun.error });
            toast.error("LLM failed: " + nodeRun.error);
          }
        }
        if (Date.now() - start > 120000) {
          clearInterval(poll);
          setLoading(false);
        }
      }, 1500);
    } catch (err) {
      setLoading(false);
      setExecutionStatus(id, "error");
      toast.error("Failed to run LLM node");
    }
  }

  return (
    <div className="relative">
      {/* Input handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="system_prompt"
        style={{ top: "30%" }}
        title="System Prompt (text)"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="user_message"
        style={{ top: "50%" }}
        title="User Message (text)"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="images"
        style={{ top: "70%" }}
        title="Images (image)"
      />

      <NodeWrapper
        id={id}
        title="Run Any LLM"
        icon={<Sparkles size={12} />}
        iconBg="rgba(96,165,250,0.15)"
        iconColor="#60a5fa"
        minWidth={260}
      >
        {/* Handle labels */}
        <div className="flex flex-col gap-1 mb-2 -mt-1">
          {[
            { label: "System Prompt", top: "30%" },
            { label: "User Message", top: "50%" },
            { label: "Images", top: "70%" },
          ].map((h) => (
            <div key={h.label} className="text-[9px] text-text-dim flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-border-primary" />
              {h.label}
            </div>
          ))}
        </div>

        {/* Model */}
        <FieldLabel>Model</FieldLabel>
        <select
          className="node-input"
          value={d.model || "gemini-1.5-flash"}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          {GEMINI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>

        {/* System Prompt */}
        <FieldLabel connected={connectedHandles.has("system_prompt")}>
          System Prompt
        </FieldLabel>
        <textarea
          className="node-input"
          rows={2}
          placeholder="Optional system instructions..."
          value={d.systemPrompt || ""}
          onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
          disabled={connectedHandles.has("system_prompt")}
        />

        {/* User Message */}
        <FieldLabel connected={connectedHandles.has("user_message")}>
          User Message
        </FieldLabel>
        <textarea
          className="node-input"
          rows={2}
          placeholder="What should the LLM do?"
          value={d.userMessage || ""}
          onChange={(e) => updateNodeData(id, { userMessage: e.target.value })}
          disabled={connectedHandles.has("user_message")}
        />

        <RunButton onClick={handleRunSingle} loading={loading} />

        <OutputPanel output={d.output} error={d.error as string | undefined} />
      </NodeWrapper>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ top: "50%" }}
        title="Text output"
      />
    </div>
  );
});

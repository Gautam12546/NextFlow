"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeWrapper, FieldLabel } from "./NodeWrapper";
import { useWorkflowStore } from "@/store/workflowStore";
import type { TextNodeData } from "@/types/nodes";
import { Type } from "lucide-react";

export default memo(function TextNode({ id, data }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
  const d = data as TextNodeData;

  return (
    <div className="relative">
      <NodeWrapper
        id={id}
        title="Text Node"
        icon={<Type size={12} />}
        iconBg="rgba(167,139,250,0.15)"
        iconColor="#a78bfa"
      >
        <FieldLabel>Content</FieldLabel>
        <textarea
          className="node-input"
          rows={4}
          placeholder="Type or paste your text here..."
          value={d.content || ""}
          onChange={(e) => updateNodeData(id, { content: e.target.value })}
        />
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

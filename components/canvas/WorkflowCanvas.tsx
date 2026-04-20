"use client";

import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  type NodeTypes,
  type EdgeTypes,
  type IsValidConnection,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "@/store/workflowStore";
import AnimatedEdge from "./edges/AnimatedEdge";
import TextNode from "./nodes/TextNode";
import UploadImageNode from "./nodes/UploadImageNode";
import UploadVideoNode from "./nodes/UploadVideoNode";
import LLMNode from "./nodes/LLMNode";
import CropImageNode from "./nodes/CropImageNode";
import ExtractFrameNode from "./nodes/ExtractFrameNode";
import type { NodeType } from "@/types/nodes";
import toast from "react-hot-toast";

const nodeTypes: NodeTypes = {
  textNode: TextNode,
  uploadImageNode: UploadImageNode,
  uploadVideoNode: UploadVideoNode,
  llmNode: LLMNode,
  cropImageNode: CropImageNode,
  extractFrameNode: ExtractFrameNode,
};

const edgeTypes: EdgeTypes = {
  animatedEdge: AnimatedEdge,
};

export default function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    removeNode,
  } = useWorkflowStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow") as NodeType;
      if (!type) return;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
      useWorkflowStore.getState().addNode(type, position);
    },
    [screenToFlowPosition]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const selectedNode = nodes.find((n) => n.selected);
        if (selectedNode) removeNode(selectedNode.id);
      }
    },
    [nodes, removeNode]
  );

  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
      const valid = onConnect(connection);
      if (!valid) {
        toast.error("Invalid connection — incompatible handle types");
      }
    },
    [onConnect]
  );

  const handleIsValidConnection: IsValidConnection = useCallback(
    (connection) => isValidConnection(connection),
    [isValidConnection]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 w-full h-full relative"
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" opacity="0.9" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={handleIsValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: "animatedEdge",
          animated: true,
          style: { stroke: "#8b5cf6", strokeWidth: 2 },
        }}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#2a2a2a"
          style={{ backgroundColor: "#0d0d0d" }}
        />
        <MiniMap
          nodeColor="#8b5cf630"
          nodeStrokeColor="#8b5cf660"
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: "#111", border: "1px solid #222", borderRadius: 10 }}
          position="bottom-right"
        />
        <Controls
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}
          position="bottom-left"
        />
      </ReactFlow>
    </div>
  );
}
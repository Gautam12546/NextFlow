"use client";

import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import type {
  Node, Edge, NodeChange, EdgeChange, Connection,
} from "@xyflow/react";
import type {
  FlowNode, NodeStatus, AnyNodeData, WorkflowRunData, NodeType,
} from "@/types/nodes";
// REPLACE with:
import { CONNECTION_RULES, HANDLE_DATA_TYPES } from "@/types/nodes";
import { generateId } from "@/lib/utils";

// ─── Default node data per type ───────────────────────────────────────────────

function defaultNodeData(type: NodeType): AnyNodeData {
  switch (type) {
    case "textNode":       return { type: "text", content: "" };
    case "uploadImageNode":return { type: "uploadImage" };
    case "uploadVideoNode":return { type: "uploadVideo" };
    case "llmNode":        return { type: "llm", model: "gemini-1.5-flash", systemPrompt: "", userMessage: "" };
    case "cropImageNode":  return { type: "cropImage", imageUrl: "", xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100 };
    case "extractFrameNode": return { type: "extractFrame", videoUrl: "", timestamp: "0" };
  }
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface WorkflowState {
  // Canvas
  nodes: FlowNode[];
  edges: Edge[];
  workflowId: string | null;
  workflowName: string;

  // Execution
  executionStatus: Record<string, NodeStatus>;
  nodeOutputs: Record<string, Record<string, unknown>>;
  currentRunId: string | null;
  isRunning: boolean;

  // History
  runs: WorkflowRunData[];

  // Undo/Redo
  past: Array<{ nodes: FlowNode[]; edges: Edge[] }>;
  future: Array<{ nodes: FlowNode[]; edges: Edge[] }>;

  // Actions
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => boolean;
  isValidConnection: (connection: Connection) => boolean;

  addNode: (type: NodeType, position?: { x: number; y: number }) => void;
  updateNodeData: (id: string, data: Partial<AnyNodeData>) => void;
  removeNode: (id: string) => void;

  setExecutionStatus: (id: string, status: NodeStatus) => void;
  setNodeOutput: (id: string, outputs: Record<string, unknown>) => void;
  setCurrentRunId: (id: string | null) => void;
  setIsRunning: (v: boolean) => void;

  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setRuns: (runs: WorkflowRunData[]) => void;
  prependRun: (run: WorkflowRunData) => void;
  updateRun: (run: WorkflowRunData) => void;

  resetExecution: () => void;
  loadWorkflow: (nodes: FlowNode[], edges: Edge[]) => void;

  undo: () => void;
  redo: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  workflowId: null,
  workflowName: "Untitled Workflow",
  executionStatus: {},
  nodeOutputs: {},
  currentRunId: null,
  isRunning: false,
  runs: [],
  past: [],
  future: [],

  onNodesChange: (changes) => {
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as FlowNode[] }));
  },

  onEdgesChange: (changes) => {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
  },

  isValidConnection: (connection) => {
    const { nodes, edges } = get();

    // Get source node type
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;

    // No self-loops
    if (connection.source === connection.target) return false;

    // Check data type compatibility
    const sourceHandle = connection.sourceHandle || "output";
    const targetHandle = connection.targetHandle || "input";

    const sourceDataType = HANDLE_DATA_TYPES[sourceNode.type as NodeType]?.[sourceHandle];
    const allowedTypes = CONNECTION_RULES[targetHandle];

    if (sourceDataType && allowedTypes && !allowedTypes.includes(sourceDataType)) {
      return false;
    }

    // Check for cycles
    const tempEdge: Edge = {
      id: "temp",
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    };
    // REPLACE with:
const visited = new Set<string>();
const inStack = new Set<string>();
const adj: Record<string, string[]> = {};
for (const node of nodes) adj[node.id] = [];
for (const edge of [...edges, tempEdge]) {
  adj[edge.source] = [...(adj[edge.source] || []), edge.target];
}
function dfs(id: string): boolean {
  visited.add(id); inStack.add(id);
  for (const nb of adj[id] || []) {
    if (!visited.has(nb) && dfs(nb)) return true;
    if (inStack.has(nb)) return true;
  }
  inStack.delete(id); return false;
}
for (const node of nodes) {
  if (!visited.has(node.id) && dfs(node.id)) return false;
}
return true;

  },

  onConnect: (connection) => {
    if (!get().isValidConnection(connection)) return false;
    set((s) => ({
      past: [...s.past.slice(-19), { nodes: s.nodes, edges: s.edges }],
      future: [],
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: { stroke: "#8b5cf6", strokeWidth: 2 },
          type: "animatedEdge",
        },
        s.edges
      ),
    }));
    return true;
  },

  addNode: (type, position = { x: 300, y: 200 }) => {
    const id = `${type}-${generateId()}`;
    const newNode: FlowNode = {
      id,
      type,
      position,
      data: defaultNodeData(type),
    } as FlowNode;

    set((s) => ({
      past: [...s.past.slice(-19), { nodes: s.nodes, edges: s.edges }],
      future: [],
      nodes: [...s.nodes, newNode],
    }));
  },

  updateNodeData: (id, data) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } as AnyNodeData } : n
      ) as FlowNode[],
    }));
  },

  removeNode: (id) => {
    set((s) => ({
      past: [...s.past.slice(-19), { nodes: s.nodes, edges: s.edges }],
      future: [],
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    }));
  },

  setExecutionStatus: (id, status) => {
    set((s) => ({ executionStatus: { ...s.executionStatus, [id]: status } }));
  },

  setNodeOutput: (id, outputs) => {
    set((s) => ({ nodeOutputs: { ...s.nodeOutputs, [id]: outputs } }));
  },

  setCurrentRunId: (id) => set({ currentRunId: id }),
  setIsRunning: (v) => set({ isRunning: v }),
  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setRuns: (runs) => set({ runs }),
  prependRun: (run) => set((s) => ({ runs: [run, ...s.runs] })),
  updateRun: (run) =>
    set((s) => ({ runs: s.runs.map((r) => (r.id === run.id ? run : r)) })),

  resetExecution: () => set({ executionStatus: {}, nodeOutputs: {}, currentRunId: null, isRunning: false }),

  loadWorkflow: (nodes, edges) => {
    set({ nodes, edges, past: [], future: [], executionStatus: {}, nodeOutputs: {} });
  },

  undo: () => {
    const { past, nodes, edges, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      past: past.slice(0, -1),
      future: [{ nodes, edges }, ...future.slice(0, 19)],
    });
  },

  redo: () => {
    const { past, nodes, edges, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past.slice(-19), { nodes, edges }],
      future: future.slice(1),
    });
  },
}));

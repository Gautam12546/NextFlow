import type { Edge } from "@xyflow/react";
import type { FlowNode, NodeExecutionResult, AnyNodeData } from "@/types/nodes";

// ─── Topological Sort (Kahn's Algorithm) ─────────────────────────────────────

export function topologicalSort(nodes: FlowNode[], edges: Edge[]): string[][] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adj[node.id] = [];
  }

  for (const edge of edges) {
    adj[edge.source].push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  }

  const waves: string[][] = [];
  let queue = Object.entries(inDegree)
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id);

  while (queue.length > 0) {
    waves.push([...queue]);
    const nextQueue: string[] = [];
    for (const nodeId of queue) {
      for (const neighbor of adj[nodeId] || []) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) nextQueue.push(neighbor);
      }
    }
    queue = nextQueue;
  }

  return waves;
}

// ─── Cycle Detection ──────────────────────────────────────────────────────────

export function hasCycle(nodes: FlowNode[], edges: Edge[]): boolean {
  const adj: Record<string, string[]> = {};
  for (const node of nodes) adj[node.id] = [];
  for (const edge of edges) adj[edge.source].push(edge.target);

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(id: string): boolean {
    visited.add(id);
    inStack.add(id);
    for (const neighbor of adj[id] || []) {
      if (!visited.has(neighbor) && dfs(neighbor)) return true;
      if (inStack.has(neighbor)) return true;
    }
    inStack.delete(id);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && dfs(node.id)) return true;
  }
  return false;
}

// ─── Output Resolver ─────────────────────────────────────────────────────────

export function resolveNodeInputs(
  nodeId: string,
  edges: Edge[],
  nodeOutputs: Record<string, Record<string, unknown>>,
  nodeData: Record<string, AnyNodeData>
): Record<string, unknown> {
  const incoming = edges.filter((e) => e.target === nodeId);
  const resolved: Record<string, unknown> = {};

  for (const edge of incoming) {
    const sourceOutput = nodeOutputs[edge.source];
    if (!sourceOutput) continue;

    const targetHandle = edge.targetHandle || "input";
    const sourceHandle = edge.sourceHandle || "output";

    if (targetHandle === "images") {
      const existing = (resolved["images"] as string[]) || [];
      resolved["images"] = [...existing, sourceOutput[sourceHandle]];
    } else {
      resolved[targetHandle] = sourceOutput[sourceHandle];
    }
  }

  // Merge with manual node data (connected inputs override manual)
  const data = nodeData[nodeId];
  if (data) {
    const merged: Record<string, unknown> = { ...resolved };
    if (!("system_prompt" in resolved) && "systemPrompt" in data) {
      merged["system_prompt"] = (data as Record<string, unknown>).systemPrompt;
    }
    if (!("user_message" in resolved) && "userMessage" in data) {
      merged["user_message"] = (data as Record<string, unknown>).userMessage;
    }
    if (!("image_url" in resolved) && "imageUrl" in data) {
      merged["image_url"] = (data as Record<string, unknown>).imageUrl;
    }
    if (!("video_url" in resolved) && "videoUrl" in data) {
      merged["video_url"] = (data as Record<string, unknown>).videoUrl;
    }
    return merged;
  }

  return resolved;
}

// ─── Execution Graph Filter (for partial/single runs) ────────────────────────

export function filterExecutionGraph(
  nodes: FlowNode[],
  edges: Edge[],
  selectedIds: string[]
): { nodes: FlowNode[]; edges: Edge[] } {
  const selectedSet = new Set(selectedIds);
  const filteredNodes = nodes.filter((n) => selectedSet.has(n.id));
  const filteredEdges = edges.filter(
    (e) => selectedSet.has(e.source) && selectedSet.has(e.target)
  );
  return { nodes: filteredNodes, edges: filteredEdges };
}

// ─── Result Aggregator ────────────────────────────────────────────────────────

export function aggregateRunStatus(
  results: NodeExecutionResult[]
): "success" | "failed" | "partial" {
  const total = results.length;
  const succeeded = results.filter((r) => r.status === "success").length;
  if (succeeded === total) return "success";
  if (succeeded === 0) return "failed";
  return "partial";
}

import type { Node, Edge } from "@xyflow/react";

// ─── Node Data Types ──────────────────────────────────────────────────────────

export type NodeStatus = "idle" | "running" | "success" | "error";

export interface BaseNodeData {
  status?: NodeStatus;
  error?: string;
  [key: string]: unknown;
}

export interface TextNodeData extends BaseNodeData {
  type: "text";
  content: string;
  output?: string;
}

export interface UploadImageNodeData extends BaseNodeData {
  type: "uploadImage";
  imageUrl?: string;
  fileName?: string;
  output?: string; // same as imageUrl
}

export interface UploadVideoNodeData extends BaseNodeData {
  type: "uploadVideo";
  videoUrl?: string;
  fileName?: string;
  output?: string; // same as videoUrl
}

export interface LLMNodeData extends BaseNodeData {
  type: "llm";
  model: string;
  systemPrompt?: string;
  userMessage?: string;
  images?: string[];
  output?: string;
}

export interface CropImageNodeData extends BaseNodeData {
  type: "cropImage";
  imageUrl?: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  output?: string;
}

export interface ExtractFrameNodeData extends BaseNodeData {
  type: "extractFrame";
  videoUrl?: string;
  timestamp: string;
  output?: string;
}

export type AnyNodeData =
  | TextNodeData
  | UploadImageNodeData
  | UploadVideoNodeData
  | LLMNodeData
  | CropImageNodeData
  | ExtractFrameNodeData;

// ─── Node Type Keys ───────────────────────────────────────────────────────────

export type NodeType =
  | "textNode"
  | "uploadImageNode"
  | "uploadVideoNode"
  | "llmNode"
  | "cropImageNode"
  | "extractFrameNode";

// ─── React Flow Typed Nodes ───────────────────────────────────────────────────

export type TextFlowNode = Node<TextNodeData, "textNode">;
export type UploadImageFlowNode = Node<UploadImageNodeData, "uploadImageNode">;
export type UploadVideoFlowNode = Node<UploadVideoNodeData, "uploadVideoNode">;
export type LLMFlowNode = Node<LLMNodeData, "llmNode">;
export type CropImageFlowNode = Node<CropImageNodeData, "cropImageNode">;
export type ExtractFrameFlowNode = Node<ExtractFrameNodeData, "extractFrameNode">;

export type FlowNode =
  | TextFlowNode
  | UploadImageFlowNode
  | UploadVideoFlowNode
  | LLMFlowNode
  | CropImageFlowNode
  | ExtractFrameFlowNode;

// ─── Handle Types for Connection Validation ───────────────────────────────────

export type HandleDataType = "text" | "image" | "video";

export interface HandleMeta {
  nodeType: NodeType;
  handleId: string;
  dataType: HandleDataType;
  kind: "source" | "target";
}

export const CONNECTION_RULES: Record<string, HandleDataType[]> = {
  // target handle id → allowed source data types
  system_prompt: ["text"],
  user_message: ["text"],
  images: ["image"],
  image_url: ["image"],
  video_url: ["video"],
};

export const HANDLE_DATA_TYPES: Record<string, Record<string, HandleDataType>> = {
  textNode: { output: "text" },
  uploadImageNode: { output: "image" },
  uploadVideoNode: { output: "video" },
  llmNode: {
    output: "text",
    system_prompt: "text",
    user_message: "text",
    images: "image",
  },
  cropImageNode: { output: "image", image_url: "image" },
  extractFrameNode: { output: "image", video_url: "video" },
};

// ─── Workflow Types ───────────────────────────────────────────────────────────

export interface WorkflowData {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunData {
  id: string;
  workflowId: string;
  userId: string;
  status: "running" | "success" | "failed" | "partial";
  scope: "full" | "partial" | "single";
  duration: number;
  createdAt: string;
  nodeRuns: NodeRunData[];
}

export interface NodeRunData {
  id: string;
  workflowRunId: string;
  nodeId: string;
  nodeType: string;
  status: "running" | "success" | "failed";
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  error?: string;
  duration: number;
  createdAt: string;
}

// ─── Execution Types ──────────────────────────────────────────────────────────

export interface ExecutePayload {
  workflowId: string;
  scope: "full" | "partial" | "single";
  selectedNodeIds?: string[];
}

export interface NodeExecutionResult {
  nodeId: string;
  status: "success" | "failed";
  outputs: Record<string, unknown>;
  error?: string;
  duration: number;
}

// ─── Gemini Models ────────────────────────────────────────────────────────────

export const GEMINI_MODELS = [
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Fast)" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Smart)" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Latest)" },
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number]["id"];

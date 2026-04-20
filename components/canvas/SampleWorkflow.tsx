"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import type { FlowNode } from "@/types/nodes";
import type { Edge } from "@xyflow/react";
import toast from "react-hot-toast";
import { Wand2 } from "lucide-react";

export function useSampleWorkflow() {
  const { loadWorkflow, setWorkflowName } = useWorkflowStore();

  const loadSample = useCallback(() => {
    const nodes: FlowNode[] = [
      // ── BRANCH A ─────────────────────────────────────────────────────
      {
        id: "img-upload-1",
        type: "uploadImageNode",
        position: { x: 60, y: 60 },
        data: { type: "uploadImage" },
      },
      {
        id: "crop-1",
        type: "cropImageNode",
        position: { x: 360, y: 60 },
        data: {
          type: "cropImage",
          xPercent: 10,
          yPercent: 10,
          widthPercent: 80,
          heightPercent: 80,
        },
      },
      {
        id: "text-system-1",
        type: "textNode",
        position: { x: 60, y: 280 },
        data: {
          type: "text",
          content:
            "You are a professional marketing copywriter. Write compelling, concise product descriptions.",
        },
      },
      {
        id: "text-product-1",
        type: "textNode",
        position: { x: 60, y: 450 },
        data: {
          type: "text",
          content:
            "Product: Wireless Bluetooth Headphones. Features: 40hr battery, noise cancellation, premium sound.",
        },
      },
      {
        id: "llm-1",
        type: "llmNode",
        position: { x: 660, y: 200 },
        data: {
          type: "llm",
          model: "gemini-1.5-flash",
          systemPrompt: "",
          userMessage: "",
        },
      },

      // ── BRANCH B ─────────────────────────────────────────────────────
      {
        id: "vid-upload-1",
        type: "uploadVideoNode",
        position: { x: 60, y: 650 },
        data: { type: "uploadVideo" },
      },
      {
        id: "frame-1",
        type: "extractFrameNode",
        position: { x: 360, y: 650 },
        data: { type: "extractFrame", timestamp: "50%" },
      },

      // ── CONVERGENCE ──────────────────────────────────────────────────
      {
        id: "text-system-2",
        type: "textNode",
        position: { x: 660, y: 580 },
        data: {
          type: "text",
          content:
            "You are a creative social media manager. Write a punchy tweet (max 280 chars) with emojis for this product.",
        },
      },
      {
        id: "llm-2",
        type: "llmNode",
        position: { x: 980, y: 380 },
        data: {
          type: "llm",
          model: "gemini-1.5-flash",
          systemPrompt: "",
          userMessage: "",
        },
      },
    ] as FlowNode[];

    const edgeStyle = { stroke: "#8b5cf6", strokeWidth: 2 };

    const edges: Edge[] = [
      // Branch A connections
      {
        id: "e-img-crop",
        source: "img-upload-1",
        target: "crop-1",
        sourceHandle: "output",
        targetHandle: "image_url",
        type: "animatedEdge",
        animated: true,
        style: edgeStyle,
      },
      {
        id: "e-text-sys-llm1",
        source: "text-system-1",
        target: "llm-1",
        sourceHandle: "output",
        targetHandle: "system_prompt",
        type: "animatedEdge",
        animated: true,
        style: edgeStyle,
      },
      {
        id: "e-text-prod-llm1",
        source: "text-product-1",
        target: "llm-1",
        sourceHandle: "output",
        targetHandle: "user_message",
        type: "animatedEdge",
        animated: true,
        style: edgeStyle,
      },
      {
        id: "e-crop-llm1",
        source: "crop-1",
        target: "llm-1",
        sourceHandle: "output",
        targetHandle: "images",
        type: "animatedEdge",
        animated: true,
        style: edgeStyle,
      },

      // Branch B connections
      {
        id: "e-vid-frame",
        source: "vid-upload-1",
        target: "frame-1",
        sourceHandle: "output",
        targetHandle: "video_url",
        type: "animatedEdge",
        animated: true,
        style: edgeStyle,
      },

      // Convergence
      {
        id: "e-text-sys2-llm2",
        source: "text-system-2",
        target: "llm-2",
        sourceHandle: "output",
        targetHandle: "system_prompt",
        type: "animatedEdge",
        animated: true,
        style: edgeStyle,
      },
      {
        id: "e-llm1-llm2",
        source: "llm-1",
        target: "llm-2",
        sourceHandle: "output",
        targetHandle: "user_message",
        type: "animatedEdge",
        animated: true,
        style: edgeStyle,
      },
      {
        id: "e-crop-llm2",
        source: "crop-1",
        target: "llm-2",
        sourceHandle: "output",
        targetHandle: "images",
        type: "animatedEdge",
        animated: true,
        style: edgeStyle,
      },
      {
        id: "e-frame-llm2",
        source: "frame-1",
        target: "llm-2",
        sourceHandle: "output",
        targetHandle: "images",
        type: "animatedEdge",
        animated: true,
        style: edgeStyle,
      },
    ];

    loadWorkflow(nodes, edges);
    setWorkflowName("Product Marketing Kit");
    toast.success("Demo workflow loaded! Upload an image and video to run it.", { duration: 5000 });
  }, [loadWorkflow, setWorkflowName]);

  return { loadSample };
}

export default function LoadSampleButton() {
  const { loadSample } = useSampleWorkflow();

  return (
    <button
      onClick={loadSample}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-purple hover:text-purple-light bg-purple/10 hover:bg-purple/20 border border-purple/30 transition-all"
    >
      <Wand2 size={12} />
      Load Demo
    </button>
  );
}

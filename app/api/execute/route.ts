import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks } from "@trigger.dev/sdk/v3";
import { topologicalSort, filterExecutionGraph, resolveNodeInputs, aggregateRunStatus } from "@/lib/executionEngine";
import type { FlowNode, AnyNodeData, NodeExecutionResult } from "@/types/nodes";
import type { Edge } from "@xyflow/react";

const ExecuteSchema = z.object({
  workflowId: z.string(),
  scope: z.enum(["full", "partial", "single"]).default("full"),
  selectedNodeIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workflowId, scope, selectedNodeIds } = ExecuteSchema.parse(body);

    const workflow = await db.workflow.findFirst({ where: { id: workflowId, userId } });
    if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    // Create run record
    const run = await db.workflowRun.create({
      data: { workflowId, userId, status: "running", scope },
    });

    const allNodes = (workflow.nodes as unknown as FlowNode[]) || [];
    const allEdges = (workflow.edges as unknown as Edge[]) || [];

    // Filter for partial/single runs
    let nodes = allNodes;
    let edges = allEdges;
    if ((scope === "partial" || scope === "single") && selectedNodeIds?.length) {
      const filtered = filterExecutionGraph(allNodes, allEdges, selectedNodeIds);
      nodes = filtered.nodes;
      edges = filtered.edges;
    }

    // Execute in background (non-blocking response)
    executeWorkflow(nodes, edges, run.id, userId).catch(console.error);

    return NextResponse.json({ runId: run.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function executeWorkflow(
  nodes: FlowNode[],
  edges: Edge[],
  runId: string,
  _userId: string
) {
  const startTime = Date.now();
  const nodeOutputs: Record<string, Record<string, unknown>> = {};
  const results: NodeExecutionResult[] = [];

  try {
    const waves = topologicalSort(nodes, edges);

    for (const wave of waves) {
      // Execute nodes in each wave in parallel
      const waveResults = await Promise.all(
        wave.map(async (nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          if (!node) return null;

          const nodeStart = Date.now();

          // Update node run status to running
          await db.nodeRun.create({
            data: {
              workflowRunId: runId,
              nodeId,
              nodeType: node.type || "unknown",
              status: "running",
              inputs: {},
              outputs: {},
            },
          });

          try {
            const inputs = resolveNodeInputs(nodeId, edges, nodeOutputs, {
              [nodeId]: node.data as AnyNodeData,
            });

            const output = await executeNode(node, inputs);
            nodeOutputs[nodeId] = output;

            const duration = Date.now() - nodeStart;

            await db.nodeRun.updateMany({
              where: { workflowRunId: runId, nodeId },
              data: { status: "success", inputs, outputs: output, duration },
            });

            return { nodeId, status: "success" as const, outputs: output, duration };
          } catch (err) {
            const duration = Date.now() - nodeStart;
            const errorMsg = err instanceof Error ? err.message : "Unknown error";

            await db.nodeRun.updateMany({
              where: { workflowRunId: runId, nodeId },
              data: { status: "failed", error: errorMsg, duration },
            });

            return { nodeId, status: "failed" as const, outputs: {}, error: errorMsg, duration };
          }
        })
      );

      results.push(...(waveResults.filter(Boolean) as NodeExecutionResult[]));
    }

    const finalStatus = aggregateRunStatus(results);
    const totalDuration = Date.now() - startTime;

    await db.workflowRun.update({
      where: { id: runId },
      data: { status: finalStatus, duration: totalDuration },
    });
  } catch (err) {
    await db.workflowRun.update({
      where: { id: runId },
      data: { status: "failed", duration: Date.now() - startTime },
    });
    throw err;
  }
}

async function executeNode(
  node: FlowNode,
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const data = node.data as AnyNodeData;

  switch (node.type) {
    case "textNode": {
      const content = (data as { content: string }).content;
      return { output: content };
    }

    case "uploadImageNode": {
      const imageUrl = (data as { imageUrl?: string }).imageUrl || "";
      return { output: imageUrl };
    }

    case "uploadVideoNode": {
      const videoUrl = (data as { videoUrl?: string }).videoUrl || "";
      return { output: videoUrl };
    }

    case "llmNode": {
      const llmData = data as { model: string; systemPrompt?: string; userMessage?: string };
      const handle = await tasks.triggerAndWait("run-llm-node", {
        model: llmData.model || "gemini-1.5-flash",
        systemPrompt: (inputs["system_prompt"] as string) || llmData.systemPrompt,
        userMessage: (inputs["user_message"] as string) || llmData.userMessage || "",
        images: (inputs["images"] as string[]) || [],
      });
      if (handle.ok) return { output: (handle.output as { output: string }).output };
      throw new Error("LLM task failed");
    }

    case "cropImageNode": {
      const cropData = data as {
        imageUrl?: string; xPercent: number; yPercent: number;
        widthPercent: number; heightPercent: number;
      };
      const handle = await tasks.triggerAndWait("crop-image-node", {
        imageUrl: (inputs["image_url"] as string) || cropData.imageUrl || "",
        xPercent: cropData.xPercent,
        yPercent: cropData.yPercent,
        widthPercent: cropData.widthPercent,
        heightPercent: cropData.heightPercent,
      });
      if (handle.ok) return { output: (handle.output as { output: string }).output };
      throw new Error("Crop image task failed");
    }

    case "extractFrameNode": {
      const frameData = data as { videoUrl?: string; timestamp: string };
      const handle = await tasks.triggerAndWait("extract-frame-node", {
        videoUrl: (inputs["video_url"] as string) || frameData.videoUrl || "",
        timestamp: frameData.timestamp || "0",
      });
      if (handle.ok) return { output: (handle.output as { output: string }).output };
      throw new Error("Extract frame task failed");
    }

    default:
      return {};
  }
}

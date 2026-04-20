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
    executeWorkflow(nodes, edges, run.id, userId).catch((error) => {
      console.error("Background workflow execution failed:", error);
    });

    return NextResponse.json({ runId: run.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error("Validation error:", err.errors);
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Error in execute endpoint:", err);
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

          // Create node run record
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
              data: { 
                status: "success", 
                inputs: JSON.parse(JSON.stringify(inputs)),
                outputs: JSON.parse(JSON.stringify(output)), 
                duration 
              },
            });

            return { nodeId, status: "success" as const, outputs: output, duration };
          } catch (err) {
            const duration = Date.now() - nodeStart;
            const errorMsg = err instanceof Error ? err.message : "Unknown error";

            console.error(`Node ${nodeId} execution failed:`, errorMsg);

            await db.nodeRun.updateMany({
              where: { workflowRunId: runId, nodeId },
              data: { 
                status: "failed", 
                error: errorMsg, 
                duration,
                outputs: {} 
              },
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

    console.log(`Workflow ${runId} completed with status: ${finalStatus}`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`Workflow ${runId} execution failed:`, errorMsg);
    
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
      try {
        const llmData = data as { model: string; systemPrompt?: string; userMessage?: string };
        const userMessage = (inputs["user_message"] as string) || llmData.userMessage || "";
        
        if (!userMessage.trim()) {
          throw new Error("User message is required for LLM node");
        }

        const handle = await tasks.triggerAndWait("run-llm-node", {
          model: llmData.model || "gemini-1.5-flash",
          systemPrompt: (inputs["system_prompt"] as string) || llmData.systemPrompt,
          userMessage: userMessage,
          images: (inputs["images"] as string[]) || [],
        });
        
        if (handle.ok) {
          return { output: (handle.output as { output: string }).output };
        }
        throw new Error((handle.error as any)?.message || "LLM task failed");
      } catch (error) {
        console.error("LLM execution error:", error);
        throw error;
      }
    }

    case "cropImageNode": {
      try {
        const cropData = data as {
          imageUrl?: string; xPercent: number; yPercent: number;
          widthPercent: number; heightPercent: number;
        };
        const imageUrl = (inputs["image_url"] as string) || cropData.imageUrl || "";
        
        if (!imageUrl.trim()) {
          throw new Error("Image URL is required for crop operation");
        }

        const handle = await tasks.triggerAndWait("crop-image-node", {
          imageUrl: imageUrl,
          xPercent: cropData.xPercent,
          yPercent: cropData.yPercent,
          widthPercent: cropData.widthPercent,
          heightPercent: cropData.heightPercent,
        });
        
        if (handle.ok) {
          return { output: (handle.output as { output: string }).output };
        }
        throw new Error((handle.error as any)?.message || "Crop image task failed");
      } catch (error) {
        console.error("Crop image execution error:", error);
        throw error;
      }
    }

    case "extractFrameNode": {
      try {
        const frameData = data as { videoUrl?: string; timestamp: string };
        const videoUrl = (inputs["video_url"] as string) || frameData.videoUrl || "";
        
        if (!videoUrl.trim()) {
          throw new Error("Video URL is required for frame extraction");
        }

        const handle = await tasks.triggerAndWait("extract-frame-node", {
          videoUrl: videoUrl,
          timestamp: frameData.timestamp || "0",
        });
        
        if (handle.ok) {
          return { output: (handle.output as { output: string }).output };
        }
        throw new Error((handle.error as any)?.message || "Extract frame task failed");
      } catch (error) {
        console.error("Frame extraction error:", error);
        throw error;
      }
    }

    default: {
      // FIXED: Removed node.type that was causing the error
      console.warn("Unknown node type");
      return {};
    }
  }
}

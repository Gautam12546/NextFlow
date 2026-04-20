import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const run = await db.workflowRun.findFirst({
      where: { id, userId },
      include: { nodeRuns: { orderBy: { createdAt: "asc" } } },
    });

    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(run);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const UpdateRunSchema = z.object({
  status: z.enum(["running", "success", "failed", "partial"]).optional(),
  duration: z.number().optional(),
  nodeRuns: z
    .array(
      z.object({
        nodeId: z.string(),
        nodeType: z.string(),
        status: z.enum(["running", "success", "failed"]),
        inputs: z.record(z.unknown()).default({}),
        outputs: z.record(z.unknown()).default({}),
        error: z.string().optional(),
        duration: z.number().default(0),
      })
    )
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await db.workflowRun.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = UpdateRunSchema.parse(body);

    const updated = await db.workflowRun.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.nodeRuns && {
          nodeRuns: {
            createMany: {
              data: data.nodeRuns.map((nr) => ({
                nodeId: nr.nodeId,
                nodeType: nr.nodeType,
                status: nr.status,
                inputs: nr.inputs,
                outputs: nr.outputs,
                error: nr.error,
                duration: nr.duration,
                workflowRunId: id,
              })),
            },
          },
        }),
      },
      include: { nodeRuns: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("workflowId");
    if (!workflowId) return NextResponse.json({ error: "workflowId required" }, { status: 400 });

    const workflow = await db.workflow.findFirst({ where: { id: workflowId, userId } });
    if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const runs = await db.workflowRun.findMany({
      where: { workflowId, userId },
      include: { nodeRuns: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(runs);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const CreateRunSchema = z.object({
  workflowId: z.string(),
  scope: z.enum(["full", "partial", "single"]).default("full"),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workflowId, scope } = CreateRunSchema.parse(body);

    const workflow = await db.workflow.findFirst({ where: { id: workflowId, userId } });
    if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const run = await db.workflowRun.create({
      data: { workflowId, userId, status: "running", scope },
      include: { nodeRuns: true },
    });

    return NextResponse.json(run, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

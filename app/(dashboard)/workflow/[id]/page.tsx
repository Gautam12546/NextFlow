import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import WorkflowEditor from "@/components/WorkflowEditor";

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const workflow = await db.workflow.findFirst({ where: { id, userId } });
  if (!workflow) notFound();

  const runs = await db.workflowRun.findMany({
    where: { workflowId: id, userId },
    include: { nodeRuns: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <WorkflowEditor
      workflowId={workflow.id}
      workflowName={workflow.name}
      initialNodes={workflow.nodes as unknown[]}
      initialEdges={workflow.edges as unknown[]}
      initialRuns={JSON.parse(JSON.stringify(runs))}
    />
  );
}

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { formatTimestamp } from "@/lib/utils";
import NewWorkflowButton from "@/components/dashboard/NewWorkflowButton";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const workflows = await db.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { runs: true } } },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-[#222] bg-[#111] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">N</div>
          <span className="text-lg font-semibold">NextFlow</span>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">My Workflows</h1>
            <p className="text-gray-500 text-sm mt-1">{workflows.length} workflow{workflows.length !== 1 ? "s" : ""}</p>
          </div>
          <NewWorkflowButton />
        </div>

        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4 text-3xl">⚡</div>
            <h2 className="text-lg font-medium mb-2">No workflows yet</h2>
            <p className="text-gray-500 text-sm mb-6">Create your first AI workflow to get started</p>
            <NewWorkflowButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf) => (
              <Link
                key={wf.id}
                href={`/workflow/${wf.id}`}
                className="block bg-[#111] border border-[#222] rounded-xl p-5 hover:border-violet-500/40 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-violet-600/10 rounded-lg flex items-center justify-center border border-violet-500/20 text-violet-400 text-lg">⚡</div>
                  <span className="text-xs text-gray-500 bg-[#1a1a1a] px-2 py-1 rounded-md border border-[#2a2a2a]">
                    {wf._count.runs} run{wf._count.runs !== 1 ? "s" : ""}
                  </span>
                </div>
                <h3 className="font-medium truncate">{wf.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Updated {formatTimestamp(wf.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
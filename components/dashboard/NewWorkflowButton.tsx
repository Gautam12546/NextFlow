"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";

export default function NewWorkflowButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Workflow", nodes: [], edges: [] }),
      });
      const wf = await res.json();
      router.push(`/workflow/${wf.id}`);
    } catch {
      toast.error("Failed to create workflow");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="flex items-center gap-2 bg-purple hover:bg-purple-dark disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" />
      ) : (
        <Plus size={16} />
      )}
      New Workflow
    </button>
  );
}

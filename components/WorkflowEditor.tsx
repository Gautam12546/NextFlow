"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import WorkflowCanvas from "@/components/canvas/WorkflowCanvas";
import LeftSidebar from "@/components/sidebar/LeftSidebar";
import RightSidebar from "@/components/sidebar/RightSidebar";
import CanvasToolbar from "@/components/toolbar/CanvasToolbar";
import type { FlowNode, WorkflowRunData } from "@/types/nodes";
import type { Edge } from "@xyflow/react";

interface Props {
  workflowId: string;
  workflowName: string;
  initialNodes: unknown[];
  initialEdges: unknown[];
  initialRuns: WorkflowRunData[];
}

export default function WorkflowEditor({
  workflowId,
  workflowName,
  initialNodes,
  initialEdges,
  initialRuns,
}: Props) {
  const { setWorkflowId, setWorkflowName, loadWorkflow, setRuns } = useWorkflowStore();

  useEffect(() => {
    setWorkflowId(workflowId);
    setWorkflowName(workflowName);
    loadWorkflow(initialNodes as FlowNode[], initialEdges as Edge[]);
    setRuns(initialRuns);
  }, [workflowId]);

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-bg-primary">
        <LeftSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <CanvasToolbar />
          <WorkflowCanvas />
        </div>
        <RightSidebar />
      </div>
    </ReactFlowProvider>
  );
}

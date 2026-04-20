import { BaseEdge, EdgeProps, getSmoothStepPath } from "@xyflow/react";

export default function AnimatedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, selected,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 8,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: selected ? "#a78bfa" : "#8b5cf6",
        strokeWidth: selected ? 2.5 : 2,
        strokeDasharray: "6 4",
        animation: "dash 0.6s linear infinite",
        opacity: 0.9,
      }}
      markerEnd="url(#arrowhead)"
    />
  );
}

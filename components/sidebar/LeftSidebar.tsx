"use client";

import { useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import type { NodeType } from "@/types/nodes";
import {
  Type, ImageIcon, Video, Sparkles, Crop, Film,
  ChevronLeft, ChevronRight, Search, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

interface NodeDef {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  dotColor: string;
  iconBg: string;
  iconColor: string;
}

const NODE_DEFS: NodeDef[] = [
  {
    type: "textNode",
    label: "Text Node",
    description: "Text input with output handle",
    icon: <Type size={14} />,
    dotColor: "#a78bfa",
    iconBg: "rgba(167,139,250,0.15)",
    iconColor: "#a78bfa",
  },
  {
    type: "uploadImageNode",
    label: "Upload Image",
    description: "Upload JPG, PNG, WEBP, GIF",
    icon: <ImageIcon size={14} />,
    dotColor: "#34d399",
    iconBg: "rgba(52,211,153,0.15)",
    iconColor: "#34d399",
  },
  {
    type: "uploadVideoNode",
    label: "Upload Video",
    description: "Upload MP4, MOV, WEBM, M4V",
    icon: <Video size={14} />,
    dotColor: "#f472b6",
    iconBg: "rgba(244,114,182,0.15)",
    iconColor: "#f472b6",
  },
  {
    type: "llmNode",
    label: "Run Any LLM",
    description: "Google Gemini AI model",
    icon: <Sparkles size={14} />,
    dotColor: "#60a5fa",
    iconBg: "rgba(96,165,250,0.15)",
    iconColor: "#60a5fa",
  },
  {
    type: "cropImageNode",
    label: "Crop Image",
    description: "FFmpeg image crop by %",
    icon: <Crop size={14} />,
    dotColor: "#fb923c",
    iconBg: "rgba(251,146,60,0.15)",
    iconColor: "#fb923c",
  },
  {
    type: "extractFrameNode",
    label: "Extract Frame",
    description: "Extract video frame via FFmpeg",
    icon: <Film size={14} />,
    dotColor: "#e879f9",
    iconBg: "rgba(232,121,249,0.15)",
    iconColor: "#e879f9",
  },
];

export default function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const { addNode } = useWorkflowStore();
  const { screenToFlowPosition } = useReactFlow();

  const filtered = NODE_DEFS.filter(
    (n) =>
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, type: NodeType) => {
      e.dataTransfer.setData("application/reactflow", type);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  function handleAddNode(type: NodeType) {
    // Add at a slightly randomized center position
    addNode(type, {
      x: 300 + Math.random() * 80 - 40,
      y: 200 + Math.random() * 80 - 40,
    });
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-bg-secondary border-r border-border-secondary transition-all duration-300 flex-shrink-0 h-full",
        collapsed ? "w-12" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-border-secondary flex-shrink-0 h-12",
        collapsed ? "justify-center px-0" : "gap-2.5 px-4"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-purple rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            N
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-text-primary truncate">NextFlow</span>
          )}
        </Link>
      </div>

      {!collapsed && (
        <>
          {/* Search */}
          <div className="px-3 pt-3 pb-1 flex-shrink-0">
            <div className="flex items-center gap-2 bg-bg-tertiary border border-border-primary rounded-lg px-2.5 py-1.5">
              <Search size={12} className="text-text-muted flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search nodes..."
                className="bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none flex-1 min-w-0"
              />
            </div>
          </div>

          {/* Section label */}
          <div className="px-4 pt-3 pb-1 flex-shrink-0">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={10} />
              Quick Access
            </p>
          </div>

          {/* Node buttons */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {filtered.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => handleDragStart(e, node.type)}
                onClick={() => handleAddNode(node.type)}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-bg-hover transition-all duration-150 select-none"
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: node.iconBg, color: node.iconColor }}
                >
                  {node.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary truncate leading-tight">{node.label}</p>
                  <p className="text-[10px] text-text-muted truncate leading-tight mt-0.5">{node.description}</p>
                </div>
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: node.dotColor }}
                />
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="text-xs text-text-muted text-center py-6">No nodes found</p>
            )}
          </div>

          {/* Drag hint */}
          <div className="px-3 py-2 border-t border-border-secondary flex-shrink-0">
            <p className="text-[10px] text-text-muted text-center">
              Click or drag onto canvas
            </p>
          </div>
        </>
      )}

      {/* User + Collapse button */}
      <div className={cn(
        "flex items-center border-t border-border-secondary flex-shrink-0 py-2",
        collapsed ? "flex-col gap-2 px-2" : "gap-2 px-3"
      )}>
        {!collapsed && <UserButton afterSignOutUrl="/sign-in" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all",
            collapsed ? "w-8 h-8" : "ml-auto w-7 h-7"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}

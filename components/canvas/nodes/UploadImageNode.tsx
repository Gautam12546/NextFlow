"use client";

import { memo, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeWrapper, FieldLabel } from "./NodeWrapper";
import { useWorkflowStore } from "@/store/workflowStore";
import type { UploadImageNodeData } from "@/types/nodes";
import { ImageIcon, Upload, X } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

export default memo(function UploadImageNode({ id, data }: NodeProps) {
  const { updateNodeData } = useWorkflowStore();
  const d = data as UploadImageNodeData;
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Use JPG, PNG, WEBP, or GIF.");
      return;
    }

    const uploadPromise = uploadToTransloadit(file);
    toast.promise(uploadPromise, {
      loading: "Uploading image...",
      success: "Image uploaded!",
      error: "Upload failed",
    });

    try {
      const url = await uploadPromise;
      updateNodeData(id, { imageUrl: url, fileName: file.name, output: url });
    } catch {
      // error handled by toast
    }
  }

  async function uploadToTransloadit(file: File): Promise<string> {
    const key = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY;
    const templateId = process.env.NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID;

    if (!key || !templateId) {
      // Fallback: create object URL for demo
      return URL.createObjectURL(file);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("params", JSON.stringify({ auth: { key }, template_id: templateId }));

    const res = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // Poll for completion
    let assembly = data;
    let attempts = 0;
    while (assembly.ok !== "ASSEMBLY_COMPLETED" && assembly.ok !== "ASSEMBLY_FAILED" && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(`https://api2.transloadit.com/assemblies/${assembly.assembly_id}`);
      assembly = await poll.json();
      attempts++;
    }

    if (assembly.ok === "ASSEMBLY_FAILED") throw new Error("Transloadit assembly failed");

    const firstKey = Object.keys(assembly.results)[0];
    return assembly.results[firstKey][0].ssl_url;
  }

  return (
    <div className="relative">
      <NodeWrapper
        id={id}
        title="Upload Image"
        icon={<ImageIcon size={12} />}
        iconBg="rgba(52,211,153,0.15)"
        iconColor="#34d399"
        minWidth={240}
      >
        {!d.imageUrl ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-border-primary hover:border-green-500/50 hover:bg-green-500/5 rounded-lg p-4 flex flex-col items-center gap-2 transition-all cursor-pointer"
          >
            <Upload size={20} className="text-text-muted" />
            <div className="text-center">
              <p className="text-xs font-medium text-text-secondary">Click to upload</p>
              <p className="text-[10px] text-text-muted mt-0.5">JPG, PNG, WEBP, GIF</p>
            </div>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden bg-bg-primary border border-border-primary">
              <img
                src={d.imageUrl}
                alt="Preview"
                className="w-full object-cover"
                style={{ maxHeight: 120 }}
              />
              <button
                onClick={() => updateNodeData(id, { imageUrl: undefined, fileName: undefined, output: undefined })}
                className="absolute top-1 right-1 bg-black/60 hover:bg-red-900/60 text-white rounded-md p-0.5 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <FieldLabel>URL</FieldLabel>
            <input
              className="node-input text-[10px]"
              value={d.imageUrl}
              readOnly
              title={d.imageUrl}
            />
            {d.fileName && (
              <p className="text-[10px] text-text-muted truncate">{d.fileName}</p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </NodeWrapper>

      <Handle type="source" position={Position.Right} id="output" style={{ top: "50%" }} />
    </div>
  );
});

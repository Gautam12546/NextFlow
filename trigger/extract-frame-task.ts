import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

const ExtractFramePayloadSchema = z.object({
  videoUrl: z.string().url(),
  timestamp: z.union([z.string(), z.number()]).default(0),
  transloaditKey: z.string().optional(),
  transloaditTemplateId: z.string().optional(),
});

type ExtractFramePayload = z.infer<typeof ExtractFramePayloadSchema>;

async function getVideoDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

async function parseTimestamp(timestamp: string | number, videoPath: string): Promise<number> {
  if (typeof timestamp === "number") return timestamp;

  if (typeof timestamp === "string" && timestamp.endsWith("%")) {
    const percentage = parseFloat(timestamp.slice(0, -1)) / 100;
    const duration = await getVideoDuration(videoPath);
    return duration * percentage;
  }

  return parseFloat(timestamp) || 0;
}

async function uploadToTransloadit(
  filePath: string,
  key: string,
  templateId: string
): Promise<string> {
  const formData = new FormData();
  const fileBuffer = await fs.readFile(filePath);
  const blob = new Blob([fileBuffer], { type: "image/jpeg" });
  formData.append("file", blob, path.basename(filePath));
  formData.append("params", JSON.stringify({ auth: { key }, template_id: templateId }));

  const response = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
  });

  const data = await response.json() as {
    results?: { [key: string]: Array<{ ssl_url: string }> };
    assembly_id?: string;
    ok?: string;
    error?: string;
  };

  if (data.error) throw new Error(`Transloadit error: ${data.error}`);

  let assembly = data;
  let attempts = 0;
  while (assembly.ok !== "ASSEMBLY_COMPLETED" && assembly.ok !== "ASSEMBLY_FAILED" && attempts < 30) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api2.transloadit.com/assemblies/${assembly.assembly_id}`);
    assembly = await pollRes.json() as typeof assembly;
    attempts++;
  }

  if (!assembly.results) throw new Error("No results from Transloadit");
  const firstKey = Object.keys(assembly.results)[0];
  const files = assembly.results[firstKey];
  if (!files || files.length === 0) throw new Error("No files in Transloadit result");
  return files[0].ssl_url;
}

export const extractFrameTask = task({
  id: "extract-frame-node",
  maxDuration: 180,
  run: async (payload: ExtractFramePayload) => {
    const { videoUrl, timestamp } = ExtractFramePayloadSchema.parse(payload);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "nextflow-frame-"));
    const ext = videoUrl.split("?")[0].split(".").pop() || "mp4";
    const inputPath = path.join(tmpDir, `input.${ext}`);
    const outputPath = path.join(tmpDir, "frame.jpg");

    try {
      // Download video
      const response = await fetch(videoUrl);
      const buffer = await response.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(buffer));

      // Resolve timestamp
      const seconds = await parseTimestamp(timestamp, inputPath);

      // Extract frame with FFmpeg
      await execAsync(
        `ffmpeg -ss ${seconds} -i "${inputPath}" -frames:v 1 -q:v 2 -y "${outputPath}"`
      );

      // Check output exists
      const stat = await fs.stat(outputPath);
      if (stat.size === 0) throw new Error("FFmpeg produced empty frame");

      // Upload or return base64
      const transloaditKey = payload.transloaditKey || process.env.TRANSLOADIT_KEY;
      const transloaditTemplateId = payload.transloaditTemplateId || process.env.TRANSLOADIT_TEMPLATE_ID;

      if (transloaditKey && transloaditTemplateId) {
        const url = await uploadToTransloadit(outputPath, transloaditKey, transloaditTemplateId);
        return { output: url };
      }

      const outputBuffer = await fs.readFile(outputPath);
      const base64 = outputBuffer.toString("base64");
      return { output: `data:image/jpeg;base64,${base64}` };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  },
});

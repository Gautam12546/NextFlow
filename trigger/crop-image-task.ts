import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

const CropPayloadSchema = z.object({
  imageUrl: z.string().url(),
  xPercent: z.number().min(0).max(100).default(0),
  yPercent: z.number().min(0).max(100).default(0),
  widthPercent: z.number().min(1).max(100).default(100),
  heightPercent: z.number().min(1).max(100).default(100),
  transloaditKey: z.string().optional(),
  transloaditTemplateId: z.string().optional(),
});

type CropPayload = z.infer<typeof CropPayloadSchema>;

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  const { stdout } = await execAsync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`
  );
  const [width, height] = stdout.trim().split("x").map(Number);
  return { width, height };
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
    error?: string;
  };

  if (data.error) throw new Error(`Transloadit error: ${data.error}`);

  // Poll for assembly completion
  let assembly = data;
  let attempts = 0;
  while (
    (assembly as { ok?: string }).ok !== "ASSEMBLY_COMPLETED" &&
    (assembly as { ok?: string }).ok !== "ASSEMBLY_FAILED" &&
    attempts < 30
  ) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(
      `https://api2.transloadit.com/assemblies/${(assembly as { assembly_id?: string }).assembly_id}`
    );
    assembly = await pollRes.json() as typeof assembly;
    attempts++;
  }

  const results = (assembly as typeof data).results;
  if (!results) throw new Error("No results from Transloadit");

  const firstKey = Object.keys(results)[0];
  const files = results[firstKey];
  if (!files || files.length === 0) throw new Error("No files in Transloadit result");

  return files[0].ssl_url;
}

export const cropImageTask = task({
  id: "crop-image-node",
  maxDuration: 180,
  run: async (payload: CropPayload) => {
    const { imageUrl, xPercent, yPercent, widthPercent, heightPercent } = CropPayloadSchema.parse(payload);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "nextflow-crop-"));
    const inputPath = path.join(tmpDir, "input.jpg");
    const outputPath = path.join(tmpDir, "output.jpg");

    try {
      // Download image
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(buffer));

      // Get dimensions
      const { width, height } = await getImageDimensions(inputPath);

      // Calculate pixel values from percentages
      const x = Math.floor((xPercent / 100) * width);
      const y = Math.floor((yPercent / 100) * height);
      const w = Math.floor((widthPercent / 100) * width);
      const h = Math.floor((heightPercent / 100) * height);

      // Clamp values
      const cx = Math.min(x, width - 1);
      const cy = Math.min(y, height - 1);
      const cw = Math.min(w, width - cx);
      const ch = Math.min(h, height - cy);

      // Run FFmpeg crop
      await execAsync(
        `ffmpeg -i "${inputPath}" -vf "crop=${cw}:${ch}:${cx}:${cy}" -y "${outputPath}"`
      );

      // Upload to Transloadit or return base64 fallback
      const transloaditKey = payload.transloaditKey || process.env.TRANSLOADIT_KEY;
      const transloaditTemplateId = payload.transloaditTemplateId || process.env.TRANSLOADIT_TEMPLATE_ID;

      if (transloaditKey && transloaditTemplateId) {
        const uploadedUrl = await uploadToTransloadit(outputPath, transloaditKey, transloaditTemplateId);
        return { output: uploadedUrl };
      }

      // Fallback: return base64 data URL
      const outputBuffer = await fs.readFile(outputPath);
      const base64 = outputBuffer.toString("base64");
      return { output: `data:image/jpeg;base64,${base64}` };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  },
});

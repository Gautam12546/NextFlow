import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { z } from "zod";

const LLMPayloadSchema = z.object({
  model: z.string().default("gemini-1.5-flash"),
  systemPrompt: z.string().optional(),
  userMessage: z.string(),
  images: z.array(z.string()).optional(),
});

type LLMPayload = z.infer<typeof LLMPayloadSchema>;

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return { data: base64, mimeType: contentType };
}

export const llmTask = task({
  id: "run-llm-node",
  maxDuration: 120,
  run: async (payload: LLMPayload) => {
    const validated = LLMPayloadSchema.parse(payload);
    const { model, systemPrompt, userMessage, images } = validated;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const generativeModel = genAI.getGenerativeModel({
      model,
      ...(systemPrompt
        ? { systemInstruction: { role: "system", parts: [{ text: systemPrompt }] } }
        : {}),
    });

    const parts: Part[] = [{ text: userMessage }];

    // Add images as inline base64 parts
    if (images && images.length > 0) {
      for (const imageUrl of images) {
        try {
          const { data, mimeType } = await fetchImageAsBase64(imageUrl);
          parts.push({
            inlineData: { data, mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" },
          });
        } catch {
          console.error(`Failed to fetch image: ${imageUrl}`);
        }
      }
    }

    const result = await generativeModel.generateContent({ contents: [{ role: "user", parts }] });
    const text = result.response.text();

    return { output: text };
  },
});

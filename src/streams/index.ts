import { streams, InferStreamType } from "@trigger.dev/sdk";

// Stream for real-time progress updates to the frontend
export const progressStream = streams.define<{
  step: string;
  status: "running" | "completed" | "failed";
  message: string;
  data?: Record<string, unknown>;
}>({
  id: "agent-progress",
});

// Stream for AI-generated content (terraform code, explanations)
export const aiOutputStream = streams.define<string>({
  id: "ai-output",
});

// Stream for terraform execution output
export const terraformOutputStream = streams.define<string>({
  id: "terraform-output",
});

export type ProgressStreamPart = InferStreamType<typeof progressStream>;
export type AIOutputStreamPart = InferStreamType<typeof aiOutputStream>;
export type TerraformOutputStreamPart = InferStreamType<typeof terraformOutputStream>;

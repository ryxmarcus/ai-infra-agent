import { task } from "@trigger.dev/sdk";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { InfrastructureRequest } from "../lib/schemas";
import { TERRAFORM_GENERATOR_SYSTEM_PROMPT } from "../lib/prompts";
import { progressStream, aiOutputStream } from "../streams";

export const generateTerraform = task({
  id: "generate-terraform",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { infraRequest: InfrastructureRequest }) => {
    await progressStream.append(
      {
        step: "generate",
        status: "running",
        message: "Generating Terraform code...",
      },
      { target: "root" }
    );

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: TERRAFORM_GENERATOR_SYSTEM_PROMPT,
      prompt: `Generate Terraform code for the following infrastructure specification:

Provider: ${payload.infraRequest.provider}
Region: ${payload.infraRequest.region}
Project: ${payload.infraRequest.projectName}
Tags: ${JSON.stringify(payload.infraRequest.tags || {})}

Resources:
${payload.infraRequest.resources
  .map(
    (r) =>
      `- ${r.type} "${r.name}": ${JSON.stringify(r.config)}`
  )
  .join("\n")}

Generate complete, production-ready Terraform code.`,
      experimental_telemetry: { isEnabled: true },
    });

    // Stream the generated terraform code to the frontend in real-time
    const { waitUntilComplete } = aiOutputStream.pipe(result.textStream, {
      target: "root",
    });
    await waitUntilComplete();

    // Get the full text after streaming completes
    const terraformCode = await result.text;

    await progressStream.append(
      {
        step: "generate",
        status: "completed",
        message: "Terraform code generated successfully",
      },
      { target: "root" }
    );

    return { terraformCode };
  },
});

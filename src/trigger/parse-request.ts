import { task } from "@trigger.dev/sdk";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { InfrastructureRequestSchema } from "../lib/schemas";
import { INFRA_PARSER_SYSTEM_PROMPT } from "../lib/prompts";
import { progressStream } from "../streams";

export const parseInfraRequest = task({
  id: "parse-infra-request",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { userPrompt: string }) => {
    await progressStream.append(
      {
        step: "parse",
        status: "running",
        message: "Analyzing your infrastructure request with AI...",
      },
      { target: "root" }
    );

    const { object: infraRequest } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: InfrastructureRequestSchema,
      system: INFRA_PARSER_SYSTEM_PROMPT,
      prompt: payload.userPrompt,
      experimental_telemetry: { isEnabled: true },
    });

    await progressStream.append(
      {
        step: "parse",
        status: "completed",
        message: `Parsed request: ${infraRequest.resources.length} resources on ${infraRequest.provider.toUpperCase()} in ${infraRequest.region}`,
        data: { infraRequest },
      },
      { target: "root" }
    );

    return infraRequest;
  },
});

import { z } from "zod";

// Schema for the parsed infrastructure request
export const InfrastructureRequestSchema = z.object({
  provider: z.enum(["aws", "gcp", "azure"]).describe("Cloud provider to deploy to"),
  projectName: z.string().describe("Name for the infrastructure project"),
  resources: z
    .array(
      z.object({
        type: z
          .string()
          .describe("Resource type, e.g., 'ec2_instance', 'gcs_bucket', 's3_bucket', 'vpc'"),
        name: z.string().describe("Resource name"),
        config: z
          .array(
            z.object({
              key: z.string().describe("Configuration key"),
              value: z.string().describe("Configuration value"),
            })
          )
          .describe("Resource-specific configuration as key-value pairs"),
      })
    )
    .describe("List of cloud resources to provision"),
  region: z.string().describe("Cloud region for deployment"),
  tags: z
    .array(
      z.object({
        key: z.string().describe("Tag key"),
        value: z.string().describe("Tag value"),
      })
    )
    .optional()
    .describe("Tags to apply to all resources as key-value pairs"),
});

export type InfrastructureRequest = z.infer<typeof InfrastructureRequestSchema>;

// Schema for the agent's orchestrator payload
export const AgentPayloadSchema = z.object({
  userPrompt: z.string().describe("The user's natural language infrastructure request"),
});

export type AgentPayload = z.infer<typeof AgentPayloadSchema>;

// Schema for terraform validation result
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Schema for cost estimation
export const CostEstimateSchema = z.object({
  monthlyCost: z.string().describe("Estimated monthly cost"),
  breakdown: z
    .array(
      z.object({
        resource: z.string(),
        monthlyCost: z.string(),
      })
    )
    .describe("Cost breakdown by resource"),
  currency: z.string().default("USD"),
});

export type CostEstimate = z.infer<typeof CostEstimateSchema>;

import { task, wait } from "@trigger.dev/sdk";
import { AgentPayloadSchema } from "../lib/schemas";
import { parseInfraRequest } from "./parse-request";
import { generateTerraform } from "./generate-terraform";
import { validateAndEstimate } from "./validate-terraform";
import { deployTerraform } from "./deploy-terraform";
import { progressStream } from "../streams";

// Main orchestrator task - coordinates the entire AI agent workflow
export const infraAgentOrchestrator = task({
  id: "infra-agent-orchestrator",
  retry: {
    maxAttempts: 1, // Don't retry the orchestrator itself
  },
  maxDuration: 600, // 10 minutes max
  run: async (payload: { userPrompt: string }) => {
    // Validate the payload
    AgentPayloadSchema.parse(payload);

    await progressStream.append({
      step: "start",
      status: "running",
      message: "Starting AI Infrastructure Agent...",
    });

    // ──────────────────────────────────────────────
    // Step 1: Parse the natural language request
    // ──────────────────────────────────────────────
    const parseResult = await parseInfraRequest.triggerAndWait({
      userPrompt: payload.userPrompt,
    });

    if (!parseResult.ok) {
      throw new Error("Failed to parse infrastructure request");
    }

    const infraRequest = parseResult.output;

    // ──────────────────────────────────────────────
    // Step 2: Generate Terraform code
    // ──────────────────────────────────────────────
    const generateResult = await generateTerraform.triggerAndWait({
      infraRequest,
    });

    if (!generateResult.ok) {
      throw new Error("Failed to generate Terraform code");
    }

    const { terraformCode } = generateResult.output;

    // ──────────────────────────────────────────────
    // Step 3: Validate and estimate costs
    // ──────────────────────────────────────────────
    const validateResult = await validateAndEstimate.triggerAndWait({
      terraformCode,
    });

    if (!validateResult.ok) {
      throw new Error("Terraform validation failed");
    }

    const { costEstimate } = validateResult.output;

    // ──────────────────────────────────────────────
    // Step 4: Human-in-the-loop approval
    // ──────────────────────────────────────────────
    // Create the wait token first so we can send its ID to the frontend
    const approvalToken = await wait.createToken({
      idempotencyKey: "deployment-approval",
      timeout: "30m", // Wait up to 30 minutes for approval
    });

    await progressStream.append({
      step: "approval",
      status: "running",
      message: "Waiting for your approval to deploy...",
      data: {
        terraformCode: validateResult.output.terraformCode,
        costEstimate,
        infraRequest,
        tokenId: approvalToken.id,
      },
    });

    const approval = await wait.forToken<{
      approved: boolean;
      message?: string;
    }>(approvalToken);

    if (!approval.ok || !approval.output.approved) {
      await progressStream.append({
        step: "approval",
        status: "failed",
        message: "Deployment rejected by user",
      });
      return {
        status: "rejected",
        infraRequest,
        terraformCode: validateResult.output.terraformCode,
        costEstimate,
      };
    }

    // ──────────────────────────────────────────────
    // Step 5: Deploy via Terraform
    // ──────────────────────────────────────────────
    await progressStream.append({
      step: "deploy",
      status: "running",
      message: "Deploying infrastructure with Terraform...",
    });

    const deployResult = await deployTerraform.triggerAndWait({
      terraformCode: validateResult.output.terraformCode,
      projectName: infraRequest.projectName,
    });

    if (!deployResult.ok) {
      await progressStream.append({
        step: "deploy",
        status: "failed",
        message: "Terraform deployment failed",
      });
      throw new Error("Terraform deployment failed");
    }

    await progressStream.append({
      step: "deploy",
      status: "completed",
      message: "Infrastructure deployed successfully!",
      data: {
        terraformCode: validateResult.output.terraformCode,
        costEstimate,
        infraRequest,
        terraformOutput: deployResult.output.output,
      },
    });

    return {
      status: "deployed",
      infraRequest,
      terraformCode: validateResult.output.terraformCode,
      costEstimate,
      terraformOutput: deployResult.output.output,
    };
  },
});

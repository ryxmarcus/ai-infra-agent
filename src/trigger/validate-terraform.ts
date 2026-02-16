import { task } from "@trigger.dev/sdk";
import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { ValidationResultSchema, CostEstimateSchema } from "../lib/schemas";
import {
  COST_ESTIMATOR_SYSTEM_PROMPT,
  TERRAFORM_FIXER_SYSTEM_PROMPT,
} from "../lib/prompts";
import { progressStream } from "../streams";

export const validateAndEstimate = task({
  id: "validate-and-estimate",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: { terraformCode: string; attempt?: number }): Promise<any> => {
    const attempt = payload.attempt || 1;
    const maxFixAttempts = 3;

    // Step 1: Validate the Terraform code using AI
    // (In production, you'd run `terraform validate` via shell)
    await progressStream.append(
      {
        step: "validate",
        status: "running",
        message: `Validating Terraform code (attempt ${attempt})...`,
      },
      { target: "root" }
    );

    const { object: validation } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: ValidationResultSchema,
      system: `You are a Terraform validation expert. Analyze the following Terraform code for syntax errors, missing required fields, security issues, and best practice violations. Be strict but fair.`,
      prompt: `Validate this Terraform code:\n\n${payload.terraformCode}`,
    });

    // If validation failed, try to fix the code
    if (!validation.valid && attempt < maxFixAttempts) {
      await progressStream.append(
        {
          step: "validate",
          status: "running",
          message: `Validation found issues. Auto-fixing (attempt ${attempt}/${maxFixAttempts})...`,
          data: { errors: validation.errors },
        },
        { target: "root" }
      );

      const { text: fixedCode } = await generateText({
        model: google("gemini-2.0-flash"),
        system: TERRAFORM_FIXER_SYSTEM_PROMPT,
        prompt: `Fix these errors in the Terraform code:

Errors: ${JSON.stringify(validation.errors)}
Warnings: ${JSON.stringify(validation.warnings)}

Original code:
${payload.terraformCode}`,
      });

      // Recursively validate the fixed code
      const fixResult = await validateAndEstimate.triggerAndWait({
        terraformCode: fixedCode,
        attempt: attempt + 1,
      });

      if (!fixResult.ok) {
        throw new Error("Recursive validation failed");
      }

      return fixResult.output;
    }

    if (!validation.valid) {
      await progressStream.append(
        {
          step: "validate",
          status: "failed",
          message: "Terraform validation failed after multiple fix attempts",
          data: { errors: validation.errors },
        },
        { target: "root" }
      );
      throw new Error(
        `Terraform validation failed: ${validation.errors?.join(", ")}`
      );
    }

    await progressStream.append(
      {
        step: "validate",
        status: "completed",
        message: "Terraform code validated successfully",
      },
      { target: "root" }
    );

    // Step 2: Estimate costs
    await progressStream.append(
      {
        step: "cost",
        status: "running",
        message: "Estimating infrastructure costs...",
      },
      { target: "root" }
    );

    const { object: costEstimate } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: CostEstimateSchema,
      system: COST_ESTIMATOR_SYSTEM_PROMPT,
      prompt: `Estimate the monthly cost for this Terraform infrastructure:\n\n${payload.terraformCode}`,
    });

    await progressStream.append(
      {
        step: "cost",
        status: "completed",
        message: `Estimated monthly cost: $${costEstimate.monthlyCost}`,
        data: { costEstimate },
      },
      { target: "root" }
    );

    return {
      terraformCode: payload.terraformCode,
      validation,
      costEstimate,
    };
  },
});

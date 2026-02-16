import { task } from "@trigger.dev/sdk";
import { mkdir, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { progressStream, terraformOutputStream } from "../streams";

const execFileAsync = promisify(execFile);

export const deployTerraform = task({
  id: "deploy-terraform",
  retry: {
    maxAttempts: 1, // Don't retry deployments
  },
  maxDuration: 300, // 5 minutes max for terraform operations
  run: async (payload: { terraformCode: string; projectName: string }) => {
    const projectDir = join(process.cwd(), "generated", payload.projectName);

    // ── Write main.tf ──
    await progressStream.append(
      {
        step: "deploy",
        status: "running",
        message: "Writing Terraform configuration...",
      },
      { target: "root" }
    );

    // Strip markdown code fences (```terraform ... ```) that AI models wrap around code
    const cleanedCode = payload.terraformCode
      .replace(/^```(?:terraform|hcl)?\s*\n/gm, "")
      .replace(/\n```\s*$/gm, "");

    await mkdir(projectDir, { recursive: true });
    await writeFile(join(projectDir, "main.tf"), cleanedCode, "utf-8");

    await terraformOutputStream.append(
      `>> Written main.tf to ${projectDir}\n`,
      { target: "root" }
    );

    // ── terraform init ──
    await progressStream.append(
      {
        step: "deploy",
        status: "running",
        message: "Running terraform init...",
      },
      { target: "root" }
    );

    try {
      const initResult = await execFileAsync("terraform", ["init"], {
        cwd: projectDir,
        maxBuffer: 10 * 1024 * 1024,
      });

      await terraformOutputStream.append(initResult.stdout, {
        target: "root",
      });

      if (initResult.stderr) {
        await terraformOutputStream.append(initResult.stderr, {
          target: "root",
        });
      }
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      await terraformOutputStream.append(
        `terraform init failed:\n${errMsg}\n`,
        { target: "root" }
      );
      throw new Error(`terraform init failed: ${errMsg}`);
    }

    // ── terraform apply ──
    await progressStream.append(
      {
        step: "deploy",
        status: "running",
        message: "Running terraform apply...",
      },
      { target: "root" }
    );

    try {
      const applyResult = await execFileAsync(
        "terraform",
        ["apply", "-auto-approve"],
        {
          cwd: projectDir,
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      await terraformOutputStream.append(applyResult.stdout, {
        target: "root",
      });

      if (applyResult.stderr) {
        await terraformOutputStream.append(applyResult.stderr, {
          target: "root",
        });
      }

      return { output: applyResult.stdout };
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      await terraformOutputStream.append(
        `terraform apply failed:\n${errMsg}\n`,
        { target: "root" }
      );
      throw new Error(`terraform apply failed: ${errMsg}`);
    }
  },
});

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { terraformCode, projectName } = await req.json();

    if (!terraformCode) {
      return NextResponse.json(
        { error: "terraformCode is required" },
        { status: 400 }
      );
    }

    const folderName = projectName || `infra-${Date.now()}`;
    const outputDir = path.join(process.cwd(), "generated", folderName);

    // Create the output directory
    await mkdir(outputDir, { recursive: true });

    // Split the terraform code into separate files if it contains section markers
    // Otherwise save as a single main.tf
    const mainTfPath = path.join(outputDir, "main.tf");
    await writeFile(mainTfPath, terraformCode, "utf-8");

    return NextResponse.json({
      success: true,
      outputDir,
      files: ["main.tf"],
      message: `Terraform files saved to: ${outputDir}`,
    });
  } catch (error) {
    console.error("Save terraform error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save terraform files" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { configure, auth } from "@trigger.dev/sdk";
import { infraAgentOrchestrator } from "../../../trigger/orchestrator";

// Configure the Trigger.dev SDK for server-side usage
configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A prompt is required" },
        { status: 400 }
      );
    }

    // Trigger the orchestrator task
    const handle = await infraAgentOrchestrator.trigger({
      userPrompt: prompt,
    });

    // Generate a public access token so the frontend can subscribe to streams
    const publicToken = await auth.createPublicToken({
      scopes: {
        read: {
          runs: [handle.id],
        },
      },
      expirationTime: "1hr",
    });

    return NextResponse.json({
      runId: handle.id,
      publicAccessToken: publicToken,
    });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start agent" },
      { status: 500 }
    );
  }
}

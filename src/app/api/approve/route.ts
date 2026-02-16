import { NextRequest, NextResponse } from "next/server";
import { configure, wait } from "@trigger.dev/sdk";

configure({
  secretKey: process.env.TRIGGER_SECRET_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { tokenId, approved, message } = await req.json();

    if (!tokenId) {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    // Complete the wait token to resume the orchestrator
    await wait.completeToken(tokenId, {
      approved: approved ?? false,
      message: message ?? "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process approval" },
      { status: 500 }
    );
  }
}

"use client";

import { useState } from "react";
import { useRealtimeStream } from "@trigger.dev/react-hooks";
import { progressStream } from "../../streams";
import type { ProgressStreamPart } from "../../streams";
import { ProgressTimeline } from "./ProgressTimeline";
import { TerraformViewer } from "./TerraformViewer";
import { ApprovalPanel } from "./ApprovalPanel";

function useProgressStream(runId: string | null, accessToken: string | null) {
  const result = useRealtimeStream(progressStream, runId ?? "", {
    accessToken: accessToken ?? "",
    timeoutInSeconds: 600,
    enabled: !!runId && !!accessToken,
  });
  return result;
}

export function AgentDashboard() {
  const [prompt, setPrompt] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { parts: streamParts, error: streamError } = useProgressStream(runId, accessToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("API error:", data.error);
        alert(`Error: ${data.error}`);
        return;
      }
      setRunId(data.runId);
      setAccessToken(data.publicAccessToken);
    } catch (error) {
      console.error("Failed to start agent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const examplePrompts = [
    "Deploy a web server on AWS with an EC2 instance in eu-north-1 with ami ami-073130f74f5ffb161 and t3.micro",
    "Set up a GKE Kubernetes cluster on Google Cloud with 3 nodes and a Cloud SQL PostgreSQL database",
    "Create an Azure virtual machine with a virtual network, storage account, and a managed PostgreSQL database",
    "Deploy a serverless API on AWS with Lambda, API Gateway, DynamoDB table, and S3 bucket",
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white">
          AI Cloud Infrastructure Agent
        </h1>
        <p className="text-gray-400 text-lg">
          Describe your infrastructure in plain English. The AI agent will
          generate Terraform code, validate it, estimate costs, and deploy it.
        </p>
        <p className="text-sm text-gray-500">
          Powered by{" "}
          <a
            href="https://trigger.dev"
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Trigger.dev
          </a>
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Deploy a web application on AWS with an EC2 instance, RDS PostgreSQL database, and S3 bucket for static files..."
          className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          disabled={isSubmitting || !!runId}
        />

        {!runId && (
          <>
            <button
              type="submit"
              disabled={isSubmitting || !prompt.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isSubmitting ? "Starting Agent..." : "Deploy Infrastructure"}
            </button>

            {/* Example prompts */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Try an example:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="text-left text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 p-3 rounded-lg transition-colors border border-gray-700"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </form>

      {/* Agent Output */}
      {runId && accessToken && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Progress Timeline */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Agent Progress</h2>
            <ProgressTimeline parts={streamParts} error={streamError} />
            <ApprovalPanel parts={streamParts} />
          </div>

          {/* Right: Terraform Code Viewer */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Generated Terraform Code
            </h2>
            <TerraformViewer runId={runId} accessToken={accessToken} />
          </div>
        </div>
      )}

      {/* Reset button */}
      {runId && (
        <button
          onClick={() => {
            setRunId(null);
            setAccessToken(null);
            setPrompt("");
          }}
          className="text-gray-400 hover:text-white underline text-sm"
        >
          Start a new deployment
        </button>
      )}
    </div>
  );
}

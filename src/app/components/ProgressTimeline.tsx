"use client";

import type { ProgressStreamPart } from "../../streams";

const stepLabels: Record<string, string> = {
  start: "Initializing Agent",
  parse: "Parsing Request",
  generate: "Generating Terraform",
  validate: "Validating Code",
  cost: "Estimating Costs",
  approval: "Awaiting Approval",
  deploy: "Deploying Infrastructure",
};

const statusIcons: Record<string, string> = {
  running: "...",
  completed: "[done]",
  failed: "[X]",
};

export function ProgressTimeline({
  parts,
  error,
}: {
  parts: ProgressStreamPart[];
  error?: Error;
}) {
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
        Error connecting to agent: {error.message}
      </div>
    );
  }

  if (!parts || parts.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-400 animate-pulse">
        Waiting for agent to start...
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      {parts.map((part, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-lg ${
            part.status === "running"
              ? "bg-blue-900/20 border border-blue-800"
              : part.status === "completed"
              ? "bg-green-900/20 border border-green-800"
              : "bg-red-900/20 border border-red-800"
          }`}
        >
          <span className="text-lg mt-0.5">
            {statusIcons[part.status] || ""}
          </span>
          <div className="flex-1">
            <p className="font-medium text-white">
              {stepLabels[part.step] || part.step}
            </p>
            <p
              className={`text-sm ${
                part.status === "running"
                  ? "text-blue-300"
                  : part.status === "completed"
                  ? "text-green-300"
                  : "text-red-300"
              }`}
            >
              {part.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRealtimeStream } from "@trigger.dev/react-hooks";
import { aiOutputStream } from "../../streams";

export function TerraformViewer({
  runId,
  accessToken,
}: {
  runId: string;
  accessToken: string;
}) {
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const { parts, error } = useRealtimeStream(aiOutputStream, runId, {
    accessToken,
    timeoutInSeconds: 600,
  });

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
        Error: {error.message}
      </div>
    );
  }

  const code = parts?.join("") || "";

  const handleSaveToDisk = async () => {
    if (!code) return;
    setSaveStatus("Saving...");
    try {
      const res = await fetch("/api/save-terraform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terraformCode: code,
          projectName: `deploy-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus(`Saved to: ${data.outputDir}`);
      } else {
        setSaveStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setSaveStatus("Failed to save");
    }
  };

  if (!code) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-500 h-96 flex items-center justify-center">
        Terraform code will appear here as the AI generates it...
      </div>
    );
  }

  return (
    <div className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <span className="text-sm text-gray-400">main.tf</span>
        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded transition-colors"
          >
            Copy
          </button>
          <button
            onClick={handleSaveToDisk}
            className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
          >
            Save to Disk
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-auto max-h-[600px] text-sm">
        <code className="text-green-400 whitespace-pre-wrap">{code}</code>
      </pre>
      {saveStatus && (
        <div className="px-4 py-2 bg-gray-900 border-t border-gray-700 text-xs text-gray-400">
          {saveStatus}
        </div>
      )}
    </div>
  );
}

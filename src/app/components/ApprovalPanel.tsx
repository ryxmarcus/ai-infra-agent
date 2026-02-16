"use client";

import { useState } from "react";
import type { ProgressStreamPart } from "../../streams";

export function ApprovalPanel({
  parts,
}: {
  parts: ProgressStreamPart[];
}) {
  const [approvalSent, setApprovalSent] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<
    "pending" | "approved" | "rejected"
  >("pending");

  // Check if we're at the approval step
  const approvalStep = parts?.find(
    (p) => p.step === "approval" && p.status === "running"
  );

  if (!approvalStep || approvalSent) {
    if (approvalStatus === "approved") {
      return (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-green-400">
          Deployment approved! Infrastructure is being provisioned...
        </div>
      );
    }
    if (approvalStatus === "rejected") {
      return (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
          Deployment rejected.
        </div>
      );
    }
    return null;
  }

  const costData = approvalStep.data?.costEstimate as
    | { monthlyCost: string; breakdown: Array<{ resource: string; monthlyCost: string }> }
    | undefined;

  const handleApproval = async (approved: boolean) => {
    // Extract the actual token ID from the stream data
    const tokenId = approvalStep.data?.tokenId as string;
    if (!tokenId) {
      console.error("No token ID found in approval step data");
      return;
    }

    try {
      await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId,
          approved,
          message: approved ? "User approved deployment" : "User rejected deployment",
        }),
      });

      setApprovalSent(true);
      setApprovalStatus(approved ? "approved" : "rejected");
    } catch (error) {
      console.error("Failed to send approval:", error);
    }
  };

  return (
    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-yellow-400">
        Approval Required
      </h3>
      <p className="text-gray-300">
        Review the generated Terraform code and cost estimate before deploying.
      </p>

      {/* Cost Estimate */}
      {costData && (
        <div className="bg-gray-900 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-400">
            Estimated Monthly Cost
          </h4>
          <p className="text-2xl font-bold text-white">
            ${costData.monthlyCost}/mo
          </p>
          {costData.breakdown && (
            <div className="space-y-1 mt-2">
              {costData.breakdown.map(
                (item: { resource: string; monthlyCost: string }, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm text-gray-400"
                  >
                    <span>{item.resource}</span>
                    <span>${item.monthlyCost}</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Approval Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => handleApproval(true)}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Approve & Deploy
        </button>
        <button
          onClick={() => handleApproval(false)}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

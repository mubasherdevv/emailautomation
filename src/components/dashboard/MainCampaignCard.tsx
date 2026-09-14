"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Campaign } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  ArrowUpRight,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from "lucide-react";

interface MainCampaignCardProps {
  campaign: Campaign | null;
  onAction?: () => void;
}

export function MainCampaignCard({ campaign, onAction }: MainCampaignCardProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  if (!campaign) {
    return (
      <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#F5F5F5]/40 p-8 text-center">
        <Send className="mx-auto h-8 w-8 text-[#666666]" />
        <h3 className="mt-3 text-sm font-semibold text-[#111111]">No Active Campaigns</h3>
        <p className="mt-1 text-xs text-[#666666]">
          Create and launch an outreach campaign to monitor real-time sending.
        </p>
        <Link
          href="/campaigns/new"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs"
        >
          Create First Campaign
        </Link>
      </div>
    );
  }

  const total = campaign.total_count || 1;
  const sent = campaign.sent_count || 0;
  const pending = campaign.pending_count || 0;
  const failed = campaign.failed_count || 0;
  const progressPercent = Math.min(100, Math.max(0, (sent / total) * 100));

  const handleAction = async (action: "start" | "pause" | "resume" | "stop" | "restart") => {
    try {
      setLoadingAction(action);
      const res = await fetch(`/api/campaigns/${campaign.id}/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        if (onAction) onAction();
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    } finally {
      setLoadingAction(null);
      setShowStopModal(false);
      setShowRestartModal(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-xs relative overflow-hidden">
        {/* Subtle top accent highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6D28D9] via-purple-500 to-indigo-500" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#F5F5F5]">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#6D28D9]">
                Primary Outreach Engine
              </span>
              <StatusBadge status={campaign.status} />
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-[#111111] flex items-center gap-2">
              <span>{campaign.name}</span>
            </h2>
            <p className="mt-0.5 text-xs text-[#666666]">
              Subject: <span className="font-medium text-neutral-800">&quot;{campaign.subject}&quot;</span> &bull;
              From: <span className="font-medium text-neutral-800">{campaign.from_name} &lt;{campaign.from_email}&gt;</span>
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2">
            {campaign.status === "draft" && (
              <button
                onClick={() => handleAction("start")}
                disabled={loadingAction === "start"}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Start Campaign</span>
              </button>
            )}

            {campaign.status === "running" && (
              <button
                onClick={() => handleAction("pause")}
                disabled={loadingAction === "pause"}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition shadow-xs disabled:opacity-50"
              >
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            {campaign.status === "paused" && (
              <button
                onClick={() => handleAction("resume")}
                disabled={loadingAction === "resume"}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Resume</span>
              </button>
            )}

            {(campaign.status === "running" || campaign.status === "paused") && (
              <button
                onClick={() => setShowStopModal(true)}
                disabled={loadingAction === "stop"}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition disabled:opacity-50"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop</span>
              </button>
            )}

            {/* Restart Campaign */}
            {campaign.status !== "draft" && (
              <button
                onClick={() => setShowRestartModal(true)}
                disabled={loadingAction === "restart"}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 shadow-xs ${
                  campaign.status === "stopped" || campaign.status === "completed"
                    ? "bg-[#6D28D9] text-white hover:bg-[#5b21b6]"
                    : "border border-purple-200 bg-purple-50/70 text-[#6D28D9] hover:bg-purple-100"
                }`}
                title="Restart campaign from recipient 1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart</span>
              </button>
            )}

            <Link
              href={`/campaigns/${campaign.id}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-[#111111] text-xs font-medium hover:bg-[#F5F5F5] transition"
            >
              <span>Details</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#666666]" />
            </Link>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#111111]">Dispatch Completion</span>
            <span className="font-mono font-bold text-[#6D28D9]">
              {progressPercent.toFixed(2)}%
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 relative">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out bg-[#6D28D9] ${
                campaign.status === "running" ? "animate-pulse" : ""
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Atomic Counter Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-neutral-50 p-3 border border-neutral-100">
            <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] font-medium">
              <Sliders className="h-3.5 w-3.5" />
              <span>Total Target</span>
            </div>
            <div className="mt-1.5 text-lg font-bold text-[#111111] font-mono">
              {total.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-emerald-50/60 p-3 border border-emerald-100">
            <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Sent</span>
            </div>
            <div className="mt-1.5 text-lg font-bold text-emerald-700 font-mono">
              {sent.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50/60 p-3 border border-amber-100">
            <div className="flex items-center gap-1.5 text-amber-700 text-[11px] font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Pending</span>
            </div>
            <div className="mt-1.5 text-lg font-bold text-amber-700 font-mono">
              {pending.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-rose-50/60 p-3 border border-rose-100">
            <div className="flex items-center gap-1.5 text-rose-700 text-[11px] font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Failed</span>
            </div>
            <div className="mt-1.5 text-lg font-bold text-rose-700 font-mono">
              {failed.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Stop Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-neutral-200">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-base font-semibold text-[#111111]">Stop this campaign?</h3>
            </div>
            <p className="mt-2 text-xs text-[#666666] leading-relaxed">
              Are you sure you want to stop <strong>&quot;{campaign.name}&quot;</strong>? This will permanently halt future batches. All previously sent emails remain securely recorded in your audit logs.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowStopModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction("stop")}
                disabled={loadingAction === "stop"}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loadingAction === "stop" ? "Stopping..." : "Yes, Stop Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restart Confirmation Modal */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-neutral-200">
            <div className="flex items-center gap-3 text-[#6D28D9]">
              <RotateCcw className="h-6 w-6" />
              <h3 className="text-base font-semibold text-[#111111]">Restart Campaign from Beginning?</h3>
            </div>
            <p className="mt-2 text-xs text-[#666666] leading-relaxed">
              This will reset sent and pending counters to 0, clear previous run logs, and automatically trigger the <strong>n8n automation engine</strong> from the first lead in your sheet.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowRestartModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction("restart")}
                disabled={loadingAction === "restart"}
                className="px-4 py-1.5 rounded-lg bg-[#6D28D9] text-xs font-semibold text-white hover:bg-[#5b21b6] disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{loadingAction === "restart" ? "Restarting..." : "Confirm & Trigger n8n"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed";
import { useRealtimeCampaign } from "@/hooks/useRealtimeCampaign";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  RotateCcw,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Clock,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params?.id as string;
  const { toast } = useToast();

  const { campaign, events, logs, isRealtimeConnected, refetch } =
    useRealtimeCampaign(campaignId);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  if (!campaign) {
    return (
      <AdminShell title="Campaign Details" subtitle="Loading campaign metadata...">
        <div className="py-20 text-center text-xs text-neutral-400">
          Loading campaign details...
        </div>
      </AdminShell>
    );
  }

  const total = campaign.total_count || 1;
  const sent = campaign.sent_count || 0;
  const isFinished = campaign.status === "completed" || campaign.status === "stopped";
  const pending = isFinished ? 0 : (campaign.pending_count || 0);
  const failed = campaign.failed_count || 0;
  const sending = isFinished ? 0 : (campaign.sending_count || 0);
  const skippedCount = logs.filter((l) => l.status === "skipped").length;
  const progressPercent = isFinished ? 100 : Math.min(100, Math.max(0, (sent / total) * 100));

  const handleAction = async (action: "start" | "pause" | "resume" | "stop" | "restart") => {
    try {
      setLoadingAction(action);
      const res = await fetch(`/api/campaigns/${campaign.id}/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        toast(`Campaign ${action.toUpperCase()}`, `Action triggered successfully`, "success");
        refetch();
      }
    } catch {
      toast("Error", `Failed to execute ${action}`, "error");
    } finally {
      setLoadingAction(null);
      setShowStopModal(false);
      setShowRestartModal(false);
    }
  };

  return (
    <AdminShell
      title={campaign.name}
      subtitle={`Created on ${new Date(campaign.created_at).toLocaleDateString()}`}
      isRealtimeConnected={isRealtimeConnected}
      onRefresh={refetch}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/campaigns"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:bg-[#F5F5F5]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Campaigns</span>
          </Link>

          {campaign.status === "draft" && (
            <button
              onClick={() => handleAction("start")}
              disabled={loadingAction === "start"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Start Campaign</span>
            </button>
          )}

          {campaign.status === "running" && (
            <button
              onClick={() => handleAction("pause")}
              disabled={loadingAction === "pause"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition disabled:opacity-50"
            >
              <Pause className="h-3.5 w-3.5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          {campaign.status === "paused" && (
            <button
              onClick={() => handleAction("resume")}
              disabled={loadingAction === "resume"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
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

          {/* Restart Campaign Button */}
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
              <span>Restart Campaign</span>
            </button>
          )}
        </div>
      }
    >
      {/* Overview & Metadata Card */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#111111]">{campaign.name}</h2>
            <StatusBadge status={campaign.status} />
          </div>

          <div className="flex items-center gap-4 text-xs text-[#666666]">
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Sheet: {campaign.sheet_name}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-[#6D28D9]" />
              Batch: {campaign.batch_size} / {campaign.delay_seconds}s
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-[#111111]">Overall Sending Progress</span>
            <span className="font-mono font-bold text-[#6D28D9]">{progressPercent.toFixed(2)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={`h-full rounded-full bg-[#6D28D9] transition-all duration-700 ${
                campaign.status === "running" ? "animate-pulse" : ""
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Statistics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
          <div className="rounded-lg bg-neutral-50 p-3 border border-neutral-100">
            <span className="text-[11px] font-medium text-neutral-500">Total</span>
            <div className="mt-1 text-lg font-bold text-[#111111] font-mono">
              {total.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-emerald-50/70 p-3 border border-emerald-100">
            <span className="text-[11px] font-medium text-emerald-700">Sent</span>
            <div className="mt-1 text-lg font-bold text-emerald-700 font-mono">
              {sent.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50/70 p-3 border border-amber-200">
            <span className="text-[11px] font-medium text-amber-800">Duplicates</span>
            <div className="mt-1 text-lg font-bold text-amber-800 font-mono">
              {skippedCount.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-purple-50/70 p-3 border border-purple-100">
            <span className="text-[11px] font-medium text-purple-700">Sending</span>
            <div className="mt-1 text-lg font-bold text-[#6D28D9] font-mono">
              {sending.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50/40 p-3 border border-amber-100">
            <span className="text-[11px] font-medium text-amber-700">Pending</span>
            <div className="mt-1 text-lg font-bold text-amber-700 font-mono">
              {pending.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-rose-50/70 p-3 border border-rose-100">
            <span className="text-[11px] font-medium text-rose-700">Failed</span>
            <div className="mt-1 text-lg font-bold text-rose-700 font-mono">
              {failed.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Two columns: Activity Feed & Recent Emails Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realtime Activity Feed */}
        <div className="lg:col-span-1">
          <LiveActivityFeed events={events} />
        </div>

        {/* Recent Emails Table */}
        <div className="lg:col-span-2 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F5]">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-[#6D28D9]" />
                <h3 className="text-sm font-semibold text-[#111111]">Recent Campaign Emails</h3>
              </div>
              <span className="text-[11px] font-mono text-[#666666]">
                {logs.length} logged
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600">
                <thead className="border-b border-[#E5E5E5] bg-neutral-50/70 text-[10px] font-semibold uppercase text-[#666666]">
                  <tr>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2">Message ID</th>
                    <th className="py-2.5 px-2">Sent At</th>
                    <th className="py-2.5 px-3">Error / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {logs.length > 0 ? (
                    logs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50/50">
                        <td className="py-2.5 px-3 font-mono text-neutral-900 font-medium truncate max-w-[160px]">
                          {log.email}
                        </td>
                        <td className="py-2.5 px-2">
                          <StatusBadge status={log.status} showDot={false} />
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-neutral-400 truncate max-w-[120px]">
                          {log.provider_message_id || "—"}
                        </td>
                        <td className="py-2.5 px-2 text-[11px] text-neutral-500 whitespace-nowrap">
                          {log.sent_at ? new Date(log.sent_at).toLocaleTimeString() : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-rose-600 truncate max-w-[140px]" title={log.error || ""}>
                          {log.error || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-neutral-400">
                        No recipient dispatches recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F5F5F5] text-right">
            <Link
              href={`/logs?campaignId=${campaign.id}`}
              className="text-xs font-semibold text-[#6D28D9] hover:underline"
            >
              View all campaign logs &rarr;
            </Link>
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
              Are you sure you want to stop <strong>&quot;{campaign.name}&quot;</strong>? This action halts future batches permanently.
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
                {loadingAction === "stop" ? "Stopping..." : "Confirm Stop"}
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
    </AdminShell>
  );
}

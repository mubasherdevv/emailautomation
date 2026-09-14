"use client";

import React from "react";
import { EmailLog, CampaignEvent } from "@/types";
import { Send, Check, X, Loader2, Sparkles } from "lucide-react";

interface LiveSendingMonitorProps {
  logs: EmailLog[];
  events: CampaignEvent[];
  isRealtimeConnected: boolean;
}

export function LiveSendingMonitor({
  logs,
  events,
  isRealtimeConnected,
}: LiveSendingMonitorProps) {
  // Find currently sending recipient (from logs or latest events)
  const currentlySendingLog = logs.find((l) => l.status === "sending");
  const currentlySendingEvent = events.find((e) => e.event_type === "email_sending");
  const activeSendingEmail = currentlySendingLog?.email || currentlySendingEvent?.email;

  // Filter recently sent emails
  const recentlySent = logs.filter((l) => l.status === "sent" || l.status === "delivered").slice(0, 6);

  // Filter failed emails
  const failedLogs = logs.filter((l) => l.status === "failed" || l.status === "bounced" || l.status === "complained").slice(0, 4);

  return (
    <div className="rounded-xl border border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] p-5 shadow-xs transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F5] dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-[#111111] dark:text-neutral-100 tracking-tight">
            Live Sending Monitor
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#666666] dark:text-neutral-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
          </span>
          <span className="font-medium">
            {isRealtimeConnected ? "Supabase Live Stream" : "Adaptive Stream"}
          </span>
        </div>
      </div>

      {/* Currently Sending Banner */}
      <div className="mt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#666666] dark:text-neutral-400">
          Currently Sending
        </span>
        <div className="mt-1.5 flex items-center justify-between p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/40 dark:bg-indigo-950/20 transition-colors">
          {activeSendingEmail ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#111111] dark:text-neutral-100 font-mono">
                  {activeSendingEmail}
                </span>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1">
                  <span>Dispatching via Resend API...</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-neutral-500 dark:text-neutral-400 py-1">
              <Send className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              <span className="text-xs">Engine waiting for next dispatch window...</span>
            </div>
          )}

          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 shadow-xs">
            {activeSendingEmail ? "SENDING" : "IDLE"}
          </span>
        </div>
      </div>

      {/* Recently Sent & Failed Columns */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recently Sent Column */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#666666] dark:text-neutral-400 flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500 stroke-[3]" />
              <span>Recently Sent</span>
            </span>
            <span className="text-[11px] text-emerald-500 font-semibold font-mono">
              {recentlySent.length} listed
            </span>
          </div>

          <div className="space-y-1.5">
            {recentlySent.length > 0 ? (
              recentlySent.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]">
                      ✓
                    </span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate">{log.email}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium shrink-0 ml-2">
                    {log.sent_at ? new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now"}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-neutral-400 dark:text-neutral-500 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
                No recent successful deliveries yet
              </div>
            )}
          </div>
        </div>

        {/* Failed Column */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#666666] dark:text-neutral-400 flex items-center gap-1">
              <X className="h-3 w-3 text-rose-500 stroke-[3]" />
              <span>Failed</span>
            </span>
            <span className="text-[11px] text-rose-500 font-semibold font-mono">
              {failedLogs.length} listed
            </span>
          </div>

          <div className="space-y-1.5">
            {failedLogs.length > 0 ? (
              failedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs transition-all hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white text-[10px]">
                      ✕
                    </span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate">{log.email}</span>
                  </div>
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium shrink-0 ml-2 truncate max-w-[110px]" title={log.error || "Rejected"}>
                    {log.error || "Rejected"}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-neutral-400 dark:text-neutral-500 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
                Zero failed deliveries recorded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

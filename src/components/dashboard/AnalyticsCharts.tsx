"use client";

import React from "react";
import { Campaign } from "@/types";
import { TrendingUp, BarChart3, PieChart } from "lucide-react";

interface AnalyticsChartsProps {
  campaigns: Campaign[];
}

export function AnalyticsCharts({ campaigns }: AnalyticsChartsProps) {
  // Aggregate sent vs failed vs pending across all real campaigns
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);
  const totalPending = campaigns.reduce((acc, c) => acc + (c.pending_count || 0), 0);
  const grandTotal = totalSent + totalFailed + totalPending;

  const hasActivity = grandTotal > 0 && (totalSent > 0 || totalFailed > 0);

  const sentPct = grandTotal > 0 ? ((totalSent / grandTotal) * 100).toFixed(1) : "0.0";
  const failedPct = grandTotal > 0 ? ((totalFailed / grandTotal) * 100).toFixed(1) : "0.0";
  const pendingPct = grandTotal > 0 ? ((totalPending / grandTotal) * 100).toFixed(1) : "0.0";

  // Real campaign distribution if campaigns exist with counts
  const activeCampaignsWithData = campaigns.filter((c) => (c.sent_count || 0) + (c.failed_count || 0) > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Velocity / Campaign Breakdown Chart */}
      <div className="lg:col-span-2 rounded-xl border border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F5] dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-[#111111] dark:text-neutral-100 tracking-tight">
              Campaign Delivery Velocity
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#666666] dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Sent
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Failed
            </span>
          </div>
        </div>

        {hasActivity && activeCampaignsWithData.length > 0 ? (
          <div className="mt-5 flex items-end justify-between gap-3 h-44 pt-4 px-2">
            {activeCampaignsWithData.slice(0, 8).map((c) => {
              const cSent = c.sent_count || 0;
              const cFailed = c.failed_count || 0;
              const maxVal = Math.max(...activeCampaignsWithData.map((item) => (item.sent_count || 0) + (item.failed_count || 0))) || 1;
              const barHeight = Math.max(12, ((cSent + cFailed) / maxVal) * 100);

              return (
                <div key={c.id} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-mono text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {cSent + cFailed}
                  </div>
                  <div className="w-full h-full flex items-end justify-center">
                    <div
                      className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col justify-end transition-all duration-500 group-hover:brightness-110"
                      style={{ height: `${barHeight}%` }}
                    >
                      {cFailed > 0 && (
                        <div
                          className="w-full bg-rose-500"
                          style={{ height: `${(cFailed / (cSent + cFailed)) * 100}%` }}
                          title={`Failed: ${cFailed}`}
                        />
                      )}
                      {cSent > 0 && (
                        <div
                          className="w-full bg-indigo-600"
                          style={{ height: `${(cSent / (cSent + cFailed)) * 100}%` }}
                          title={`Sent: ${cSent}`}
                        />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 truncate max-w-[60px] text-center" title={c.name}>
                    {c.name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-2">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">No sending velocity recorded yet</p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
              Live delivery velocity and volume metrics will dynamically appear here when campaigns are actively dispatched.
            </p>
          </div>
        )}
      </div>

      {/* Aggregate Sent vs Failed Ratio */}
      <div className="rounded-xl border border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] p-5 shadow-xs flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F5] dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-[#111111] dark:text-neutral-100 tracking-tight">
                Delivery Breakdown
              </h3>
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>

          <div className="mt-5 space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-emerald-700">Delivered / Sent</span>
                <span className="font-mono font-bold text-neutral-800">
                  {totalSent.toLocaleString()} ({sentPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${grandTotal > 0 ? sentPct : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-amber-700">Pending Queue</span>
                <span className="font-mono font-bold text-neutral-800">
                  {totalPending.toLocaleString()} ({pendingPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${grandTotal > 0 ? pendingPct : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-rose-700">Failed / Bounced</span>
                <span className="font-mono font-bold text-neutral-800">
                  {totalFailed.toLocaleString()} ({failedPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${grandTotal > 0 ? failedPct : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[#F5F5F5] flex items-center justify-between text-[11px] text-[#666666]">
          <span>Delivery Health Score</span>
          <span className="font-semibold text-emerald-600">
            {totalSent + totalFailed > 0
              ? `${((totalSent / (totalSent + totalFailed)) * 100).toFixed(1)}% Success`
              : "Ready"}
          </span>
        </div>
      </div>
    </div>
  );
}

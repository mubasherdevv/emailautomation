"use client";

import React from "react";
import { CampaignEvent } from "@/types";
import { Activity, Check, X, ArrowRight, Layers, Bell } from "lucide-react";

interface LiveActivityFeedProps {
  events: CampaignEvent[];
}

export function LiveActivityFeed({ events }: LiveActivityFeedProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "email_sent":
        return <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />;
      case "email_failed":
        return <X className="h-3 w-3 text-rose-600 stroke-[3]" />;
      case "email_sending":
        return <ArrowRight className="h-3 w-3 text-[#6D28D9] stroke-[2.5]" />;
      case "batch_started":
      case "batch_completed":
        return <Layers className="h-3 w-3 text-blue-600" />;
      default:
        return <Bell className="h-3 w-3 text-neutral-600" />;
    }
  };

  const getEventStyle = (type: string) => {
    switch (type) {
      case "email_sent":
        return "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/20";
      case "email_failed":
        return "border-rose-100 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/20";
      case "email_sending":
        return "border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20";
      case "batch_started":
      case "batch_completed":
        return "border-blue-100 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/20";
      default:
        return "border-neutral-100 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30";
    }
  };

  return (
    <div className="rounded-xl border border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] p-5 shadow-xs transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F5] dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-[#111111] dark:text-neutral-100 tracking-tight">
            Live Activity Feed
          </h3>
        </div>
        <span className="text-[11px] text-[#666666] dark:text-neutral-400 font-mono">
          {events.length} events logged
        </span>
      </div>

      <div className="mt-3 divide-y divide-[#F5F5F5] max-h-[360px] overflow-y-auto pr-1">
        {events.length > 0 ? (
          events.map((event) => {
            const time = new Date(event.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={event.id}
                className={`flex items-start justify-between py-2.5 px-2 rounded-md transition-colors my-1 border ${getEventStyle(
                  event.event_type
                )}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white shadow-2xs">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {event.email && (
                        <span className="text-xs font-mono font-medium text-[#111111]">
                          {event.email}
                        </span>
                      )}
                      <span className="text-[11px] text-neutral-600">
                        {event.message}
                      </span>
                    </div>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                        {JSON.stringify(event.metadata)}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-mono text-[#666666] shrink-0 ml-3">
                  {time}
                </span>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-neutral-400">
            No live events received yet. Start a campaign to observe streaming events.
          </div>
        )}
      </div>
    </div>
  );
}

import React from "react";
import { CampaignStatus } from "@/types";

interface StatusBadgeProps {
  status: CampaignStatus | "sending" | "sent" | "failed" | "pending" | "skipped" | "unsubscribed" | "delivered" | "bounced" | "complained";
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className = "", showDot = true }: StatusBadgeProps) {
  const normalized = status?.toLowerCase();

  let bgClass = "bg-neutral-100 text-neutral-700 border-neutral-200";
  let dotClass = "bg-neutral-400";
  let label: string = status || "";

  switch (normalized) {
    case "running":
    case "sent":
    case "delivered":
      bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      dotClass = "bg-emerald-500 animate-pulse";
      label = normalized === "running" ? "Running" : normalized === "sent" ? "Sent" : "Delivered";
      break;

    case "paused":
    case "pending":
      bgClass = "bg-amber-50 text-amber-700 border-amber-200";
      dotClass = "bg-amber-500";
      label = normalized === "paused" ? "Paused" : "Pending";
      break;

    case "stopped":
    case "failed":
    case "bounced":
    case "complained":
      bgClass = "bg-rose-50 text-rose-700 border-rose-200";
      dotClass = "bg-rose-500";
      label = normalized === "stopped" ? "Stopped" : normalized === "failed" ? "Failed" : normalized === "bounced" ? "Bounced" : "Complained";
      break;

    case "sending":
      bgClass = "bg-purple-50 text-purple-700 border-purple-200";
      dotClass = "bg-[#6D28D9] animate-ping";
      label = "Sending...";
      break;

    case "completed":
      bgClass = "bg-blue-50 text-blue-700 border-blue-200";
      dotClass = "bg-blue-500";
      label = "Completed";
      break;

    case "skipped":
      bgClass = "bg-amber-50 text-amber-700 border-amber-200";
      dotClass = "bg-amber-500";
      label = "Skipped (Duplicate)";
      break;

    case "draft":
      bgClass = "bg-slate-100 text-slate-700 border-slate-200";
      dotClass = "bg-slate-400";
      label = "Draft";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${bgClass} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
      <span className="capitalize">{label}</span>
    </span>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Flame, Clock, Sliders, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DailyQuotaMeterProps {
  sentToday?: number;
}

export function DailyQuotaMeter({ sentToday = 0 }: DailyQuotaMeterProps) {
  const [dailyLimit, setDailyLimit] = useState(500);
  const [isEditing, setIsEditing] = useState(false);
  const [tempLimit, setTempLimit] = useState("500");
  const [timeUntilReset, setTimeUntilReset] = useState("");

  // Load persisted daily limit if exists
  useEffect(() => {
    const saved = localStorage.getItem("outreach_daily_quota");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setDailyLimit(parsed);
        setTempLimit(String(parsed));
      }
    }
  }, []);

  // Midnight UTC countdown ticker
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeUntilReset(
        `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(tempLimit, 10);
    if (!isNaN(val) && val > 0) {
      setDailyLimit(val);
      localStorage.setItem("outreach_daily_quota", String(val));
    }
    setIsEditing(false);
  };

  const percentUsed = Math.min(100, Math.max(0, (sentToday / dailyLimit) * 100));
  const remaining = Math.max(0, dailyLimit - sentToday);

  // Safety Status Tier
  let safetyTier = {
    label: "Safe Warmup Tier",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    barColor: "bg-emerald-500",
    description: "Sending frequency is well within inbox reputation safety limits.",
  };

  if (percentUsed >= 95) {
    safetyTier = {
      label: "Quota Threshold Reached",
      badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      barColor: "bg-rose-500",
      description: "Approaching hard daily safety limit. Cooldown recommended to prevent spam scoring.",
    };
  } else if (percentUsed >= 75) {
    safetyTier = {
      label: "Moderate Velocity",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      barColor: "bg-amber-500",
      description: "High volume detected. Ensure 5-10 second batch delay is active.",
    };
  } else if (percentUsed >= 35) {
    safetyTier = {
      label: "Optimal Outreach Flow",
      badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      barColor: "bg-indigo-500",
      description: "Consistent inbox warming trajectory. Delivery health remains optimal.",
    };
  }

  return (
    <div className="rounded-xl border border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] p-5 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F5F5F5] dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#111111] dark:text-neutral-100 tracking-tight">
                Daily Quota &amp; Warmup Meter
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${safetyTier.badgeColor}`}>
                {safetyTier.label}
              </span>
            </div>
            <p className="text-[11px] text-[#666666] dark:text-neutral-400 mt-0.5">
              Protects SMTP &amp; Gmail reputation against automated spam blacklists
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition cursor-pointer"
            title="Adjust daily email cap"
          >
            <Sliders className="h-3 w-3" />
            <span>{isEditing ? "Cancel" : "Edit Quota"}</span>
          </button>
        </div>
      </div>

      {/* Edit Quota Form Modal/Dropdown */}
      {isEditing && (
        <form onSubmit={handleSaveLimit} className="mt-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 flex items-center gap-3 animate-in fade-in">
          <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Daily Safety Limit (emails/day):
          </label>
          <input
            type="number"
            min="10"
            max="10000"
            value={tempLimit}
            onChange={(e) => setTempLimit(e.target.value)}
            className="w-28 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1 text-xs text-neutral-900 dark:text-white focus:outline-hidden"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            Apply
          </button>
          <div className="text-[10px] text-neutral-500">
            Recommended: 100-300 for new domains, 500-1000 for warmed accounts.
          </div>
        </form>
      )}

      {/* Main Meter Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Metric 1: Sent Today */}
        <div className="p-3.5 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/80">
          <span className="text-[11px] font-medium text-[#666666] dark:text-neutral-400 block">
            Dispatched Today
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-[#111111] dark:text-neutral-100">
              {sentToday.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-neutral-500">
              / {dailyLimit.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">
            {percentUsed.toFixed(1)}% of allowance
          </span>
        </div>

        {/* Metric 2: Available Capacity */}
        <div className="p-3.5 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/80">
          <span className="text-[11px] font-medium text-[#666666] dark:text-neutral-400 block">
            Remaining Capacity
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {remaining.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500">safe slots</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">
            Can dispatch immediately
          </span>
        </div>

        {/* Metric 3: Reset Timer */}
        <div className="p-3.5 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/80">
          <span className="text-[11px] font-medium text-[#666666] dark:text-neutral-400 flex items-center gap-1">
            <Clock className="h-3 w-3 text-neutral-400" />
            <span>Quota Refresh Cycle</span>
          </span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-[#111111] dark:text-neutral-100">
              {timeUntilReset || "00h 00m 00s"}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">
            Resets at midnight UTC
          </span>
        </div>

        {/* Metric 4: Health Verdict */}
        <div className="p-3.5 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/80 flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              Reputation Index
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
            {safetyTier.description}
          </p>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            Daily Allowance Consumption
          </span>
          <span className="text-[11px] font-mono font-semibold text-neutral-900 dark:text-neutral-100">
            {sentToday} / {dailyLimit} ({percentUsed.toFixed(1)}%)
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative">
          <div
            className={`h-full ${safetyTier.barColor} transition-all duration-700 ease-out rounded-full`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Menu, Plus, RefreshCw, Radio } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  isRealtimeConnected?: boolean;
  onRefresh?: () => void;
  onOpenMobile?: () => void;
  actions?: React.ReactNode;
}

export function Header({
  title = "Dashboard",
  subtitle = "Overview & Live Sending Controls",
  isRealtimeConnected = true,
  onRefresh,
  onOpenMobile,
  actions,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E5E5E5] bg-white/90 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F5F5]"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base font-semibold text-[#111111] tracking-tight">{title}</h1>
          <p className="text-[11px] text-[#666666] hidden sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Realtime Status Pill */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
            isRealtimeConnected
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-neutral-50 text-neutral-600 border-neutral-200"
          }`}
          title={isRealtimeConnected ? "Supabase Realtime WebSocket Active" : "Polling Mode Active"}
        >
          <span className="relative flex h-2 w-2">
            {isRealtimeConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isRealtimeConnected ? "bg-emerald-500" : "bg-neutral-400"
              }`}
            />
          </span>
          <span className="flex items-center gap-1">
            <Radio className="h-3 w-3" />
            {isRealtimeConnected ? "Realtime Live" : "Adaptive Sync"}
          </span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E5] text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] transition"
            title="Refresh Data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Action Button or slot */}
        {actions || (
          <Link
            href="/campaigns/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Campaign</span>
          </Link>
        )}
      </div>
    </header>
  );
}

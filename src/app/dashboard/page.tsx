"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatCards } from "@/components/dashboard/StatCards";
import { DailyQuotaMeter } from "@/components/dashboard/DailyQuotaMeter";
import { MainCampaignCard } from "@/components/dashboard/MainCampaignCard";
import { LiveSendingMonitor } from "@/components/dashboard/LiveSendingMonitor";
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { useRealtimeCampaign } from "@/hooks/useRealtimeCampaign";
import { Campaign } from "@/types";
import { Zap, Plus } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export default function DashboardPage() {
  const { toast } = useToast();
  const { campaign, events, logs, isRealtimeConnected, refetch } = useRealtimeCampaign();
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);

  const fetchStats = async () => {
    try {
      const [cRes, contRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/contacts"),
      ]);
      if (cRes.ok) {
        const d = await cRes.json();
        setAllCampaigns(d.campaigns || []);
      }
      if (contRes.ok) {
        const d = await contRes.json();
        setTotalContacts(d.contacts?.length || 0);
      }
    } catch (err) {
      console.error("Stats fetch error", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshAll = async () => {
    await Promise.all([refetch(), fetchStats()]);
    toast("Dashboard Refreshed", "Live stats synchronized with database", "info");
  };

  const totalCampaigns = allCampaigns.length;
  const activeCampaigns = allCampaigns.filter((c) => c.status === "running").length;
  const totalSent = allCampaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);

  return (
    <AdminShell
      title="Live Campaign Dashboard"
      subtitle="Real-time campaign monitoring & analytics"
      isRealtimeConnected={isRealtimeConnected}
      onRefresh={handleRefreshAll}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/campaigns/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Campaign</span>
          </Link>
        </div>
      }
    >
      {/* 1. Top Section - Stat Cards */}
      <StatCards
        totalCampaigns={totalCampaigns}
        activeCampaigns={activeCampaigns}
        totalContacts={totalContacts}
        totalSent={totalSent}
      />

      {/* 2. Daily Quota & Anti-Spam Health Meter */}
      <DailyQuotaMeter sentToday={totalSent} />

      {/* 3. Main Active Campaign Overview */}
      <MainCampaignCard campaign={campaign} onAction={refetch} />

      {/* 3. Live Sending Monitor & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveSendingMonitor
          logs={logs}
          events={events}
          isRealtimeConnected={isRealtimeConnected}
        />
        <LiveActivityFeed events={events} />
      </div>

      {/* 4. Analytics & Performance Charts */}
      <AnalyticsCharts campaigns={allCampaigns} />
    </AdminShell>
  );
}

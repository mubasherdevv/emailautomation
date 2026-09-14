"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Campaign, CampaignEvent, EmailLog } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface RealtimeData {
  campaign: Campaign | null;
  events: CampaignEvent[];
  logs: EmailLog[];
  isRealtimeConnected: boolean;
  refetch: () => Promise<void>;
}

export function useRealtimeCampaign(campaignId?: string): RealtimeData {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const isFetchingRef = useRef(false);

  // Initial and manual fetch
  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (campaignId) {
        const [resCamp, resLogs] = await Promise.all([
          fetch(`/api/campaigns/${campaignId}`),
          fetch(`/api/campaigns/${campaignId}/logs`),
        ]);

        if (resCamp.ok) {
          const d = await resCamp.json();
          if (d.campaign) setCampaign(d.campaign);
        }
        if (resLogs.ok) {
          const d = await resLogs.json();
          if (d.logs) setLogs(d.logs);
          if (d.events) setEvents(d.events);
        }
      } else {
        // Fetch top active campaign for main dashboard
        const [resCamps, resEvents, resLogs] = await Promise.all([
          fetch("/api/campaigns"),
          fetch("/api/events?limit=30"),
          fetch("/api/logs"),
        ]);

        if (resCamps.ok) {
          const d = await resCamps.json();
          const active = d.campaigns?.find((c: Campaign) => c.status === "running") || d.campaigns?.[0];
          if (active) setCampaign(active);
        }
        if (resEvents.ok) {
          const d = await resEvents.json();
          if (d.events) setEvents(d.events);
        }
        if (resLogs.ok) {
          const d = await resLogs.json();
          if (d.logs) setLogs(d.logs);
        }
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();

    const supabase = createClient();
    let channel: any = null;

    try {
      // Connect Supabase Realtime channel
      channel = supabase
        .channel(`campaign-stream-${campaignId || "global"}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "campaign_events",
            ...(campaignId ? { filter: `campaign_id=eq.${campaignId}` } : {}),
          },
          (payload) => {
            const newEvent = payload.new as CampaignEvent;
            if (newEvent && newEvent.id) {
              setEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id)].slice(0, 50));
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "email_logs",
            ...(campaignId ? { filter: `campaign_id=eq.${campaignId}` } : {}),
          },
          (payload) => {
            const newLog = payload.new as EmailLog;
            if (newLog && newLog.id) {
              setLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)]);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "campaigns",
            ...(campaignId ? { filter: `id=eq.${campaignId}` } : {}),
          },
          (payload) => {
            const updated = payload.new as Campaign;
            if (updated) {
              setCampaign(updated);
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsRealtimeConnected(true);
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            setIsRealtimeConnected(false);
          }
        });
    } catch {
      setIsRealtimeConnected(false);
    }

    // Adaptive background poll (every 5 seconds) as fallback if WebSocket is offline
    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [campaignId, fetchData]);

  return {
    campaign,
    events,
    logs,
    isRealtimeConnected,
    refetch: fetchData,
  };
}

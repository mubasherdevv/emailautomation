"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Campaign, CampaignStatus } from "@/types";
import {
  Plus,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  Eye,
  Send,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function CampaignsListPage() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setCampaigns(d.campaigns || []);
      }
    } catch {
      toast("Error", "Failed to load campaigns", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Auto-refresh every 5s while any campaign is running/sending so n8n updates show live
  useEffect(() => {
    const hasActive = campaigns.some(
      (c) => c.status === "running"
    );
    if (!hasActive) return;
    const interval = setInterval(() => {
      fetch("/api/campaigns", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d.campaigns) setCampaigns(d.campaigns);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [campaigns]);

  const handleAction = async (id: string, action: "start" | "pause" | "resume" | "stop" | "delete" | "restart") => {
    try {
      if (action === "delete") {
        if (!confirm("Are you sure you want to delete this campaign?")) return;
        const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
        if (res.ok) {
          toast("Campaign Deleted", "Campaign removed from registry", "info");
          fetchCampaigns();
        }
        return;
      }

      if (action === "restart") {
        if (!confirm("Restart this campaign from beginning and trigger n8n automation?")) return;
      }

      const res = await fetch(`/api/campaigns/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        toast(`Campaign ${action.toUpperCase()}`, `Action applied successfully`, "success");
        fetchCampaigns();
      }
    } catch {
      toast("Action Failed", "Could not complete operation", "error");
    }
  };

  const filtered = useMemo(() => {
    return campaigns
      .filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.subject?.toLowerCase().includes(search.toLowerCase()) ||
          c.sheet_id?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || c.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [campaigns, search, statusFilter, sortOrder]);

  return (
    <AdminShell
      title="Email Campaigns"
      subtitle="Manage, dispatch, and configure outreach pipelines"
      actions={
        <Link
          href="/campaigns/new"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Campaign</span>
        </Link>
      }
    >
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-[#E5E5E5] bg-white shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns, subjects..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#E5E5E5] text-xs text-[#111111] placeholder:text-neutral-400 focus:outline-hidden focus:border-[#6D28D9]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#666666]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#111111] focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="stopped">Stopped</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs text-[#666666] hover:bg-[#F5F5F5] transition"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="capitalize">{sortOrder}</span>
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="border-b border-[#E5E5E5] bg-neutral-50/70 text-[11px] font-semibold uppercase tracking-wider text-[#666666]">
              <tr>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Progress</th>
                <th className="py-3 px-3 text-right">Target</th>
                <th className="py-3 px-3 text-right text-emerald-700">Sent</th>
                <th className="py-3 px-3 text-right text-amber-700">Pending</th>
                <th className="py-3 px-3 text-right text-rose-700">Failed</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-neutral-400">
                    Loading campaigns...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((c) => {
                  const denominator = Math.max(
                    c.total_count || 0,
                    c.send_limit || 1
                  ) || 1;
                  const progress =
                    c.status === "completed" || c.status === "stopped"
                      ? 100
                      : Math.min(100, Math.max(0, ((c.sent_count || 0) / denominator) * 100));

                  return (
                    <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="font-semibold text-[#111111] hover:text-[#6D28D9] transition block truncate max-w-[200px]"
                        >
                          {c.name}
                        </Link>
                        <span className="text-[11px] text-neutral-400 block truncate max-w-[200px]">
                          {c.subject || "No subject specified"}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge status={c.status} />
                      </td>

                      <td className="py-3 px-3 w-32">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#6D28D9]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-neutral-900">
                        {c.total_count?.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-emerald-700">
                        {c.sent_count?.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-amber-700">
                        {c.pending_count?.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-rose-700">
                        {c.failed_count?.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-neutral-500 whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/campaigns/${c.id}`}
                            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>

                          {c.status === "draft" && (
                            <button
                              onClick={() => handleAction(c.id, "start")}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                              title="Start Campaign"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                            </button>
                          )}

                          {c.status === "running" && (
                            <button
                              onClick={() => handleAction(c.id, "pause")}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition"
                              title="Pause"
                            >
                              <Pause className="h-3.5 w-3.5 fill-current" />
                            </button>
                          )}

                          {c.status === "paused" && (
                            <button
                              onClick={() => handleAction(c.id, "resume")}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                              title="Resume"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                            </button>
                          )}

                          {(c.status === "running" || c.status === "paused") && (
                            <button
                              onClick={() => handleAction(c.id, "stop")}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition"
                              title="Stop"
                            >
                              <Square className="h-3.5 w-3.5 fill-current" />
                            </button>
                          )}

                          {c.status !== "draft" && (
                            <button
                              onClick={() => handleAction(c.id, "restart")}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition"
                              title="Restart Campaign"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleAction(c.id, "delete")}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-neutral-500">
                    <Send className="mx-auto h-6 w-6 text-neutral-300 mb-2" />
                    No campaigns found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

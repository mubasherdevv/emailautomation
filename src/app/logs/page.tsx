"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmailLog, Campaign } from "@/types";
import {
  Search,
  SlidersHorizontal,
  ListOrdered,
  Calendar,
  Download,
  AlertCircle,
  Mail,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function LogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const [lRes, cRes] = await Promise.all([
        fetch("/api/logs"),
        fetch("/api/campaigns"),
      ]);

      if (lRes.ok) {
        const d = await lRes.json();
        setLogs(d.logs || []);
      }
      if (cRes.ok) {
        const d = await cRes.json();
        setCampaigns(d.campaigns || []);
      }
    } catch {
      toast("Error", "Failed to fetch audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch =
        l.email.toLowerCase().includes(search.toLowerCase()) ||
        (l.provider_message_id && l.provider_message_id.toLowerCase().includes(search.toLowerCase())) ||
        (l.campaign_name && l.campaign_name.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesCampaign = campaignFilter === "all" || l.campaign_id === campaignFilter;

      return matchesSearch && matchesStatus && matchesCampaign;
    });
  }, [logs, search, statusFilter, campaignFilter]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Time", "Campaign", "Recipient", "Status", "Provider Message ID", "Error", "Sent At"];
    const rows = filtered.map((l) => [
      l.created_at,
      l.campaign_name || l.campaign_id || "",
      l.email,
      l.status,
      l.provider_message_id || "",
      (l.error || "").replace(/,/g, " "),
      l.sent_at || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `email_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("Export Ready", "CSV file generated and downloaded", "success");
  };

  return (
    <AdminShell
      title="Email Audit Logs"
      subtitle="Complete delivery, bounce, and error ledger for Resend & n8n dispatches"
      actions={
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E5E5E5] text-[#111111] text-xs font-semibold hover:bg-[#F5F5F5] transition shadow-2xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </button>
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
            placeholder="Search by recipient email or Message ID..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#E5E5E5] text-xs text-[#111111] placeholder:text-neutral-400 focus:outline-hidden focus:border-[#6D28D9]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#666666]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#111111] focus:outline-hidden"
            >
              <option value="all">All Delivery Statuses</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="bounced">Bounced</option>
              <option value="complained">Complained</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          {/* Campaign Filter */}
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#111111] focus:outline-hidden"
          >
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <span className="text-xs font-mono text-[#666666]">
            {filtered.length} entries
          </span>
        </div>
      </div>

      {/* Logs Data Table */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="border-b border-[#E5E5E5] bg-neutral-50/70 text-[10px] font-semibold uppercase text-[#666666]">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-3">Campaign</th>
                <th className="py-3 px-3">Recipient Email</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Provider Message ID</th>
                <th className="py-3 px-3">Sent At</th>
                <th className="py-3 px-4">Error / Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-neutral-400">
                    Loading email activity logs...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    <td className="py-3 px-3 font-medium text-neutral-800 truncate max-w-[150px]">
                      {log.campaign_name || "General Dispatch"}
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-neutral-900 truncate max-w-[180px]">
                      {log.email}
                    </td>

                    <td className="py-3 px-3">
                      <StatusBadge status={log.status} showDot={false} />
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-neutral-400 truncate max-w-[140px]">
                      {log.provider_message_id || "—"}
                    </td>

                    <td className="py-3 px-3 text-[11px] text-neutral-500 whitespace-nowrap">
                      {log.sent_at ? new Date(log.sent_at).toLocaleTimeString() : "—"}
                    </td>

                    <td className="py-3 px-4 text-[11px] text-rose-600 truncate max-w-[180px]" title={log.error || ""}>
                      {log.error ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{log.error}</span>
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-neutral-500">
                    <ListOrdered className="mx-auto h-6 w-6 text-neutral-300 mb-2" />
                    No logs found matching your selected criteria.
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

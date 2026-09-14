"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Upload,
  AlertCircle,
  Table,
  Sparkles,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Download,
  Mail,
  Phone,
  Globe,
  MapPin,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

// Smart field extractor matching varied, custom, or partial headers
function getSmartValue(
  row: Record<string, string>,
  type: "email" | "personalEmail" | "firstName" | "lastName" | "address" | "contact" | "website"
): string {
  if (!row || typeof row !== "object") return "";
  const entries = Object.entries(row);

  for (const [rawK, rawV] of entries) {
    if (rawV === undefined || rawV === null) continue;
    const val = String(rawV).trim();
    if (!val) continue;
    const k = rawK.toLowerCase().trim();

    if (type === "email") {
      if (k.includes("email") && !k.includes("personal") && !k.includes("alt") && !k.includes("second")) {
        return val;
      }
    } else if (type === "personalEmail") {
      if (k.includes("personal") || k.includes("alt") || (k.includes("email") && (k.includes("2") || k.includes("secondary")))) {
        return val;
      }
    } else if (type === "firstName") {
      if (k.includes("first") || (k.includes("name") && !k.includes("last") && !k.includes("sur") && !k.includes("family"))) {
        return val;
      }
    } else if (type === "lastName") {
      if (k.includes("last") || k.includes("sur") || k.includes("family")) {
        return val;
      }
    } else if (type === "address") {
      if (k.includes("address") || k.includes("location") || k.includes("city") || k.includes("country")) {
        return val;
      }
    } else if (type === "contact") {
      if (k.includes("contact") || k.includes("phone") || k.includes("mobile") || k.includes("cell") || k.includes("tel") || k.includes("whatsapp")) {
        return val;
      }
    } else if (type === "website") {
      if (k.includes("web") || k.includes("site") || k.includes("url") || k.includes("domain") || k.includes("company")) {
        return val;
      }
    }
  }

  // Fallback: If looking for email, check if any column contains an email address
  if (type === "email") {
    for (const [, rawV] of entries) {
      if (rawV && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(rawV).trim())) {
        return String(rawV).trim();
      }
    }
  }

  return "";
}

type FilterOption = "all" | "valid_email" | "has_phone" | "has_personal_email" | "has_website" | "has_address";
type PageSizeOption = "50" | "100" | "500" | "1000" | "all" | "custom";

export default function ContactsImportPage() {
  const { toast } = useToast();

  const [sheetId, setSheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [importing, setImporting] = useState(false);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<{
    totalRowsReceived: number;
    imported: number;
    duplicatesSkipped: number;
    invalidEmails: number;
  } | null>(null);

  // Raw rows fetched from sheet
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Filtering & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCriteria, setFilterCriteria] = useState<FilterOption>("all");
  const [pageSize, setPageSize] = useState<PageSizeOption>("50");
  const [customPageSize, setCustomPageSize] = useState("25");
  const [currentPage, setCurrentPage] = useState(1);

  // Selection state (set of indices into previewRows)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const executeFetch = async (targetId: string, targetTab: string, silent = false) => {
    if (!targetId.trim()) return;
    setFetchingLive(true);
    try {
      const res = await fetch("/api/settings/verify-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrlOrId: targetId, sheetName: targetTab }),
      });
      const data = await res.json();
      if (!data.success) {
        if (!silent) toast("Sheet Error", data.error || "Failed to read sheet", "error");
        return;
      }

      const sourceRows = data.allRows || data.sampleRows;
      if (data.isLiveFetched && sourceRows && sourceRows.length > 0) {
        // Map dynamic CSV rows to contact schema using smart extractor
        const mappedRows = sourceRows.map((r: Record<string, string>) => ({
          firstName: getSmartValue(r, "firstName"),
          lastName: getSmartValue(r, "lastName"),
          email: getSmartValue(r, "email"),
          personalEmail: getSmartValue(r, "personalEmail") || null,
          address: getSmartValue(r, "address"),
          contact: getSmartValue(r, "contact"),
          website: getSmartValue(r, "website"),
        }));

        setPreviewRows(mappedRows);
        setSelectedIndices(new Set());
        setCurrentPage(1);
        if (!silent) {
          toast("Live Rows Loaded", `Fetched ${data.totalRowsCount} contacts directly from Google Sheet!`, "success");
        }
      } else if (data.requiresShare && !silent) {
        toast("Sheet is Private", "Please set Google Sheet 'Share' to 'Anyone with the link can view' to fetch live rows", "error");
      }
    } catch {
      if (!silent) toast("Error", "Could not fetch Google Sheet data", "error");
    } finally {
      setFetchingLive(false);
    }
  };

  // Auto-load saved sheet configuration from URL / localStorage / API on mount
  useEffect(() => {
    async function loadSavedSheet() {
      let resolvedSheet = "";
      let resolvedTab = "Sheet1";

      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search);
        const urlSheet = searchParams.get("sheetId");
        const urlTab = searchParams.get("sheetName");

        const localSheet = localStorage.getItem("volt_saved_sheet_url");
        const localTab = localStorage.getItem("volt_saved_sheet_name");

        if (urlSheet) {
          resolvedSheet = urlSheet;
          resolvedTab = urlTab || "Sheet1";
        } else if (localSheet) {
          resolvedSheet = localSheet;
          resolvedTab = localTab || "Sheet1";
        }
      }

      if (!resolvedSheet) {
        try {
          const res = await fetch("/api/settings");
          const data = await res.json();
          if (data.googleSheetId) {
            resolvedSheet = data.googleSheetId;
          }
          if (data.googleSheetName) {
            resolvedTab = data.googleSheetName;
          }
        } catch {
          // ignore
        }
      }

      if (resolvedSheet) {
        setSheetId(resolvedSheet);
        setSheetName(resolvedTab);
        if (typeof window !== "undefined") {
          localStorage.setItem("volt_saved_sheet_url", resolvedSheet);
          localStorage.setItem("volt_saved_sheet_name", resolvedTab);
        }
        executeFetch(resolvedSheet, resolvedTab, true);
      }
    }

    loadSavedSheet();
  }, []);

  const handleFetchLiveSheet = async () => {
    if (!sheetId.trim()) {
      toast("Error", "Please enter a Google Sheet URL or Sheet ID", "error");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("volt_saved_sheet_url", sheetId);
      localStorage.setItem("volt_saved_sheet_name", sheetName);
    }
    // Also save in server settings
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleSheetId: sheetId, googleSheetName: sheetName }),
    }).catch(() => {});

    await executeFetch(sheetId, sheetName, false);
  };

  // Filter & Search Logic
  const filteredRowsWithIndex = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return previewRows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        // 1. Search Query
        if (q) {
          const matchSearch =
            (row.firstName || "").toLowerCase().includes(q) ||
            (row.lastName || "").toLowerCase().includes(q) ||
            (row.email || "").toLowerCase().includes(q) ||
            (row.personalEmail || "").toLowerCase().includes(q) ||
            (row.contact || "").toLowerCase().includes(q) ||
            (row.address || "").toLowerCase().includes(q) ||
            (row.website || "").toLowerCase().includes(q);

          if (!matchSearch) return false;
        }

        // 2. Criteria Filters
        if (filterCriteria === "valid_email") {
          return Boolean(row.email && emailRegex.test(row.email));
        }
        if (filterCriteria === "has_phone") {
          return Boolean(row.contact && String(row.contact).trim() !== "");
        }
        if (filterCriteria === "has_personal_email") {
          return Boolean(row.personalEmail && String(row.personalEmail).trim() !== "");
        }
        if (filterCriteria === "has_website") {
          return Boolean(row.website && String(row.website).trim() !== "");
        }
        if (filterCriteria === "has_address") {
          return Boolean(row.address && String(row.address).trim() !== "");
        }

        return true;
      });
  }, [previewRows, searchQuery, filterCriteria]);

  // Pagination calculation
  const effectivePageSize = useMemo(() => {
    if (pageSize === "all") return Infinity;
    if (pageSize === "custom") {
      const parsed = parseInt(customPageSize, 10);
      return isNaN(parsed) || parsed <= 0 ? 25 : parsed;
    }
    return parseInt(pageSize, 10);
  }, [pageSize, customPageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRowsWithIndex.length / effectivePageSize));

  const paginatedRows = useMemo(() => {
    if (effectivePageSize === Infinity) return filteredRowsWithIndex;
    const start = (currentPage - 1) * effectivePageSize;
    return filteredRowsWithIndex.slice(start, start + effectivePageSize);
  }, [filteredRowsWithIndex, currentPage, effectivePageSize]);

  // Adjust page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Selection toggles
  const handleToggleRow = (originalIndex: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(originalIndex)) {
        next.delete(originalIndex);
      } else {
        next.add(originalIndex);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIndices = filteredRowsWithIndex.map((f) => f.originalIndex);
    const areAllSelected = allFilteredIndices.every((i) => selectedIndices.has(i));

    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (areAllSelected) {
        allFilteredIndices.forEach((i) => next.delete(i));
      } else {
        allFilteredIndices.forEach((i) => next.add(i));
      }
      return next;
    });
  };

  const allFilteredSelected =
    filteredRowsWithIndex.length > 0 &&
    filteredRowsWithIndex.every((f) => selectedIndices.has(f.originalIndex));

  // Determine which rows to actually send to the import endpoint
  const rowsToImport = useMemo(() => {
    if (selectedIndices.size > 0) {
      return previewRows.filter((_, idx) => selectedIndices.has(idx));
    }
    return filteredRowsWithIndex.map((f) => f.row);
  }, [selectedIndices, previewRows, filteredRowsWithIndex]);

  const handleExecuteImport = async () => {
    if (rowsToImport.length === 0) {
      toast("Notice", "No contacts selected or matching filters to import", "info");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId,
          sheetName,
          rows: rowsToImport,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details ? `${data.error}: ${data.details}` : data.error || "Import failed");
      }

      setSyncSummary(data.summary);
      setLastSyncTime(new Date().toLocaleTimeString());
      toast("Sync Complete", data.message, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync error";
      toast("Import Error", msg, "error");
    } finally {
      setImporting(false);
    }
  };

  // Export current filtered contacts as CSV
  const handleExportCsv = () => {
    if (filteredRowsWithIndex.length === 0) return;
    const headers = ["First Name", "Last Name", "Email", "Personal Email", "Website", "Contact", "Address"];
    const rows = filteredRowsWithIndex.map(({ row }) => [
      `"${(row.firstName || "").replace(/"/g, '""')}"`,
      `"${(row.lastName || "").replace(/"/g, '""')}"`,
      `"${(row.email || "").replace(/"/g, '""')}"`,
      `"${(row.personalEmail || "").replace(/"/g, '""')}"`,
      `"${(row.website || "").replace(/"/g, '""')}"`,
      `"${(row.contact || "").replace(/"/g, '""')}"`,
      `"${(row.address || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `google_sheet_contacts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("CSV Exported", `Exported ${filteredRowsWithIndex.length} contacts`, "success");
  };

  return (
    <AdminShell
      title="Google Sheets Lead Import"
      subtitle="Connect spreadsheet tabs, filter leads, and synchronize contacts into Postgres"
      actions={
        <div className="flex items-center gap-2">
          {previewRows.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] bg-white text-xs font-semibold text-neutral-700 hover:bg-[#F5F5F5] transition shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          )}
          <Link
            href="/contacts"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:bg-[#F5F5F5]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Contacts</span>
          </Link>
        </div>
      }
    >
      {/* Top Connection Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#666666]">
            <span>Google API Status</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 text-base font-bold text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>Connected</span>
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Service Account &amp; CSV Feed</span>
        </div>

        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-xs text-[#666666]">Last Synchronized</div>
          <div className="mt-2 text-base font-bold text-[#111111] font-mono">
            {lastSyncTime || "Not synced yet"}
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Automated on campaign start</span>
        </div>

        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-xs text-[#666666]">Total Rows Discovered</div>
          <div className="mt-2 text-base font-bold text-[#6D28D9] font-mono">
            {previewRows.length} Contacts
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            {filteredRowsWithIndex.length} matching active filters
          </span>
        </div>

        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-xs">
          <div className="text-xs text-[#666666]">Active Selection</div>
          <div className="mt-2 text-base font-bold text-neutral-800 font-mono">
            {selectedIndices.size > 0 ? `${selectedIndices.size} Selected` : "All Filtered"}
          </div>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            Targeted for immediate sync
          </span>
        </div>
      </div>

      {/* Sync Configuration Form */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-[#111111]">
              Spreadsheet Source Parameters
            </h3>
          </div>
          <button
            type="button"
            onClick={handleFetchLiveSheet}
            disabled={fetchingLive}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition shadow-2xs disabled:opacity-50"
          >
            {fetchingLive ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>{fetchingLive ? "Fetching Live..." : "Fetch Live from Sheet"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Google Spreadsheet ID or Full URL *
            </label>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms or paste browser URL"
              className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Sheet Tab Name *
            </label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet1"
              className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Expected Schema Badges */}
        <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#111111]">
              Supported Columns:
            </span>
            {[
              "First Name",
              "Last Name",
              "Email",
              "Personal Email",
              "Contact / Phone",
              "Address",
              "Website",
            ].map((col) => (
              <span
                key={col}
                className="px-2 py-0.5 rounded-md bg-white border border-[#E5E5E5] text-[10px] font-mono text-neutral-700 shadow-2xs"
              >
                {col}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-neutral-500 italic">Smart matching handles custom names &amp; typos</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-[#666666]">
            <span>Normalizes emails: </span>
            <code className="text-[#6D28D9] font-mono text-[11px]">ALI@GMAIL.COM &rarr; ali@gmail.com</code>
          </div>

          <button
            onClick={handleExecuteImport}
            disabled={importing || rowsToImport.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {importing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span>
              {importing
                ? "Synchronizing..."
                : selectedIndices.size > 0
                ? `Import ${selectedIndices.size} Selected Leads`
                : `Import All ${rowsToImport.length} Leads`}
            </span>
          </button>
        </div>
      </div>

      {/* Sync Result Summary */}
      {syncSummary && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs mb-3">
            <Sparkles className="h-4 w-4" />
            <span>Synchronization Result Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
              <span className="text-neutral-500 text-[11px]">Total Rows</span>
              <div className="font-mono font-bold text-neutral-900 text-sm">
                {syncSummary.totalRowsReceived}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
              <span className="text-emerald-700 text-[11px]">Successfully Imported</span>
              <div className="font-mono font-bold text-emerald-700 text-sm">
                {syncSummary.imported}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
              <span className="text-amber-700 text-[11px]">Duplicates Skipped</span>
              <div className="font-mono font-bold text-amber-700 text-sm">
                {syncSummary.duplicatesSkipped}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
              <span className="text-rose-700 text-[11px]">Invalid Rows Ignored</span>
              <div className="font-mono font-bold text-rose-700 text-sm">
                {syncSummary.invalidEmails}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FILTERING & TABLE PREVIEW CONTROLS */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-4">
        {/* Table Title and Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4 text-[#6D28D9]" />
            <h3 className="text-sm font-semibold text-[#111111]">
              Live Sheet Preview ({filteredRowsWithIndex.length} of {previewRows.length} Loaded)
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-600">
            {selectedIndices.size > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-purple-50 text-[#6D28D9] font-semibold text-[11px]">
                {selectedIndices.size} selected
              </span>
            )}
            <span className="text-[11px] text-neutral-400">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Realtime Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone, location, domain..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-[#E5E5E5] text-xs text-neutral-800 placeholder-neutral-400 focus:border-[#6D28D9] focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick Filter Criteria Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <button
              onClick={() => setFilterCriteria("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterCriteria === "all"
                  ? "bg-[#6D28D9] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All Leads
            </button>
            <button
              onClick={() => setFilterCriteria("valid_email")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriteria === "valid_email"
                  ? "bg-[#6D28D9] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Mail className="h-3 w-3" />
              <span>Valid Email</span>
            </button>
            <button
              onClick={() => setFilterCriteria("has_phone")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriteria === "has_phone"
                  ? "bg-[#6D28D9] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Phone className="h-3 w-3" />
              <span>Has Phone</span>
            </button>
            <button
              onClick={() => setFilterCriteria("has_personal_email")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriteria === "has_personal_email"
                  ? "bg-[#6D28D9] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Mail className="h-3 w-3" />
              <span>Personal Email</span>
            </button>
            <button
              onClick={() => setFilterCriteria("has_website")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriteria === "has_website"
                  ? "bg-[#6D28D9] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Globe className="h-3 w-3" />
              <span>Website</span>
            </button>
            <button
              onClick={() => setFilterCriteria("has_address")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriteria === "has_address"
                  ? "bg-[#6D28D9] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <MapPin className="h-3 w-3" />
              <span>Address</span>
            </button>
          </div>
        </div>

        {/* Rows per page selector & selection header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
          {/* Select all checkbox & bulk controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllFiltered}
              disabled={filteredRowsWithIndex.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 text-xs font-medium hover:bg-neutral-100 transition disabled:opacity-50 cursor-pointer"
            >
              {allFilteredSelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-[#6D28D9]" />
              ) : (
                <Square className="h-3.5 w-3.5 text-neutral-400" />
              )}
              <span>{allFilteredSelected ? "Deselect Filtered" : "Select All Filtered"}</span>
            </button>

            {selectedIndices.size > 0 && (
              <button
                onClick={() => setSelectedIndices(new Set())}
                className="text-[11px] text-neutral-500 hover:text-neutral-800 underline"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Show count selector (50, 100, 500, 1000, All, Custom) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500 flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" />
              Show:
            </span>

            <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50/70 p-0.5 text-xs">
              {(["50", "100", "500", "1000", "all", "custom"] as PageSizeOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPageSize(opt)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    pageSize === opt
                      ? "bg-white text-neutral-900 shadow-2xs font-semibold"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {opt === "all" ? "All" : opt === "custom" ? "Custom" : opt}
                </button>
              ))}
            </div>

            {/* Custom rows input */}
            {pageSize === "custom" && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={customPageSize}
                  onChange={(e) => setCustomPageSize(e.target.value)}
                  className="w-16 px-2 py-0.5 rounded-md border border-neutral-300 text-xs font-mono text-center focus:border-[#6D28D9] focus:outline-hidden"
                  placeholder="25"
                />
                <span className="text-[10px] text-neutral-500">rows</span>
              </div>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-lg border border-[#E5E5E5]">
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="border-b border-[#E5E5E5] bg-neutral-50 text-[10px] font-semibold uppercase text-[#666666]">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleSelectAllFiltered}
                    disabled={filteredRowsWithIndex.length === 0}
                    className="rounded text-[#6D28D9] focus:ring-[#6D28D9] cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">First Name</th>
                <th className="py-2.5 px-3">Last Name</th>
                <th className="py-2.5 px-3">Email (Required)</th>
                <th className="py-2.5 px-3">Personal Email</th>
                <th className="py-2.5 px-3">Contact / Phone</th>
                <th className="py-2.5 px-3">Website</th>
                <th className="py-2.5 px-3">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <p className="text-xs font-semibold text-neutral-700">
                      {previewRows.length === 0 ? "No contacts loaded yet" : "No contacts match the current filter"}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      {previewRows.length === 0
                        ? "Paste your Google Sheet URL/ID above and click 'Fetch Live from Sheet'."
                        : "Try adjusting your search query or switching to 'All Leads'."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map(({ row, originalIndex }, displayIdx) => {
                  const isSelected = selectedIndices.has(originalIndex);
                  const rowNumber = (currentPage - 1) * (effectivePageSize === Infinity ? 0 : effectivePageSize) + displayIdx + 1;

                  return (
                    <tr
                      key={originalIndex}
                      onClick={() => handleToggleRow(originalIndex)}
                      className={`hover:bg-neutral-50/70 transition cursor-pointer ${
                        isSelected ? "bg-purple-50/40" : ""
                      }`}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleRow(originalIndex);
                          }}
                          className="rounded text-[#6D28D9] focus:ring-[#6D28D9] cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3 text-neutral-400 font-mono text-[10px]">
                        {rowNumber}
                      </td>
                      <td className="py-2 px-3 font-medium text-neutral-900">
                        {row.firstName || <span className="text-neutral-300 italic">—</span>}
                      </td>
                      <td className="py-2 px-3">
                        {row.lastName || <span className="text-neutral-300 italic">—</span>}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-[#6D28D9]">
                        {row.email || <span className="text-rose-400 italic text-[11px]">Missing</span>}
                      </td>
                      <td className="py-2 px-3 font-mono text-neutral-500">
                        {row.personalEmail || <span className="text-neutral-300 italic">—</span>}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {row.contact || <span className="text-neutral-300 italic">—</span>}
                      </td>
                      <td className="py-2 px-3 text-neutral-600">
                        {row.website ? (
                          <a
                            href={row.website.startsWith("http") ? row.website : `https://${row.website}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-[#6D28D9] underline"
                          >
                            {row.website}
                          </a>
                        ) : (
                          <span className="text-neutral-300 italic">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-neutral-600 max-w-xs truncate">
                        {row.address || <span className="text-neutral-300 italic">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
            <span className="text-neutral-500 text-[11px]">
              Showing {Math.min(filteredRowsWithIndex.length, (currentPage - 1) * effectivePageSize + 1)} to{" "}
              {Math.min(filteredRowsWithIndex.length, currentPage * effectivePageSize)} of{" "}
              <strong>{filteredRowsWithIndex.length}</strong> contacts
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 transition shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-3 py-1 font-mono font-medium text-neutral-700 text-xs">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 transition shadow-2xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

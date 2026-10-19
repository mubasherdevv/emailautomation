"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Radar,
  Search,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Sparkles,
  Download,
  Users,
  Send,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Key,
  ShieldCheck,
  ChevronRight,
  Filter,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { AdminShell } from "@/components/layout/AdminShell";

interface LeadItem {
  id: string;
  name: string;
  category?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  rating?: number;
  reviewsCount?: number;
  source: "apify" | "web";
  socials?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

export default function LeadFinderPage() {
  const { toast } = useToast();
  const router = useRouter();

  // Search parameters
  const [query, setQuery] = useState("Digital Marketing Agencies");
  const [location, setLocation] = useState("Dubai, UAE");
  const [limit, setLimit] = useState(25);
  const [searchMode, setSearchMode] = useState<"apify" | "web">("apify");
  const [apifyToken, setApifyToken] = useState("");
  const [actorId, setActorId] = useState("compass~crawler-google-places");
  const [showConfig, setShowConfig] = useState(false);

  // Search execution state
  const [searching, setSearching] = useState(false);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);
  const [importing, setImporting] = useState(false);

  // In-table filtering
  const [tableFilter, setTableFilter] = useState("");
  const [onlyWithEmail, setOnlyWithEmail] = useState(false);

  // Load saved token from localStorage or settings on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("apify_api_token");
    if (savedToken) {
      setApifyToken(savedToken);
    } else {
      // Check if backend has one in settings
      fetch("/api/settings")
        .then((res) => res.json())
        .then((d) => {
          if (d.settings?.apifyApiToken) {
            setApifyToken(d.settings.apifyApiToken);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleSaveToken = () => {
    if (apifyToken.trim()) {
      localStorage.setItem("apify_api_token", apifyToken.trim());
      toast("Token Saved", "Apify API token saved locally in your browser", "success");
    } else {
      localStorage.removeItem("apify_api_token");
      toast("Token Cleared", "Apify API token cleared", "info");
    }
    setShowConfig(false);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      toast("Missing Query", "Please enter a business niche or keyword", "error");
      return;
    }

    setSearching(true);
    setSelectedIds(new Set());

    try {
      const res = await fetch("/api/lead-finder/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          location: location.trim(),
          limit: Number(limit),
          apifyToken: searchMode === "apify" ? apifyToken.trim() : undefined,
          actorId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      const results: LeadItem[] = data.leads || [];
      setLeads(results);

      // Pre-select leads that have an email address
      const withEmailIds = results.filter((l) => l.email && l.email.includes("@")).map((l) => l.id);
      setSelectedIds(new Set(withEmailIds.length > 0 ? withEmailIds : results.map((r) => r.id)));

      if (results.length === 0) {
        toast("No Leads Found", "Try broadening your niche keyword or location", "warning");
      } else {
        toast(
          "Search Complete",
          `Found ${results.length} leads via ${data.source === "apify" ? "Apify Google Places" : "Web Discovery"}`,
          "success"
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error finding leads";
      toast("Search Failed", msg, "error");
    } finally {
      setSearching(false);
    }
  };

  // Filtered leads in table
  const filteredLeads = useMemo(() => {
    const q = tableFilter.toLowerCase().trim();
    return leads.filter((item) => {
      if (onlyWithEmail && (!item.email || !item.email.includes("@"))) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.website && item.website.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.phone && item.phone.toLowerCase().includes(q))
      );
    });
  }, [leads, tableFilter, onlyWithEmail]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allFiltered = filteredLeads.map((l) => l.id);
    const areAllSelected = allFiltered.length > 0 && allFiltered.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (areAllSelected) {
        allFiltered.forEach((id) => next.delete(id));
      } else {
        allFiltered.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // 1-Click Email Enrichment: Visit websites of selected leads to scrape contact emails
  const handleEnrichSelected = async () => {
    const targetLeads = leads.filter((l) => selectedIds.has(l.id) && l.website && !l.email);
    if (targetLeads.length === 0) {
      toast("All Have Emails", "All selected leads already have an email or missing a website", "info");
      return;
    }

    setEnriching(true);
    toast("Enriching Leads", `Crawling websites for ${targetLeads.length} leads to extract emails...`, "info");

    try {
      const websites = targetLeads.map((l) => l.website!);
      const res = await fetch("/api/lead-finder/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websites }),
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data.enriched)) {
        let foundEmailsCount = 0;
        setLeads((prev) =>
          prev.map((l) => {
            const match = data.enriched.find((e: any) => e.website === l.website);
            if (match && match.email) {
              foundEmailsCount++;
              return {
                ...l,
                email: match.email,
                phone: l.phone || match.phone,
                socials: { ...l.socials, ...match.socials },
              };
            }
            return l;
          })
        );
        toast("Enrichment Done", `Discovered ${foundEmailsCount} new emails from business websites!`, "success");
      }
    } catch {
      toast("Enrichment Error", "Could not complete website crawling", "error");
    } finally {
      setEnriching(false);
    }
  };

  // Import selected leads into Contacts Directory
  const handleImportToContacts = async () => {
    const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
    if (selectedLeads.length === 0) {
      toast("No Leads Selected", "Select at least 1 lead to import", "warning");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/lead-finder/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: selectedLeads }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      toast("Import Successful", data.message || `Imported ${data.importedCount} contacts`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error importing contacts";
      toast("Import Failed", msg, "error");
    } finally {
      setImporting(false);
    }
  };

  // Launch campaign with selected leads
  const handleLaunchCampaign = async () => {
    const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
    if (selectedLeads.length === 0) {
      toast("No Leads Selected", "Select leads to launch campaign", "warning");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/lead-finder/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: selectedLeads }),
      });
      const data = await res.json();
      if (data.contactIds && Array.isArray(data.contactIds)) {
        localStorage.setItem("campaign_selected_contact_ids", JSON.stringify(data.contactIds));
        toast("Leads Ready", "Redirecting to Campaign Creator...", "success");
        router.push("/campaigns/new");
      } else {
        router.push("/campaigns/new");
      }
    } catch {
      router.push("/campaigns/new");
    } finally {
      setImporting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
    const items = selectedLeads.length > 0 ? selectedLeads : leads;
    if (items.length === 0) {
      toast("No Data", "No leads to export", "warning");
      return;
    }

    const headers = ["Business Name", "Category", "Email", "Phone", "Website", "Address", "City", "Source"];
    const rows = items.map((l) => [
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${(l.category || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.website || "").replace(/"/g, '""')}"`,
      `"${(l.address || "").replace(/"/g, '""')}"`,
      `"${(l.city || "").replace(/"/g, '""')}"`,
      `"${l.source}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_${query.toLowerCase().replace(/[^a-z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast("CSV Exported", `Downloaded ${items.length} leads as CSV`, "success");
  };

  // Quick niches
  const quickNiches = [
    "Digital Marketing Agencies",
    "Dentists & Dental Clinics",
    "Real Estate Brokers",
    "E-commerce Brands",
    "Software & SaaS Companies",
    "Accounting & Tax Firms",
  ];

  return (
    <AdminShell
      title="Lead Finder"
      subtitle="Find high-intent business leads & decision-maker emails via Apify Google Places or live web discovery"
      actions={
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
            showConfig || apifyToken
              ? "border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300"
              : "border-neutral-200 bg-white text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
          }`}
        >
          <Key className="h-3.5 w-3.5" />
          <span>{apifyToken ? "Apify Connected" : "Configure Apify Token"}</span>
        </button>
      }
    >
      <div className="space-y-6">

      {/* Apify Configuration Card (Collapsible) */}
      {showConfig && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-900/50 p-4 space-y-3 transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                Apify API Integration (Optional for Google Places / Maps scraping)
              </h3>
            </div>
            <span className="text-[10px] text-neutral-500">
              Get free token from{" "}
              <a href="https://apify.com" target="_blank" rel="noreferrer" className="text-purple-600 underline">
                apify.com
              </a>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Apify Personal API Token
              </label>
              <input
                type="password"
                value={apifyToken}
                onChange={(e) => setApifyToken(e.target.value)}
                placeholder="apify_api_..."
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 font-mono focus:border-purple-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Scraper Actor ID
              </label>
              <input
                type="text"
                value={actorId}
                onChange={(e) => setActorId(e.target.value)}
                placeholder="compass~crawler-google-places"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 font-mono focus:border-purple-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="px-3 py-1 text-xs text-neutral-500 hover:text-neutral-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveToken}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700 transition shadow-xs cursor-pointer"
            >
              Save Token
            </button>
          </div>
        </div>
      )}

      {/* Main Search Panel */}
      <div className="rounded-xl border border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] p-5 shadow-xs space-y-4">
        {/* Source Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSearchMode("apify")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition font-medium ${
                searchMode === "apify"
                  ? "bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 shadow-xs font-semibold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-purple-600" />
              <span>Google Places / Maps (Apify)</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchMode("web")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition font-medium ${
                searchMode === "web"
                  ? "bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 shadow-xs font-semibold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-indigo-600" />
              <span>Live Web Discovery (Free)</span>
            </button>
          </div>

          <div className="text-[11px] text-neutral-500">
            {searchMode === "apify" ? (
              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                <Sparkles className="h-3 w-3" />
                Scrapes verified Google Maps listings with addresses &amp; websites
              </span>
            ) : (
              <span>Crawl active company domains &amp; directory listings in realtime</span>
            )}
          </div>
        </div>

        {/* Search Form Inputs */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-[#111111] dark:text-neutral-100 mb-1">
              Target Niche / Business Keyword *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Digital Marketing Agencies, Dentists..."
                className="w-full rounded-lg border border-[#E5E5E5] dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3.5 py-2 text-xs text-[#111111] dark:text-neutral-100 focus:border-[#6D28D9] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-[#111111] dark:text-neutral-100 mb-1">
              Target City / Location *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. London, UK or Dubai"
                className="w-full rounded-lg border border-[#E5E5E5] dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3.5 py-2 text-xs text-[#111111] dark:text-neutral-100 focus:border-[#6D28D9] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-[#111111] dark:text-neutral-100 mb-1">
              Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-[#E5E5E5] dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-xs text-[#111111] dark:text-neutral-100 focus:border-[#6D28D9] focus:outline-hidden cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={searching}
              className="w-full py-2 px-4 rounded-lg bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {searching ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Radar className="h-3.5 w-3.5" />
                  <span>Find Leads</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Niches Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-[11px] text-neutral-500 font-medium">Quick Niches:</span>
          {quickNiches.map((niche) => (
            <button
              key={niche}
              type="button"
              onClick={() => {
                setQuery(niche);
              }}
              className="px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
            >
              {niche}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Results Grid & Actions */}
      {leads.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121215] shadow-xs">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Total Leads</span>
              <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">{leads.length}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/40 shadow-xs">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-semibold">
                With Email
              </span>
              <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {leads.filter((l) => Boolean(l.email && l.email.includes("@"))).length}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-900/40 shadow-xs">
              <span className="text-[10px] text-blue-700 dark:text-blue-400 uppercase tracking-wider font-semibold">
                With Website
              </span>
              <p className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
                {leads.filter((l) => Boolean(l.website)).length}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/30 dark:bg-purple-950/20 dark:border-purple-900/40 shadow-xs">
              <span className="text-[10px] text-purple-700 dark:text-purple-400 uppercase tracking-wider font-semibold">
                With Phone
              </span>
              <p className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-300">
                {leads.filter((l) => Boolean(l.phone)).length}
              </p>
            </div>
          </div>

          {/* Table Controls & Batch Action Bar */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 dark:bg-purple-950/20 dark:border-purple-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3 w-3 text-neutral-400" />
                <input
                  type="text"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  placeholder="Filter by name, website..."
                  className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-8 pr-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden w-48 sm:w-60"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyWithEmail}
                  onChange={(e) => setOnlyWithEmail(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-600"
                />
                <span>Only with Email</span>
              </label>

              <span className="text-xs text-purple-800 dark:text-purple-300 font-semibold">
                {selectedIds.size} of {filteredLeads.length} Selected
              </span>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleEnrichSelected}
                disabled={enriching}
                title="Crawls business websites of selected leads to discover emails"
                className="px-3 py-1.5 rounded-lg border border-purple-300 bg-white dark:bg-neutral-900 text-purple-700 dark:text-purple-300 hover:bg-purple-50 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Sparkles className={`h-3.5 w-3.5 ${enriching ? "animate-spin" : ""}`} />
                <span>{enriching ? "Crawling..." : "Enrich Missing Emails"}</span>
              </button>

              <button
                type="button"
                onClick={handleImportToContacts}
                disabled={importing || selectedIds.size === 0}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Add to Contacts</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchCampaign}
                disabled={importing || selectedIds.size === 0}
                className="px-3.5 py-1.5 rounded-lg bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Launch Campaign &rarr;</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                title="Export leads to CSV"
                className="p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 text-xs cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="rounded-xl border border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#F5F5F5] dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredLeads.length > 0 && filteredLeads.every((l) => selectedIds.has(l.id))}
                        onChange={handleSelectAll}
                        className="rounded text-purple-600 focus:ring-purple-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Business / Company</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Website</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5] dark:divide-neutral-800">
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedIds.has(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        className={`transition hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 ${
                          isSelected ? "bg-purple-50/30 dark:bg-purple-950/20" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(lead.id)}
                            className="rounded text-purple-600 focus:ring-purple-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                            <span>{lead.name}</span>
                            {lead.rating ? (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-full font-medium">
                                ★ {lead.rating}
                              </span>
                            ) : null}
                          </div>
                          {lead.category && (
                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                              {lead.category}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {lead.email ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-md font-medium">
                              <Mail className="h-3 w-3 text-purple-500" />
                              <span>{lead.email}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIds(new Set([lead.id]));
                                handleEnrichSelected();
                              }}
                              disabled={!lead.website}
                              className="text-[10px] text-neutral-400 hover:text-purple-600 underline cursor-pointer disabled:no-underline disabled:opacity-40"
                            >
                              {lead.website ? "+ Find Email" : "No website"}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} className="hover:text-purple-600 hover:underline">
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {lead.website ? (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                            >
                              <span>{lead.website.replace(/^https?:\/\//, "").replace(/\/+$/, "")}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400 max-w-[200px] truncate">
                          {lead.address || lead.city || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIds(new Set([lead.id]));
                              handleImportToContacts();
                            }}
                            className="px-2.5 py-1 rounded-md text-[11px] border border-neutral-200 hover:border-purple-300 hover:bg-purple-50 text-neutral-700 hover:text-purple-700 transition cursor-pointer shadow-2xs"
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State before search */}
      {leads.length === 0 && !searching && (
        <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20 p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            <Radar className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            No leads searched yet
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Enter a niche keyword and target city above, then click <strong>&quot;Find Leads&quot;</strong>. The system will
            scrape verified local businesses and extract their email addresses and websites automatically.
          </p>
        </div>
      )}
      </div>
    </AdminShell>
  );
}

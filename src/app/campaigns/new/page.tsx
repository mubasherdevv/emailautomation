"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmailTemplate, Contact } from "@/types";
import {
  ArrowLeft,
  FileSpreadsheet,
  Send,
  Sparkles,
  ShieldAlert,
  Clock,
  Layers,
  Sliders,
  Users,
  CheckSquare,
  Square,
  Search,
  CheckCircle2,
  Filter,
  Globe,
  Mail,
  RefreshCw,
  AlertCircle,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Lead Source Type: "sheets" or "contacts"
  const [sourceType, setSourceType] = useState<"sheets" | "contacts">("sheets");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState<"all" | "pending">("all");

  // Google Sheets Verification & Live Preview State
  const [sheetVerifying, setSheetVerifying] = useState(false);
  const [sheetVerified, setSheetVerified] = useState<boolean | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<Record<string, string>[]>([]);
  const [sheetTotalRows, setSheetTotalRows] = useState(0);
  const [sheetEmailCol, setSheetEmailCol] = useState("Email");
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [showSheetPreviewTable, setShowSheetPreviewTable] = useState(false);

  // Form State
  const [name, setName] = useState("Outreach Campaign");
  const [sheetId, setSheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("Quick question about {{company}}");
  const [fromName, setFromName] = useState("Mubasher");
  const [fromEmail, setFromEmail] = useState("ben@redvisionexpert.com");
  const [sendLimit, setSendLimit] = useState(100);
  const [batchSize, setBatchSize] = useState(5);
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [primaryRecipientField, setPrimaryRecipientField] = useState<"email" | "personal_email">("email");

  const handleVerifySheet = async (customId?: string, customName?: string) => {
    const targetId = customId || sheetId;
    const targetName = customName || sheetName;
    if (!targetId) {
      toast("Missing Sheet ID", "Please enter a Google Sheet ID or URL", "error");
      return;
    }

    setSheetVerifying(true);
    setSheetError(null);
    try {
      const res = await fetch("/api/settings/verify-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: targetId, sheetName: targetName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to verify sheet");
      }

      if (data.requiresShare || data.isLiveFetched === false) {
        setSheetError(
          data.message ||
            "Google Sheet is currently Restricted. Open Google Sheet, click Share (top right), and set General access to 'Anyone with the link can view' so the live preview table can read the data."
        );
        setSheetVerified(false);
        toast("Sheet is Restricted", "Set Google Sheet sharing to 'Anyone with the link can view' to preview leads", "warning");
        return;
      }

      const resolvedHeaders: string[] = data.headers || data.detectedHeaders || [];
      const resolvedRows: Record<string, string>[] = data.rows || data.allRows || data.sampleRows || [];
      const count = Number(data.totalRowsCount || resolvedRows.length || 0);

      setSheetVerified(true);
      setSheetHeaders(resolvedHeaders);
      setSheetRows(resolvedRows);
      setSheetTotalRows(count);
      setSheetEmailCol(data.emailColumn || resolvedHeaders.find((h) => h.toLowerCase().includes("email")) || "Email");
      setShowSheetPreviewTable(true);
      if (count > 0) {
        setSendLimit(count);
      }
      toast("Sheet Verified", `Connected! Found ${count} lead rows in ${targetName}`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setSheetError(msg);
      setSheetVerified(false);
      toast("Verification Error", msg, "error");
    } finally {
      setSheetVerifying(false);
    }
  };

  useEffect(() => {
    // Load available settings & templates
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          if (data.settings.googleSheetId) setSheetId(data.settings.googleSheetId);
          if (data.settings.googleSheetName) setSheetName(data.settings.googleSheetName);
          if (data.settings.resendFromName) setFromName(data.settings.resendFromName);
          if (data.settings.smtpUser && data.settings.smtpUser.includes("@")) {
            setFromEmail(data.settings.smtpUser);
          } else if (data.settings.resendFromEmail && !data.settings.resendFromEmail.includes("domain.com")) {
            setFromEmail(data.settings.resendFromEmail);
          }
        }
      })
      .catch(() => {});

    // Check localStorage fallback for saved sheet ID
    const savedSheet = localStorage.getItem("last_active_sheet_id");
    if (savedSheet) setSheetId(savedSheet);

    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.templates && Array.isArray(data.templates)) {
          setTemplates(data.templates);
          // If templates exist, select the first one and populate subject
          if (data.templates.length > 0) {
            setTemplateId(data.templates[0].id);
            setSubject(data.templates[0].subject || "Quick question about {{company}}");
          }
        }
      })
      .catch((err) => console.error("Error fetching templates", err));

    // Load contacts from directory
    setLoadingContacts(true);
    fetch("/api/contacts")
      .then((res) => res.json())
      .then((data) => {
        if (data.contacts && Array.isArray(data.contacts)) {
          setContacts(data.contacts);

          // Check if contacts were preselected from Contacts page
          try {
            const raw = localStorage.getItem("campaign_selected_contact_ids");
            if (raw) {
              const ids: string[] = JSON.parse(raw);
              if (Array.isArray(ids) && ids.length > 0) {
                setSelectedContactIds(new Set(ids));
                setSourceType("contacts");
                setSendLimit(ids.length);
              }
              localStorage.removeItem("campaign_selected_contact_ids");
            } else if (typeof window !== "undefined" && window.location.search.includes("source=contacts")) {
              setSourceType("contacts");
            }
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => console.error("Error loading contacts", err))
      .finally(() => setLoadingContacts(false));
  }, []);

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const selected = templates.find((t) => t.id === id);
    if (selected) {
      setSubject(selected.subject);
    }
  };

  // Filtered contacts for directory picker
  const filteredContacts = useMemo(() => {
    const q = contactSearch.toLowerCase().trim();
    return contacts.filter((c) => {
      if (contactStatusFilter === "pending" && c.status !== "pending") return false;
      if (!q) return true;
      return (
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.first_name && c.first_name.toLowerCase().includes(q)) ||
        (c.last_name && c.last_name.toLowerCase().includes(q)) ||
        (c.website && c.website.toLowerCase().includes(q))
      );
    });
  }, [contacts, contactSearch, contactStatusFilter]);

  const handleToggleContact = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setSendLimit(Math.max(1, next.size));
      return next;
    });
  };

  const handleSelectAllFilteredContacts = () => {
    const allFilteredIds = filteredContacts.map((c) => c.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedContactIds.has(id));
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (areAllSelected) {
        allFilteredIds.forEach((id) => next.delete(id));
      } else {
        allFilteredIds.forEach((id) => next.add(id));
      }
      setSendLimit(Math.max(1, next.size));
      return next;
    });
  };

  const handleSelectAllPendingContacts = () => {
    const pendingIds = contacts.filter((c) => c.status === "pending").map((c) => c.id);
    setSelectedContactIds(new Set(pendingIds));
    setSendLimit(Math.max(1, pendingIds.length));
  };

  const handleSubmit = async (e: React.FormEvent, shouldStartImmediately = false) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (sourceType === "contacts" && selectedContactIds.size === 0) {
        toast("No Contacts Selected", "Please select at least 1 contact lead from the directory", "error");
        setLoading(false);
        return;
      }

      // 1. Create campaign record
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sourceType,
          selectedContactIds: Array.from(selectedContactIds),
          sheetId: sourceType === "sheets" ? sheetId : (sheetId || "contacts_source"),
          sheetName: sourceType === "sheets" ? sheetName : (sheetName || "Sheet1"),
          templateId: templateId || undefined,
          subject,
          fromName,
          fromEmail,
          sendLimit: Number(sendLimit),
          batchSize: Number(batchSize),
          delaySeconds: Number(delaySeconds),
          primaryRecipientField,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }

      const campaignId = data.campaign.id;
      toast("Campaign Created", `"${name}" configured successfully`, "success");

      // 2. If user clicked "Create & Start Immediately", trigger n8n start
      if (shouldStartImmediately) {
        const startRes = await fetch(`/api/campaigns/${campaignId}/start`, { method: "POST" });
        if (startRes.ok) {
          toast("Campaign Dispatched", "Workflow started and sent to n8n webhook", "success");
        }
      }

      router.push(`/campaigns/${campaignId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating campaign";
      toast("Validation Error", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell
      title="Create Campaign"
      subtitle="Configure Google Sheet source, Resend sender details, and batch limits"
      actions={
        <Link
          href="/campaigns"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:bg-[#F5F5F5]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Campaigns</span>
        </Link>
      }
    >
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 max-w-4xl">
        {/* Step 1: General Info */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F5F5F5]">
            <Sparkles className="h-4 w-4 text-[#6D28D9]" />
            <h3 className="text-sm font-semibold text-[#111111]">1. Campaign Identity</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. September Outreach"
                className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Email Template
              </label>
              <select
                value={templateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
              >
                <option value="">-- Custom Subject & Body --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subject})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Subject Line *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question about {{company}}"
              className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
            />
            <div className="mt-2 flex items-center flex-wrap gap-1.5 text-xs">
              <span className="text-[11px] text-neutral-500 font-medium mr-1">Variables (Click or Drag):</span>
              {[
                { tag: "{{firstName}}", label: "First Name" },
                { tag: "{{company}}", label: "Company" },
                { tag: "{{website}}", label: "Website" },
                { tag: "{{address}}", label: "Address" },
              ].map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", item.tag);
                  }}
                  onClick={() => setSubject((prev) => (prev ? prev + " " + item.tag : item.tag))}
                  title="Click to append or drag & drop into Subject Line"
                  className="px-2 py-0.5 rounded border border-purple-200 bg-purple-50/70 hover:bg-purple-100 hover:border-[#6D28D9] text-[#6D28D9] font-mono text-[11px] transition cursor-grab active:cursor-grabbing select-none"
                >
                  {item.tag}
                </button>
              ))}
            </div>
          </div>

          {templates.find((t) => t.id === templateId) && (
            <div className="p-3.5 rounded-lg border border-purple-100 bg-purple-50/30 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-purple-900">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#6D28D9]" />
                  Template Email Body Preview: {templates.find((t) => t.id === templateId)?.name}
                </span>
                <Link
                  href="/templates"
                  className="text-[#6D28D9] hover:underline font-normal text-[11px]"
                  target="_blank"
                >
                  Edit in Template Library &rarr;
                </Link>
              </div>
              <div
                className="p-3 bg-white rounded-md border border-purple-100 text-neutral-700 text-xs max-h-40 overflow-y-auto leading-relaxed shadow-xs"
                dangerouslySetInnerHTML={{
                  __html:
                    templates.find((t) => t.id === templateId)?.html_body ||
                    templates.find((t) => t.id === templateId)?.text_body ||
                    "<p class='text-neutral-400'>No content</p>",
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                From Name *
              </label>
              <input
                type="text"
                required
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="e.g. Mubasher"
                className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                From Email (Verified Domain on Resend) *
              </label>
              <input
                type="email"
                required
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="hello@domain.com"
                className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Lead Source (Contacts Directory vs Google Sheets) */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F5F5F5]">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-[#111111]">2. Lead Source</h3>
            </div>

            {/* Source Segmented Switcher */}
            <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setSourceType("contacts");
                  if (selectedContactIds.size === 0 && contacts.length > 0) {
                    const pendingIds = contacts.filter((c) => c.status === "pending").map((c) => c.id);
                    const targetIds = pendingIds.length > 0 ? pendingIds : contacts.map((c) => c.id);
                    setSelectedContactIds(new Set(targetIds));
                    setSendLimit(targetIds.length);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  sourceType === "contacts"
                    ? "bg-white text-purple-700 shadow-xs font-semibold"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Contacts Directory ({selectedContactIds.size} Selected)</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("sheets")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  sourceType === "sheets"
                    ? "bg-white text-emerald-700 shadow-xs font-semibold"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Google Sheets</span>
              </button>
            </div>
          </div>

          {/* CONTACTS DIRECTORY SOURCE */}
          {sourceType === "contacts" && (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Filter contacts by name, email, company..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 bg-white dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllPendingContacts}
                    className="px-2.5 py-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-medium transition cursor-pointer"
                  >
                    Select Pending ({contacts.filter((c) => c.status === "pending").length})
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectAllFilteredContacts}
                    className="px-2.5 py-1 rounded-md border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium transition cursor-pointer"
                  >
                    Select All Filtered ({filteredContacts.length})
                  </button>

                  {selectedContactIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContactIds(new Set());
                        setSendLimit(1);
                      }}
                      className="px-2 py-1 text-[11px] text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Contacts Table List */}
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {loadingContacts ? (
                  <div className="p-6 text-center text-xs text-neutral-500">Loading directory contacts...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500">
                    No contacts match the filter. Add contacts in the Contacts page first.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-neutral-500 border-b border-neutral-200 dark:border-neutral-700 sticky top-0">
                      <tr>
                        <th className="w-9 px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={handleSelectAllFilteredContacts}
                            className="cursor-pointer"
                          >
                            {filteredContacts.length > 0 &&
                            filteredContacts.every((c) => selectedContactIds.has(c.id)) ? (
                              <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
                            ) : (
                              <Square className="h-3.5 w-3.5 text-neutral-400" />
                            )}
                          </button>
                        </th>
                        <th className="px-3 py-2 font-semibold">Lead Contact</th>
                        <th className="px-3 py-2 font-semibold">Company / Website</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {filteredContacts.map((c) => {
                        const isSelected = selectedContactIds.has(c.id);
                        return (
                          <tr
                            key={c.id}
                            onClick={() => handleToggleContact(c.id)}
                            className={`cursor-pointer transition hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 ${
                              isSelected ? "bg-purple-50/40 dark:bg-purple-950/20" : ""
                            }`}
                          >
                            <td className="px-3 py-2 text-center">
                              {isSelected ? (
                                <CheckSquare className="h-3.5 w-3.5 text-purple-600 inline" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-neutral-300 inline" />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {c.first_name || c.last_name
                                  ? `${c.first_name || ""} ${c.last_name || ""}`.trim()
                                  : "Lead"}
                              </div>
                              <div className="font-mono text-[11px] text-purple-600 dark:text-purple-400">
                                {c.email}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-neutral-500">
                              {c.website ? (
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3 text-neutral-400" />
                                  <span className="truncate max-w-[160px]">{c.website}</span>
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                                  c.status === "sent"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : c.status === "failed"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Selection Summary Pill */}
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 text-purple-800 dark:text-purple-300">
                <span className="font-medium">
                  <strong>{selectedContactIds.size}</strong> leads selected out of {contacts.length} total contacts.
                </span>
                <span className="text-[11px] text-purple-600 dark:text-purple-400">
                  Send Limit auto-aligned to {selectedContactIds.size}
                </span>
              </div>
            </div>
          )}

          {/* GOOGLE SHEETS SOURCE */}
          {sourceType === "sheets" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] dark:text-neutral-200 mb-1.5">
                    Google Sheet ID or Full URL *
                  </label>
                  <input
                    type="text"
                    required={sourceType === "sheets"}
                    value={sheetId}
                    onChange={(e) => {
                      setSheetId(e.target.value);
                      setSheetVerified(null);
                    }}
                    placeholder="e.g. 11EOLANkddwKPMiHCL9aQOO-1FrtzgSgxSy_ZZAL4pfM"
                    className="w-full rounded-lg border border-[#E5E5E5] dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2 text-xs text-[#111111] dark:text-neutral-100 font-mono focus:border-[#6D28D9] focus:outline-hidden"
                  />
                  <span className="text-[10px] text-[#666666] dark:text-neutral-400 mt-1 block">
                    Spreadsheet URL ya ID paste karein (e.g. docs.google.com/spreadsheets/d/{"<ID>"}/edit)
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#111111] dark:text-neutral-200">
                      Sheet / Tab Name *
                    </label>
                    <span className="text-[10px] text-neutral-400">Default: Sheet1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required={sourceType === "sheets"}
                      value={sheetName}
                      onChange={(e) => {
                        setSheetName(e.target.value);
                        setSheetVerified(null);
                      }}
                      placeholder="Sheet1"
                      className="flex-1 rounded-lg border border-[#E5E5E5] dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2 text-xs text-[#111111] dark:text-neutral-100 focus:border-[#6D28D9] focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifySheet()}
                      disabled={sheetVerifying || !sheetId}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      {sheetVerifying ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Verify & Preview</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Alert if Verification Failed */}
              {sheetError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-1">
                    <p className="font-semibold">Google Sheet Verification Error</p>
                    <p className="text-[11px] opacity-90">{sheetError}</p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">
                      Tip: Make sure your Google Sheet sharing is set to <strong>"Anyone with the link can view"</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Verified Status & Live Preview Table */}
              {sheetVerified && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/60 dark:border-emerald-900/40">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-full bg-emerald-500 text-white">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                          Sheet Connected: {sheetTotalRows} Active Leads Found!
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Recipient Column: <span className="font-mono font-semibold">{sheetEmailCol}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSheetPreviewTable((prev) => !prev)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-50 dark:hover:bg-neutral-700 transition cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>{showSheetPreviewTable ? "Hide Table Preview" : "View Live Leads Table"}</span>
                        {showSheetPreviewTable ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Live Leads Table */}
                  {showSheetPreviewTable && (
                    <div className="border border-emerald-200 dark:border-emerald-900/40 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-white dark:bg-neutral-900 text-xs shadow-2xs">
                      {sheetRows.length === 0 ? (
                        <div className="p-6 text-center text-xs text-neutral-500">
                          Sheet connected, but no lead rows were found. Check your sheet tab content.
                        </div>
                      ) : (
                        <table className="w-full text-left">
                          <thead className="bg-emerald-50/80 dark:bg-neutral-800 text-emerald-900 dark:text-emerald-300 border-b border-emerald-200 dark:border-neutral-700 sticky top-0 font-semibold">
                            <tr>
                              <th className="w-10 px-3 py-2 text-center text-[10px] text-neutral-400">#</th>
                              {(sheetHeaders.length > 0 ? sheetHeaders : Object.keys(sheetRows[0] || {}))
                                .slice(0, 7)
                                .map((h, i) => (
                                  <th key={i} className="px-3 py-2 text-xs">
                                    {h}
                                    {h.toLowerCase().includes("email") && (
                                      <span className="ml-1 text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                                        Recipient
                                      </span>
                                    )}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {sheetRows.slice(0, 20).map((row, idx) => {
                              const cols = sheetHeaders.length > 0 ? sheetHeaders : Object.keys(row);
                              return (
                                <tr key={idx} className="hover:bg-emerald-50/30 dark:hover:bg-neutral-800/40">
                                  <td className="px-3 py-2 text-center font-mono text-[10px] text-neutral-400">
                                    {idx + 1}
                                  </td>
                                  {cols.slice(0, 7).map((h, i) => {
                                    const val = row[h] || "";
                                    const isEmail = h.toLowerCase().includes("email") || (typeof val === "string" && val.includes("@"));
                                    return (
                                      <td
                                        key={i}
                                        className={`px-3 py-2 truncate max-w-[180px] ${
                                          isEmail
                                            ? "font-mono font-medium text-purple-600 dark:text-purple-400"
                                            : "text-neutral-700 dark:text-neutral-300"
                                        }`}
                                      >
                                        {val || "—"}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                      {sheetTotalRows > 20 && (
                        <div className="p-2 text-center text-[10px] text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800">
                          Showing first 20 rows of {sheetTotalRows} total leads from sheet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Email Selection Safety Rule */}
          <div className="p-3.5 rounded-lg border border-purple-100 bg-purple-50/40">
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Primary Recipient Email Field
            </label>
            <p className="text-[11px] text-[#666666] mb-2.5">
              By compliance standards, messages are delivered to Business Email by default.
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-[#111111]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientField"
                  value="email"
                  checked={primaryRecipientField === "email"}
                  onChange={() => setPrimaryRecipientField("email")}
                  className="text-[#6D28D9] focus:ring-[#6D28D9]"
                />
                <span>Default: Business Email (<code>Email</code> column)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientField"
                  value="personal_email"
                  checked={primaryRecipientField === "personal_email"}
                  onChange={() => setPrimaryRecipientField("personal_email")}
                  className="text-[#6D28D9] focus:ring-[#6D28D9]"
                />
                <span>Optional: Personal Email (<code>Personal Email</code> column)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Step 3: Throttling & Batch Controls */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F5F5F5]">
            <Sliders className="h-4 w-4 text-[#6D28D9]" />
            <h3 className="text-sm font-semibold text-[#111111]">3. Sending Controls &amp; Batching</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-neutral-500" />
                <span>Send Limit (Total)</span>
              </label>
              <input
                type="number"
                min={1}
                max={50000}
                required
                value={sendLimit}
                onChange={(e) => setSendLimit(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#666666] mt-1 block">Max contacts to process</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-neutral-500" />
                <span>Batch Size</span>
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#666666] mt-1 block">Emails sent per chunk (1-50)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-neutral-500" />
                <span>Delay Between Batches</span>
              </label>
              <input
                type="number"
                min={1}
                max={60}
                required
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#666666] mt-1 block">Seconds to wait between batches</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/campaigns"
            className="px-4 py-2 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:bg-[#F5F5F5] transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg border border-purple-200 bg-purple-50 text-[#6D28D9] text-xs font-semibold hover:bg-purple-100 transition disabled:opacity-50"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{loading ? "Processing..." : "Create & Start Campaign"}</span>
          </button>
        </div>
      </form>
    </AdminShell>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Contact } from "@/types";
import {
  Search,
  Upload,
  UserPlus,
  Users,
  Globe,
  Mail,
  SlidersHorizontal,
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Download,
  Phone,
  MapPin,
  X,
  AlertTriangle,
  Send,
  FileText,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type FilterCriterion = "all" | "pending" | "sending" | "sent" | "failed" | "has_phone" | "has_website" | "has_personal_email";
type PageSizeOption = "50" | "100" | "500" | "1000" | "all" | "custom";

export default function ContactsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [filterCriterion, setFilterCriterion] = useState<FilterCriterion>("all");
  const [pageSize, setPageSize] = useState<PageSizeOption>("50");
  const [customPageSize, setCustomPageSize] = useState("25");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Bulk Add Leads Modal State
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkTab, setBulkTab] = useState<"paste" | "csv">("paste");
  const [bulkText, setBulkText] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkParsedRows, setBulkParsedRows] = useState<Array<Record<string, string>>>([]);
  const [bulkImporting, setBulkImporting] = useState(false);

  // Selection state for single & bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    idsToDelete: string[];
    isBulk: boolean;
  }>({ isOpen: false, idsToDelete: [], isBulk: false });

  // New Contact Form State
  const [newEmail, setNewEmail] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newPersonal, setNewPersonal] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const d = await res.json();
        setContacts(d.contacts || []);
      }
    } catch {
      toast("Error", "Failed to load contacts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Filter and search logic
  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase().trim();

    return contacts.filter((c) => {
      // 1. Search Query
      if (q) {
        const matches =
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.first_name && c.first_name.toLowerCase().includes(q)) ||
          (c.last_name && c.last_name.toLowerCase().includes(q)) ||
          (c.personal_email && c.personal_email.toLowerCase().includes(q)) ||
          (c.contact && c.contact.toLowerCase().includes(q)) ||
          (c.website && c.website.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q));

        if (!matches) return false;
      }

      // 2. Criteria Filters
      if (filterCriterion === "pending") return c.status === "pending";
      if (filterCriterion === "sending") return c.status === "sending";
      if (filterCriterion === "sent") return c.status === "sent";
      if (filterCriterion === "failed") return c.status === "failed";
      if (filterCriterion === "has_phone") return Boolean(c.contact && String(c.contact).trim() !== "");
      if (filterCriterion === "has_website") return Boolean(c.website && String(c.website).trim() !== "");
      if (filterCriterion === "has_personal_email") return Boolean(c.personal_email && String(c.personal_email).trim() !== "");

      return true;
    });
  }, [contacts, search, filterCriterion]);

  // Pagination calculation
  const effectivePageSize = useMemo(() => {
    if (pageSize === "all") return Infinity;
    if (pageSize === "custom") {
      const parsed = parseInt(customPageSize, 10);
      return isNaN(parsed) || parsed <= 0 ? 25 : parsed;
    }
    return parseInt(pageSize, 10);
  }, [pageSize, customPageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / effectivePageSize));

  const paginatedContacts = useMemo(() => {
    if (effectivePageSize === Infinity) return filteredContacts;
    const start = (currentPage - 1) * effectivePageSize;
    return filteredContacts.slice(start, start + effectivePageSize);
  }, [filteredContacts, currentPage, effectivePageSize]);

  // Adjust page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Selection logic
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allFilteredSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((c) => selectedIds.has(c.id));

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredContacts.map((c) => c.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        allFilteredIds.forEach((id) => next.delete(id));
      } else {
        allFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Trigger Delete Modal
  const requestDeleteSingle = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmDeleteModal({ isOpen: true, idsToDelete: [id], isBulk: false });
  };

  const requestDeleteBulk = () => {
    if (selectedIds.size === 0) return;
    setConfirmDeleteModal({ isOpen: true, idsToDelete: Array.from(selectedIds), isBulk: true });
  };

  // Perform Delete
  const confirmExecuteDelete = async () => {
    const { idsToDelete } = confirmDeleteModal;
    if (idsToDelete.length === 0) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      // Update state locally
      const idSet = new Set(idsToDelete);
      setContacts((prev) => prev.filter((c) => !idSet.has(c.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });

      toast("Deleted", `Successfully removed ${idsToDelete.length} contact(s)`, "success");
      setConfirmDeleteModal({ isOpen: false, idsToDelete: [], isBulk: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed";
      toast("Error", msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  // Add Contact Form Submit
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          first_name: newFirst,
          last_name: newLast,
          personal_email: newPersonal || null,
          website: newWebsite || null,
          contact: newContact || null,
          address: newAddress || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add contact");

      toast("Contact Added", `${newEmail} successfully saved`, "success");
      setShowAddModal(false);
      setNewEmail("");
      setNewFirst("");
      setNewLast("");
      setNewPersonal("");
      setNewWebsite("");
      setNewContact("");
      setNewAddress("");
      fetchContacts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add contact";
      toast("Error", msg, "error");
    }
  };

  // Helper to parse pasted raw text or CSV content
  const parseRawContactsText = (text: string): Array<Record<string, string>> => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes("email") ||
      firstLine.includes("name") ||
      firstLine.includes("first") ||
      !firstLine.includes("@");

    const rawHeaders = hasHeader
      ? lines[0].split(/[,\t]/).map((h) => h.trim().replace(/^["']|["']$/g, ""))
      : ["email", "firstName", "lastName", "website", "contact", "address"];

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const result: Array<Record<string, string>> = [];

    for (const line of dataLines) {
      if (!line) continue;
      const parts = line.includes("\t")
        ? line.split("\t")
        : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((p) => p.trim().replace(/^["']|["']$/g, ""));

      // Direct single email line check
      if (parts.length === 1 && parts[0].includes("@")) {
        result.push({
          email: parts[0].trim(),
          firstName: "",
          lastName: "",
          website: "",
          contact: "",
          address: "",
        });
        continue;
      }

      const rowObj: Record<string, string> = {};
      rawHeaders.forEach((h, idx) => {
        if (parts[idx] !== undefined) {
          rowObj[h] = parts[idx].trim();
        }
      });

      // If at least one column has an email
      if (Object.values(rowObj).some((v) => typeof v === "string" && v.includes("@"))) {
        result.push(rowObj);
      }
    }

    return result;
  };

  const handleBulkTextChange = (txt: string) => {
    setBulkText(txt);
    const parsed = parseRawContactsText(txt);
    setBulkParsedRows(parsed);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBulkText(content);
        const parsed = parseRawContactsText(content);
        setBulkParsedRows(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImportSubmit = async () => {
    if (bulkParsedRows.length === 0) {
      toast("No Valid Leads", "Please enter or upload at least one contact with a valid email", "error");
      return;
    }

    setBulkImporting(true);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: "manual_bulk_import",
          sheetName: "Bulk Upload",
          rows: bulkParsedRows,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import contacts");

      toast(
        "Bulk Import Successful",
        `Imported ${data.summary?.importedCount || bulkParsedRows.length} contacts (${data.summary?.duplicateCount || 0} duplicates skipped)`,
        "success"
      );

      setShowBulkAddModal(false);
      setBulkText("");
      setBulkFileName("");
      setBulkParsedRows([]);
      fetchContacts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bulk import failed";
      toast("Import Error", msg, "error");
    } finally {
      setBulkImporting(false);
    }
  };

  // Launch campaign creator with selected contacts
  const handleCreateCampaignWithSelected = () => {
    if (selectedIds.size === 0) return;
    const selectedList = contacts.filter((c) => selectedIds.has(c.id));
    try {
      localStorage.setItem("campaign_selected_contact_ids", JSON.stringify(Array.from(selectedIds)));
      localStorage.setItem("campaign_selected_contacts_cache", JSON.stringify(selectedList));
    } catch {
      // ignore storage quota errors
    }
    router.push("/campaigns/new?source=contacts");
  };

  // Export filtered contacts to CSV
  const handleExportCsv = () => {
    if (filteredContacts.length === 0) return;
    const headers = ["First Name", "Last Name", "Email", "Personal Email", "Website", "Contact", "Address", "Status", "Created At"];
    const rows = filteredContacts.map((c) => [
      `"${(c.first_name || "").replace(/"/g, '""')}"`,
      `"${(c.last_name || "").replace(/"/g, '""')}"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${(c.personal_email || "").replace(/"/g, '""')}"`,
      `"${(c.website || "").replace(/"/g, '""')}"`,
      `"${(c.contact || "").replace(/"/g, '""')}"`,
      `"${(c.address || "").replace(/"/g, '""')}"`,
      `"${c.status}"`,
      `"${c.created_at}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contacts_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("Export Complete", `Exported ${filteredContacts.length} contacts to CSV`, "success");
  };

  return (
    <AdminShell
      title="Contacts Directory"
      subtitle="Normalized customer list with automated deduplication & suppression status"
      actions={
        <div className="flex items-center gap-2">
          {contacts.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] bg-white text-xs font-semibold text-neutral-700 hover:bg-[#F5F5F5] transition shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          <Link
            href="/contacts/import"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E5E5E5] text-[#111111] text-xs font-semibold hover:bg-[#F5F5F5] transition shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            <span>Import from Google Sheets</span>
          </Link>

          <button
            onClick={() => setShowBulkAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition shadow-2xs cursor-pointer"
          >
            <Users className="h-3.5 w-3.5 text-purple-600" />
            <span>Bulk Add Leads</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Single</span>
          </button>
        </div>
      }
    >
      {/* ========================================================================= */}
      {/* SEARCH, QUALITY FILTERS & BULK ACTIONS BAR */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-4">
        {/* Top Search & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Realtime Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, domain, phone, address..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-[#E5E5E5] text-xs text-neutral-800 placeholder-neutral-400 focus:border-[#6D28D9] focus:outline-hidden"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quality & Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <button
              onClick={() => setFilterCriterion("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterCriterion === "all"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              All ({contacts.length})
            </button>
            <button
              onClick={() => setFilterCriterion("pending")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterCriterion === "pending"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterCriterion("sent")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterCriterion === "sent"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => setFilterCriterion("failed")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterCriterion === "failed"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              Failed
            </button>
            <button
              onClick={() => setFilterCriterion("has_phone")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriterion === "has_phone"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <Phone className="h-3 w-3" />
              <span>Has Phone</span>
            </button>
            <button
              onClick={() => setFilterCriterion("has_website")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriterion === "has_website"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <Globe className="h-3 w-3" />
              <span>Website</span>
            </button>
            <button
              onClick={() => setFilterCriterion("has_personal_email")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriterion === "has_personal_email"
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <Mail className="h-3 w-3" />
              <span>Personal Email</span>
            </button>
          </div>
        </div>

        {/* Rows per page selector, Bulk selection & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          {/* Bulk Selection and Delete Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSelectAllFiltered}
              disabled={filteredContacts.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition disabled:opacity-50 cursor-pointer"
            >
              {allFilteredSelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-[#6D28D9]" />
              ) : (
                <Square className="h-3.5 w-3.5 text-neutral-400" />
              )}
              <span>{allFilteredSelected ? "Deselect All" : "Select All Filtered"}</span>
            </button>

            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleCreateCampaignWithSelected}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
                  title="Configure and launch a new campaign with these selected leads"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Create Campaign ({selectedIds.size} Leads)</span>
                </button>

                <button
                  onClick={requestDeleteBulk}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition shadow-2xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>

                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              </>
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
      </div>

      {/* ========================================================================= */}
      {/* CONTACTS TABLE */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="border-b border-[#E5E5E5] bg-neutral-50/70 text-[10px] font-semibold uppercase text-[#666666]">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleSelectAllFiltered}
                    disabled={filteredContacts.length === 0}
                    className="rounded text-[#6D28D9] focus:ring-[#6D28D9] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 w-10">#</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Business Email</th>
                <th className="py-3 px-3">Personal Email</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Website</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Last Sent</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-neutral-400">
                    Loading contacts directory...
                  </td>
                </tr>
              ) : paginatedContacts.length > 0 ? (
                paginatedContacts.map((c, displayIdx) => {
                  const isSelected = selectedIds.has(c.id);
                  const rowNumber = (currentPage - 1) * (effectivePageSize === Infinity ? 0 : effectivePageSize) + displayIdx + 1;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleToggleSelect(c.id)}
                      className={`hover:bg-neutral-50/60 transition cursor-pointer ${
                        isSelected ? "bg-purple-50/40" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(c.id);
                          }}
                          className="rounded text-[#6D28D9] focus:ring-[#6D28D9] cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-2 font-mono text-neutral-400 text-[10px]">
                        {rowNumber}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#111111]">
                          {c.first_name || c.last_name
                            ? `${c.first_name || ""} ${c.last_name || ""}`.trim()
                            : "Anonymous Lead"}
                        </div>
                        {c.address && (
                          <span className="text-[10px] text-neutral-400 block truncate max-w-[180px]">
                            {c.address}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[#6D28D9] font-medium">
                        {c.email}
                      </td>

                      <td className="py-3 px-3 font-mono text-neutral-500">
                        {c.personal_email || <span className="text-neutral-300">—</span>}
                      </td>

                      <td className="py-3 px-3 font-mono text-neutral-600">
                        {c.contact || <span className="text-neutral-300">—</span>}
                      </td>

                      <td className="py-3 px-3">
                        {c.website ? (
                          <a
                            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-neutral-600 hover:text-[#6D28D9] underline flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3 text-neutral-400 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{c.website}</span>
                          </a>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge status={c.status} showDot={false} />
                      </td>

                      <td className="py-3 px-3 text-[11px] text-neutral-500 whitespace-nowrap">
                        {c.last_sent_at
                          ? new Date(c.last_sent_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : "Never"}
                      </td>

                      {/* Single Delete Button */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => requestDeleteSingle(c.id, e)}
                          title="Delete contact"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-neutral-500">
                    <Users className="mx-auto h-6 w-6 text-neutral-300 mb-2" />
                    {contacts.length === 0
                      ? "No contacts in directory. Import leads from Google Sheets or add manually."
                      : "No contacts match the current filter or search criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 bg-neutral-50/50 text-xs">
            <span className="text-neutral-500 text-[11px]">
              Showing {Math.min(filteredContacts.length, (currentPage - 1) * effectivePageSize + 1)} to{" "}
              {Math.min(filteredContacts.length, currentPage * effectivePageSize)} of{" "}
              <strong>{filteredContacts.length}</strong> contacts
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  {confirmDeleteModal.isBulk
                    ? `Delete ${confirmDeleteModal.idsToDelete.length} Contacts?`
                    : "Delete Contact?"}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  This action cannot be undone. These leads will be permanently removed from PostgreSQL.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: false, idsToDelete: [], isBulk: false })}
                disabled={deleting}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExecuteDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition shadow-xs cursor-pointer"
              >
                {deleting ? "Deleting..." : confirmDeleteModal.isBulk ? `Delete ${confirmDeleteModal.idsToDelete.length} Contacts` : "Delete Contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-neutral-200">
            <h3 className="text-base font-semibold text-[#111111] mb-4">
              Add Contact to Database
            </h3>
            <form onSubmit={handleAddContact} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    placeholder="John"
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newLast}
                    onChange={(e) => setNewLast(e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Business Email *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#111111]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Personal Email (Optional)
                </label>
                <input
                  type="email"
                  value={newPersonal}
                  onChange={(e) => setNewPersonal(e.target.value)}
                  placeholder="john.personal@gmail.com"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#111111]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={newWebsite}
                    onChange={(e) => setNewWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Phone / Contact
                  </label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="+1 555-0100"
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Address / City
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="San Francisco, CA"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#111111]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F5F5F5]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:bg-[#F5F5F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#6D28D9] text-xs font-semibold text-white hover:bg-[#5b21b6]"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* BULK ADD CONTACTS MODAL */}
      {/* ========================================================================= */}
      {showBulkAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Bulk Add Contacts & Leads
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Paste raw email lists or upload a CSV file with automatic column mapping
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkAddModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 text-xs">
              <button
                type="button"
                onClick={() => setBulkTab("paste")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  bulkTab === "paste"
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Quick Paste Text</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkTab("csv")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  bulkTab === "csv"
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload CSV File</span>
              </button>
            </div>

            {/* Paste Tab */}
            {bulkTab === "paste" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Paste Emails or CSV formatted leads:
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    1 lead per line (e.g. email or email, firstName, website)
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={(e) => handleBulkTextChange(e.target.value)}
                  placeholder={`john@example.com\nsarah@company.com, Sarah, Connor, https://company.com\ncontact@agency.org, Alex, Smith`}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3 font-mono text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:border-purple-500 focus:outline-hidden"
                />
              </div>
            )}

            {/* CSV File Upload Tab */}
            {bulkTab === "csv" && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition bg-neutral-50/50 dark:bg-neutral-800/30"
                >
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {bulkFileName ? `Selected: ${bulkFileName}` : "Click to browse or drop CSV file here"}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Supports comma or tab delimited files with headers: Email, Name, Website, etc.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Live Parsing Summary & Preview */}
            {bulkParsedRows.length > 0 && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{bulkParsedRows.length} Contacts Ready to Import</span>
                  </div>
                  <span className="text-[11px] text-emerald-600/80 dark:text-emerald-500">
                    Auto deduplication enabled
                  </span>
                </div>

                {/* Preview sample */}
                <div className="max-h-28 overflow-y-auto rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 bg-white/70 dark:bg-neutral-900/70 text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                      <tr>
                        <th className="px-2.5 py-1 font-medium">Email</th>
                        <th className="px-2.5 py-1 font-medium">Name</th>
                        <th className="px-2.5 py-1 font-medium">Website</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {bulkParsedRows.slice(0, 3).map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-2.5 py-1 font-mono text-purple-600 dark:text-purple-400">
                            {row.email || Object.values(row).find((v) => typeof v === "string" && v.includes("@")) || "—"}
                          </td>
                          <td className="px-2.5 py-1 text-neutral-700 dark:text-neutral-300">
                            {row.firstName || row["First Name"] || row.name || "—"}
                          </td>
                          <td className="px-2.5 py-1 text-neutral-500 truncate max-w-[120px]">
                            {row.website || row["Website"] || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setShowBulkAddModal(false);
                  setBulkText("");
                  setBulkFileName("");
                  setBulkParsedRows([]);
                }}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImportSubmit}
                disabled={bulkParsedRows.length === 0 || bulkImporting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {bulkImporting ? (
                  <>Importing...</>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Import {bulkParsedRows.length > 0 ? `(${bulkParsedRows.length}) Leads` : "Leads"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

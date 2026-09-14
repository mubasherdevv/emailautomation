"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type FilterCriterion = "all" | "pending" | "sending" | "sent" | "failed" | "has_phone" | "has_website" | "has_personal_email";
type PageSizeOption = "50" | "100" | "500" | "1000" | "all" | "custom";

export default function ContactsPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [filterCriterion, setFilterCriterion] = useState<FilterCriterion>("all");
  const [pageSize, setPageSize] = useState<PageSizeOption>("50");
  const [customPageSize, setCustomPageSize] = useState("25");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

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
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Contact</span>
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
                  ? "bg-[#6D28D9] text-white font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All ({contacts.length})
            </button>
            <button
              onClick={() => setFilterCriterion("pending")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterCriterion === "pending"
                  ? "bg-[#6D28D9] text-white font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterCriterion("sent")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterCriterion === "sent"
                  ? "bg-[#6D28D9] text-white font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => setFilterCriterion("failed")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterCriterion === "failed"
                  ? "bg-[#6D28D9] text-white font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Failed
            </button>
            <button
              onClick={() => setFilterCriterion("has_phone")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriterion === "has_phone"
                  ? "bg-[#6D28D9] text-white font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Phone className="h-3 w-3" />
              <span>Has Phone</span>
            </button>
            <button
              onClick={() => setFilterCriterion("has_website")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriterion === "has_website"
                  ? "bg-[#6D28D9] text-white font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Globe className="h-3 w-3" />
              <span>Website</span>
            </button>
            <button
              onClick={() => setFilterCriterion("has_personal_email")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                filterCriterion === "has_personal_email"
                  ? "bg-[#6D28D9] text-white font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <Mail className="h-3 w-3" />
              <span>Personal Email</span>
            </button>
          </div>
        </div>

        {/* Rows per page selector, Bulk selection & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100 text-xs">
          {/* Bulk Selection and Delete Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSelectAllFiltered}
              disabled={filteredContacts.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 text-xs font-medium hover:bg-neutral-100 transition disabled:opacity-50 cursor-pointer"
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
                  onClick={requestDeleteBulk}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition shadow-2xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>

                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 underline"
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
    </AdminShell>
  );
}

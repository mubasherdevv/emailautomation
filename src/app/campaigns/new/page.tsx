"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmailTemplate } from "@/types";
import {
  ArrowLeft,
  FileSpreadsheet,
  Send,
  Sparkles,
  ShieldAlert,
  Clock,
  Layers,
  Sliders,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);

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
        if (data.templates) {
          setTemplates(data.templates);
          if (data.templates.length > 0) {
            setTemplateId(data.templates[0].id);
          }
        }
      })
      .catch((err) => console.error("Error fetching templates", err));
  }, []);

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const selected = templates.find((t) => t.id === id);
    if (selected) {
      setSubject(selected.subject);
    }
  };

  const handleSubmit = async (e: React.FormEvent, shouldStartImmediately = false) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create campaign record
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sheetId,
          sheetName,
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

        {/* Step 2: Google Sheets Lead Source */}
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F5F5F5]">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-[#111111]">2. Google Sheets Lead Source</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Google Sheet ID *
              </label>
              <input
                type="text"
                required
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#666666] mt-1 block">
                Extracted from your spreadsheet URL: /d/{"<ID>"}/edit
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Sheet / Tab Name *
              </label>
              <input
                type="text"
                required
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Sheet1"
                className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
              />
            </div>
          </div>

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

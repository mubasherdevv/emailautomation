"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  Database,
  FileSpreadsheet,
  Mail,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Shield,
  ExternalLink,
  ChevronRight,
  Send,
  Lock,
  Layers,
  Sparkles,
  X,
  Check,
  Copy,
  Table,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type TabId = "supabase" | "sheets" | "email" | "n8n" | "defaults";

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("supabase");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);

  // Verification States
  const [verifyingSupabase, setVerifyingSupabase] = useState(false);
  const [supabaseDiagnostic, setSupabaseDiagnostic] = useState<{
    success: boolean;
    message: string;
    latency?: string;
    detectedTables?: string[];
  } | null>(null);

  const [verifyingSheets, setVerifyingSheets] = useState(false);
  const [sheetDiagnostic, setSheetDiagnostic] = useState<{
    success: boolean;
    message: string;
    sheetId?: string;
    detectedHeaders?: string[];
    isLiveFetched?: boolean;
    totalRowsCount?: number;
    sampleRows?: Record<string, string>[];
    requiresShare?: boolean;
    accessMode?: string;
  } | null>(null);

  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailDiagnostic, setEmailDiagnostic] = useState<{
    success: boolean;
    message: string;
    verifiedDomains?: string[];
  } | null>(null);

  // Test Email Sending State
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailDiagnostic, setTestEmailDiagnostic] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 1. Supabase Form State
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseServiceKey, setSupabaseServiceKey] = useState("");

  // 2. Google Sheets Form State
  const [sheetUrlOrId, setSheetUrlOrId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");

  // 3. Email Provider Form State
  const [emailMode, setEmailMode] = useState<"resend" | "smtp">("resend");
  const [resendApiKey, setResendApiKey] = useState("");
  const [fromName, setFromName] = useState("Mubasher");
  const [fromEmail, setFromEmail] = useState("hello@domain.com");

  // Custom SMTP
  const [smtpHost, setSmtpHost] = useState("smtp.resend.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("resend");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpAllowSelfSigned, setSmtpAllowSelfSigned] = useState(true);

  // 4. n8n Form State
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [n8nWebhookSecret, setN8nWebhookSecret] = useState("");

  // 5. Defaults
  const [defaultLimit, setDefaultLimit] = useState(100);
  const [defaultBatch, setDefaultBatch] = useState(5);
  const [defaultDelay, setDefaultDelay] = useState(2);

  // Load existing configuration from API
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoadingInitial(true);
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const s = data.settings;
          if (s) {
            setSupabaseUrl(s.supabaseUrl || "");
            setSupabaseAnonKey(s.supabaseAnonKey || "");
            setSupabaseServiceKey(s.supabaseServiceKey || "");
            setSheetUrlOrId(s.googleSheetId || "");
            setSheetName(s.googleSheetName || "Sheet1");
            setEmailMode(s.emailProviderMode || "resend");
            setResendApiKey(s.resendApiKey || "");
            setFromName(s.resendFromName || "Mubasher");
            const resolvedFrom = (s.resendFromEmail && !s.resendFromEmail.includes("domain.com"))
              ? s.resendFromEmail
              : (s.smtpUser && s.smtpUser.includes("@") ? s.smtpUser : "ben@redvisionexpert.com");
            setFromEmail(resolvedFrom);
            setSmtpHost(s.smtpHost || "smtp.resend.com");
            setSmtpPort(s.smtpPort || 587);
            setSmtpUser(s.smtpUser || "resend");
            setSmtpSecure(s.smtpSecure || false);
            setSmtpAllowSelfSigned(s.smtpAllowSelfSigned !== false);
            setN8nWebhookUrl(s.n8nWebhookUrl || "");
            setN8nWebhookSecret(s.n8nWebhookSecret || "");
          }
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadSettings();
  }, []);

  // Save Settings to .env.local
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl,
          supabaseAnonKey,
          supabaseServiceKey,
          googleSheetId: sheetUrlOrId,
          googleSheetName: sheetName,
          emailProviderMode: emailMode,
          resendApiKey,
          resendFromName: fromName,
          resendFromEmail: fromEmail,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSecure,
          smtpAllowSelfSigned,
          n8nWebhookUrl,
          n8nWebhookSecret,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      toast("Settings Saved", "Configuration updated and persisted to .env.local", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Test Supabase Connection
  const handleVerifySupabase = async () => {
    setVerifyingSupabase(true);
    setSupabaseDiagnostic(null);
    try {
      const res = await fetch("/api/settings/verify-supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl,
          supabaseAnonKey,
          supabaseServiceKey,
        }),
      });

      const data = await res.json();
      setSupabaseDiagnostic({
        success: data.success,
        message: data.message || data.error,
        latency: data.latency,
        detectedTables: data.detectedTables,
      });

      if (data.success) {
        toast("Supabase Verified", data.message, "success");
      } else {
        toast("Supabase Error", data.error, "error");
      }
    } catch {
      toast("Verification Failed", "Could not reach Supabase endpoint", "error");
    } finally {
      setVerifyingSupabase(false);
    }
  };

  // Deploy / Apply Schema to Supabase
  const [applyingSchema, setApplyingSchema] = useState(false);
  const [schemaStatus, setSchemaStatus] = useState<any>(null);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [dbPassword, setDbPassword] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);

  const handleApplySchema = async () => {
    setApplyingSchema(true);
    try {
      const res = await fetch("/api/settings/apply-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl,
          supabaseServiceKey,
          dbPassword,
        }),
      });

      const data = await res.json();
      setSchemaStatus(data);
      setShowSchemaModal(true);
      if (data.executedDirectly) {
        toast("Schema Executed", "All tables created directly in PostgreSQL!", "success");
        handleVerifySupabase();
      } else {
        toast("Schema Ready", "Copy SQL or enter DB password to complete setup", "info");
      }
    } catch {
      toast("Error", "Could not execute schema endpoint", "error");
    } finally {
      setApplyingSchema(false);
    }
  };

  const handleCopySql = () => {
    if (schemaStatus?.sqlContent) {
      navigator.clipboard.writeText(schemaStatus.sqlContent);
      setCopiedSql(true);
      toast("SQL Copied", "Complete supabase_schema.sql copied to clipboard", "success");
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  // Sync / Import all rows and tables from Supabase into Dashboard
  const [syncingData, setSyncingData] = useState(false);
  const handleSyncData = async () => {
    setSyncingData(true);
    try {
      const res = await fetch("/api/settings/sync-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl,
          supabaseServiceKey: supabaseServiceKey || supabaseAnonKey,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast("Data Synchronized", data.message, "success");
      } else {
        toast("Sync Error", data.error, "error");
      }
    } catch {
      toast("Error", "Could not pull data from Supabase", "error");
    } finally {
      setSyncingData(false);
    }
  };

  // Test Google Sheet Access
  const handleVerifySheet = async () => {
    setVerifyingSheets(true);
    setSheetDiagnostic(null);
    try {
      const res = await fetch("/api/settings/verify-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrlOrId,
          sheetName,
        }),
      });

      const data = await res.json();
      setSheetDiagnostic({
        success: data.success,
        message: data.message || data.error,
        sheetId: data.sheetId,
        detectedHeaders: data.detectedHeaders,
        isLiveFetched: data.isLiveFetched,
        totalRowsCount: data.totalRowsCount,
        sampleRows: data.sampleRows,
        requiresShare: data.requiresShare,
        accessMode: data.accessMode,
      });

      if (data.success) {
        const activeId = data.sheetId || sheetUrlOrId;
        if (data.sheetId) setSheetUrlOrId(data.sheetId);
        if (typeof window !== "undefined") {
          localStorage.setItem("volt_saved_sheet_url", activeId);
          localStorage.setItem("volt_saved_sheet_name", sheetName);
        }
        if (data.isLiveFetched) {
          toast("Live Rows Fetched!", `Successfully read ${data.totalRowsCount} contacts from Google Sheet`, "success");
        } else {
          toast("Google Sheet Verified", data.message, "info");
        }
      } else {
        toast("Sheet Error", data.error, "error");
      }
    } catch {
      toast("Verification Failed", "Could not verify Google Sheet access", "error");
    } finally {
      setVerifyingSheets(false);
    }
  };

  // Test Email Provider (Resend API or SMTP)
  const handleVerifyEmail = async () => {
    setVerifyingEmail(true);
    setEmailDiagnostic(null);
    try {
      const res = await fetch("/api/settings/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: emailMode,
          apiKey: resendApiKey,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSecure,
          smtpAllowSelfSigned,
        }),
      });

      const data = await res.json();
      setEmailDiagnostic({
        success: data.success,
        message: data.message || data.error,
        verifiedDomains: data.verifiedDomains,
      });

      if (data.success) {
        toast("Email Verified", data.message, "success");
      } else {
        toast("Email Error", data.error, "error");
      }
    } catch {
      toast("Verification Failed", "Connection test failed", "error");
    } finally {
      setVerifyingEmail(false);
    }
  };

  // Send Actual Live Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes("@")) {
      toast("Invalid Recipient", "Please enter a valid recipient email address to receive the test", "error");
      return;
    }
    setSendingTestEmail(true);
    setTestEmailDiagnostic(null);
    try {
      const res = await fetch("/api/settings/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: emailMode,
          recipient: testEmailRecipient,
          apiKey: resendApiKey,
          fromEmail,
          fromName,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSecure,
          smtpAllowSelfSigned,
        }),
      });

      const data = await res.json();
      setTestEmailDiagnostic({
        success: data.success,
        message: data.message || data.error,
      });

      if (data.success) {
        toast("Test Email Dispatched!", data.message, "success");
      } else {
        toast("Delivery Failed", data.error, "error");
      }
    } catch {
      toast("Error", "Failed to dispatch test email", "error");
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <AdminShell
      title="Integration & Service Hub"
      subtitle="Click any integration to configure, test live connections, and save directly"
      actions={
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs disabled:opacity-50"
        >
          {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span>{saving ? "Saving..." : "Save All to .env.local"}</span>
        </button>
      }
    >
      {/* 1. Quick Integration Selectors (Click any card to open) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Supabase Tab Card */}
        <div
          onClick={() => setActiveTab("supabase")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "supabase"
              ? "border-[#6D28D9] bg-purple-50/40 shadow-xs"
              : "border-[#E5E5E5] bg-white hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#111111]">Supabase</h4>
                <span className="text-[11px] text-[#666666]">PostgreSQL &amp; Realtime</span>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === "supabase" ? "text-[#6D28D9] rotate-90" : "text-neutral-400"}`} />
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5F5F5] flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">Status:</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Configurable</span>
            </span>
          </div>
        </div>

        {/* Google Sheets Tab Card */}
        <div
          onClick={() => setActiveTab("sheets")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "sheets"
              ? "border-[#6D28D9] bg-purple-50/40 shadow-xs"
              : "border-[#E5E5E5] bg-white hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#111111]">Google Sheets</h4>
                <span className="text-[11px] text-[#666666]">Leads Ingestion</span>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === "sheets" ? "text-[#6D28D9] rotate-90" : "text-neutral-400"}`} />
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5F5F5] flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">By URL or ID:</span>
            <span className="font-semibold text-[#6D28D9]">Verify Ready</span>
          </div>
        </div>

        {/* Email Provider Tab Card */}
        <div
          onClick={() => setActiveTab("email")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "email"
              ? "border-[#6D28D9] bg-purple-50/40 shadow-xs"
              : "border-[#E5E5E5] bg-white hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#111111]">Email Engine</h4>
                <span className="text-[11px] text-[#666666]">Resend &amp; Custom SMTP</span>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === "email" ? "text-[#6D28D9] rotate-90" : "text-neutral-400"}`} />
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5F5F5] flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">Active Mode:</span>
            <span className="font-semibold text-neutral-800 uppercase">{emailMode}</span>
          </div>
        </div>

        {/* n8n Engine Tab Card */}
        <div
          onClick={() => setActiveTab("n8n")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === "n8n"
              ? "border-[#6D28D9] bg-purple-50/40 shadow-xs"
              : "border-[#E5E5E5] bg-white hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-[#6D28D9]">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#111111]">n8n Webhook</h4>
                <span className="text-[11px] text-[#666666]">Automation Engine</span>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === "n8n" ? "text-[#6D28D9] rotate-90" : "text-neutral-400"}`} />
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5F5F5] flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">Security:</span>
            <span className="font-semibold text-neutral-800">X-Campaign-Secret</span>
          </div>
        </div>
      </div>

      {/* 2. Active Tab Configuration Detail View */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-xs space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: SUPABASE CONFIGURATION */}
        {/* ========================================================================= */}
        {activeTab === "supabase" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F5F5F5]">
              <div className="flex items-center gap-2.5">
                <Database className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-semibold text-[#111111]">
                    Supabase PostgreSQL &amp; Realtime Configuration
                  </h3>
                  <p className="text-[11px] text-[#666666]">
                    Configure credentials, deploy SQL migrations, and sync database tables directly from the dashboard.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleVerifySupabase}
                  disabled={verifyingSupabase}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] bg-white text-xs font-semibold text-neutral-700 hover:bg-[#F5F5F5] transition shadow-2xs disabled:opacity-50"
                  title="Ping Supabase and check responsiveness"
                >
                  {verifyingSupabase ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                  <span>{verifyingSupabase ? "Testing..." : "Test Connection"}</span>
                </button>

                <button
                  onClick={handleApplySchema}
                  disabled={applyingSchema}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-[#6D28D9] text-xs font-semibold hover:bg-purple-100 transition shadow-2xs disabled:opacity-50"
                  title="Deploy supabase_schema.sql directly to Supabase"
                >
                  {applyingSchema ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
                  <span>{applyingSchema ? "Deploying..." : "Apply Schema (SQL)"}</span>
                </button>

                <button
                  onClick={handleSyncData}
                  disabled={syncingData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-2xs disabled:opacity-50"
                  title="Import/Pull all existing tables and rows from Supabase into dashboard"
                >
                  {syncingData ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                  <span>{syncingData ? "Syncing..." : "Sync All from Supabase"}</span>
                </button>
              </div>
            </div>

            {/* Diagnostic Alert Box */}
            {supabaseDiagnostic && (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  supabaseDiagnostic.success
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {supabaseDiagnostic.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
                  <span>{supabaseDiagnostic.success ? "Connection Verified" : "Connection Failed"}</span>
                  {supabaseDiagnostic.latency && <span className="text-[10px] font-mono text-neutral-500">({supabaseDiagnostic.latency})</span>}
                </div>
                <p className="text-[11px]">{supabaseDiagnostic.message}</p>
                {supabaseDiagnostic.detectedTables && supabaseDiagnostic.detectedTables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="text-neutral-500 font-sans">Active tables in Supabase:</span>
                    {supabaseDiagnostic.detectedTables.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded-sm bg-white border border-emerald-200 text-emerald-700">
                        {t} ✓
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Schema Migration Status Box */}
            {schemaStatus && (
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 text-xs text-purple-950 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#6D28D9]">
                  <Sparkles className="h-4 w-4" />
                  <span>Schema Migration Status</span>
                </div>
                <p className="text-[11px] leading-relaxed">{schemaStatus.message}</p>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span>Active Tables: <strong className="font-mono">{schemaStatus.existingTables?.join(", ") || "None"}</strong></span>
                  {schemaStatus.missingTables?.length > 0 && (
                    <span className="text-rose-600">Pending: {schemaStatus.missingTables.join(", ")}</span>
                  )}
                </div>
              </div>
            )}

            {/* Table Architecture Checklist */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 space-y-2.5 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#111111] dark:text-neutral-100 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Schema Tables Architecture (from supabase_schema.sql):</span>
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">7 Core Tables with Realtime Publication</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                {[
                  { name: "campaigns", desc: "Atomic counters & status" },
                  { name: "contacts", desc: "Deduplicated emails" },
                  { name: "campaign_contacts", desc: "Batch & recipient link" },
                  { name: "email_logs", desc: "Provider message logs" },
                  { name: "email_templates", desc: "HTML / text bodies" },
                  { name: "suppression_list", desc: "Bounced / unsubscribed" },
                  { name: "campaign_events", desc: "Realtime live stream" },
                ].map((tbl) => (
                  <div key={tbl.name} className="p-2 rounded-lg bg-white dark:bg-[#121215] border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 block text-[10px]">
                      {tbl.name}
                    </span>
                    <span className="text-[9px] text-neutral-500 dark:text-neutral-400 block truncate">
                      {tbl.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Supabase Project URL *
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                />
                <span className="text-[10px] text-[#666666] mt-1 block">
                  Found in your Supabase Dashboard &rarr; Settings &rarr; API &rarr; Project URL
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Supabase Anon Public Key (Client Safe) *
                  </label>
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJh..."
                    className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                  />
                  <span className="text-[10px] text-[#666666] mt-1 block">
                    Used for browser realtime subscriptions
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Supabase Service Role Key (Backend Secret) *
                  </label>
                  <input
                    type="password"
                    value={supabaseServiceKey}
                    onChange={(e) => setSupabaseServiceKey(e.target.value)}
                    placeholder="eyJh..."
                    className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                  />
                  <span className="text-[10px] text-[#666666] mt-1 block">
                    Never exposed to browser. Used by n8n, triggers &amp; admin routes.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-between text-xs text-[#666666]">
              <span>SQL Schema file is located at <code className="text-[#6D28D9] font-mono">supabase_schema.sql</code></span>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-[#6D28D9] text-white font-semibold text-xs hover:bg-[#5b21b6]"
              >
                Save Supabase Credentials
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GOOGLE SHEETS CONFIGURATION */}
        {/* ========================================================================= */}
        {activeTab === "sheets" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F5]">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-semibold text-[#111111]">
                    Google Sheets Connection &amp; Tab Verification
                  </h3>
                  <p className="text-[11px] text-[#666666]">
                    Paste the complete spreadsheet URL or direct Sheet ID to inspect tabs and verify columns.
                  </p>
                </div>
              </div>

              <button
                onClick={handleVerifySheet}
                disabled={verifyingSheets}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition shadow-2xs disabled:opacity-50"
              >
                {verifyingSheets ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>{verifyingSheets ? "Verifying Sheet..." : "Verify & Read Columns"}</span>
              </button>
            </div>

            {sheetDiagnostic && (
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    sheetDiagnostic.isLiveFetched
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                      : sheetDiagnostic.requiresShare
                      ? "bg-amber-50/80 border-amber-200 text-amber-900"
                      : sheetDiagnostic.success
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <div className="flex items-center gap-2">
                      {sheetDiagnostic.isLiveFetched ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : sheetDiagnostic.requiresShare ? (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      ) : sheetDiagnostic.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                      )}
                      <span>
                        {sheetDiagnostic.isLiveFetched
                          ? `Live Data Active — ${sheetDiagnostic.totalRowsCount} Contacts Detected!`
                          : sheetDiagnostic.requiresShare
                          ? "Sheet is Private / Restricted (Google Auth Required)"
                          : sheetDiagnostic.success
                          ? "Sheet Access Verified"
                          : "Verification Failed"}
                      </span>
                    </div>

                    {sheetDiagnostic.accessMode && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-600">
                        {sheetDiagnostic.accessMode}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed">{sheetDiagnostic.message}</p>

                  {/* If private, guide user how to make it readable in 1 click */}
                  {sheetDiagnostic.requiresShare && (
                    <div className="mt-3 p-3 bg-white/80 rounded-lg border border-amber-200 text-[11px] space-y-1.5 text-amber-950">
                      <p className="font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        Live Data Fetch karne ka tareeqa:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-neutral-700 pl-1">
                        <li>Apni Google Sheet open karein.</li>
                        <li>Top right corner me <strong>&quot;Share&quot;</strong> button par click karein.</li>
                        <li><strong>&quot;General access&quot;</strong> ko <em>&quot;Restricted&quot;</em> se badal kar <strong>&quot;Anyone with the link&quot;</strong> (Viewer) kar dein.</li>
                        <li>Yahan wapis aakar dobara <strong>&quot;Verify &amp; Read Columns&quot;</strong> par click karein — aapki sheet ki tamam rows yahan screen par preview ho jayengi!</li>
                      </ol>
                    </div>
                  )}

                  {sheetDiagnostic.detectedHeaders && sheetDiagnostic.detectedHeaders.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-mono">
                      <span className="text-neutral-500 font-sans">Detected header columns:</span>
                      {sheetDiagnostic.detectedHeaders.map((h) => (
                        <span key={h} className="px-1.5 py-0.5 rounded-sm bg-white border border-emerald-200 text-emerald-700">
                          {h} ✓
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Row Preview Table */}
                {sheetDiagnostic.sampleRows && sheetDiagnostic.sampleRows.length > 0 && (
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                    <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4 text-[#6D28D9]" />
                        <span className="text-xs font-semibold text-neutral-900">
                          Live Data Preview (Showing first {sheetDiagnostic.sampleRows.length} of {sheetDiagnostic.totalRowsCount} rows)
                        </span>
                      </div>
                      <a
                        href={`/contacts/import?sheetId=${encodeURIComponent(sheetUrlOrId || sheetDiagnostic.sheetId || "")}&sheetName=${encodeURIComponent(sheetName)}`}
                        className="text-[11px] font-medium text-[#6D28D9] hover:underline flex items-center gap-1"
                      >
                        <span>Open Contacts Importer</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-600 font-medium font-mono text-[10px]">
                            {sheetDiagnostic.detectedHeaders?.map((h) => (
                              <th key={h} className="p-2.5 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {sheetDiagnostic.sampleRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50/50">
                              {sheetDiagnostic.detectedHeaders?.map((h) => (
                                <td key={h} className="p-2.5 whitespace-nowrap text-neutral-700 font-sans">
                                  {row[h] || <span className="text-neutral-300 italic">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Google Sheet URL or Sheet ID *
                </label>
                <input
                  type="text"
                  value={sheetUrlOrId}
                  onChange={(e) => setSheetUrlOrId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                />
                <span className="text-[10px] text-[#666666] mt-1 block">
                  You can paste the full browser URL directly. The system automatically extracts the ID.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Sheet Tab Name
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Sheet1"
                    className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Service Account Access
                  </label>
                  <div className="px-3.5 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 font-mono">
                    Handled via n8n Google Sheets OAuth / Service Account
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-[#6D28D9] text-white font-semibold text-xs hover:bg-[#5b21b6]"
              >
                Save Sheet Connection
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EMAIL DELIVERY (RESEND API & CUSTOM SMTP) */}
        {/* ========================================================================= */}
        {activeTab === "email" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F5]">
              <div className="flex items-center gap-2.5">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-semibold text-[#111111]">
                    Email Delivery Provider: Resend API &amp; Custom SMTP
                  </h3>
                  <p className="text-[11px] text-[#666666]">
                    Use Resend API or switch to Resend SMTP or any private SMTP server (SendGrid, Mailgun, Amazon SES).
                  </p>
                </div>
              </div>

              <button
                onClick={handleVerifyEmail}
                disabled={verifyingEmail}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition shadow-2xs disabled:opacity-50"
              >
                {verifyingEmail ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>{verifyingEmail ? "Verifying..." : "Verify & Test Provider"}</span>
              </button>
            </div>

            {/* Email Diagnostics */}
            {emailDiagnostic && (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  emailDiagnostic.success
                    ? "bg-blue-50/70 border-blue-200 text-blue-900"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {emailDiagnostic.success ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
                  <span>{emailDiagnostic.success ? "Email Provider Verified" : "Verification Error"}</span>
                </div>
                <p className="text-[11px]">{emailDiagnostic.message}</p>
                {emailDiagnostic.verifiedDomains && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="text-neutral-500 font-sans">Verified sender domains:</span>
                    {emailDiagnostic.verifiedDomains.map((d) => (
                      <span key={d} className="px-1.5 py-0.5 rounded-sm bg-white border border-blue-200 text-blue-700">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mode Selector Toggle */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl border border-neutral-200 bg-neutral-50">
              <span className="text-xs font-semibold text-[#111111]">Delivery Engine Mode:</span>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="emailMode"
                    value="resend"
                    checked={emailMode === "resend"}
                    onChange={() => setEmailMode("resend")}
                    className="text-[#6D28D9] focus:ring-[#6D28D9]"
                  />
                  <span>Resend REST API (Default)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="emailMode"
                    value="smtp"
                    checked={emailMode === "smtp"}
                    onChange={() => setEmailMode("smtp")}
                    className="text-[#6D28D9] focus:ring-[#6D28D9]"
                  />
                  <span>Custom SMTP (Resend SMTP / Private SMTP)</span>
                </label>
              </div>
            </div>

            {/* Sub-form 1: Resend REST API */}
            {emailMode === "resend" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Resend API Key *
                  </label>
                  <input
                    type="password"
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder="re_123456789_abcdef..."
                    className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                  />
                  <span className="text-[10px] text-[#666666] mt-1 block">
                    Created in your Resend Dashboard &rarr; API Keys
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      Default From Name
                    </label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Mubasher"
                      className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      Default From Email (Verified Domain)
                    </label>
                    <input
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="hello@domain.com"
                      className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Sub-form 2: Custom SMTP */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      SMTP Host *
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.resend.com or smtp.mailgun.org"
                      className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      Port *
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      placeholder="587"
                      className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      SMTP Username *
                    </label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="resend or apikey"
                      className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      SMTP Password *
                    </label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Mubasher"
                      className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5 flex items-center justify-between">
                      <span>Sender Email (From Address) *</span>
                      {smtpUser && smtpUser.includes("@") && (
                        <button
                          type="button"
                          onClick={() => setFromEmail(smtpUser)}
                          className="text-[10px] text-[#6D28D9] hover:underline font-normal"
                        >
                          Use {smtpUser}
                        </button>
                      )}
                    </label>
                    <input
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="ben@redvisionexpert.com"
                      className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
                    />
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Must match your domain (e.g. {smtpUser || "user@yourdomain.com"}) to pass Gmail SPF/DMARC filters.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.checked)}
                      className="rounded-sm border-neutral-300 text-[#6D28D9] focus:ring-[#6D28D9]"
                    />
                    <label htmlFor="smtpSecure" className="text-xs text-neutral-700 cursor-pointer">
                      Enable SSL / TLS encryption (recommended for port 465)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="smtpAllowSelfSigned"
                      checked={smtpAllowSelfSigned}
                      onChange={(e) => setSmtpAllowSelfSigned(e.target.checked)}
                      className="rounded-sm border-neutral-300 text-[#6D28D9] focus:ring-[#6D28D9]"
                    />
                    <label htmlFor="smtpAllowSelfSigned" className="text-xs text-neutral-700 cursor-pointer">
                      Trust self-signed / custom SSL certificates (fixes self-signed certificate error)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Live Test Email Dispatch Card */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#6D28D9] text-white">
                  <Send className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#111111]">
                    Send Live Test Email
                  </h4>
                  <p className="text-[11px] text-[#666666]">
                    Dispatch an actual real test email to any inbox to verify that {emailMode === "resend" ? "Resend API" : "your Custom SMTP server"} is delivering properly.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="Enter recipient email (e.g. yourname@gmail.com)"
                    className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden shadow-2xs"
                  />
                </div>
                <button
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail || !testEmailRecipient}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs disabled:opacity-50 shrink-0"
                >
                  {sendingTestEmail ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending Test...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Test Email</span>
                    </>
                  )}
                </button>
              </div>

              {testEmailDiagnostic && (
                <div
                  className={`p-3 rounded-lg border text-xs leading-relaxed ${
                    testEmailDiagnostic.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                    {testEmailDiagnostic.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                    )}
                    <span>{testEmailDiagnostic.success ? "Email Dispatched Successfully!" : "Test Email Error"}</span>
                  </div>
                  <p className="text-[11px] mt-0.5">{testEmailDiagnostic.message}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-[#6D28D9] text-white font-semibold text-xs hover:bg-[#5b21b6]"
              >
                Save Email Settings
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: n8n AUTOMATION ENGINE CONFIGURATION */}
        {/* ========================================================================= */}
        {activeTab === "n8n" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F5]">
              <div className="flex items-center gap-2.5">
                <Zap className="h-5 w-5 text-[#6D28D9]" />
                <div>
                  <h3 className="text-sm font-semibold text-[#111111]">
                    n8n Webhook Integration
                  </h3>
                  <p className="text-[11px] text-[#666666]">
                    Next.js triggers this webhook when campaigns start. Protected via <code>X-Campaign-Secret</code> header.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  n8n Webhook Endpoint URL *
                </label>
                <input
                  type="text"
                  value={n8nWebhookUrl}
                  onChange={(e) => setN8nWebhookUrl(e.target.value)}
                  placeholder="https://n8n.yourdomain.com/webhook/bulk-email/start"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  X-Campaign-Secret (Shared Webhook Secret) *
                </label>
                <input
                  type="password"
                  value={n8nWebhookSecret}
                  onChange={(e) => setN8nWebhookSecret(e.target.value)}
                  placeholder="bulk_email_secret_key_prod_2026"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] font-mono focus:border-[#6D28D9] focus:outline-hidden"
                />
                <span className="text-[10px] text-[#666666] mt-1 block">
                  Must match the secret expected by your n8n workflow IF node.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-[#6D28D9] text-white font-semibold text-xs hover:bg-[#5b21b6]"
              >
                Save n8n Credentials
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Architecture Notice */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 p-5 space-y-2 transition-colors">
        <div className="flex items-center gap-2 font-semibold text-xs text-[#111111] dark:text-neutral-100">
          <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>Security &amp; Persistence Assurance</span>
        </div>
        <p className="text-xs text-[#666666] dark:text-neutral-400 leading-relaxed">
          When you click <strong>Save</strong>, your credentials are securely persisted directly to <code>.env.local</code> on the server and loaded into the active runtime. No manual file edits are required. Secret keys are never exposed to browser client code.
        </p>
      </div>

      {/* Schema Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-[#6D28D9]" />
                <h3 className="font-semibold text-sm text-[#111111]">
                  Apply Database Schema to Supabase
                </h3>
              </div>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {schemaStatus?.executedDirectly ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm font-semibold mb-1">Tables Created Successfully!</strong>
                    <span>All 7 tables, triggers, and realtime publications were created directly via PostgreSQL connection. Click &apos;Check Tables Now&apos; below to confirm.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <p className="font-semibold mb-1">Supabase REST API security prevents direct table creation over HTTP.</p>
                    <p className="text-neutral-600">You can create all tables in <strong>10 seconds</strong> using Supabase&apos;s built-in SQL Editor, or enter your Database Password below for automatic creation.</p>
                  </div>

                  {/* Option 1: Copy SQL + Open Supabase SQL Editor */}
                  <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-neutral-900 block">Method 1: Run in Supabase SQL Editor (Recommended - 100% Reliable)</span>
                        <span className="text-[11px] text-neutral-500">Copy the SQL script below and paste it into Supabase SQL Editor.</span>
                      </div>
                      <button
                        onClick={handleCopySql}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6D28D9] text-white rounded-lg text-xs font-medium hover:bg-[#5b21b6] shadow-sm"
                      >
                        {copiedSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedSql ? "Copied!" : "Copy SQL Script"}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={schemaStatus?.sqlEditorUrl || (supabaseUrl ? `https://supabase.com/dashboard/project/${supabaseUrl.replace("https://", "").split(".")[0]}/sql/new` : "https://supabase.com/dashboard")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-[#6D28D9]" />
                        Open Supabase SQL Editor
                      </a>
                      <span className="text-[11px] text-neutral-500">Paste &amp; Click &apos;Run&apos; in Supabase.</span>
                    </div>
                  </div>

                  {/* Option 2: Database Password for Direct Execution */}
                  <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                    <div>
                      <span className="text-xs font-semibold text-neutral-900 block">Method 2: Auto-Run via Database Password</span>
                      <span className="text-[11px] text-neutral-500">Enter your Supabase Postgres Database Password to execute DDL directly from this dashboard.</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        placeholder="Supabase Database Password"
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                      />
                      <button
                        onClick={handleApplySchema}
                        disabled={applyingSchema || !dbPassword}
                        className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
                      >
                        {applyingSchema ? "Executing..." : "Run Directly"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50/80 flex items-center justify-between">
              <button
                onClick={() => {
                  handleVerifySupabase();
                  setShowSchemaModal(false);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                ✓ Check Tables Now
              </button>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="px-3 py-1.5 text-neutral-600 hover:text-neutral-900 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

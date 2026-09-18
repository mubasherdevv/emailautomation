"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmailTemplate } from "@/types";
import {
  Plus,
  Copy,
  Trash2,
  Edit2,
  FileText,
  Eye,
  Check,
  Code,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function TemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Quick question about {{website}}");
  const [htmlBody, setHtmlBody] = useState(
    `<p>Hi {{firstName}},</p>\n<p>I was checking {{website}} and noticed key growth opportunities for your team.</p>\n<p>Would you have 5 minutes to connect this week?</p>\n<p>Best regards,<br/><strong>Mubasher</strong></p>`
  );
  const [textBody, setTextBody] = useState(
    "Hi {{firstName}},\n\nI was checking {{website}} and noticed key growth opportunities.\n\nBest,\nMubasher"
  );
  const [activeTab, setActiveTab] = useState<"html" | "text">("html");
  const [highlightTags, setHighlightTags] = useState(true);

  const subjectInputRef = React.useRef<HTMLInputElement | null>(null);
  const htmlTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const textTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [focusedField, setFocusedField] = useState<"subject" | "html" | "text">("html");

  // Sample contacts for live preview simulation
  const sampleContacts = [
    {
      id: "sarah",
      label: "Sarah Connor (Cyberdyne)",
      data: {
        firstName: "Sarah",
        lastName: "Connor",
        email: "sarah@cyberdyne.org",
        website: "cyberdyne.org",
        address: "Los Angeles, CA",
        contact: "+1 (555) 876-5432",
        company: "Cyberdyne Systems",
      },
    },
    {
      id: "john",
      label: "John Doe (Acme Corp)",
      data: {
        firstName: "John",
        lastName: "Doe",
        email: "johndoe@acmecorp.com",
        website: "acmecorp.com",
        address: "Austin, Texas",
        contact: "+1 (555) 321-7654",
        company: "Acme Corporation",
      },
    },
  ];

  const [selectedContact, setSelectedContact] = useState(sampleContacts[0]);

  const insertMergeTag = (tag: string) => {
    if (focusedField === "subject") {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const nextVal = subject.substring(0, start) + tag + subject.substring(end);
        setSubject(nextVal);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + tag.length, start + tag.length);
        }, 50);
      } else {
        setSubject((prev) => prev + " " + tag);
      }
      toast("Tag Inserted", `Added ${tag} to Subject`, "success");
      return;
    }

    if (focusedField === "text" || activeTab === "text") {
      const textarea = textTextareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const nextVal = textBody.substring(0, start) + tag + textBody.substring(end);
        setTextBody(nextVal);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 50);
      } else {
        setTextBody((prev) => prev + " " + tag);
      }
      toast("Tag Inserted", `Added ${tag} to Plain Text`, "success");
      return;
    }

    // Default to HTML Body
    const textarea = htmlTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const nextVal = htmlBody.substring(0, start) + tag + htmlBody.substring(end);
      setHtmlBody(nextVal);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      setHtmlBody((prev) => prev + " " + tag);
    }
    toast("Tag Inserted", `Added ${tag} to HTML Body`, "success");
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const d = await res.json();
        const list = d.templates || [];
        setTemplates(list);
        if (list.length > 0 && !selectedTemplate) {
          selectTemplateForEditing(list[0]);
        }
      }
    } catch {
      toast("Error", "Failed to fetch templates", "error");
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const startNewTemplate = () => {
    setIsEditing(false);
    setSelectedTemplate(null);
    setName("Outreach - New Template");
    setSubject("Quick question about {{website}}");
    setHtmlBody(
      `<p>Hi {{firstName}},</p>\n<p>I was checking {{website}} and noticed key growth opportunities for your team.</p>\n<p>Would you have 5 minutes to connect this week?</p>\n<p>Best regards,<br/><strong>Mubasher</strong></p>`
    );
    setTextBody(
      "Hi {{firstName}},\n\nI was checking {{website}} and noticed key growth opportunities.\n\nBest,\nMubasher"
    );
  };

  const convertPlainTextToHtml = (text: string) => {
    if (!text || !text.trim()) return "";
    return text
      .split(/\n\n+/)
      .map((p) => `<p>${p.trim().replace(/\n/g, "<br />")}</p>`)
      .join("\n");
  };

  const convertHtmlToPlainText = (html: string) => {
    if (!html) return "";
    return html
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  };

  const syncPlainTextToHtml = () => {
    if (!textBody.trim()) {
      toast("Nothing to Sync", "Plain text body is empty", "warning");
      return;
    }
    const converted = convertPlainTextToHtml(textBody);
    setHtmlBody(converted);
    toast("Synced to HTML", "HTML body has been updated from plain text", "success");
  };

  const syncHtmlToPlainText = () => {
    if (!htmlBody.trim()) {
      toast("Nothing to Sync", "HTML body is empty", "warning");
      return;
    }
    const converted = convertHtmlToPlainText(htmlBody);
    setTextBody(converted);
    toast("Synced to Plain Text", "Plain text body has been updated from HTML", "success");
  };

  const selectTemplateForEditing = (tpl: EmailTemplate) => {
    setIsEditing(true);
    setSelectedTemplate(tpl);
    setName(tpl.name);
    setSubject(tpl.subject);

    const textVal = tpl.text_body ?? "";
    const isHtmlDefault =
      !tpl.html_body ||
      tpl.html_body.includes("I was checking {{website}} and noticed key growth opportunities");
    const isTextCustom =
      Boolean(textVal) &&
      !textVal.includes("I was checking {{website}} and noticed key growth opportunities");

    if (isTextCustom && isHtmlDefault) {
      const generatedHtml = convertPlainTextToHtml(textVal);
      setHtmlBody(generatedHtml);
      setTextBody(textVal);
    } else {
      setHtmlBody(tpl.html_body);
      setTextBody(textVal || (tpl.html_body ? convertHtmlToPlainText(tpl.html_body) : ""));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Missing Name", "Please enter a template name", "error");
      return;
    }

    const isHtmlDefault =
      !htmlBody ||
      htmlBody.includes("I was checking {{website}} and noticed key growth opportunities");
    const isTextCustom =
      Boolean(textBody) &&
      !textBody.includes("I was checking {{website}} and noticed key growth opportunities");

    let finalHtml = htmlBody;
    let finalText = textBody;

    // If user edited Plain Text or has custom text with untouched default HTML, auto-sync HTML
    if (activeTab === "text" || (isTextCustom && isHtmlDefault)) {
      if (textBody.trim()) {
        finalHtml = convertPlainTextToHtml(textBody);
        setHtmlBody(finalHtml);
      }
    } else if (activeTab === "html" && (!textBody || isHtmlDefault)) {
      if (htmlBody.trim()) {
        finalText = convertHtmlToPlainText(htmlBody);
        setTextBody(finalText);
      }
    }

    try {
      if (isEditing && selectedTemplate) {
        const res = await fetch(`/api/templates/${selectedTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subject, html_body: finalHtml, text_body: finalText }),
        });
        if (!res.ok) throw new Error("Update failed");
        toast("Template Saved", "Template updated successfully (HTML & Plain Text synced)", "success");
      } else {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subject, html_body: finalHtml, text_body: finalText }),
        });
        if (!res.ok) throw new Error("Creation failed");
        const data = await res.json();
        toast("Template Created", `"${name}" added to library`, "success");
        if (data.template) {
          setSelectedTemplate(data.template);
          setIsEditing(true);
        }
      }
      fetchTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving template";
      toast("Error", msg, "error");
    }
  };

  const handleDuplicate = async (tpl: EmailTemplate) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${tpl.name} (Copy)`,
          subject: tpl.subject,
          html_body: tpl.html_body,
          text_body: tpl.text_body,
        }),
      });
      if (res.ok) {
        toast("Template Duplicated", `Created copy of ${tpl.name}`, "success");
        fetchTemplates();
      }
    } catch {
      toast("Error", "Could not duplicate template", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Deleted", "Template removed", "info");
        if (selectedTemplate?.id === id) {
          startNewTemplate();
        }
        fetchTemplates();
      }
    } catch {
      toast("Error", "Could not delete template", "error");
    }
  };

  const renderPreview = (content: string, isHtml: boolean = false) => {
    if (!content) return "";
    let formatted = content;

    // Auto-convert newlines to <br/> if content doesn't have standard HTML block tags
    if (isHtml && !/<(p|div|br|h[1-6]|table|ul|ol)\b[^>]*>/i.test(formatted)) {
      formatted = formatted.replace(/\n/g, "<br />");
    }

    const data = selectedContact.data;
    const tagMap: Record<string, string> = {
      firstname: data.firstName,
      first_name: data.firstName,
      fname: data.firstName,
      name: `${data.firstName} ${data.lastName}`,
      lastname: data.lastName,
      last_name: data.lastName,
      lname: data.lastName,
      email: data.email,
      mail: data.email,
      website: data.website,
      site: data.website,
      url: data.website,
      address: data.address,
      location: data.address,
      contact: data.contact,
      phone: data.contact,
      phonenumber: data.contact,
      mobile: data.contact,
      company: data.company,
      companyname: data.company,
    };

    return formatted.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, rawKey) => {
      const lower = rawKey.toLowerCase();
      const value = tagMap[lower];
      if (value !== undefined) {
        if (highlightTags) {
          return isHtml
            ? `<mark style="background-color: #ede9fe; color: #6d28d9; padding: 2px 6px; border-radius: 4px; font-weight: 600; border: 1px solid #c4b5fd; text-decoration: none;">${value}</mark>`
            : `[${value}]`;
        }
        return value;
      }
      if (highlightTags) {
        return isHtml
          ? `<mark style="background-color: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #fde68a;">${match}</mark>`
          : match;
      }
      return match;
    });
  };

  // Extract variables present in the current subject or body
  const currentContent = `${subject} ${activeTab === "text" ? textBody : htmlBody}`;
  const currentTagsFound = Array.from(
    new Set(
      Array.from(currentContent.matchAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g)).map((m) => m[1])
    )
  );

  return (
    <AdminShell
      title="Email Templates"
      subtitle="Interactive in-page template designer with drag & drop merge tags and real-time live preview"
      actions={
        <button
          onClick={startNewTemplate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5b21b6] transition shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ New Template</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Saved Templates List (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
              Saved Templates ({templates.length})
            </span>
          </div>

          <div className="space-y-2">
            {templates.map((tpl) => {
              const isSelected = selectedTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => selectTemplateForEditing(tpl)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/30"
                      : "border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-[#111111] dark:text-neutral-100 truncate">{tpl.name}</h4>
                      <p className="mt-1 text-[11px] text-[#666666] dark:text-neutral-400 truncate">
                        {tpl.subject}
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(tpl);
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(tpl.id);
                        }}
                        className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                    {(() => {
                      const detected = new Set<string>(tpl.variables || []);
                      const combined = `${tpl.subject || ""} ${tpl.html_body || ""} ${tpl.text_body || ""}`;
                      const matches = combined.matchAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g);
                      for (const m of matches) {
                        if (m[1]) detected.add(m[1]);
                      }
                      if (detected.size === 0) {
                        ["firstName", "company", "website"].forEach((v) => detected.add(v));
                      }
                      return Array.from(detected).map((v) => (
                        <span
                          key={v}
                          className="px-1.5 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-[9px] font-mono text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                        >
                          {`{{${v}}}`}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              );
            })}

            {templates.length === 0 && (
              <div className="p-6 rounded-xl border border-dashed border-neutral-200 text-center text-xs text-neutral-400">
                No templates saved yet. Create your first one!
              </div>
            )}
          </div>
        </div>

        {/* Center Column: In-Page Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleSave} className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#6D28D9]" />
                <h3 className="text-xs font-semibold text-[#111111]">
                  {isEditing ? `Edit: ${selectedTemplate?.name}` : "Create New Template"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#6D28D9] text-xs font-semibold text-white hover:bg-[#5b21b6] transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isEditing ? "Save Changes" : "Create Template"}</span>
                </button>
              </div>
            </div>

            {/* Template Name */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Template Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Initial Email - DM"
                className="w-full rounded-lg border border-[#E5E5E5] px-3.5 py-2 text-xs text-[#111111] focus:border-[#6D28D9] focus:outline-hidden"
              />
            </div>

            {/* Subject Line with focus tracking */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#111111]">
                  Subject Line *
                </label>
                {focusedField === "subject" && (
                  <span className="text-[10px] text-[#6D28D9] font-medium animate-pulse">
                    ● Active cursor target
                  </span>
                )}
              </div>
              <input
                ref={subjectInputRef}
                type="text"
                required
                value={subject}
                onFocus={() => setFocusedField("subject")}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Quick question about {{website}}"
                className={`w-full rounded-lg border px-3.5 py-2 text-xs text-[#111111] transition-all focus:outline-hidden ${
                  focusedField === "subject"
                    ? "border-[#6D28D9] ring-2 ring-[#6D28D9]/10 bg-purple-50/10"
                    : "border-[#E5E5E5] focus:border-[#6D28D9]"
                }`}
              />
            </div>

            {/* Interactive Draggable & Clickable Merge Tag Cheat Sheet */}
            <div className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40 text-xs transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Merge Tag Cheat Sheet</span>
                </span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                  Inserting to: {focusedField === "subject" ? "Subject Line" : activeTab === "text" ? "Plain Text Body" : "HTML Body"}
                </span>
              </div>
              
              <p className="text-[11px] text-neutral-600 mb-2.5">
                ⚡ <strong>Click tag</strong> to insert at cursor, or <strong>drag &amp; drop</strong> into editor:
              </p>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: "{{firstName}}", label: "First Name" },
                  { tag: "{{lastName}}", label: "Last Name" },
                  { tag: "{{email}}", label: "Email" },
                  { tag: "{{company}}", label: "Company" },
                  { tag: "{{website}}", label: "Website" },
                  { tag: "{{address}}", label: "Address" },
                  { tag: "{{contact}}", label: "Contact Phone" },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", item.tag);
                    }}
                    onClick={() => insertMergeTag(item.tag)}
                    title={`Click to insert ${item.tag} or drag & drop anywhere`}
                    className="group flex items-center gap-1 px-2.5 py-1 rounded-md border border-purple-200 bg-white hover:bg-purple-100 hover:border-[#6D28D9] text-[#6D28D9] text-[11px] font-mono transition-all shadow-xs cursor-grab active:cursor-grabbing select-none"
                  >
                    <span className="text-[10px] text-purple-400 group-hover:text-purple-700">⋮⋮</span>
                    <span className="font-semibold">{item.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body Editor with Tabs (HTML / Plain Text) */}
            <div>
              <div className="flex items-center justify-between border-b border-neutral-100 mb-2 pb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("html");
                      setFocusedField("html");
                    }}
                    className={`text-xs font-semibold pb-1.5 border-b-2 cursor-pointer transition ${
                      activeTab === "html"
                        ? "border-[#6D28D9] text-[#6D28D9]"
                        : "border-transparent text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    HTML Body *
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("text");
                      setFocusedField("text");
                    }}
                    className={`text-xs font-semibold pb-1.5 border-b-2 cursor-pointer transition ${
                      activeTab === "text"
                        ? "border-[#6D28D9] text-[#6D28D9]"
                        : "border-transparent text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    Plain Text Fallback
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {activeTab === "text" ? (
                    <button
                      type="button"
                      onClick={syncPlainTextToHtml}
                      title="Convert this plain text into formatted HTML body"
                      className="text-[10px] text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded cursor-pointer font-medium flex items-center gap-1 transition shadow-xs"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>Sync to HTML Body</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={syncHtmlToPlainText}
                      title="Strip HTML tags and sync to plain text body"
                      className="text-[10px] text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded cursor-pointer font-medium flex items-center gap-1 transition shadow-xs"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>Sync to Plain Text</span>
                    </button>
                  )}
                  <span className="text-[10px] text-neutral-400">
                    {activeTab === "html" ? "Rendered in preview" : "Auto-synced on save"}
                  </span>
                </div>
              </div>

              {activeTab === "html" ? (
                <textarea
                  ref={htmlTextareaRef}
                  rows={9}
                  required
                  value={htmlBody}
                  onFocus={() => setFocusedField("html")}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder="<p>Hi {{firstName}},</p>"
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs text-[#111111] font-mono leading-relaxed transition-all focus:outline-hidden ${
                    focusedField === "html"
                      ? "border-[#6D28D9] ring-2 ring-[#6D28D9]/10 bg-purple-50/5"
                      : "border-[#E5E5E5] focus:border-[#6D28D9]"
                  }`}
                />
              ) : (
                <textarea
                  ref={textTextareaRef}
                  rows={9}
                  value={textBody}
                  onFocus={() => setFocusedField("text")}
                  onChange={(e) => setTextBody(e.target.value)}
                  placeholder="Hi {{firstName}}, checking in about {{website}}..."
                  className={`w-full rounded-lg border px-3.5 py-2 text-xs text-[#111111] font-mono leading-relaxed transition-all focus:outline-hidden ${
                    focusedField === "text"
                      ? "border-[#6D28D9] ring-2 ring-[#6D28D9]/10 bg-purple-50/5"
                      : "border-[#E5E5E5] focus:border-[#6D28D9]"
                  }`}
                />
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Live Real-Time Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="rounded-xl border border-[#E5E5E5] dark:border-neutral-800 bg-white dark:bg-[#121215] shadow-xs overflow-hidden sticky top-6 transition-colors">
            {/* Preview Toolbar */}
            <div className="p-3.5 border-b border-[#F5F5F5] dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-[#111111] dark:text-neutral-100">
                    Live Email Preview
                  </span>
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={highlightTags}
                    onChange={(e) => setHighlightTags(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-600"
                  />
                  <span>Highlight Tags</span>
                </label>
              </div>

              {/* View Mode Toggle (HTML vs Plain Text) */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-200/50 dark:border-neutral-800">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("html")}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition ${
                      activeTab === "html"
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    HTML View
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("text")}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition ${
                      activeTab === "text"
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    Plain Text View
                  </button>
                </div>

                {/* Sample contact switcher */}
                <select
                  value={selectedContact.id}
                  onChange={(e) => {
                    const c = sampleContacts.find((x) => x.id === e.target.value);
                    if (c) setSelectedContact(c);
                  }}
                  className="rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-700 dark:text-neutral-200 font-medium cursor-pointer"
                >
                  {sampleContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email Client Simulation Frame */}
            <div className="p-4 bg-neutral-50/40">
              <div className="rounded-lg border border-neutral-200 bg-white shadow-xs overflow-hidden">
                {/* Email Header */}
                <div className="border-b border-neutral-100 p-3 space-y-1.5 bg-neutral-50/30 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 font-medium text-[11px]">To:</span>
                    <span className="font-mono text-neutral-800 text-[11px]">
                      {selectedContact.data.firstName} {selectedContact.data.lastName} &lt;{selectedContact.data.email}&gt;
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 font-medium text-[11px]">From:</span>
                    <span className="font-mono text-neutral-800 text-[11px]">
                      Mubasher &lt;hello@domain.com&gt;
                    </span>
                  </div>
                  <div className="flex items-start justify-between pt-1 border-t border-neutral-100 gap-2">
                    <span className="text-neutral-500 font-medium text-[11px]">Subject:</span>
                    <span
                      className="font-semibold text-neutral-900 text-xs text-right"
                      dangerouslySetInnerHTML={{
                        __html: renderPreview(subject || "No Subject", true),
                      }}
                    />
                  </div>
                </div>

                {/* Rendered Body (HTML or Plain Text based on active view) */}
                {activeTab === "html" ? (
                  <div
                    key={`preview-html-${selectedContact.id}-${highlightTags}`}
                    className="p-4 text-xs text-neutral-800 leading-relaxed prose prose-neutral max-w-none min-h-[140px]"
                    dangerouslySetInnerHTML={{
                      __html: renderPreview(
                        htmlBody || "<p style='color:#999;font-style:italic;'>Type in HTML Body to see preview...</p>",
                        true
                      ),
                    }}
                  />
                ) : (
                  <div
                    key={`preview-text-${selectedContact.id}-${highlightTags}`}
                    className="p-4 text-xs text-neutral-800 font-mono leading-relaxed whitespace-pre-wrap min-h-[140px]"
                    dangerouslySetInnerHTML={{
                      __html: renderPreview(
                        textBody || "Type in Plain Text Fallback to see preview...",
                        true
                      ),
                    }}
                  />
                )}

                {/* Detected Tags Bar */}
                <div className="p-2.5 bg-neutral-50 border-t border-neutral-100 text-[10px] space-y-1">
                  <div className="flex items-center justify-between text-neutral-500 font-medium">
                    <span>Detected Merge Tags in Live Preview:</span>
                    <span className="text-[#6D28D9] font-semibold">{currentTagsFound.length} tags active</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentTagsFound.map((t) => {
                      const lower = t.toLowerCase();
                      const val = (selectedContact.data as Record<string, string>)[t] || (selectedContact.data as Record<string, string>)[lower] || "Replaced";
                      return (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded bg-purple-100 text-[#6D28D9] font-mono text-[9px] font-semibold flex items-center gap-0.5"
                        >
                          ✓ {`{{${t}}}`} &rarr; {val}
                        </span>
                      );
                    })}
                    {currentTagsFound.length === 0 && (
                      <span className="text-neutral-400 italic">No merge tags currently in template</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

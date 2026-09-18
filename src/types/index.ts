import { z } from "zod";

export type CampaignStatus = 
  | "draft" 
  | "running" 
  | "paused" 
  | "stopped" 
  | "completed" 
  | "failed";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  send_limit: number;
  batch_size: number;
  delay_seconds: number;
  subject: string;
  from_name: string;
  from_email: string;
  sheet_id: string;
  sheet_name: string;
  source_type?: "sheets" | "contacts";
  selected_contact_ids?: string[];
  template_id?: string | null;
  primary_recipient_field: "email" | "personal_email";
  
  // Atomic Counters
  total_count: number;
  sent_count: number;
  sending_count: number;
  pending_count: number;
  failed_count: number;
  
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at: string;
}

export type ContactStatus = 
  | "pending" 
  | "sending" 
  | "sent" 
  | "failed" 
  | "skipped" 
  | "unsubscribed";

export interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  personal_email?: string | null;
  address?: string | null;
  company?: string | null;
  contact?: string | null;
  website?: string | null;
  status: ContactStatus;
  last_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  contact_id: string;
  recipient_email: string;
  status: "pending" | "sending" | "sent" | "failed" | "skipped";
  provider_message_id?: string | null;
  error?: string | null;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
}

export interface EmailLog {
  id: string;
  campaign_id?: string | null;
  contact_id?: string | null;
  email: string;
  status: "sending" | "sent" | "failed" | "skipped" | "delivered" | "bounced" | "complained";
  provider_message_id?: string | null;
  error?: string | null;
  sent_at?: string | null;
  created_at: string;
  campaign_name?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body?: string | null;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export type CampaignEventType = 
  | "campaign_started"
  | "campaign_restarted"
  | "leads_loaded"
  | "batch_started"
  | "email_sending"
  | "email_sent"
  | "email_failed"
  | "batch_completed"
  | "campaign_paused"
  | "campaign_resumed"
  | "campaign_stopped"
  | "campaign_completed";

export interface CampaignEvent {
  id: string;
  campaign_id: string;
  event_type: CampaignEventType;
  email?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

// Zod Validation Schemas
export const CreateCampaignSchema = z.object({
  name: z.string().min(2, "Campaign name must be at least 2 characters").max(100),
  sourceType: z.enum(["sheets", "contacts"]).optional().default("sheets"),
  sheetId: z.string().optional().default(""),
  sheetName: z.string().default("Sheet1"),
  selectedContactIds: z.array(z.string()).optional().default([]),
  templateId: z.string().optional().nullable(),
  subject: z.string().min(1, "Subject line is required"),
  fromName: z.string().min(1, "From Name is required"),
  fromEmail: z.string().email("Valid From Email is required"),
  sendLimit: z.number().int().min(1, "Minimum limit is 1").max(50000, "Maximum limit is 50,000").default(100),
  batchSize: z.number().int().min(1, "Minimum batch is 1").max(50, "Batch size must not exceed 50").default(5),
  delaySeconds: z.number().int().min(1, "Minimum delay is 1s").max(60, "Maximum delay is 60s").default(2),
  primaryRecipientField: z.enum(["email", "personal_email"]).default("email"),
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(2, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  html_body: z.string().min(1, "HTML body is required"),
  text_body: z.string().optional(),
});

export const ImportContactsSchema = z.object({
  sheetId: z.string().optional().default(""),
  sheetName: z.string().optional().default("Sheet1"),
  rows: z.array(z.record(z.string(), z.any())).min(1, "At least 1 row is required"),
});


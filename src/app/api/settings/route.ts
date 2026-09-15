import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper to mask sensitive keys
function maskKey(key?: string | null): string {
  if (!key || key.length < 8) return "";
  return key.slice(0, 4) + "••••••••••••" + key.slice(-4);
}

export async function GET() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = "";
    try {
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
      }
    } catch {
      // Ignore read errors
    }

    // Parse env key-values
    const envMap: Record<string, string> = {};
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx !== -1) {
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          envMap[k] = v;
        }
      }
    });

    const settings = {
      // Supabase
      supabaseUrl: envMap["NEXT_PUBLIC_SUPABASE_URL"] || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: maskKey(envMap["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      supabaseServiceKey: maskKey(envMap["SUPABASE_SERVICE_ROLE_KEY"] || process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasSupabaseAnonKey: Boolean(envMap["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasSupabaseServiceKey: Boolean(envMap["SUPABASE_SERVICE_ROLE_KEY"] || process.env.SUPABASE_SERVICE_ROLE_KEY),

      // Google Sheets
      googleSheetId: envMap["GOOGLE_SHEET_ID"] || process.env.GOOGLE_SHEET_ID || "",
      googleSheetName: envMap["GOOGLE_SHEET_NAME"] || process.env.GOOGLE_SHEET_NAME || "Sheet1",
      googleServiceAccountEmail: envMap["GOOGLE_SERVICE_ACCOUNT_EMAIL"] || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
      hasGoogleServiceAccount: Boolean(envMap["GOOGLE_SERVICE_ACCOUNT_KEY"] || process.env.GOOGLE_SERVICE_ACCOUNT_KEY),

      // Email Provider
      emailProviderMode: envMap["EMAIL_PROVIDER_MODE"] || process.env.EMAIL_PROVIDER_MODE || "resend", // 'resend' | 'smtp'
      resendApiKey: maskKey(envMap["RESEND_API_KEY"] || process.env.RESEND_API_KEY),
      hasResendApiKey: Boolean(envMap["RESEND_API_KEY"] || process.env.RESEND_API_KEY),
      resendFromEmail: envMap["RESEND_FROM_EMAIL"] || process.env.RESEND_FROM_EMAIL || "hello@domain.com",
      resendFromName: envMap["RESEND_FROM_NAME"] || process.env.RESEND_FROM_NAME || "Mubasher",

      // SMTP
      smtpHost: envMap["SMTP_HOST"] || process.env.SMTP_HOST || "smtp.resend.com",
      smtpPort: Number(envMap["SMTP_PORT"] || process.env.SMTP_PORT || 587),
      smtpUser: envMap["SMTP_USER"] || process.env.SMTP_USER || "resend",
      smtpPass: maskKey(envMap["SMTP_PASS"] || process.env.SMTP_PASS),
      smtpSecure: envMap["SMTP_SECURE"] === "true",
      smtpAllowSelfSigned: envMap["SMTP_ALLOW_SELF_SIGNED"] !== "false", // default true

      // n8n
      n8nWebhookUrl: envMap["N8N_WEBHOOK_URL"] || process.env.N8N_WEBHOOK_URL || "",
      n8nWebhookSecret: maskKey(envMap["N8N_WEBHOOK_SECRET"] || process.env.N8N_WEBHOOK_SECRET),
    };

    return NextResponse.json({ settings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const envPath = path.join(process.cwd(), ".env.local");

    let currentEnv = "";
    try {
      if (fs.existsSync(envPath)) {
        currentEnv = fs.readFileSync(envPath, "utf-8");
      }
    } catch {
      // Ignore read errors
    }

    const envMap: Record<string, string> = {};
    currentEnv.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx !== -1) {
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          envMap[k] = v;
        }
      }
    });

    // Update keys if explicitly provided and not masked
    if (body.supabaseUrl !== undefined) {
      envMap["NEXT_PUBLIC_SUPABASE_URL"] = body.supabaseUrl.trim();
      process.env.NEXT_PUBLIC_SUPABASE_URL = body.supabaseUrl.trim();
    }
    if (body.supabaseAnonKey && !body.supabaseAnonKey.includes("••••")) {
      envMap["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = body.supabaseAnonKey.trim();
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = body.supabaseAnonKey.trim();
    }
    if (body.supabaseServiceKey && !body.supabaseServiceKey.includes("••••")) {
      envMap["SUPABASE_SERVICE_ROLE_KEY"] = body.supabaseServiceKey.trim();
      process.env.SUPABASE_SERVICE_ROLE_KEY = body.supabaseServiceKey.trim();
    }

    if (body.googleSheetId !== undefined) {
      envMap["GOOGLE_SHEET_ID"] = body.googleSheetId.trim();
      process.env.GOOGLE_SHEET_ID = body.googleSheetId.trim();
    }
    if (body.googleSheetName !== undefined) {
      envMap["GOOGLE_SHEET_NAME"] = body.googleSheetName.trim();
      process.env.GOOGLE_SHEET_NAME = body.googleSheetName.trim();
    }

    if (body.emailProviderMode !== undefined) {
      envMap["EMAIL_PROVIDER_MODE"] = body.emailProviderMode;
      process.env.EMAIL_PROVIDER_MODE = body.emailProviderMode;
    }
    if (body.resendApiKey && !body.resendApiKey.includes("••••")) {
      envMap["RESEND_API_KEY"] = body.resendApiKey.trim();
      process.env.RESEND_API_KEY = body.resendApiKey.trim();
    }
    if (body.resendFromEmail !== undefined) {
      envMap["RESEND_FROM_EMAIL"] = body.resendFromEmail.trim();
      process.env.RESEND_FROM_EMAIL = body.resendFromEmail.trim();
    }
    if (body.resendFromName !== undefined) {
      envMap["RESEND_FROM_NAME"] = body.resendFromName.trim();
      process.env.RESEND_FROM_NAME = body.resendFromName.trim();
    }

    if (body.smtpHost !== undefined) {
      envMap["SMTP_HOST"] = body.smtpHost.trim();
      process.env.SMTP_HOST = body.smtpHost.trim();
    }
    if (body.smtpPort !== undefined) {
      envMap["SMTP_PORT"] = String(body.smtpPort);
      process.env.SMTP_PORT = String(body.smtpPort);
    }
    if (body.smtpUser !== undefined) {
      envMap["SMTP_USER"] = body.smtpUser.trim();
      process.env.SMTP_USER = body.smtpUser.trim();
    }
    if (body.smtpPass && !body.smtpPass.includes("••••")) {
      envMap["SMTP_PASS"] = body.smtpPass.trim();
      process.env.SMTP_PASS = body.smtpPass.trim();
    }
    if (body.smtpSecure !== undefined) {
      envMap["SMTP_SECURE"] = body.smtpSecure ? "true" : "false";
      process.env.SMTP_SECURE = body.smtpSecure ? "true" : "false";
    }
    if (body.smtpAllowSelfSigned !== undefined) {
      envMap["SMTP_ALLOW_SELF_SIGNED"] = body.smtpAllowSelfSigned ? "true" : "false";
      process.env.SMTP_ALLOW_SELF_SIGNED = body.smtpAllowSelfSigned ? "true" : "false";
    }

    if (body.n8nWebhookUrl !== undefined) {
      envMap["N8N_WEBHOOK_URL"] = body.n8nWebhookUrl.trim();
      process.env.N8N_WEBHOOK_URL = body.n8nWebhookUrl.trim();
    }
    if (body.n8nWebhookSecret && !body.n8nWebhookSecret.includes("••••")) {
      envMap["N8N_WEBHOOK_SECRET"] = body.n8nWebhookSecret.trim();
      process.env.N8N_WEBHOOK_SECRET = body.n8nWebhookSecret.trim();
    }

    // Safely attempt to write to .env.local (works on local/self-hosted; fails silently on Vercel serverless)
    let fileSaved = false;
    try {
      const newContent = Object.entries(envMap)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n");
      fs.writeFileSync(envPath, newContent, "utf-8");
      fileSaved = true;
    } catch {
      // Ignore EROFS (Read-only file system on Vercel / serverless runtime)
    }

    return NextResponse.json({
      success: true,
      message: fileSaved
        ? "Configuration saved successfully to server and .env.local"
        : "Configuration updated in memory. (For permanent Vercel settings, add them to your Vercel Project Environment Variables).",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to persist settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

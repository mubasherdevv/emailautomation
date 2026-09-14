import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mode = body.mode || "resend"; // 'resend' | 'smtp'
    const recipient = (body.recipient || "").trim();

    if (!recipient || !recipient.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid recipient email address." },
        { status: 400 }
      );
    }

    const fromName = body.fromName?.trim() || process.env.RESEND_FROM_NAME || "Bulk Email Platform";
    const fromEmail = body.fromEmail?.trim() || process.env.RESEND_FROM_EMAIL || "";

    const testSubject = `Test Delivery - Bulk Email Platform (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E5E5E5; border-radius: 12px; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <div style="background: #6D28D9; width: 32px; height: 32px; border-radius: 8px; display: inline-block; text-align: center; line-height: 32px; color: #ffffff; font-weight: bold; font-size: 16px;">✓</div>
          <h2 style="margin: 0; color: #111111; font-size: 18px; font-weight: 600; display: inline-block; margin-left: 8px;">Delivery Test Successful</h2>
        </div>
        <p style="color: #444444; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Congratulations! Your email dispatch configuration is working properly and can successfully deliver outbound messages.
        </p>
        <div style="background: #F8F9FA; border: 1px solid #E9ECEF; border-radius: 8px; padding: 14px; font-size: 12px; color: #555555; line-height: 1.6; font-family: monospace;">
          <div><strong>Provider Mode:</strong> ${mode.toUpperCase()}</div>
          <div><strong>Sender:</strong> ${fromName} &lt;${fromEmail || (mode === 'smtp' ? body.smtpUser : 'default')}&gt;</div>
          <div><strong>Recipient:</strong> ${recipient}</div>
          <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
        </div>
        <p style="color: #888888; font-size: 11px; margin-top: 20px; border-top: 1px solid #E5E5E5; padding-top: 12px;">
          Sent from Bulk Email Automation Platform
        </p>
      </div>
    `;

    // 1. Resend REST API mode
    if (mode === "resend") {
      let apiKey = body.apiKey || process.env.RESEND_API_KEY || "";
      if (apiKey.includes("••••")) apiKey = process.env.RESEND_API_KEY || "";

      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: "Resend API Key is required." },
          { status: 400 }
        );
      }

      if (!fromEmail) {
        return NextResponse.json(
          { success: false, error: "Sender email (fromEmail) with a verified Resend domain is required." },
          { status: 400 }
        );
      }

      const resendPayload = {
        from: `${fromName} <${fromEmail}>`,
        to: [recipient],
        subject: testSubject,
        html: testHtml,
        text: `Delivery Test Successful!\n\nYour Resend integration is working properly.\nSent to: ${recipient}\nTimestamp: ${new Date().toISOString()}`,
      };

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendPayload),
      });

      const resData = await res.json();

      if (!res.ok) {
        const errMsg = resData?.message || resData?.error || "Resend API rejected the request.";
        return NextResponse.json({ success: false, error: errMsg }, { status: res.status });
      }

      return NextResponse.json({
        success: true,
        messageId: resData.id,
        message: `Test email successfully dispatched to ${recipient} via Resend! (ID: ${resData.id})`,
      });
    }

    // 2. Custom SMTP mode
    if (mode === "smtp") {
      const host = body.smtpHost || process.env.SMTP_HOST || "";
      const port = Number(body.smtpPort || process.env.SMTP_PORT || 587);
      const user = body.smtpUser || process.env.SMTP_USER || "";
      let pass = body.smtpPass || process.env.SMTP_PASS || "";
      if (pass.includes("••••")) pass = process.env.SMTP_PASS || "";
      const secure = body.smtpSecure === true || port === 465;
      const allowSelfSigned = body.smtpAllowSelfSigned !== false;

      if (!host || !user || !pass) {
        return NextResponse.json(
          { success: false, error: "SMTP Host, Username, and Password are all required." },
          { status: 400 }
        );
      }

      // If fromEmail is empty or placeholder 'hello@domain.com', use the authenticated user address
      let effectiveFromEmail = (fromEmail || "").trim();
      if (!effectiveFromEmail || effectiveFromEmail.toLowerCase().includes("@domain.com")) {
        effectiveFromEmail = user;
      }

      const senderAddress = `"${fromName}" <${effectiveFromEmail}>`;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 10000,
        tls: {
          rejectUnauthorized: !allowSelfSigned,
        },
      });

      const info = await transporter.sendMail({
        from: senderAddress,
        to: recipient,
        subject: testSubject,
        text: `Delivery Test Successful!\n\nYour SMTP server (${host}:${port}) is working properly.\nSent to: ${recipient}\nTimestamp: ${new Date().toISOString()}`,
        html: testHtml,
      });

      return NextResponse.json({
        success: true,
        messageId: info.messageId,
        message: `Test email successfully sent to ${recipient} via SMTP (${host}:${port})! (Message ID: ${info.messageId})`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid email mode" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send test email";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

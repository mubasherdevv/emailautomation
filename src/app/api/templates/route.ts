import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { CreateTemplateSchema, EmailTemplate } from "@/types";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  resolveTemplateBodies,
  extractTemplateVariables,
} from "@/lib/template-utils";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const normalized = data.map((t: EmailTemplate) => {
          const { htmlBody, textBody } = resolveTemplateBodies(t.html_body, t.text_body);
          if (htmlBody !== t.html_body) {
            t.html_body = htmlBody;
            t.text_body = textBody;
            // Proactively sync in Supabase asynchronously
            supabase
              .from("email_templates")
              .update({ html_body: htmlBody })
              .eq("id", t.id)
              .then(() => {});
          }
          return t;
        });
        return successResponse({ templates: normalized });
      }
    }

    const memNormalized = store.templates.map((t) => {
      const { htmlBody, textBody } = resolveTemplateBodies(t.html_body, t.text_body);
      return {
        ...t,
        html_body: htmlBody,
        text_body: textBody,
      };
    });

    return successResponse({ templates: memNormalized });
  } catch (err) {
    console.error("Templates fetch error:", err);
    return successResponse({ templates: store.templates });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = CreateTemplateSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.format());
    }

    const { name, subject, html_body, text_body } = parsed.data;
    const { htmlBody, textBody } = resolveTemplateBodies(html_body, text_body);
    const variables = extractTemplateVariables(`${name} ${subject} ${htmlBody} ${textBody}`);

    const newTemplate: EmailTemplate = {
      id: crypto.randomUUID(),
      name,
      subject,
      html_body: htmlBody,
      text_body: textBody,
      variables,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      await supabase.from("email_templates").insert([newTemplate]);
    }

    store.templates.unshift(newTemplate);

    return successResponse({ success: true, template: newTemplate }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Creation failed";
    return errorResponse(message, 500);
  }
}


import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { CreateTemplateSchema } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ templates: data });
      }
    }
    return NextResponse.json({ templates: store.templates });
  } catch {
    return NextResponse.json({ templates: store.templates });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = CreateTemplateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, subject, html_body, text_body } = parsed.data;

    // Sanitize script injection
    const sanitizedHtml = html_body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

    const newTemplate = {
      id: crypto.randomUUID(),
      name,
      subject,
      html_body: sanitizedHtml,
      text_body: text_body || "",
      variables: ["firstName", "lastName", "email", "website", "address", "contact"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      await supabase.from("email_templates").insert([newTemplate]);
    }

    store.templates.unshift(newTemplate);

    return NextResponse.json({ success: true, template: newTemplate }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      const { data } = await supabase.from("email_templates").select("*").eq("id", id).single();
      if (data) return NextResponse.json({ template: data });
    }

    const template = store.templates.find((t) => t.id === id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch {
    const template = store.templates.find((t) => t.id === id);
    return NextResponse.json({ template });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const json = await request.json();

    const sanitizedHtml = json.html_body
      ? json.html_body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      : undefined;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (json.name) updates.name = json.name;
    if (json.subject) updates.subject = json.subject;
    if (sanitizedHtml !== undefined) updates.html_body = sanitizedHtml;
    if (json.text_body !== undefined) updates.text_body = json.text_body;

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      await supabase.from("email_templates").update(updates).eq("id", id);
    }

    const memTemplate = store.templates.find((t) => t.id === id);
    if (memTemplate) {
      Object.assign(memTemplate, updates);
    }

    return NextResponse.json({ success: true, template: { id, ...updates } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const index = store.templates.findIndex((t) => t.id === id);
    if (index !== -1) {
      store.templates.splice(index, 1);
    }

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      await supabase.from("email_templates").delete().eq("id", id);
    }

    return NextResponse.json({ success: true, message: "Template removed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Deletion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

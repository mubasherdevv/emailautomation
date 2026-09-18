import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { CreateTemplateSchema } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

const textToHtml = (txt: string) => {
  if (!txt || !txt.trim()) return "";
  return txt
    .split(/\n\n+/)
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br />")}</p>`)
    .join("\n");
};

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
        const normalized = data.map((t) => {
          const textVal = t.text_body ?? "";
          const isHtmlDefault =
            !t.html_body ||
            t.html_body.includes("I was checking {{website}} and noticed key growth opportunities");
          const isTextCustom =
            Boolean(textVal) &&
            !textVal.includes("I was checking {{website}} and noticed key growth opportunities");

          if (isTextCustom && isHtmlDefault) {
            t.html_body = textToHtml(textVal);
            // Proactively sync in Supabase
            supabase
              .from("email_templates")
              .update({ html_body: t.html_body })
              .eq("id", t.id)
              .then(() => {});
          }
          return t;
        });
        return NextResponse.json({ templates: normalized });
      }
    }
    const memNormalized = store.templates.map((t) => {
      const textVal = t.text_body ?? "";
      const isHtmlDefault =
        !t.html_body ||
        t.html_body.includes("I was checking {{website}} and noticed key growth opportunities");
      const isTextCustom =
        Boolean(textVal) &&
        !textVal.includes("I was checking {{website}} and noticed key growth opportunities");

      if (isTextCustom && isHtmlDefault) {
        t.html_body = textToHtml(textVal);
      }
      return t;
    });
    return NextResponse.json({ templates: memNormalized });
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
    const textVal = text_body ?? "";

    // Sanitize script injection
    let sanitizedHtml = html_body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

    const isHtmlDefault =
      !sanitizedHtml ||
      sanitizedHtml.includes("I was checking {{website}} and noticed key growth opportunities");
    const isTextCustom =
      Boolean(textVal) &&
      !textVal.includes("I was checking {{website}} and noticed key growth opportunities");

    if (isTextCustom && isHtmlDefault) {
      sanitizedHtml = textToHtml(textVal);
    }

    const combined = `${name} ${subject} ${sanitizedHtml} ${text_body || ""}`;
    const matches = combined.matchAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g);
    const varSet = new Set(["firstName", "lastName", "email", "company", "website", "address", "contact"]);
    for (const m of matches) {
      if (m[1]) varSet.add(m[1]);
    }

    const newTemplate = {
      id: crypto.randomUUID(),
      name,
      subject,
      html_body: sanitizedHtml,
      text_body: text_body || "",
      variables: Array.from(varSet),
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

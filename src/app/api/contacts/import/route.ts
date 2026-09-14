import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { ImportContactsSchema } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

// Smart field extractor matching varied, custom, or partial headers
function getSmartField(
  row: Record<string, unknown>,
  type: "email" | "personalEmail" | "firstName" | "lastName" | "address" | "contact" | "website"
): string {
  if (!row || typeof row !== "object") return "";
  const entries = Object.entries(row);

  for (const [rawK, rawV] of entries) {
    if (rawV === undefined || rawV === null) continue;
    const val = String(rawV).trim();
    if (!val) continue;
    const k = rawK.toLowerCase().trim();

    if (type === "email") {
      if (k.includes("email") && !k.includes("personal") && !k.includes("alt") && !k.includes("second")) {
        return val;
      }
    } else if (type === "personalEmail") {
      if (k.includes("personal") || k.includes("alt") || (k.includes("email") && (k.includes("2") || k.includes("secondary")))) {
        return val;
      }
    } else if (type === "firstName") {
      if (k.includes("first") || (k.includes("name") && !k.includes("last") && !k.includes("sur") && !k.includes("family"))) {
        return val;
      }
    } else if (type === "lastName") {
      if (k.includes("last") || k.includes("sur") || k.includes("family")) {
        return val;
      }
    } else if (type === "address") {
      if (k.includes("address") || k.includes("location") || k.includes("city") || k.includes("country")) {
        return val;
      }
    } else if (type === "contact") {
      if (k.includes("contact") || k.includes("phone") || k.includes("mobile") || k.includes("cell") || k.includes("tel") || k.includes("whatsapp")) {
        return val;
      }
    } else if (type === "website") {
      if (k.includes("web") || k.includes("site") || k.includes("url") || k.includes("domain") || k.includes("company")) {
        return val;
      }
    }
  }

  // Bulletproof fallback: If looking for email, check if any column's content looks like an email
  if (type === "email") {
    for (const [, rawV] of entries) {
      if (rawV !== undefined && rawV !== null) {
        const val = String(rawV).trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          return val;
        }
      }
    }
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = ImportContactsSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
        },
        { status: 400 }
      );
    }

    const { rows } = parsed.data;

    let importedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    const existingEmails = new Set(store.contacts.map((c) => c.email.toLowerCase()));
    const newContacts = [];

    for (const rawRow of rows) {
      if (!rawRow || typeof rawRow !== "object") {
        invalidCount++;
        continue;
      }

      const row = rawRow as Record<string, unknown>;

      const rawEmail = getSmartField(row, "email");
      const normalizedEmail = rawEmail.trim().toLowerCase();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        invalidCount++;
        continue;
      }

      if (existingEmails.has(normalizedEmail)) {
        duplicateCount++;
        continue;
      }

      existingEmails.add(normalizedEmail);

      const firstName = getSmartField(row, "firstName");
      const lastName = getSmartField(row, "lastName");
      const personalEmail = getSmartField(row, "personalEmail");
      const address = getSmartField(row, "address");
      const contactPhone = getSmartField(row, "contact");
      const website = getSmartField(row, "website");

      const contact = {
        id: crypto.randomUUID(),
        first_name: firstName || null,
        last_name: lastName || null,
        email: normalizedEmail,
        personal_email: personalEmail ? personalEmail.toLowerCase() : null,
        address: address || null,
        contact: contactPhone || null,
        website: website || null,
        status: "pending" as const,
        last_sent_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newContacts.push(contact);
      store.contacts.unshift(contact);
      importedCount++;
    }

    // Try batch insertion to Supabase with admin privileges
    if (
      newContacts.length > 0 &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      try {
        const supabase = createAdminClient();
        const { error: upsertErr } = await supabase.from("contacts").upsert(newContacts, { onConflict: "email" });
        if (upsertErr) {
          console.error("Supabase upsert error:", upsertErr);
        }
      } catch (e) {
        console.error("Supabase import error (fallback to local)", e);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRowsReceived: rows.length,
        imported: importedCount,
        duplicatesSkipped: duplicateCount,
        invalidEmails: invalidCount,
      },
      message: `Imported ${importedCount} contacts successfully (${duplicateCount} duplicates skipped, ${invalidCount} invalid rows ignored).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

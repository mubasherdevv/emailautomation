import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { Contact } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leads } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "No leads provided to import" }, { status: 400 });
    }

    const newContacts: Contact[] = [];
    const seenEmails = new Set(store.contacts.map((c) => c.email.toLowerCase()));

    for (const lead of leads) {
      const rawEmail = lead.email ? String(lead.email).trim().toLowerCase() : "";
      if (!rawEmail || !rawEmail.includes("@")) {
        // Skip leads with no valid email address
        continue;
      }

      if (seenEmails.has(rawEmail)) {
        continue;
      }
      seenEmails.add(rawEmail);

      // Extract sensible first name / business title
      const nameParts = (lead.name || "Business").trim().split(" ");
      const firstName = nameParts[0] || "Business";
      const lastName = nameParts.slice(1).join(" ") || "";

      const contactRecord: Contact = {
        id: crypto.randomUUID(),
        first_name: firstName,
        last_name: lastName,
        email: rawEmail,
        personal_email: null,
        company: lead.name || null,
        website: lead.website || null,
        address: lead.address || lead.city || null,
        contact: lead.phone || null,
        status: "pending",
        last_sent_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newContacts.push(contactRecord);
    }

    if (newContacts.length === 0) {
      return NextResponse.json({
        success: true,
        importedCount: 0,
        message: "No new contacts to import (all leads were already in contacts or had no email)",
      });
    }

    // Insert into memory store
    store.contacts.unshift(...newContacts);

    // Sync to Supabase if connected
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      try {
        const supabase = createAdminClient();
        await supabase.from("contacts").upsert(newContacts, { onConflict: "email" });
      } catch (e) {
        console.error("Supabase bulk import error for lead-finder", e);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: newContacts.length,
      contactIds: newContacts.map((c) => c.id),
      message: `Successfully imported ${newContacts.length} leads into Contacts Directory`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

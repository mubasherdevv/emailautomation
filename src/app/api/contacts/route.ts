import { store } from "@/lib/store";
import { Contact } from "@/types";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase().trim() || "";
  const status = searchParams.get("status") || "all";

  try {
    let supabaseContacts: Contact[] = [];
    if (isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        let query = supabase.from("contacts").select("*").order("created_at", { ascending: false });

        if (status !== "all") {
          query = query.eq("status", status);
        }
        if (search) {
          query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,website.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          supabaseContacts = data as Contact[];
        }
      } catch (e) {
        console.error("Supabase contacts fetch error (using fallback):", e);
      }
    }

    // Merge Supabase and in-memory store contacts to guarantee zero data loss
    const emailMap = new Map<string, Contact>();
    for (const c of store.contacts) {
      if (c.email) emailMap.set(c.email.toLowerCase(), c);
    }
    for (const c of supabaseContacts) {
      if (c.email) emailMap.set(c.email.toLowerCase(), c);
    }

    let allContacts = Array.from(emailMap.values());
    if (status !== "all") {
      allContacts = allContacts.filter((c) => c.status === status);
    }
    if (search) {
      allContacts = allContacts.filter(
        (c) =>
          (c.email && c.email.toLowerCase().includes(search)) ||
          (c.first_name && c.first_name.toLowerCase().includes(search)) ||
          (c.last_name && c.last_name.toLowerCase().includes(search)) ||
          (c.website && c.website.toLowerCase().includes(search))
      );
    }

    return successResponse({ contacts: allContacts });
  } catch (err) {
    console.error("Contacts route GET error:", err);
    return successResponse({ contacts: store.contacts });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const rawEmail = json.email ? String(json.email).trim().toLowerCase() : "";

    if (!rawEmail || !rawEmail.includes("@")) {
      return errorResponse("Valid email is required", 400);
    }

    // Duplicate prevention
    const existing = store.contacts.find((c) => c.email?.toLowerCase() === rawEmail);
    if (existing) {
      return errorResponse("Contact already exists with this email", 409);
    }

    const newContact: Contact = {
      id: crypto.randomUUID(),
      first_name: json.first_name || null,
      last_name: json.last_name || null,
      email: rawEmail,
      personal_email: json.personal_email ? String(json.personal_email).trim().toLowerCase() : null,
      address: json.address || null,
      contact: json.contact || null,
      website: json.website || null,
      status: "pending",
      last_sent_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        await supabase.from("contacts").upsert([newContact], { onConflict: "email" });
      } catch (e) {
        console.error("Supabase direct insert error:", e);
      }
    }

    store.contacts.unshift(newContact);
    return successResponse({ contact: newContact }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Creation failed";
    return errorResponse(message, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const json = await request.json();
    const ids: string[] = json.ids || (json.id ? [json.id] : []);

    if (!ids || ids.length === 0) {
      return errorResponse("No contact IDs provided for deletion", 400);
    }

    const idSet = new Set(ids);

    if (isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        const { error } = await supabase.from("contacts").delete().in("id", ids);
        if (error) {
          console.error("Supabase contacts delete error:", error);
        }
      } catch (e) {
        console.error("Supabase delete execution error:", e);
      }
    }

    // Delete from in-memory store
    store.contacts = store.contacts.filter((c) => !idSet.has(c.id));

    return successResponse({
      success: true,
      deletedCount: ids.length,
      message: `Deleted ${ids.length} contact(s) successfully.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Deletion failed";
    return errorResponse(message, 500);
  }
}


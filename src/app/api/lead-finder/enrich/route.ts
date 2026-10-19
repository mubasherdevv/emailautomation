import { NextResponse } from "next/server";

// Scrapes a single website to extract emails, phone numbers, and social links
async function scrapeSiteContacts(url: string): Promise<{
  email?: string;
  phone?: string;
  socials: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}> {
  const result: {
    email?: string;
    phone?: string;
    socials: {
      linkedin?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  } = {
    socials: {},
  };

  if (!url || !url.startsWith("http")) return result;

  const pagesToTry = [url, `${url.replace(/\/+$/, "")}/contact`, `${url.replace(/\/+$/, "")}/about`];

  for (const pageUrl of pagesToTry) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) continue;
      const html = await res.text();

      // 1. Mailto links (Highest fidelity)
      const mailtoMatches = Array.from(html.matchAll(/mailto:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi));
      if (mailtoMatches.length > 0) {
        const found = mailtoMatches[0][1].toLowerCase().trim();
        if (!found.includes("wixpress") && !found.includes("sentry") && !found.includes("example.com")) {
          result.email = found;
        }
      }

      // 2. Body Text Emails if mailto wasn't found
      if (!result.email) {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
        const matches = html.match(emailRegex);
        if (matches) {
          const filtered = matches.filter(
            (e) =>
              !e.endsWith(".png") &&
              !e.endsWith(".jpg") &&
              !e.endsWith(".jpeg") &&
              !e.endsWith(".svg") &&
              !e.endsWith(".webp") &&
              !e.endsWith(".js") &&
              !e.includes("wix") &&
              !e.includes("sentry") &&
              !e.includes("polyfill") &&
              !e.includes("example.com")
          );
          if (filtered.length > 0) {
            result.email = filtered[0].toLowerCase().trim();
          }
        }
      }

      // 3. Phone number
      const telMatch = html.match(/tel:\s*([+0-9\s().-]{7,20})/i);
      if (telMatch && !result.phone) {
        result.phone = telMatch[1].trim();
      }

      // 4. Social links
      const linkedinMatch = html.match(/https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9_-]+/i);
      if (linkedinMatch && !result.socials.linkedin) {
        result.socials.linkedin = linkedinMatch[0];
      }

      const fbMatch = html.match(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._-]+/i);
      if (fbMatch && !result.socials.facebook && !fbMatch[0].includes("sharer")) {
        result.socials.facebook = fbMatch[0];
      }

      const instaMatch = html.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+/i);
      if (instaMatch && !result.socials.instagram) {
        result.socials.instagram = instaMatch[0];
      }

      // If we found email, stop checking further pages
      if (result.email) break;
    } catch {
      // Continue to next page
    }
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { website, websites } = body;

    const list: string[] = websites || (website ? [website] : []);
    if (list.length === 0) {
      return NextResponse.json({ error: "Website URL(s) required" }, { status: 400 });
    }

    // Limit batch size to 10 for parallel scraping
    const targetWebsites = list.slice(0, 10);
    const enrichedResults = await Promise.all(
      targetWebsites.map(async (url) => {
        const data = await scrapeSiteContacts(url);
        return { website: url, ...data };
      })
    );

    return NextResponse.json({
      success: true,
      enriched: enrichedResults,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Enrichment failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

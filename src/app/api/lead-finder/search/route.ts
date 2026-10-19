import { NextResponse } from "next/server";

export interface DiscoveredLead {
  id: string;
  name: string;
  category?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  rating?: number;
  reviewsCount?: number;
  source: "apify" | "web";
  socials?: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

// Helper to sanitize website url
function cleanUrl(url?: string): string {
  if (!url) return "";
  let u = url.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = "https://" + u;
  }
  try {
    const parsed = new URL(u);
    return parsed.origin;
  } catch {
    return u;
  }
}

// Fallback high-speed web crawler for B2B search
async function searchWebDirect(query: string, location: string, limit: number): Promise<DiscoveredLead[]> {
  const searchTerm = encodeURIComponent(`${query} ${location}`);
  const leads: DiscoveredLead[] = [];

  try {
    // Query public HTML search (DuckDuckGo Lite)
    const res = await fetch(`https://lite.duckduckgo.com/lite/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: `q=${searchTerm}`,
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const html = await res.text();
      // Parse results table
      const linkRegex = /<a[^>]+class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/gi;
      const snippetRegex = /<td[^>]+class=['"]result-snippet['"][^>]*>(.*?)<\/td>/gi;

      const links: Array<{ url: string; title: string }> = [];
      let m;
      while ((m = linkRegex.exec(html)) !== null && links.length < limit * 2) {
        const rawUrl = m[1];
        const rawTitle = m[2].replace(/<[^>]+>/g, "").trim();
        // DuckDuckGo redirects through /l/?uddg=...
        let targetUrl = rawUrl;
        if (rawUrl.includes("uddg=")) {
          const match = rawUrl.match(/uddg=([^&]+)/);
          if (match) targetUrl = decodeURIComponent(match[1]);
        }
        if (
          targetUrl &&
          !targetUrl.includes("duckduckgo.com") &&
          !targetUrl.includes("wikipedia.org") &&
          !targetUrl.includes("facebook.com") &&
          !targetUrl.includes("yelp.com") &&
          !targetUrl.includes("tripadvisor.com")
        ) {
          links.push({ url: targetUrl, title: rawTitle });
        }
      }

      const snippets: string[] = [];
      let sm;
      while ((sm = snippetRegex.exec(html)) !== null) {
        snippets.push(sm[1].replace(/<[^>]+>/g, "").trim());
      }

      for (let i = 0; i < Math.min(links.length, limit); i++) {
        const item = links[i];
        const snippet = snippets[i] || "";

        // Attempt to extract emails from title or snippet
        const emailMatch = (item.title + " " + snippet).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        // Phone match
        const phoneMatch = (item.title + " " + snippet).match(/(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);

        leads.push({
          id: crypto.randomUUID(),
          name: item.title.split(/[-|:]/)[0].trim() || item.title,
          category: query,
          website: cleanUrl(item.url),
          email: emailMatch ? emailMatch[0].toLowerCase() : undefined,
          phone: phoneMatch ? phoneMatch[0].trim() : undefined,
          address: location,
          city: location,
          source: "web",
        });
      }
    }
  } catch (e) {
    console.error("Direct web lead search fallback failed", e);
  }

  return leads;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, location, limit = 20, apifyToken, actorId = "compass~crawler-google-places" } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Search query / niche is required" }, { status: 400 });
    }

    const resolvedLocation = (location || "").trim();
    const requestedLimit = Math.min(Math.max(Number(limit) || 20, 5), 100);
    const resolvedToken = apifyToken || process.env.APIFY_API_TOKEN;

    // 1. If Apify Token is provided, trigger Apify Actor
    if (resolvedToken && resolvedToken.trim()) {
      try {
        const fullSearchString = resolvedLocation ? `${query} in ${resolvedLocation}` : query;
        const normalizedActorId = actorId.replace("/", "~");

        // Use Apify synchronous run-and-get-dataset endpoint
        const apifyUrl = `https://api.apify.com/v2/acts/${normalizedActorId}/run-sync-get-dataset-items?token=${resolvedToken.trim()}`;

        const payload: Record<string, unknown> = {
          searchStringsArray: [fullSearchString],
          maxCrawledPlacesPerSearch: requestedLimit,
          language: "en",
          skipClosedPlaces: true,
        };

        const apifyRes = await fetch(apifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(50000), // 50s timeout
        });

        if (apifyRes.ok) {
          const items = await apifyRes.json();
          if (Array.isArray(items) && items.length > 0) {
            const leads: DiscoveredLead[] = items.map((item: any) => {
              // Extract emails from various possible Apify Google Places fields
              let email = item.email || item.contactEmail || "";
              if (!email && Array.isArray(item.emails) && item.emails.length > 0) {
                email = item.emails[0];
              }

              return {
                id: crypto.randomUUID(),
                name: item.title || item.name || "Business Lead",
                category: item.categoryName || query,
                email: email ? String(email).trim().toLowerCase() : undefined,
                phone: item.phone || item.phoneUnformatted || undefined,
                website: cleanUrl(item.website || item.url),
                address: item.address || resolvedLocation,
                city: item.city || resolvedLocation,
                rating: item.totalScore || item.rating || undefined,
                reviewsCount: item.reviewsCount || undefined,
                source: "apify",
                socials: {
                  linkedin: item.linkedin,
                  facebook: item.facebook,
                  instagram: item.instagram,
                  twitter: item.twitter,
                },
              };
            });

            return NextResponse.json({
              success: true,
              source: "apify",
              count: leads.length,
              leads,
            });
          }
        } else {
          const errText = await apifyRes.text();
          console.warn("Apify response not OK, falling back to direct web scraper:", errText);
        }
      } catch (apifyErr) {
        console.error("Apify actor run failed or timed out, using fallback:", apifyErr);
      }
    }

    // 2. Direct Web & Directory Scraper Fallback
    const fallbackLeads = await searchWebDirect(query, resolvedLocation, requestedLimit);

    return NextResponse.json({
      success: true,
      source: "web",
      count: fallbackLeads.length,
      leads: fallbackLeads,
      note: !resolvedToken
        ? "Showing instant web discovery results. Add an Apify API Token to unlock high-volume Google Places & Maps scraping."
        : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

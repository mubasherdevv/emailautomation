import { NextResponse } from "next/server";

// Helper to extract Sheet ID from URL or return raw ID
function extractSheetId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return trimmed;
}

// Simple robust CSV line parser handling quotes
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawInput = body.sheetUrlOrId || body.sheetId || "";
    const tabName = body.sheetName || "Sheet1";

    if (!rawInput) {
      return NextResponse.json(
        { success: false, error: "Please enter a Google Sheet URL or Sheet ID" },
        { status: 400 }
      );
    }

    const sheetId = extractSheetId(rawInput);
    if (!sheetId || sheetId.length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid Google Sheet URL or ID format" },
        { status: 400 }
      );
    }

    // Attempt to fetch via Google Visualization CSV export endpoint with cache buster
    const cacheBuster = Date.now();
    const testUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}&tq=&_nocache=${cacheBuster}`;

    let headers: string[] = [];
    let allRows: Record<string, string>[] = [];
    let totalRowsCount = 0;
    let isLiveFetched = false;

    try {
      const res = await fetch(testUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/csv,text/plain,*/*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
      });

      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();

      // Check if Google returned HTML (meaning authentication required / login page)
      const isHtmlResponse =
        contentType.includes("text/html") ||
        text.trim().startsWith("<!DOCTYPE") ||
        text.includes("<html") ||
        text.includes("accounts.google.com");

      if (res.ok && !isHtmlResponse) {
        const rawLines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (rawLines.length > 0) {
          headers = parseCsvLine(rawLines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
          const dataLines = rawLines.slice(1);
          totalRowsCount = dataLines.length;

          // Parse ALL rows so newly added rows are fully included
          allRows = dataLines.map((line) => {
            const values = parseCsvLine(line).map((v) => v.replace(/^"|"$/g, "").trim());
            const rowObj: Record<string, string> = {};
            headers.forEach((h, idx) => {
              rowObj[h] = values[idx] || "";
            });
            return rowObj;
          });

          isLiveFetched = true;
        }
      } else if (res.status === 404) {
        return NextResponse.json(
          {
            success: false,
            sheetId,
            error: `Spreadsheet found, but tab "${tabName}" does not exist. Check your tab name in Google Sheets.`,
          },
          { status: 404 }
        );
      } else {
        isLiveFetched = false;
      }
    } catch {
      isLiveFetched = false;
    }

    if (isLiveFetched && headers.length > 0) {
      return NextResponse.json({
        success: true,
        isLiveFetched: true,
        sheetId,
        tabName,
        accessMode: "Live Direct Google CSV Feed",
        totalRowsCount,
        detectedHeaders: headers,
        sampleRows: allRows.slice(0, 15),
        allRows,
        message: `Successfully connected to Google Sheet! Fetched ${totalRowsCount} live rows across ${headers.length} columns.`,
      });
    }

    // If we reach here, sheet is private / not shared
    return NextResponse.json({
      success: true,
      isLiveFetched: false,
      sheetId,
      tabName,
      accessMode: "Restricted (Google Sign-In Required)",
      totalRowsCount: 0,
      detectedHeaders: [],
      sampleRows: [],
      allRows: [],
      requiresShare: true,
      message:
        "Sheet ID is valid, but the sheet is currently Restricted/Private. Google requires sign-in to view it. To test fetching live data right now in this dashboard: open your Google Sheet, click 'Share' (top right), and set General access to 'Anyone with the link can view'. (In n8n, private sheets are read using your Google Service Account OAuth).",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify Google Sheet";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

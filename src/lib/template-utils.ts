const DEFAULT_TEMPLATE_SNIPPET = "I was checking {{website}} and noticed key growth opportunities";

export const DEFAULT_TEMPLATE_VARS = [
  "firstName",
  "lastName",
  "email",
  "company",
  "website",
  "address",
  "contact",
] as const;

/**
 * Converts double-spaced plain text into clean semantic paragraph HTML.
 */
export function textToHtml(txt: string): string {
  if (!txt || !txt.trim()) return "";
  return txt
    .trim()
    .split(/\n\n+/)
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

/**
 * Checks whether an HTML or text body is using the boilerplate fallback template.
 */
export function isDefaultTemplateBody(body?: string | null): boolean {
  if (!body) return true;
  return body.includes(DEFAULT_TEMPLATE_SNIPPET);
}

/**
 * Strips dangerous inline `<script>` tags from email templates.
 */
export function sanitizeTemplateHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

/**
 * Extracts all unique `{{variable}}` merge tags from text or HTML content.
 */
export function extractTemplateVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g);
  const varSet = new Set<string>(DEFAULT_TEMPLATE_VARS);
  for (const m of matches) {
    if (m[1]) varSet.add(m[1]);
  }
  return Array.from(varSet);
}

/**
 * Syncs text_body to html_body when custom text is provided without custom HTML.
 */
export function resolveTemplateBodies(
  rawHtml?: string | null,
  rawText?: string | null
): { htmlBody: string; textBody: string } {
  const textVal = rawText ?? "";
  let htmlVal = sanitizeTemplateHtml(rawHtml ?? "");

  const hasDefaultHtml = isDefaultTemplateBody(htmlVal);
  const hasCustomText = Boolean(textVal.trim()) && !isDefaultTemplateBody(textVal);

  if (hasCustomText && hasDefaultHtml) {
    htmlVal = textToHtml(textVal);
  }

  return {
    htmlBody: htmlVal,
    textBody: textVal,
  };
}

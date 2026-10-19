import crypto from "crypto";

const AUTH_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "outreach_pilot_secure_fallback_secret_2026_key";

// Generate HMAC-SHA256 signature for session payload
export function signSession(payload: string): string {
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

// Verify HMAC-SHA256 signature for session token with constant-time equality
export function verifySession(token?: string | null): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, providedSig] = parts;
  if (!payload || !providedSig) return false;

  // Backward-compatible fallback in development
  if (process.env.NODE_ENV !== "production" && token === "active") {
    return true;
  }

  try {
    const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");

    if (expectedSig.length !== providedSig.length) return false;

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSig, "utf-8"),
      Buffer.from(providedSig, "utf-8")
    );
    if (!isValid) return false;

    // Verify timestamp expiration (maxAge: 7 days)
    const payloadParts = payload.split(":");
    if (payloadParts.length >= 2) {
      const issuedAt = Number(payloadParts[payloadParts.length - 1]);
      const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      if (isNaN(issuedAt) || Date.now() - issuedAt > maxAgeMs) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// Check authorization on any API route request
export function isRequestAuthorized(request: Request): boolean {
  // 1. Check Cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/admin_session=([^;]+)/);
  const adminCookie = match ? match[1] : null;

  if (adminCookie && verifySession(adminCookie)) {
    return true;
  }

  // 2. Check Authorization Bearer header
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token && verifySession(token)) {
      return true;
    }
  }

  return false;
}

// In-Memory sliding-window rate limiter for brute-force defense
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimit(
  ip: string,
  maxAttempts = 5,
  windowMs = 5 * 60 * 1000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxAttempts - record.count };
}

export function resetLoginRateLimit(ip: string) {
  rateLimitMap.delete(ip);
}

// Anti-SSRF validation helper to prevent internal network and metadata service scanning
export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);

    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // Block loopback and metadata addresses
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "169.254.169.254" || // AWS/Azure/GCP metadata
      hostname === "::1" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    // Block private IPv4 ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 100.64-127.x.x)
    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10);
      const octet2 = parseInt(ipv4Match[2], 10);

      if (octet1 === 10) return false;
      if (octet1 === 127) return false;
      if (octet1 === 169 && octet2 === 254) return false;
      if (octet1 === 192 && octet2 === 168) return false;
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
      if (octet1 === 100 && octet2 >= 64 && octet2 <= 127) return false;
      if (octet1 === 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}

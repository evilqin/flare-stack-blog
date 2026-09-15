import { CACHE_CONTROL } from "@/lib/constants";

/**
 * Scanner shield.
 *
 * The v1 Hono layer had a middleware that rejected obvious vulnerability-scanner
 * traffic before it reached the app. v2 deleted that layer, so the same idea
 * lives here and runs in the Worker entrypoint ahead of the router.
 *
 * This is a noise filter, not a security boundary: it only recognises paths that
 * no legitimate route of this site can ever produce (`/wp-login`, `.env`, …).
 * Anything else falls through to the router, which renders the custom 404.
 */
const SUSPICIOUS_PATTERNS = [
  "/wp-",
  "/wordpress",
  "/xmlrpc",
  "/wp-login",
  ".php",
  ".env",
  "/.git",
  "/.aws",
  "/vendor/",
  "/node_modules/",
  "/cgi-bin/",
  "/shell",
  "/backup",
  "/administrator",
  "/eval",
  "/cmd",
  "/exec",
  "/muieblackcat", // common scanner signature
  "/config.json",
  "/db_backup",
  "..%2f",
  "../",
  "//",
];

/** True when the request path matches a known scanner probe. */
export function isSuspiciousRequest(request: Request): boolean {
  let pathname: string;
  try {
    pathname = new URL(request.url).pathname.toLowerCase();
  } catch {
    return false;
  }
  return SUSPICIOUS_PATTERNS.some((pattern) => pathname.includes(pattern));
}

export function scannerNotFoundResponse(): Response {
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    ...CACHE_CONTROL.notFound,
  });
  return new Response("Not Found", { status: 404, headers });
}

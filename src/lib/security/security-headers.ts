/**
 * Baseline security headers for every Worker response.
 *
 * Applied centrally in the Worker entrypoint so HTML, feeds, API and error
 * responses all carry them. CSP is intentionally absent: the app relies on
 * inline hydration scripts and inline theme styles, so a correct policy needs
 * a dedicated report-only pass before it can be enforced.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  // No includeSubDomains: sub-domains (e.g. ai.700214.xyz) are managed
  // separately and this header must not lock them in.
  "Strict-Transport-Security": "max-age=31536000",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
};

export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

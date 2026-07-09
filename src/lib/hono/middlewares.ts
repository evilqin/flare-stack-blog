import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { getAuth } from "@/lib/auth/auth.server";
import { CACHE_CONTROL } from "@/lib/constants";
import { getDb } from "@/lib/db";
import type { Duration } from "@/lib/duration";
import { serverEnv } from "@/lib/env/server.env";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isPathValid } from "./path-manifest.generated";

declare module "hono" {
  interface ContextVariableMap {
    db: ReturnType<typeof getDb>;
    auth: ReturnType<typeof getAuth>;
  }
}

export const baseMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const db = getDb(c.env);
    const auth = getAuth({ db, env: c.env });
    c.set("db", db);
    c.set("auth", auth);
    return next();
  },
);

const tryCacheResponse = (c: Context, cache: Cache) => {
  let strategy:
    | typeof CACHE_CONTROL.notFound
    | typeof CACHE_CONTROL.serverError
    | typeof CACHE_CONTROL.forbidden
    | null = null;
  if (c.res.status === 404) {
    strategy = CACHE_CONTROL.notFound;
  } else if (c.res.status >= 500) {
    strategy = CACHE_CONTROL.serverError;
  }
  if (strategy) {
    Object.entries(strategy).forEach(([k, v]) => {
      c.res.headers.set(k, v);
    });
  }

  const resCacheControl = c.res.headers.get("Cache-Control");
  const hasSetCookie = c.res.headers.has("Set-Cookie");
  const contentType = c.res.headers.get("Content-Type") ?? "";

  const isStatusCacheable =
    c.res.status === 200 || c.res.status === 404 || c.res.status >= 500;

  // Don't cache HTML pages in Workers Cache API — they contain
  // versioned asset URLs (CSS/JS hashes) that change between deployments.
  // Caching them would serve stale HTML referencing old assets → broken page styles.
  const isHtmlPage = contentType.startsWith("text/html");

  const isCacheable =
    isStatusCacheable &&
    !hasSetCookie &&
    !isHtmlPage &&
    resCacheControl &&
    !resCacheControl.includes("no-store") &&
    !resCacheControl.includes("no-cache") &&
    !resCacheControl.includes("private");

  if (!isCacheable) return;

  const responseToCache = c.res.clone();
  c.executionCtx.waitUntil(
    cache.put(c.req.raw, responseToCache).catch(() => {}),
  );
};

export const cacheMiddleware = createMiddleware(async (c, next) => {
  if (c.req.method !== "GET") {
    return next();
  }

  const path = c.req.path;

  // 排除需要 session 的 API（如 /api/auth, /api/send）
  // 但包含 public API（/api/posts, /api/post, /api/tags, /api/search）
  const EXCLUDED_PREFIXES = ["/api/auth", "/api/send"];
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return next();
  }

  // Only cache known asset/API paths in Workers Cache API.
  // HTML pages contain versioned asset URLs (CSS/JS hashes) that change between
  // deployments. Caching them would serve stale HTML → broken page styles.
  // The CDN edge cache (with s-maxage + purge on deploy) handles page caching instead.
  const CACHEABLE_PATHS = [
    "/assets/",
    "/api/",
    "/images/",
    "/favicon",
    "/stats.js",
    "/robots.txt",
    "/site.webmanifest",
    "/atom.xml",
    "/feed.json",
    "/rss.xml",
    "/sitemap.xml",
  ];
  const isCacheablePath = CACHEABLE_PATHS.some((prefix) =>
    path.startsWith(prefix),
  );
  if (!isCacheablePath) {
    return next();
  }

  // 缓存响应逻辑
  const cache = (caches as unknown as { default: Cache }).default;

  const cachedResponse = await cache.match(c.req.raw);
  if (cachedResponse) return cachedResponse;

  await next();

  tryCacheResponse(c, cache);
});

const SHIELD_ALLOWED_PATHS = new Set([
  "/atom.xml",
  "/feed.json",
  "/robots.txt",
  "/rss.xml",
  "/site.webmanifest",
  "/sitemap.xml",
]);

interface RateLimitOptions {
  capacity: number;
  interval: Duration;
  identifier: string | ((c: Context) => string | undefined);
}

export const rateLimitMiddleware = (options: RateLimitOptions) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const identifier =
      typeof options.identifier === "function"
        ? options.identifier(c)
        : options.identifier;
    const id = c.env.RATE_LIMITER.idFromName(identifier ?? "unknown");
    const rateLimiter = c.env.RATE_LIMITER.get(id);

    const result = await rateLimiter.checkLimit({
      capacity: options.capacity,
      interval: options.interval,
    });

    if (!result.allowed) {
      c.res.headers.set("Retry-After", result.retryAfterMs.toString());
      return c.json(
        {
          code: "RATE_LIMITED",
          message: "Too Many Requests",
          retryAfterMs: result.retryAfterMs,
        },
        429,
      );
    }

    return next();
  });

export const shieldMiddleware = createMiddleware(async (c, next) => {
  if (serverEnv(c.env).ENVIRONMENT === "dev") return next();

  const path = c.req.path;

  if (
    // 静态资源
    path.startsWith("/assets/") ||
    path.startsWith("/favicon") ||
    SHIELD_ALLOWED_PATHS.has(path) ||
    path.startsWith("/apple-touch-icon") ||
    path.startsWith("/web-app-manifest") ||
    // Server Function
    path.startsWith("/_serverFn/")
  ) {
    return next();
  }

  if (isPathValid(path)) {
    return next();
  }

  // 明显恶意的路径模式 — 即使 GET 请求也直接拦截
  const SUSPICIOUS_PATTERNS = [
    "/wp-",
    "/wordpress",
    "/xmlrpc",
    "/wp-login",
    ".php",
    ".env",
    "/.git",
    "/vendor/",
    "/node_modules/",
    "/cgi-bin/",
    "/shell",
    "/backup",
    "/administrator",
    "/eval",
    "/cmd",
    "/exec",
    "/muieblackcat", // 常见扫描器特征
    "/config.json",
    "/db_backup",
    "..%2f",
    "../",
    "//",
  ];
  const lowerPath = path.toLowerCase();
  const isSuspicious = SUSPICIOUS_PATTERNS.some((p) => lowerPath.includes(p));

  if (isSuspicious) {
    const response = c.text("Not Found", 404);
    Object.entries(CACHE_CONTROL.notFound).forEach(([k, v]) => {
      response.headers.set(k, v);
    });
    return response;
  }

  // GET/HEAD 请求放行到 TanStack Start，让其渲染自定义 404 页面
  if (c.req.method === "GET" || c.req.method === "HEAD") {
    return next();
  }
  const response = c.text("Not Found", 404);
  // 只缓存 Shield 拦截的 404，保护正常 404
  Object.entries(CACHE_CONTROL.notFound).forEach(([k, v]) => {
    response.headers.set(k, v);
  });
  return response;
});

/* ======================= Turnstile ====================== */
export const turnstileMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const secretKey = serverEnv(c.env).TURNSTILE_SECRET_KEY;
    if (!secretKey) return next(); // 未配置则跳过验证

    const token = c.req.header("X-Turnstile-Token");
    if (!token) {
      return c.json(
        {
          code: "TURNSTILE_MISSING_TOKEN",
          message: "Missing Turnstile token",
        },
        400,
      );
    }

    const result = await verifyTurnstileToken({ secretKey, token });

    if (!result.success) {
      return c.json(
        {
          code: "TURNSTILE_VERIFICATION_FAILED",
          message: "Turnstile verification failed",
        },
        403,
      );
    }

    return next();
  },
);

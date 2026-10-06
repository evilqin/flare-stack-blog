// Cloudflare Workers 入口。
// 把 Fetch API 的 Request 适配成 lib/handler.js 期望的 Node 风格 req/res，
// 与 Vercel（api/*.js）和本地（server.js）共用同一份路由逻辑。
import { createHandler } from "./lib/handler";
import ASCII from "./ascii.txt";
import INDEX_HTML from "./index.html";
import ROBOTS_TXT from "./robots.txt";
import SITEMAP_XML from "./sitemap.xml";

let handler;

function getHandler(env) {
  if (!handler) {
    handler = createHandler({
      assets: {
        ascii: ASCII,
        indexHtml: INDEX_HTML,
        robotsTxt: ROBOTS_TXT,
        sitemapXml: SITEMAP_XML,
      },
      // FAKE_API_KEY 走 Workers 的 vars/secrets（wrangler secret put FAKE_API_KEY）
      env: { FAKE_API_KEY: env && env.FAKE_API_KEY },
      randomValues: (n) => crypto.getRandomValues(new Uint8Array(n)),
    });
  }
  return handler;
}

/* ============================ 登录会话 ============================ */

// 会话是 HMAC 签名的 cookie，服务端不存任何东西。
const COOKIE = "fkapi_session";
const STATE_COOKIE = "fkapi_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

function base64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/** `payload.signature`, both base64url. */
async function seal(value, secret) {
  const payload = base64url(encoder.encode(JSON.stringify(value)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(sig))}`;
}

async function unseal(token, secret) {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const key = await hmacKey(secret);
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  );
  const given = fromBase64url(token.slice(dot + 1));
  if (given.length !== expected.length) return null;
  // Constant-time compare.
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected[i] ^ given[i];
  if (diff !== 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
  } catch (err) {
    return null;
  }
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function cookie(name, value, maxAge) {
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    maxAge === 0 ? "Max-Age=0" : `Max-Age=${maxAge}`,
  ].join("; ");
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function oauthConfig(env) {
  const clientId = env && env.GITHUB_CLIENT_ID;
  const clientSecret = env && env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, sessionSecret: clientSecret };
}

/**
 * Handles the login routes. Returns null for anything else so the caller can
 * fall through to the api handler.
 */
async function handleAuth(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/auth/")) return null;

  const config = oauthConfig(env);

  if (path === "/api/auth/session") {
    if (!config) return json({ configured: false });
    const raw = readCookie(request, COOKIE);
    const session = raw ? await unseal(raw, config.sessionSecret) : null;
    if (!session || session.exp < Date.now()) return json({ configured: true, user: null });
    return json({ configured: true, user: session.user });
  }

  if (path === "/api/auth/logout") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/", "Set-Cookie": cookie(COOKIE, "", 0) },
    });
  }

  if (!config) {
    return json({ error: "oauth_not_configured" }, 501);
  }

  if (path === "/api/auth/github") {
    const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", config.clientId);
    authorize.searchParams.set("redirect_uri", `${url.origin}/api/auth/github/callback`);
    authorize.searchParams.set("scope", "read:user");
    authorize.searchParams.set("state", state);
    const signed = await seal({ state }, config.sessionSecret);
    return new Response(null, {
      status: 302,
      headers: {
        Location: authorize.toString(),
        "Set-Cookie": cookie(STATE_COOKIE, signed, 600),
      },
    });
  }

  if (path === "/api/auth/github/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const rawState = readCookie(request, STATE_COOKIE);
    const saved = rawState ? await unseal(rawState, config.sessionSecret) : null;
    if (!code || !state || !saved || saved.state !== state) {
      return json({ error: "invalid_state" }, 400);
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: `${url.origin}/api/auth/github/callback`,
      }),
    });
    const tokenBody = await tokenRes.json();
    if (!tokenBody.access_token) return json({ error: "token_exchange_failed" }, 502);

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenBody.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "fkapi",
      },
    });
    if (!userRes.ok) return json({ error: "profile_fetch_failed" }, 502);
    const profile = await userRes.json();

    const session = await seal(
      {
        exp: Date.now() + SESSION_MAX_AGE * 1000,
        user: {
          id: profile.id,
          name: profile.name || profile.login,
          avatar: profile.avatar_url || "",
        },
      },
      config.sessionSecret
    );

    const headers = new Headers({ Location: "/" });
    headers.append("Set-Cookie", cookie(COOKIE, session, SESSION_MAX_AGE));
    headers.append("Set-Cookie", cookie(STATE_COOKIE, "", 0));
    return new Response(null, { status: 302, headers });
  }

  return json({ error: "not_found" }, 404);
}

/* ====================== Node 风格适配（原有） ====================== */

// Node http.IncomingMessage 的最小替身：handler 只用 method/url/headers/on/destroy
function makeReq(request) {
  const url = new URL(request.url);
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const listeners = {};
  const req = {
    method: request.method,
    url: url.pathname + url.search,
    headers,
    on(event, cb) {
      (listeners[event] = listeners[event] || []).push(cb);
      return req;
    },
    destroy() {},
  };
  // readBody 通过 data/end 事件收包体：整个 body 一次性读出来再触发
  req._emitBody = async () => {
    try {
      if (request.body !== null) {
        const text = await request.text();
        if (text) {
          for (const cb of listeners.data || []) cb(text);
        }
      }
      for (const cb of listeners.end || []) cb();
    } catch (err) {
      for (const cb of listeners.error || []) cb(err);
    }
  };
  return req;
}

// Node http.ServerResponse 的最小替身：写操作都进 ReadableStream
function makeRes() {
  const encoder = new TextEncoder();
  let controller;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });
  const res = {
    statusCode: 200,
    headersSent: false,
    _headers: {},
    setHeader(name, value) {
      res._headers[name] = value;
    },
    flushHeaders() {
      res.headersSent = true;
    },
    write(chunk) {
      res.headersSent = true;
      if (chunk !== undefined && chunk !== null && chunk !== "") {
        controller.enqueue(encoder.encode(chunk));
      }
    },
    end(chunk) {
      res.write(chunk);
      res.headersSent = true;
      try {
        controller.close();
      } catch (err) {
        // 已经关闭（比如客户端断开）
      }
    },
  };
  res._stream = stream;
  return res;
}

// 这是整蛊站：整站不进搜索引擎，降低被陌生人撞见和被安全厂商标记的机会。
// robots.txt 的 Disallow 会让爬虫根本不来抓取，反而读不到页面里的 noindex，
// 所以这里用响应头，一次覆盖所有路径。
function noindex(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// 常见路径 → 落地页对应位置。没有这些，朋友顺手把 /docs 敲进地址栏就是 404，
// 而正经服务这些路径都该有东西。锚点由页面自己滚动过去。
const PATH_REDIRECTS = {
  "/docs": "/#docs",
  "/pricing": "/#pricing",
  "/models": "/#pricing",
  "/status": "/#status",
  "/login": "/#login",
  "/register": "/#login",
};

function handleRedirect(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const to = PATH_REDIRECTS[new URL(request.url).pathname];
  if (!to) return null;
  return new Response(null, { status: 302, headers: { Location: to } });
}

export default {
  async fetch(request, env) {
    // 先看认证路由，再看路径重定向，最后才交给 api handler。
    const auth = await handleAuth(request, env);
    if (auth) return noindex(auth);

    const redirect = handleRedirect(request);
    if (redirect) return noindex(redirect);

    const req = makeReq(request);
    const res = makeRes();
    req._emitBody();
    try {
      await getHandler(env)(req, res);
    } catch (err) {
      console.error("[fake-ai-api] worker 处理请求出错:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({
            error: { message: "Internal Server Error", type: "server_error", param: null, code: "internal_error" },
          })
        );
      } else {
        res.end();
      }
    }

    const headers = new Headers();
    for (const [name, value] of Object.entries(res._headers)) {
      const lower = name.toLowerCase();
      // 这两个头由平台管理，手动设置会被拒绝或覆盖
      if (lower === "content-length" || lower === "connection") continue;
      headers.set(name, value);
    }
    // 204/304/HEAD 不允许带 body
    const noBody = res.statusCode === 204 || res.statusCode === 304 || request.method === "HEAD";
    return noindex(
      new Response(noBody ? null : res._stream, {
        status: res.statusCode,
        headers,
      })
    );
  },
};

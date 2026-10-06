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

export default {
  async fetch(request, env) {
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
    return new Response(noBody ? null : res._stream, {
      status: res.statusCode,
      headers,
    });
  },
};

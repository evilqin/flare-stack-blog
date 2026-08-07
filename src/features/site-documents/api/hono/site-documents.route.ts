import { Hono } from "hono";
import { getExecutionContext } from "@/lib/hono/helper";
import {
  buildAtomXml,
  buildFeedJson,
  buildRobotsTxt,
  buildRssXml,
  buildSitemapXml,
  buildWebManifest,
  SITE_DOCUMENT_CACHE_CONTROL,
} from "../../service/site-documents.service";

const app = new Hono<{ Bindings: Env }>();

type AsyncDocumentBuilder = (
  env: Env,
  executionCtx: ExecutionContext<unknown>,
) => Promise<string>;

type SyncDocumentBuilder = (env: Env) => string;

interface AsyncDocumentRouteDefinition {
  path: string;
  contentType: string;
  cacheControl: string;
  build: AsyncDocumentBuilder;
}

interface SyncDocumentRouteDefinition {
  path: string;
  contentType: string;
  cacheControl: string;
  build: SyncDocumentBuilder;
}

function createCachedResponse(
  body: BodyInit | null,
  contentType: string,
  cacheControl: string,
) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  });
}

function createHeadResponse(contentType: string, cacheControl: string) {
  return createCachedResponse(null, contentType, cacheControl);
}

function registerAsyncDocumentRoute(definition: AsyncDocumentRouteDefinition) {
  app.get(definition.path, async (c) => {
    const body = await definition.build(c.env, getExecutionContext(c));
    return createCachedResponse(
      body,
      definition.contentType,
      definition.cacheControl,
    );
  });

  app.on("HEAD", definition.path, () =>
    createHeadResponse(definition.contentType, definition.cacheControl),
  );
}

function registerSyncDocumentRoute(definition: SyncDocumentRouteDefinition) {
  app.get(definition.path, (c) =>
    createCachedResponse(
      definition.build(c.env),
      definition.contentType,
      definition.cacheControl,
    ),
  );

  app.on("HEAD", definition.path, () =>
    createHeadResponse(definition.contentType, definition.cacheControl),
  );
}

const asyncDocumentRoutes = [
  {
    path: "/feed.json",
    contentType: "application/feed+json; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.feed,
    build: buildFeedJson,
  },
  {
    path: "/rss.xml",
    contentType: "application/rss+xml; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.feed,
    build: buildRssXml,
  },
  {
    path: "/atom.xml",
    contentType: "application/atom+xml; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.feed,
    build: buildAtomXml,
  },
  {
    path: "/site.webmanifest",
    contentType: "application/manifest+json; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.manifest,
    build: buildWebManifest,
  },
] satisfies AsyncDocumentRouteDefinition[];

const derivedAsyncDocumentRoutes = [
  {
    path: "/sitemap.xml",
    contentType: "application/xml; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.sitemap,
    build: async (env: Env, _executionCtx: ExecutionContext<unknown>) =>
      buildSitemapXml(env),
  },
] satisfies AsyncDocumentRouteDefinition[];

// Android 数字资产链接:让 TWA (xyz.qin.binbin) 以全屏沉浸方式打开本站
// 指纹来自 TWA 签名 keystore 的 SHA-256 证书指纹(与 APK 打包时一致)
// 顶层必须是数组(单个对象会导致 Google 解析失败, TWA 验证不过、卡在启动画面)
const ASSET_LINKS_JSON = JSON.stringify([
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "xyz.qin.binbin",
      sha256_cert_fingerprints: [
        "24:0E:44:BC:5B:F3:39:C2:5C:3C:13:2A:FF:68:1E:E8:76:29:DC:6F:21:BC:B3:8F:D4:15:D0:14:C3:30:10:CA",
      ],
    },
  },
]);

const syncDocumentRoutes = [
  {
    path: "/robots.txt",
    contentType: "text/plain; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.robots,
    build: buildRobotsTxt,
  },
  {
    path: "/.well-known/assetlinks.json",
    contentType: "application/json; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.robots,
    build: () => ASSET_LINKS_JSON,
  },
] satisfies SyncDocumentRouteDefinition[];

asyncDocumentRoutes.forEach(registerAsyncDocumentRoute);
derivedAsyncDocumentRoutes.forEach(registerAsyncDocumentRoute);
syncDocumentRoutes.forEach(registerSyncDocumentRoute);

export default app;

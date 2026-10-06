"use strict";

// Node 侧（Vercel Serverless / 本地 server.js）的平台依赖实现。
// Cloudflare Workers 的实现见 worker.js。
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function readAsset(name) {
  try {
    return fs.readFileSync(path.join(__dirname, "..", name), "utf8");
  } catch (err) {
    return "";
  }
}

module.exports = {
  assets: {
    ascii: readAsset("ascii.txt"),
    indexHtml: readAsset("index.html"),
    robotsTxt: readAsset("robots.txt"),
    sitemapXml: readAsset("sitemap.xml"),
  },
  env: {
    FAKE_API_KEY: process.env.FAKE_API_KEY,
  },
  randomValues: (n) => crypto.randomBytes(n),
};

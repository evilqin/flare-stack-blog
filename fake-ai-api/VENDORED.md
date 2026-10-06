# 来源与改动说明

本目录是从上游仓库**整棵拷进来**的第三方代码，不是本项目自己写的。

- 上游：https://github.com/XTxiaoting14332/fake-ai-api
- 版本：`main` @ `c355966`（2026-10-04）
- 许可：GPL-3.0（与本仓库一致，见根目录 `LICENSE`）

## 它是什么

一个"假 AI API"：对外伪装成 OpenAI / Anthropic 兼容接口，但**任何请求都只返回
`ascii.txt` 里的字符画**（流式输出做出"正在思考"的假象）。用途是整蛊朋友——
把 Base URL 指过来，对方以为接上了真模型。

## 落地时做了哪些改动

相对上游删掉/改掉的东西：

| 项目 | 改动 | 原因 |
| --- | --- | --- |
| `.env` | **删除** | 含上游作者自己的 API Key 和第三方中转站地址 `ai.n1ghtw1nd.com` |
| `.claude/` | **删除** | 上游作者的"自整蛊"配置（在仓库目录里开 Claude Code 会被它接管） |
| `.devin/` | **删除** | 上游作者的 agent 工具配置 |
| `config.js` | `apiKey` 换成自己生成的 | 不复用作者泄漏的凭据 |
| `index.html` | Base URL 改为 `location.origin` | 原本写死上游作者域名，部署后会替别人打广告 |
| `robots.txt`、`sitemap.xml` | 域名换成占位符 | 同上；首次部署拿到真实 workers.dev 地址后需回填 |
| `wrangler.toml` | 补注释 | 说明这是独立 Worker、不绑域名 |

`index.html` 的 Base URL 复制按钮现在取 `location.origin`，所以你部署到任何地址都自动正确。

## 已知遗留

`robots.txt` 和 `sitemap.xml` 里的 `REPLACE_WITH_WORKER_URL` 是占位符。
首次 `wrangler deploy` 成功后，把两处替换成实际的
`https://fake-ai-api.<账号子域>.workers.dev` 再提交一次即可。

这两个文件对整蛊没有实际作用（`robots.txt` 本身就 `Disallow: /v1/`），
只是保留上游文件结构方便日后对比。

## 怎么更新

上游改动时，直接对比 `fake-ai-api/` 与上游 `main`，把差异手工合并进来。
注意不要覆盖上面表格里改过的那几处。

## 部署

由 `.github/workflows/deploy-fake-ai.yml` 负责，复用仓库已有的
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secret。改动本目录下的文件
push 到 `main` 就会自动部署。

本地手动部署也行：

```bash
cd fake-ai-api && npm ci && npx wrangler deploy
```

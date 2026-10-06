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
| `robots.txt`、`sitemap.xml` | 域名换成 `ai.700214.xyz` | 同上 |
| `wrangler.toml` | 补注释 | 说明这是独立 Worker、不绑域名 |
| `index.html` | **重写**（2026-10-06） | 见下节 |
| `worker.js` | 新增登录路由 + `noindex` 响应头（2026-10-06） | 见下节 |
| `lib/handler.js` | `/v1/models` 与 `/v1/models/:id` 加了鉴权（2026-10-06） | 原来免 Key，但官方两个接口都要 Key，免得裸抓一次就露馅 |

## 2026-10-06：落地页重写

原来的页面有三个一眼可辨的破绽，都已修掉：

1. **页脚直接链到上游仓库** —— README 写着"整蛊朋友的小玩具"，点一下整蛊就结束了。已移除。
2. **模型名对不上** —— 页面写 `claude-sonnet-4.6`，而 `/v1/models` 返回 `claude-sonnet-4-6`。现已统一按 `config.js` 的写法。
3. **"注册"只弹一句"暂未开放注册"** —— 页面根本发不出 Key。现在有完整的登录/注册流程。

新增内容：

- **登录**：GitHub OAuth（真流程，只申请 `read:user`）+ 邮箱验证码兜底。**全程没有密码框**，会话是 HMAC 签名的 cookie，服务端零存储。
- **控制台**：Key、余额、7 天用量折线、调用统计、最近调用。数字是固定的，刷新不会变——会跳的假数据更可疑。
- **价格表 / 状态页 / 接入文档**：14 个模型配价格，6 个区域节点配 30 天可用率条，cURL / Python / Node 三段示例。
- **`X-Robots-Tag: noindex`** 覆盖所有响应。用响应头而不是 `robots.txt` 的 `Disallow`：后者会让爬虫不来抓取，于是也读不到页面里的 noindex 标签。

点击过程中还修掉三个小破绽：

- **导航的"模型列表"原本直指 `/v1/models`**，点一下整页变成裸 JSON。改成锚点到价格表，同时给 `/v1/models` 和 `/v1/models/:id` 加上鉴权——官方这两个接口都要 Key，而且现在的 401 报错格式也跟 OpenAI 一致（`Incorrect API key provided: (none)`），所以随手抓一下反而像正常受限的 API。
- **整页文字可选中**，鼠标到处是 I 型光标、拖动就高亮，像文档不像产品。现在界面文字 `user-select: none`，只在 `input` / `pre` / `code` 放开——价格表里模型名用的就是 `<code>`，所以仍可选中复制。
- **没有 favicon**，标签页是空图标。改用内联 SVG data URI，不额外加路由。

OAuth 在 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` 配好之前是惰性的：
`/api/auth/session` 返回 `configured:false`，`/api/auth/github` 返回 501，
页面此时回退到本地路径，控制台照常可达。

`index.html` 的 Base URL 复制按钮现在取 `location.origin`，所以你部署到任何地址都自动正确。

## 访问地址

绑的是 `ai.700214.xyz`（`custom_domain`，见 `wrangler.toml`）。

**为什么不直接用默认的 `*.workers.dev`**：那个域在国内被 DNS 污染，
直连超时、代理也连不上，等于废的。挂到博客域名下走同一条 Cloudflare
链路才通。代价是这个子域会托管那个"AI 中转站"落地页——子域信誉与主域
相对独立，但仍建议只私下把地址发给朋友，别公开传播。

`robots.txt` 和 `sitemap.xml` 对整蛊没有实际作用（`robots.txt` 本身就
`Disallow: /v1/`），保留只为贴合上游文件结构方便日后对比。

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

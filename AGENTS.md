# AGENTS.md

Repo-local configuration for engineering skills.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues on `du2333/flare-stack-blog`, with tickets as sub-issues of their spec. See `docs/agents/issue-tracker.md`.

### Triage labels

This repo uses the default five-state triage vocabulary as GitHub labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain doc layout. See `docs/agents/domain.md`.

## Cloudflare

Cloudflare operations go through the `cf` CLI (`bunx cf`), a 2026 beta that replaced Wrangler here. Find commands with `bunx cf cli search "<task>"`.

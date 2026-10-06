# Issue tracker: GitHub Issues

Issues and specs live in GitHub Issues on `du2333/flare-stack-blog`. Use `gh`; it is logged in as the repo owner. `gh` here is 2.45, which has no sub-issue or dependency flags, so those go through `gh api` (shapes below).

Older work under `.scratch/` stays there as history. Read it when a ticket points to it; new tickets go to GitHub.

## Conventions

- A spec (PRD) is one issue. Each implementation ticket is a separate issue linked to the spec as a **sub-issue**.
- Ordering between tickets is recorded as **blocked by** dependencies.
- Triage state is a label; see `triage-labels.md` for the label names.
- Conversation happens in issue comments.

## When a skill says "publish to the issue tracker"

Create the issue with `gh issue create -R du2333/flare-stack-blog --title ... --body-file ... --label ...`. For a ticket that belongs to a spec, link it as a sub-issue of the spec right after creating it.

## When a skill says "fetch the relevant ticket"

`gh issue view <number> -R du2333/flare-stack-blog --comments`. The user normally passes the issue number or URL.

## Sub-issues and dependencies

Both endpoints take the internal issue **id**, not the number. Get it with `gh api repos/du2333/flare-stack-blog/issues/<number> --jq .id`.

- Link a sub-issue: `gh api -X POST repos/du2333/flare-stack-blog/issues/<parent>/sub_issues -F sub_issue_id=<child id>`
- List sub-issues: `gh api repos/du2333/flare-stack-blog/issues/<parent>/sub_issues`
- Add a blocker: `gh api -X POST repos/du2333/flare-stack-blog/issues/<number>/dependencies/blocked_by -F issue_id=<blocker id>`
- List blockers: `gh api repos/du2333/flare-stack-blog/issues/<number>/dependencies/blocked_by`

## Wayfinding operations

Used by `/wayfinder`. The **map** is a parent issue; each **child** ticket is one of its sub-issues.

- **Map**: the parent issue's body holds the Notes / Decisions-so-far / Fog sections.
- **Child ticket**: a sub-issue with the question in the body and a `Type:` line (`research`/`prototype`/`grilling`/`task`) at the top.
- **Blocking**: blocked-by dependencies. A ticket is unblocked when every blocker is closed.
- **Frontier**: the map's sub-issues that are open, unblocked and unassigned; the lowest number wins.
- **Claim**: `gh issue edit <number> --add-assignee @me` before any work.
- **Resolve**: comment the answer under an `## Answer` heading, close the issue, then add a context pointer (gist + issue link) to Decisions-so-far in the map's body with `gh issue edit <map> --body-file ...`.

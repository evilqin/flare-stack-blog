# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the GitHub labels used in this repo.

| Canonical role    | GitHub label            | Meaning                                  |
| ----------------- | ----------------------- | ---------------------------------------- |
| `needs-triage`    | `needs-triage`          | Maintainer needs to evaluate this issue  |
| `needs-info`      | `need more information` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent`       | Fully specified, ready for an AFK agent  |
| `ready-for-human` | `ready-for-human`       | Requires human implementation            |
| `wontfix`         | `not planned`           | Will not be actioned                     |

When a skill mentions a canonical triage role, apply the corresponding label. An issue carries at most one of these labels; swap it with `gh issue edit --remove-label ... --add-label ...`.

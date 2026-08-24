# vtex-admin (OpenCLI plugin)

Read commands for VTEX Admin / VTEX API surfaces that don't have a Rocketlane-style
MCP connector — starting with the public catalog. This is a separate ecosystem from
this repo's `.claude-plugin/` (Claude Code skills): `opencli-plugin.json` at the repo
root declares this as a monorepo sub-plugin for the [OpenCLI](https://github.com/jackwener/opencli)
CLI, unrelated to how Claude loads the `skills/` folder. Same repo, two independent
plugin systems — don't confuse the two when adding to either.

## Why this exists

VTEX Admin has hundreds of screens; most have no usable public API, which is exactly
where OpenCLI's `UI_SELECTOR`/browser-session strategy is meant to apply. But UI-driven
adapters carry real maintenance cost (selectors drift on VTEX's release cadence, not
ours), so this plugin grows **one verified command at a time, per real need** — the
same way OpenCLI's own 150+ built-in site adapters (`clis/`) were built, not as a
single "map the whole Admin" effort.

## Commands

| Command | Strategy | Needs the Browser Bridge extension? | What it does |
|---|---|---|---|
| `catalog-search` | `PUBLIC` | No | Searches a store's public catalog by keyword via `/api/catalog_system/pub/products/search` — no auth, no session. Works against any VTEX account by name. |

```bash
opencli vtex-admin catalog-search usb2bstore water --limit 5
opencli vtex-admin catalog-search usb2bstore --limit 10 -f json
```

## Design note: why the first command is PUBLIC, not UI_SELECTOR

The original motivating need was reading B2B organization/cost-center/buying-policy
data from the Contracts Management screen (`vtex.contracts-management`). Recon found
three independent blockers there, investigated 2026-08-24:

1. The screen is a cross-origin iframe (`contracts-management.vercel.app`, embedded via
   `#raccoon-iframe`) — invisible to DOM-reading browser-automation tools.
2. The organization detail view (where cost centers/policies would show) never reaches
   an idle/readable state — consistent with, but not confirmed as, the same permission
   gap surfacing as a client-side retry loop instead of a clean error.
3. Two candidate read APIs (`.../authorization-dimensions`, `/api/organization-units/v1`
   and `/roots`) both returned 403 against the `usb2bstore` demo account's session —
   may be an account/role permission gap rather than a hard API limitation; not
   resolved as of this writing.

None of this generalizes to VTEX Admin as a whole — Contracts Management is an
outlier (externally-hosted iframe), not representative of ordinary same-origin Admin
screens. `catalog-search` was chosen as the first command specifically because it
sidesteps all three: no browser, no session, no selectors, and it proves the plugin's
install/discovery/typed-error path end to end on solid ground. Segment/organization
data becomes a later increment once there's a concrete, unblocked path to it (e.g. a
role with `organization-units` permission confirmed, or a different data source).

## Adding a new command

Follow OpenCLI's own [`opencli-adapter-author`](https://github.com/jackwener/opencli/tree/main/skills/opencli-adapter-author)
skill: recon → strategy note (`PUBLIC_API` > `COOKIE_API` > `UI_SELECTOR`/`DOM_STATE` >
`PAGE_FETCH`/`INTERCEPT`, cheapest-safest first) → write the command → `opencli browser
verify` (or a manual test for non-browser commands, as done here) before calling it
done. Every command needs typed errors (`@jackwener/opencli/errors`) — a command that
fails silently is worse than no command.

## Local development

```bash
npm install -g @jackwener/opencli esbuild   # once
opencli plugin install /path/to/vtex-se-toolkit/opencli-plugins/vtex-admin
opencli plugin update vtex-admin            # after editing files
```

## Installing from the published repo

```bash
opencli plugin install github:VTEX-US-SE/vtex-se-toolkit/vtex-admin
```

## Note on the Browser Bridge extension

Commands that need a live session (anything beyond `catalog-search`) require installing
OpenCLI's Chrome extension, which requests broad permissions (`debugger`, `<all_urls>`)
to drive the browser and read pages across origins. The daemon it talks to is
localhost-only. Reasonable for a demo account; be deliberate before running
session-based commands against an account with real customer data.

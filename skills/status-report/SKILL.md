---
name: status-report
description: >-
  Generate a weekly status report for a VTEX Solution Engineering (pre-sales)
  opportunity tracked in Rocketlane on the "Template SE" workflow. Use whenever
  an SE says "write my weekly status report", "status update for the Accor
  opportunity", "what should I report on KERING this week", "summarize where my
  opportunities are", or needs a ready-to-share internal update on how an
  opportunity is progressing through Discovery → RFP → Demo → POC → Solution
  Design → Closing → Handover to PS. Reads the project's Opportunity Stage,
  current phase, playbook tasks, document links, and (when available) the Slack
  channel to draft the report. READ-ONLY: never writes back to Rocketlane — it
  produces a draft the SE reviews and shares.
---

# SE weekly status report

## Purpose

VTEX Solution Engineers run pre-sales opportunities through a standard
Rocketlane playbook (the "Template SE"): **Discovery Meeting → RFP → Demo →
POC → Solution Design → Closing → Stand-by**, ending in *Handover to PS*. These
projects are non-billable and don't track hours or customer mood — so an SE
status report is about **opportunity progression**, not budget burn. This skill
drafts that weekly update from the real state of the opportunity.

Read-only. Do not call any update/create Rocketlane tool. Produce the draft in
chat; the SE shares it. This keeps the skill safe for the whole team.

## Inputs to gather

- **Which opportunity.** A name or ID, or "all my opportunities" for a
  portfolio roll-up (see step 1a below for how that path is resolved).
- **Window.** Default: since last week's report (last 7 days). Accept overrides.

## Workflow

1. **Single opportunity: read it directly.** `get_projects` with
   `includeAllFields: true`. Capture: client/company, `Opportunity Stage`
   (Qualification → Scope & Validate → Active Pursuit → Proposal → Negotiate →
   Commit & Signing → Won/Lost), `Sales Region` / `Macro Region`, `ACV`,
   `Estimated GMV`, the current phase, `progressPercentage`, and key dates
   (`startDate`, `dueDate`/Closed date). A single-project lookup is small — no
   pagination concern here.

1a. **"All my opportunities": call `get_se_digest(email)` instead of paginating
    `get_projects`.** The MCP tool (Rocketlane-MCP `feat/presentation-artifacts`
    branch onward) aggregates server-side and returns a small, deterministic
    result: `my_opps` (count), `hygiene_nudges` (missing stage/close date/ACV,
    with the actual opp names), `my_pipeline` (open ACV by stage),
    `at_risk_overdue`, `my_opps_detail` (per-opp severity 🔴/🟡/🟢 + flags), and
    **`movement`** (`{status, highlights, lowlights, since}` — Won/Lost/stage
    moves since the last weekly snapshot; `status: "insufficient_history"`
    until a baseline ~7 days old exists — say so plainly rather than
    improvising a "what changed" narrative). This replaces manually paginating
    and tallying `get_projects` across the whole book — the same 1MB/hand-count
    trap the exec/region digests were built to avoid. Use `my_opps_detail` to
    drive the per-opportunity blocks below instead of a second raw fetch per
    opp; only fall back to `get_project`/`get_tasks` for a specific opportunity
    if you need playbook task-level detail (Discovery Doc, RFP, Demo status)
    that the digest doesn't carry.

2. **Read the playbook tasks.** `get_tasks` filtered by `projectId`. The SE
   template has a known task set — e.g. *Discovery Meeting, Discovery Document,
   RFP, Demo, POC, Solution Design Document, Architecture, PS proposal request,
   Knowledge Transfer Document to PS, Handover to PS*. For each, read its Status
   (To do / In progress / Completed / Blocked / on hold) and the `Link` field
   (document link). Identify: what moved this week, what's in progress, what's
   **Blocked** or **on hold**, and what's next in the playbook sequence.
   **Caveat:** SEs often don't keep task statuses current — you may find every
   task still "To do" with due dates long past while the opportunity has clearly
   advanced (stage = Negotiate, phase = Closing). Don't take stale task statuses
   at face value. Treat `Opportunity Stage` + current phase + Slack as the truer
   signal of where things stand, and *flag* the unmaintained tasks rather than
   reporting the opportunity as if nothing has happened.

3. **Read Slack and reconcile it against Rocketlane.** This is the most valuable
   step — the channel is usually fresher and more honest than the Rocketlane
   record. Find the channel with `slack_search_channels` by the client name
   (naming varies — e.g. `#emea-pt-benfica`, `#campaign-biopak-b2b-australia`);
   if no clean match, use `slack_search_public_and_private` for recent messages
   mentioning the client. Then `slack_read_channel` over the window and **compare
   what Slack says against the Rocketlane state**, flagging mismatches such as:
   - Slack shows a demo/POC happened, a proposal was sent, or the deal advanced —
     but the Opportunity Stage / playbook tasks don't reflect it (Rocketlane is
     behind).
   - Slack shows a customer blocker, a churn/lost signal, or a go-quiet — but
     Rocketlane still looks healthy.
   - Slack is silent for weeks while Rocketlane shows an imminent close date (the
     deal may be stalling).
   Use messages as context/evidence only — don't paste private conversation
   verbatim into a shareable report.

4. **Assess momentum.** Compare phase/stage and `dueDate` against today. Flag if
   the opportunity is **past its expected close**, **stalled** (no task movement,
   sitting in Stand-by, or stuck in one phase for weeks), or has a **stage/RL
   mismatch** (e.g. Opportunity Stage = Lost/Won but the project is still In
   progress and should be closed or handed over).

## Output format

**Write the report in English by default** (Rocketlane fields are in English and
these reports are typically shared regionally/globally), even if the SE wrote
their request in another language — unless they explicitly ask for another
language.

Keep the **short-bullet** layout below — it's the most scannable. Three things
must always come through clearly, because they're what the reader acts on:
**(1) the next step / action** (and who owns it), **(2) data hygiene** flags
(stale tasks, an Opportunity Stage of Lost/Won still left open, missing
ACV/Opp ID), and **(3) dates** (expected close, days idle, days past close).

For a single opportunity:

```
**[Client] — SE status · week of [date range]**
Stage: [Opportunity Stage] · Phase: [current phase] · Region: [region] · ACV: [value]
Key dates: Expected close [date] ([on time / N days past]) · [N days since last movement]

This week:
- <what progressed — tasks completed, demo delivered, POC milestone, doc shared>

Next step / action:
- <the concrete next move and who owns it — always fill this in>

Data hygiene:
- <stale tasks, stage Lost/Won still open, missing ACV/Opp ID — or "clean">

Slack vs Rocketlane:
- <key mismatch between the channel and the record — or "aligned" / "no channel found">

Momentum: [On track / Stalled N weeks / Past expected close [date] / Ready for handover]
Links: <Discovery Doc, Solution Design Doc if present>
Sources: <tasks, Slack channel if used>
```

For "all my opportunities", lead with a one-line roll-up
(e.g. "8 active · 1 ready for handover · 2 stalled · 1 past close"), then a
**"Since last week"** block built straight from `get_se_digest`'s `movement`
field — Won/Lost/stage-advance events, verbatim from the tool, never
paraphrased or inferred from memory — followed by the per-opportunity blocks
ordered by what needs attention first (use `my_opps_detail`'s severity to
order, never as a performance ranking). If `movement.status` is
`"insufficient_history"`, say plainly "no baseline yet to compare against"
rather than guessing at what changed.

End by noting it's a draft to review before sharing, and offer to adjust.

## Offer weekly auto-scheduling

A weekly status report is most useful when it just shows up every week without the
SE remembering to ask. So, after delivering a report that covers the SE's whole
book ("all my opportunities" / a portfolio roll-up), help them put it on a
schedule:

1. **Check first.** List the user's existing scheduled tasks and look for one that
   already runs this weekly report (match on a clearly SE-status-report prompt).
   If one already exists, **don't create a duplicate** — just mention it's already
   scheduled and offer to change the day/time if they want.
2. **If none exists, offer to create one.** Propose a sensible default — e.g.
   **every Monday at 8:00 in the user's timezone** — running a prompt like
   *"Generate my weekly SE status report for all my active opportunities."*
3. **Get explicit confirmation before creating it.** Setting up a recurring task
   is persistent configuration, so never create it silently. Confirm the day/time
   (and adjust to the user's preference) and only then create the scheduled task.
4. After creating it, tell the user it's set and how to change or stop it.

Keep this a light, one-line offer when there's no schedule yet — not a nag. If the
user declines, drop it and don't re-ask every run.

## Notes

- Be concrete: "Solution Design Document completed, Architecture task in progress,
  POC scheduled for next week" beats "good progress". Name the playbook step.
- If there's genuinely no movement in the window, say so — a stalled opportunity
  is exactly what the reader needs to know.
- Call out a clean **Handover to PS** when Solution Design is done and the
  Knowledge Transfer / Handover tasks are the only ones left — that's the SE's
  finish line.

---

## Shared standards (source of truth)

This skill is grounded in the VTEX SE governance standards in [`../../standards/`](../../standards/). When this skill and a standard disagree, **the standard wins** — those files are the single source of truth that the Claude Project and Cowork consume too.

- `SE_Governance_Rubric.md` — opportunity health by stage
- `SE_Playbook_NextSteps.md` — recommended next steps

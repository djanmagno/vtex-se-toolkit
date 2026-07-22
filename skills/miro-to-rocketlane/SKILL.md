---
name: miro-to-rocketlane
description: >-
  Pull content from a Miro board — architecture diagrams, workshop boards,
  whiteboarding sessions — into a VTEX SE opportunity in Rocketlane. Use whenever
  a Solution Engineer says "log the architecture board for Accor to Rocketlane",
  "pull the Miro whiteboard from the BioPak workshop and save it", "what's on the
  Miro board for this opportunity", "summarize the architecture Miro and log it
  to Rocketlane", "resume o board do Miro e anota no RL", or wants the output of a
  Miro session captured against an opportunity. When the board covers architecture,
  it can also pull the client's existing Atlas architecture document and related
  best practices for context/comparison. Summarizes in English, asks which
  stage/card to log under, and writes to Rocketlane only after explicit
  confirmation.
---

# Miro → Rocketlane

## Purpose

SEs run architecture workshops, whiteboarding sessions, and solution-design
exercises in Miro, but that output rarely makes it into Rocketlane in a usable
form. This skill pulls the relevant Miro board, summarizes its content in
English, optionally grounds it against the client's Atlas architecture (when
the board is about architecture), and records it on the right opportunity.

## Workflow

1. **Find the board.** Resolve which opportunity/client it's about. Use
   `board_search_boards` to find the Miro board by client/opportunity name. If
   the match isn't obvious, list candidate boards and let the SE pick — don't
   guess.

2. **Pull the content.** Use `board_list_items` to read the board's items
   (sticky notes, shapes, text, frames). If the board contains a structured
   diagram, `diagram_get_dsl` gives a cleaner structural read than raw items.
   Use `context_explore` / `context_get` for a broader semantic read of the
   board when items alone don't tell the full story. If a visual read is more
   useful than text (e.g. a dense architecture diagram), `image_get_data` /
   `image_get_url` can pull a rendered image.

3. **Access the architecture, if needed.** When the board describes or
   proposes a VTEX architecture (integration flows, checkout/OMS decisions,
   data flows, catalog structure, etc.), ground the summary against Atlas:
   - `get_architecture` — if a solution architecture document already exists
     for this client, fetch it to compare against what's on the board (did the
     workshop confirm, change, or contradict the documented architecture?).
   - `retrieve_context` — pull relevant Atlas best-practice patterns for the
     topics on the board (e.g. "ERP integration", "B2B trade policy",
     "headless/FastStore") to note where the board aligns or diverges.
   Skip this step if the board isn't architecture-related (e.g. a general
   discovery workshop or requirements board).

4. **Summarize in English.** Produce a tight, factual summary — regardless of
   the board's language — covering: what the board captures, key decisions,
   open questions/unresolved items, and (if step 3 applied) how it compares to
   the documented Atlas architecture. Don't invent; if something on the board is
   ambiguous or illegible, say so rather than guessing.

5. **Resolve the project and ask which stage/card to log under.** Resolve the
   Rocketlane project with `get_projects`. List the playbook cards from
   `get_tasks` (Discovery Meeting, Discovery Document, RFP, Demo, POC, Any
   specific requirement covered, Solution Design Document, Architecture, PS
   proposal request, Knowledge Transfer Document to PS, Handover to PS).
   Suggest the most likely card (an architecture workshop board → *Architecture*
   or *Solution Design Document*), but let the SE confirm or pick a different
   one — don't guess silently.

6. **Confirm, then write to that card's Private note.** Show the SE the exact
   English text, the project, and the chosen card. On confirmation, read the
   task's current `taskPrivateNote` (`get_tasks` with `taskId`,
   `includeAllFields: true`) and write the note via `update_task` — append a
   dated, attributed HTML entry (`[YYYY-MM-DD] <author> — <English note>`),
   keeping existing private-note content above it. Never write without the
   SE's explicit OK.

## Output

- A clean English summary of the board's content in chat (what it captures ·
  key decisions · open questions · Atlas comparison if applicable), then the
  confirm-and-log step.
- Optionally offer to feed the same summary into the `discovery-brief` skill's
  architecture section, or into the `status-report` for that opportunity.

## Notes

- This skill never modifies the Miro board or Atlas — it only reads. The only
  write is the confirmed Rocketlane note.
- Keep customer-sensitive detail out of anything customer-visible; the note
  goes to the internal field (`taskPrivateNote`) by default.
- If the board can't be found or is empty, say so plainly rather than logging a
  vague note.
- Boards evolve during a workshop — if logging mid-session, note that the
  summary reflects the board's state as of the read, not necessarily its final
  form.

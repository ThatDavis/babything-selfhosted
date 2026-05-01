---
name: project-status
description: Give the user a clear, plain-English overview of where the project stands right now.
---

Give the user a clear, plain-English overview of where the project stands right now. This should feel like a friendly briefing, not a technical report.

## Step 1 — Gather information

Read:
- `plan.md`
- `requirements.md`
- `git log --oneline -10 2>/dev/null` (recent activity)
- `git status 2>/dev/null` (any unsaved changes)

## Step 2 — Produce a status summary

Write a status update using this structure (no headers needed — write it conversationally):

**Where you are:** State which phase of the plan the project is in and roughly what percentage is complete.

**What's been done:** List the key completed features or milestones in bullet points. Plain English, no code details.

**What's in progress:** If anything is partially done, call it out.

**What's next:** List the next 2–3 items to tackle from the plan.

**Unsaved changes:** If `git status` shows uncommitted changes, mention them and suggest running `/save-progress`.

**Any concerns:** If something looks incomplete, broken, or inconsistent with the requirements, flag it clearly.

## Step 3 — Offer a suggestion

End with one clear, actionable suggestion for what to work on next. Frame it as a question: "Would you like to work on [next feature] next?"

---

## Session briefing mode (if user asks for a quick checkpoint)

If the user asks for a quick progress check or session briefing, use this more compact structure instead:

### Current Phase
State the phase name and one-sentence description of its goal.

### Completed
Bullet list of every checked item (- [x]) from the current phase in `plan.md`. If none, say "Nothing completed yet."

### Up Next
The next 3–5 unchecked items (- [ ]) in order from the current phase. These are what we should work on in this session.

### Blockers / Open Questions
List any open questions from `plan.md` that are relevant to the items up next. If none apply, omit this section.

### Quick Stats
- Total tasks in current phase: N
- Completed: N
- Remaining: N

Keep the whole response under 40 lines.

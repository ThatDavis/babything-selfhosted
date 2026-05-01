---
name: start-project
description: Help a non-technical user design and set up a new software project from scratch.
---

You are helping a non-technical user design and set up a new software project from scratch. Be friendly, clear, and avoid jargon.

## Step 1 — The Design Interview

Your goal is to reach a complete, shared understanding of the project before writing a single line of code or creating any files. Do this through a structured, relentless interview.

### How to conduct the interview

- Ask **one question at a time**. Wait for the answer before continuing.
- After each answer, **follow the branch it opens** — go deeper before going wider.
- For every question, **provide your recommended answer** based on what you know so far. Frame it as: *"My recommendation: [answer]. Does that match what you're thinking, or would you change anything?"*
- When a decision **depends on a prior one**, call that out explicitly: *"This next question depends on your answer about X..."*
- Keep asking until there are **no unresolved branches** — no open "it depends", no ambiguous features, no unclear user flows.
- When the user says "I don't know" or "you decide", make the decision, explain your reasoning in plain English, and move on.
- Do not rush. A thorough interview now prevents wasted work later.

### The design tree to walk

Work through these branches in order, but follow sub-branches as they emerge:

**Branch 1 — The Problem**
- What problem does this solve, and for whom?
- How is it being solved today (manually, a different tool, not at all)?
- What does success look like — how will you know this project worked?

**Branch 2 — The Users**
- Who are the users? (roles, technical level, how many)
- How will they access it? (web browser, phone, desktop app, internal tool)
- Do different users need different levels of access or different views?

**Branch 3 — The Core Features**
- What are the 3–5 things the project absolutely must do?
- For each feature: walk through the exact steps a user takes from start to finish
- What happens when something goes wrong in that flow?
- What does "done" look like for each feature — what does the user see or get?

**Branch 4 — Data & Content**
- What information does the project need to store or track?
- Where does that data come from? (user input, imports, an existing system)
- Does any data need to be shared between users, or is it per-person?
- Are there privacy or sensitivity concerns?

**Branch 5 — Integrations & Constraints**
- Does this need to connect to anything else? (email, calendar, payment, existing software)
- Are there deadlines, budgets, or team size constraints?
- Are there things that are explicitly out of scope or off-limits?
- Does this need to work on specific devices or in specific environments?

**Branch 6 — Technical Direction** *(translate into plain English for the user)*
- Based on everything above, recommend a technology approach and explain the tradeoff in one sentence
- Confirm: does the user have any existing preferences or constraints around technology?
- Confirm: who will maintain this after it's built?

### When the interview is complete

State clearly: *"I think we have a complete picture. Here's what I understand about the project:"* — then give a 1-paragraph summary covering the problem, users, core features, and key constraints. Ask: *"Does this match your vision, or is there anything to correct?"*

Only proceed to Step 2 after the user confirms.

---

## Step 2 — Create `requirements.md`

Using everything from the interview, create a `requirements.md` file in the current directory:

```
# Project Requirements: [Project Name]
Generated: [today's date]

## Problem Statement
[What problem this solves, for whom, and how success is measured]

## Users
[Who uses it, how they access it, any role/permission distinctions]

## Core Features
For each feature:
### [Feature Name]
- What it does: [plain English]
- User flow: [step-by-step what the user does]
- Edge cases: [what happens when things go wrong]
- Done when: [what the user sees/gets when it works]

## Data & Storage
[What information is stored, where it comes from, any sharing or privacy notes]

## Integrations
[External systems, APIs, or tools this connects to]

## Constraints
[Deadlines, budget, team, devices, out-of-scope items]

## Technical Decisions
[Recommended stack/approach with one-sentence rationale for each decision]

## Open Questions
[Anything still unresolved — these must be answered before that feature is built]
```

---

## Step 3 — Create `AGENTS.md`

Read the `AGENTS-base.md` file in the current directory (if it exists) and use it as the foundation. Build on top of it rather than replacing it. Then create an `AGENTS.md` file:

```
# [Project Name] — Agent Context
Last updated: [today's date]

## What this project is
[One paragraph from the interview summary]

## Users
[Who uses it and how]

## Priorities (in order)
1. [Most important thing]
2. [Second most important]
3. [Third]

## Key decisions made
- [Decision]: [Why] — e.g. "Web app, not mobile: users are at desks all day"
- [Decision]: [Why]

## Constraints & non-negotiables
[From interview]

## How to help
- Always write code that a non-technical person can understand and maintain
- Prefer simple and working over clever and fragile
- Make minimal edits — change only the lines that need changing. Use `StrReplaceFile` for surgical edits rather than rewriting whole files
- Explain tradeoffs in plain English before making significant technical decisions
- When requirements are ambiguous, ask — don't assume
- Keep plan.md updated as features are completed
- Before starting any feature, check requirements.md for the user flow and edge cases
```

---

## Step 4 — Create `plan.md`

Create a `plan.md` file. Derive phases from the feature dependency order identified in the interview. Each phase should be independently shippable.

```
# Project Plan: [Project Name]
Last updated: [today's date]

## Phase 1 — Foundation
Goal: [What this phase delivers in plain English]
- [ ] Set up project structure and development environment
- [ ] [Prerequisite or infrastructure item]
- [ ] [First foundational feature]

## Phase 2 — [Name based on features]
Goal: [What this phase delivers]
- [ ] [Feature with user flow from requirements]
- [ ] [Feature]

## Phase 3 — [Name]
Goal: [What this phase delivers]
- [ ] [Feature]
- [ ] [Feature]

## Phase 4 — Launch
Goal: Ready for real users
- [ ] End-to-end testing of all user flows
- [ ] Fix issues found in testing
- [ ] [Deployment step]
- [ ] [Handoff or documentation step]

## Completed
(Items move here when done, with date)

## Decisions Log
(Important decisions and their rationale, added over time)

## Open Questions
[Carried over from requirements.md — must resolve before building that feature]
```

---

## Step 5 — Initialize git

1. Run `git init` if no git repo exists in the current directory.
2. Create a `.gitignore` appropriate to the technology decided in the interview. If unclear, use a general-purpose one.
3. Stage all created files and commit: `Initial project setup: requirements, plan, and agent context`

---

## Step 6 — Orient the user

Tell the user in plain English:
- What 3 files were created and what each one does
- What Phase 1 involves and what to tackle first
- How to use the other skills: `/add-feature`, `/feature-workflow`, `/save-progress`, `/project-status`, `/update-plan`
- That the plan will evolve — they don't need to have everything figured out now

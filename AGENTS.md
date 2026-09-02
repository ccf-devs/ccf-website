# AGENTS.md

## Purpose

This repository contains the production platform for the **Crescent Club of Finance (CCF)**.

This file defines **how an AI coding agent must work in this repository**.

The project requirements, product scope, technical architecture, database design, business rules, and finalized decisions are defined in `context.md`.

---

## 1. Required Reading Order

Before making any code changes:

1. Read `AGENTS.md`.
2. Read `context.md` completely.
3. Inspect the existing repository structure and relevant source files.
4. Determine the smallest implementation scope required for the current task.
5. Implement only that scope.

`context.md` is the source of truth for **what the system must be**.

`AGENTS.md` is the source of truth for **how the coding agent must operate**.

---

## 2. Core Rules

### 2.1 Do Not Invent Requirements

Do not invent:

- features
- pages
- database fields
- API behavior
- authentication behavior
- business rules
- user roles
- payment behavior
- registration rules
- UI requirements
- infrastructure choices

If something is not defined, prefer the simplest implementation consistent with the existing architecture.

If the missing information materially affects correctness, stop and ask for clarification instead of guessing.

### 2.2 Do Not Redesign the Architecture

The technology stack and architecture in `context.md` are finalized.

Do not replace or introduce alternatives to the defined stack unless explicitly requested.

Do not independently switch:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Motion
- Lucide React
- PostgreSQL
- Prisma
- Auth.js
- Resend
- Cloudflare R2
- Vercel
- Sentry

Do not introduce another framework, ORM, database, authentication provider, hosting platform, storage provider, or major architectural pattern merely because you prefer it.

---

## 3. Conflict Handling

When requirements appear to conflict:

1. Check `context.md`.
2. Check the existing implementation and migrations.
3. Check whether the apparent conflict is caused by an outdated implementation or documentation fragment.
4. Do not silently choose a new business rule.
5. If the conflict cannot be resolved from the repository's source of truth, stop and ask for clarification.

Never "fix" a requirement by changing the architecture without approval.

---

## 4. Implementation Discipline

For every task:

### Step 1 — Understand

Identify:

- requested behavior
- affected pages/components
- affected API routes
- affected database models
- affected validation
- affected tests

### Step 2 — Inspect

Before editing, inspect the relevant existing code.

Do not rewrite files blindly.

Reuse existing utilities, components, schemas, and patterns where appropriate.

### Step 3 — Plan

Choose the smallest set of changes that fully satisfies the task.

Avoid speculative abstractions.

### Step 4 — Implement

Make focused changes.

Do not modify unrelated code simply for stylistic preference.

### Step 5 — Verify

Run the relevant checks after implementation.

At minimum, when available:

- lint
- TypeScript/type checking
- relevant tests
- production build

If a check cannot be run, report that explicitly.

### Step 6 — Report

At the end of the task, report:

- what was implemented
- files changed
- tests/checks run
- any warnings or unresolved issues

Then stop.

---

## 5. Database Rules

The database architecture in `context.md` is authoritative.

When modifying Prisma/database code:

- preserve UUID primary keys
- preserve UTC timestamps
- preserve PostgreSQL/Prisma conventions defined in `context.md`
- preserve foreign-key relationships
- preserve required uniqueness constraints
- preserve partial unique indexes where specified
- use transactions for multi-step operations that require atomicity
- do not introduce duplicate sources of truth for derived state
- do not casually delete historical form versions or event data

For registration flows, correctness under concurrency is critical.

Capacity and participant uniqueness must be enforced safely inside the appropriate transaction.

Do not implement a registration flow that can create duplicate participants or exceed a configured capacity under concurrent requests.

---

## 6. Form System Rules

The event form system is versioned.

Published form versions are immutable.

When a published form needs to change:

- create a new form version
- do not mutate the published version
- ensure registrations continue referencing the form version they were submitted against

Do not flatten the dynamic form system into hard-coded event-specific fields unless explicitly requested.

---

## 7. Registration Rules

Registration logic must follow the finalized rules in `context.md`.

Important principles:

- registration is event-scoped
- duplicate registration/participant creation must be prevented
- team membership must respect event rules
- participant identity uniqueness must use the appropriate Crescent/external identity rules
- capacity must be concurrency-safe
- registration creation and related records must be atomic
- failed transactions must not leave partial registrations behind

Do not bypass the central registration transaction with scattered writes unless there is a clear, explicitly justified reason.

---

## 8. Payment Rules

Follow the payment architecture defined in `context.md`.

For the MVP:

- support FREE and PAID events
- use manual UPI flow where configured
- generate the configured UPI payment URI/QR
- treat payment initiation as separate from payment verification
- store UTR/reference information when collected
- allow admin verification according to the defined payment flow

Do not claim that generating a QR or launching a UPI intent proves payment.

Do not add a payment gateway/provider unless explicitly requested.

---

## 9. Authentication & Security

Authentication must follow the architecture in `context.md`.

Security-sensitive data must never be exposed unnecessarily.

Never place the following into audit metadata, logs, client-side responses, or source-controlled configuration:

- passwords
- authentication secrets
- magic-link tokens
- recovery codes
- TOTP secrets
- raw payment secrets
- unnecessary personal registration data

Do not commit `.env` files or real credentials.

Use environment variables for secrets.

Validate server-side even when client-side validation exists.

Never rely exclusively on client-side authorization checks.

Every protected server action/API route must verify the authenticated admin and required permissions.

---

## 10. API Rules

Use the project's established Next.js server/API architecture.

API behavior must be:

- validated
- authenticated where required
- authorization-aware
- consistent with the database model
- safe against malformed input

Use Zod for request/input validation where defined by the architecture.

Do not expose internal database structures unnecessarily.

Return appropriate HTTP status codes and structured errors.

Do not leak stack traces, secrets, SQL details, or sensitive internal information to clients.

---

## 11. Frontend Rules

Follow the UI/UX direction in `context.md`.

The site should be:

- responsive
- accessible
- professional
- finance-oriented
- visually distinctive without being excessive
- consistent across pages

Use the existing design system/components before creating duplicates.

Do not introduce unnecessary animations.

Animations should improve hierarchy, feedback, or transitions rather than distract from content.

Do not sacrifice usability for visual effects.

---

## 12. Media Rules

Public production media belongs in the configured object-storage architecture.

Do not commit large production images or event photo collections directly into the repository.

Use appropriate image optimization and metadata.

Member photos and event media must respect their relationships and visibility rules.

Do not create deletion behavior that can accidentally remove media still referenced elsewhere.

---

## 13. Environment & Secrets

Use environment variables for:

- database credentials
- authentication configuration
- email provider keys
- object storage credentials
- monitoring configuration
- other secrets

Never hard-code production secrets.

When adding a new environment variable:

1. document its purpose
2. add it to the appropriate example/environment documentation
3. validate it where appropriate
4. never include the real value

---

## 14. Migrations

Database migrations must be deliberate and reviewable.

Before creating a migration:

- inspect the current Prisma schema
- understand existing data implications
- preserve historical data unless deletion is explicitly required
- consider foreign-key ordering and circular relationships

Do not use destructive migration behavior against production data without explicit approval.

If a migration requires a data backfill, make the operation explicit and safe.

---

## 15. Testing Expectations

Tests should focus on behavior and business rules, especially:

- registration validation
- eligibility
- capacity limits
- concurrent registration safety
- participant uniqueness
- team rules
- form versioning
- payment state transitions
- authentication/authorization
- API validation
- critical admin operations

Do not write tests merely to increase coverage numbers.

When fixing a bug, prefer adding a regression test when practical.

---

## 16. Git Discipline

Keep changes easy to review.

Prefer:

- focused commits
- descriptive commit messages
- no unrelated formatting churn
- no generated junk
- no secrets
- no temporary debugging files

Do not rewrite project history or force-push unless explicitly requested.

Do not commit build artifacts unless the project explicitly requires them.

---

## 17. Dependency Discipline

Before adding a dependency, ask:

- Is it actually necessary?
- Does the existing stack already solve this?
- Is there a simpler implementation?
- Does it introduce security, maintenance, or bundle-size concerns?

Do not add packages for trivial functionality.

If a dependency is necessary, use a stable, maintained package compatible with the project's existing stack.

---

## 18. No Silent Scope Expansion

If the task says:

> Build X

do not also independently build:

- Y
- Z
- unrelated refactors
- redesigns
- additional admin features
- speculative integrations

If you notice a useful improvement outside the requested scope, mention it in the final report instead of implementing it automatically.

---

## 19. Documentation Discipline

When behavior or architecture changes, update the relevant documentation.

Do not duplicate the entire contents of `context.md` elsewhere.

Keep documentation concise and authoritative.

If an implementation decision conflicts with `context.md`, do not silently overwrite the requirement.

---

## 20. Completion Standard

A task is complete only when:

1. The requested functionality is implemented.
2. Existing functionality has not been unnecessarily broken.
3. Relevant validation exists.
4. Relevant tests/checks have been run.
5. No known critical errors remain.
6. The final response clearly states what changed and what was verified.

If the task cannot be completed safely, explain exactly what is blocking it.

---

## 21. Agent Behavior Summary

**READ → INSPECT → PLAN → IMPLEMENT → TEST → REPORT → STOP**

Always prefer:

**correctness over speed**

**existing architecture over personal preference**

**small focused changes over rewrites**

**explicit requirements over assumptions**

**secure server-side enforcement over client-side trust**

**verified behavior over "looks correct"**

---

## Source of Truth

For product requirements, business rules, architecture, schema, integrations, and finalized project decisions:

**`context.md` is authoritative.**

For agent workflow and coding behavior:

**`AGENTS.md` is authoritative.**

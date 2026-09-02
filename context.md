# CCF --- Antigravity Implementation Context

**Project:** Crescent Club of Finance (CCF) Website + Admin Platform\
**Context version:** 1.0\
**Source:** CCF Product & Engineering Handbook v0.5 FINAL + finalized IT
decisions\
**Prepared by:** Rohith Y - IT Team

> This file is the implementation-facing contract for Antigravity. The
> full handbook remains the product/engineering source of truth. This
> context freezes implementation decisions already made.

## 0. Current Status --- Pre-Code Phase Complete

The requirements and architecture pre-code phase is complete. We are now
entering implementation.

Do not rewrite the handbook or reopen the finalized stack. Implement in
bounded phases.

### Implementation sequence

1.  Repository/project foundation
2.  PostgreSQL + Prisma
3.  Authentication
4.  Design system/layout
5.  Public website
6.  Event/admin architecture
7.  Dynamic Form Engine
8.  Registration + event participant uniqueness
9.  Teams
10. UPI/manual payment
11. Recruitment
12. Admin dashboard/notifications/audit
13. CSV + Cloudflare R2 media
14. Security/accessibility/performance/concurrency testing
15. Deployment/monitoring/handover

Do not implement future phases without instruction.

## 1. Agent Rules

Before changing code, read `context.md`, inspect the repository, and
read relevant existing files/tests.

Do not invent CCF facts, members, event rules, capacities, registration
fields, payment policies, leadership details, or institutional
verification.

Do not replace the finalized stack. Do not introduce a separate backend
service, unnecessary microservices, Redis, Kubernetes, student accounts,
certificates, attendance, alumni management, sponsor systems,
newsletters, mandatory Telegram, or a full Google Forms clone.

If a genuine contradiction is found: 1. Stop the affected
implementation. 2. Identify the conflicting requirements/files. 3.
Explain why it matters. 4. Do not silently choose a new architecture. 5.
Ask for a decision.

Known legacy wording contradictions are documented below and must NOT be
reintroduced.

After each bounded task, run appropriate checks, report changed files
and verification, then stop.

## 2. Frozen Technology Stack

### Frontend

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Motion
-   Lucide React

### Backend

-   Next.js Route Handlers
-   REST-style API
-   Zod validation

### Database

-   PostgreSQL
-   Prisma ORM

### Authentication

-   Auth.js
-   Passwordless Magic Link
-   Resend
-   TOTP authenticator fallback
-   One-time recovery codes

### Media

-   Cloudflare R2

Google Drive is only the source location for supplied media, not the
production media backend.

### Deployment

-   Vercel
-   GitHub integration / CI/CD

### Monitoring

-   Sentry
-   Vercel Logs

Do not substitute technologies without an explicit architectural
decision.

## 3. Known v0.5 Legacy Contradictions

These are known editorial leftovers from the v0.5 handbook. They are
already resolved here. Do not implement the obsolete wording.

### Capacity

Canonical `EventCapacityMode`: - `PARTICIPANTS` - `TEAMS` - `UNLIMITED`

`PARTICIPANTS` = finite capacity measured in participants.\
`TEAMS` = finite capacity measured in teams.\
`UNLIMITED` = no finite capacity restriction.

Some older handbook wording may restrict team events to
`PARTICIPANTS or TEAMS`. Ignore that wording. `UNLIMITED` is valid.

### Payment

Canonical `PaymentMode`: - `FREE` - `PAID`

For FREE events, no internal payment record/state is required.

Canonical `PaymentStatus`: - `PENDING` - `VERIFIED` - `REJECTED` -
`EXPIRED` - `REFUNDED`

Do not implement `NOT_REQUIRED`, `PAID`, or `FAILED` as PaymentStatus
values.

### Registration status

Canonical `RegistrationStatus`: - `ACTIVE` - `CANCELLED`

Do not implement `PENDING`, `CONFIRMED`, or `DELETED` as
RegistrationStatus enum values.

### Obsolete fields

Do not implement: - `seats_used` on Event - required `schema_snapshot`
on FormVersion

### API

Canonical primary API architecture:
`Next.js Route Handlers + REST-style API + Zod`

Server Actions may be used internally where useful, but they are not the
primary documented API architecture.

## 4. Database Contract

Use: - PostgreSQL - Prisma - UUID primary keys - UTC/TIMESTAMPTZ
timestamps - JSONB/JSON where dynamic configuration requires it -
NUMERIC(10,2) for monetary values - foreign keys - transactions -
appropriate indexes and unique constraints - snake_case database
naming - PascalCase Prisma models with appropriate mapping

The physical Prisma schema belongs to implementation. Do not invent a
different schema architecture.

### Entities

1.  `admin_users`
2.  `departments`
3.  `members`
4.  `events`
5.  `event_content`
6.  `form_versions`
7.  `event_fields`
8.  `registrations`
9.  `registration_responses`
10. `teams`
11. `team_members`
12. `event_participants`
13. `payments`
14. `recruitment_applications`
15. `media`
16. `notifications`
17. `audit_logs`
18. `site_settings`

### Event

Conceptually includes: - id - slug - name - status - starts_at -
ends_at - venue - capacity - capacity_mode - registration_mode -
registration_method - eligibility_crescent - eligibility_external -
registration_opens_at - registration_closes_at -
active_form_version_id - payment_mode - payment_method - fee_amount -
upi_id - payee_name - created_at - updated_at

Do not add `seats_used`.

EventStatus: `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`

RegistrationMode: `INTERNAL`, `EXTERNAL`, `NONE`

RegistrationMethod: `BUILT_IN`, `GOOGLE_FORM`, `NONE`

Keep RegistrationMode and RegistrationMethod separate. Do not create
`MIXED`.

### Event participants

`event_participants` is the active event-scoped participant identity
registry.

Crescent uniqueness: `event_id + normalized RRN`

External uniqueness:
`event_id + normalized college + normalized external roll number`

It is not registration-response storage.

Authorized registration deletion/cancellation releases active identity
locks.

No global RRN uniqueness and no global external roll uniqueness.

### Forms

`FormVersion -> EventField`

Published form versions are immutable.

Registrations retain the form version used.

Do not implement a required `schema_snapshot` column.

### Payments

PaymentMethod: - `MANUAL_UPI` - `PROVIDER`

PaymentStatus: - `PENDING` - `VERIFIED` - `REJECTED` - `EXPIRED` -
`REFUNDED`

Payment is separate from registration status.

## 5. Registration Rules

### Crescent

RRN: - exactly 12 digits - begins with `2` - digits only after
normalization

There is no current college database/RRN verification API. This is
format validation only.

Uniqueness: `EVENT + normalized RRN`

A Crescent student may register for multiple different events, but not
twice actively in the same event.

### External

Required identity: - name - college/university - external roll number -
configured fields

Uniqueness:
`EVENT + normalized college + normalized external roll number`

Same roll + same college + same event = duplicate.\
Same roll + different college + same event = allowed.\
Same identity + different event = allowed.

External participants must never be forced to provide Crescent RRN.

## 6. Registration Transaction

Conceptual flow:

1.  Load event
2.  Verify event exists
3.  Verify event state
4.  Verify registration window
5.  Verify eligibility
6.  Validate form version/fields
7.  Validate participant identity
8.  Validate team structure
9.  Validate payment configuration
10. Atomically enforce finite capacity
11. Enforce event participant uniqueness
12. Create registration
13. Store responses
14. Create team/team members
15. Create event participants
16. Create payment record where applicable
17. Commit

Failure rolls back.

Concurrent requests must never overbook a finite-capacity event.

The exact safe implementation may use transactions, row locking, atomic
conditional updates, or an equivalent strategy.

## 7. Teams

Events may be individual or team.

Per-event configuration: - minimum team size - maximum team size - team
name required/not required - leader required/not required - capacity
mode - mixed-team policy

Mixed Crescent + external teams are supported.

If leader is required, exactly one leader must exist.

A participant cannot belong to multiple active registrations/teams in
the same event.

Authorized deletion/disbanding releases identity locks and capacity.

## 8. Dynamic Form Engine

The CCF platform uses a custom Dynamic Form Engine inspired by Google
Forms, not a full clone.

Supports: - system/custom fields - ordering - required/optional -
validation - conditional logic -
registration/participant/team/team-member scopes

Field types: - TEXT - TEXTAREA - NUMBER - EMAIL - PHONE - DATE - TIME -
DATETIME - SELECT - MULTI_SELECT - RADIO - CHECKBOX - FILE

For mixed events, forms may branch between Crescent and Other College
paths.

## 9. External / Google Forms

For external registration: - show configured external CTA - do not
duplicate/import the external form - do not import Google Form responses
into internal DB - do not create internal payment state for external
payment

External platform remains source of truth for that workflow.

## 10. Payment / UPI

FREE: No internal payment record/state required.

PAID INTERNAL MVP: `MANUAL_UPI`

Future: `PROVIDER`

Generate trusted UPI URI server-side using configured: - UPI ID - payee
name - amount - INR - safe reference

The same URI powers: - mobile UPI Intent - dynamically generated QR

Do not store a static QR as the primary event asset.

UPI launch/QR is not proof of payment.

User submits UTR/reference. Authorized admin verifies manually. Only
trusted server-side/admin verification may mark payment `VERIFIED`.

External payment remains external.

## 11. Capacity

Canonical modes: - PARTICIPANTS - TEAMS - UNLIMITED

Approximately 500 participants is a platform/load-testing planning
target, NOT a default event capacity.

Registration closes at: - configured closing time - capacity reached -
manual admin close

No waiting list.

If capacity is reduced below current active participation: - existing
registrations remain valid - no participants are deleted - new
registrations remain blocked until capacity permits

If capacity increases, registration may resume when other conditions
permit.

## 12. Recruitment

Current state: OPEN.

Opening/closing is controlled by admins.

Crescent students only: - any department - any year - UG/PG as
applicable - one department application per student

Fields: - Name - RRN - desired department - academic department - year -
WhatsApp-enabled phone

No resume, questionnaire, or interview workflow.

Closing hides/disables Apply Now, shows Recruitment Closed, and rejects
submissions server-side.

Authorized deletion allows the same RRN to apply again.

## 13. Authentication

Only authorized admins access the dashboard.

Roles: - CCF_ADMIN - IT_ADMIN

Both have full MVP operational permissions.

Primary: Auth.js + Resend Magic Link

Fallback: TOTP

Break-glass: one-time recovery codes

Security: - short-lived single-use magic links - secure sessions -
httpOnly cookies - appropriate SameSite policy - server-side
authorization - TOTP secrets protected at rest - recovery codes securely
hashed - recovery codes one-time - regeneration invalidates previous
codes - never log secrets

No traditional admin password system is required for MVP.

## 14. Media

Production storage: Cloudflare R2.

Workflow:
`Google Drive/source media -> curate -> optimize -> upload to R2 -> metadata -> event/gallery -> publish`

Use responsive variants, thumbnails, lazy loading, dimensions, and alt
text.

Do not expose R2 credentials.

Do not put binary media in PostgreSQL.

Do not delete shared member media merely because an event is archived.

## 15. Security

Never publicly expose: - RRN - private phone numbers - registration
records - recruitment records - admin endpoints - database/R2/Resend
credentials - Auth secrets - TOTP secrets - recovery codes

Never log: - full RRN - full phone - raw registration responses -
payment secrets - authentication secrets - recovery codes

Use server-side validation, Zod, authorization, rate limiting, secure
cookies, sanitization, URL validation, environment variables, and least
privilege.

## 16. Public Site

Pages: - Home - About - Departments - Members - Events - Event Details -
Contact - Join Us / Recruitment

Responsive, accessible, SEO-friendly, performant, premium,
finance-oriented, professional, youthful, elegant.

Do not expose private data.

Event CTA is configuration-driven: - INTERNAL - EXTERNAL - NONE

## 17. Admin

Dashboard areas: - Dashboard - Events - Registrations - Recruitment -
Members - Departments - Media/Gallery - Notifications - Settings

Admins can configure events, forms, teams, capacity, payment,
recruitment, members, departments, media, exports, notifications, and
audit activity.

Destructive actions require confirmation.

## 18. CSV / Lifecycle

All events use shared registration architecture. Never create a database
table per event.

CSV columns are derived from the applicable immutable form version and
registration/team structure.

Lifecycle:
`EVENT COMPLETED -> AUTHORIZED EXPORT -> GENERATE CSV -> VERIFY -> HANDOVER/ARCHIVE -> CONFIRM HANDOVER -> AUTHORIZED DELETE`

No automatic destructive purge without safeguards.

## 19. Testing Contract

Must test: - Crescent/external identity uniqueness - same external roll
at different colleges - different events - team size/leader/name rules -
mixed teams - participant/team/unlimited capacity - concurrent capacity
race - capacity reduction/increase - deletion releasing capacity and
identity - dynamic form fields/validation/conditional logic/versioning -
UPI URI/QR/UTR/manual verification - fake client payment success - Magic
Link expiry/reuse - TOTP fallback - recovery-code single
use/regeneration - R2 upload/validation/delivery - dynamic CSV -
security/accessibility/performance

## 20. Implementation Checkpoint

For every task:

1.  Read `context.md`.
2.  Inspect current repository.
3.  Implement only requested scope.
4.  Run appropriate checks.
5.  Report changed files.
6.  Report commands/tests/checks.
7.  Report failures honestly.
8.  Stop.

## 21. First Coding Phase

The pre-code phase is complete.

When instructed to start from scratch, begin with the project
foundation: - Next.js - React - TypeScript - Tailwind - shadcn/ui
baseline - lint/formatting - environment template - repository hygiene -
README - baseline build/typecheck/lint

Do not implement the complete platform in one operation.

After foundation verification, stop.

## 22. Next Phase --- Prisma/PostgreSQL

After foundation: 1. Configure Prisma 2. Configure PostgreSQL 3. Create
`prisma/schema.prisma` 4. Implement the database contract 5. Create
migration 6. Create seed strategy 7. Test critical constraints 8. Stop

Pay special attention to: - event-scoped participant uniqueness -
immutable form versions - registration/payment separation -
registration/form-version consistency - deletion/release semantics -
concurrency-safe capacity - EventContent one-to-one - Member -\> Media
relation - Event -\> active FormVersion relation

## 23. Final Rule

The architecture is frozen.

**BUILD IT.**

Do not redesign it, replace the stack, invent requirements, reopen
finalized decisions, or build everything at once.

If an implementation detail is not frozen and does not change a business
rule, choose the simplest maintainable solution.

If a business rule or architecture decision is genuinely unclear, stop
and ask.

## Canonical Quick Reference

Frontend: Next.js + React + TypeScript / Tailwind + shadcn/ui / Motion +
Lucide

Backend: Next.js Route Handlers / REST-style API / Zod

Database: PostgreSQL + Prisma

Auth: Auth.js / Magic Link / Resend / TOTP / one-time recovery codes

Media: Cloudflare R2

Deployment: Vercel

Monitoring: Sentry + Vercel Logs

RegistrationMode: INTERNAL / EXTERNAL / NONE

RegistrationMethod: BUILT_IN / GOOGLE_FORM / NONE

Capacity: PARTICIPANTS / TEAMS / UNLIMITED

ParticipantType: CRESCENT / EXTERNAL

RegistrationType: INDIVIDUAL / TEAM

RegistrationStatus: ACTIVE / CANCELLED

PaymentMode: FREE / PAID

PaymentMethod: MANUAL_UPI / PROVIDER

PaymentStatus: PENDING / VERIFIED / REJECTED / EXPIRED / REFUNDED

Form versions: published versions immutable

Identity: - Crescent = EVENT + normalized RRN - External = EVENT +
normalized COLLEGE + normalized ROLL

No: - student accounts - waiting list - public edit/cancel - per-event
registration tables - mandatory payment gateway - college DB/RRN
verification API - unnecessary microservices

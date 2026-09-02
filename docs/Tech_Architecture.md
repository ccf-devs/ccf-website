

\# 🏗️ CCF Technical Architecture v0.1



\## 1. Architecture philosophy



Our core principle:



> \*\*Build one maintainable full-stack platform, not a collection of disconnected services.\*\*



For a 3-person IT team and \~500-student registration events, microservices would be unnecessary complexity.



\### Recommended architecture



```text

&#x20;                        INTERNET

&#x20;                           │

&#x20;             ┌─────────────┴─────────────┐

&#x20;             │                           │

&#x20;             ▼                           ▼

&#x20;      PUBLIC WEBSITE                ADMIN DASHBOARD

&#x20;      /                           /admin/\*

&#x20;      /about

&#x20;      /events

&#x20;      /members

&#x20;      /join-us

&#x20;      /contact

&#x20;             │                           │

&#x20;             └─────────────┬─────────────┘

&#x20;                           ▼

&#x20;                 ┌─────────────────────┐

&#x20;                 │   FULL-STACK APP    │

&#x20;                 │                     │

&#x20;                 │ UI + Server + API   │

&#x20;                 │ Auth + Validation   │

&#x20;                 │ Business Logic      │

&#x20;                 └──────────┬──────────┘

&#x20;                            │

&#x20;         ┌──────────────────┼──────────────────┐

&#x20;         │                  │                  │

&#x20;         ▼                  ▼                  ▼

&#x20;   ┌───────────┐      ┌────────────┐    ┌──────────────┐

&#x20;   │ PostgreSQL│      │   Object   │    │   External   │

&#x20;   │ Database  │      │  Storage   │    │   Services   │

&#x20;   │           │      │            │    │              │

&#x20;   │ Events    │      │ Images     │    │ UPI          │

&#x20;   │ Forms     │      │ Posters    │    │ Google Forms │

&#x20;   │ Registr.  │      │ Gallery    │    │ WhatsApp     │

&#x20;   │ Teams     │      │ Members    │    │ Email        │

&#x20;   │ Payments  │      │            │    │              │

&#x20;   └───────────┘      └────────────┘    └──────────────┘

```



This is consistent with v0.4's recommendation for a simple full-stack application rather than a distributed architecture. 



\---



\# 2. My recommended technology stack



Now I'm going to make a \*\*technical recommendation\*\*, not pretend CCF already approved these choices.



\## Frontend + Backend



\### \*\*Next.js + TypeScript\*\*



I'd recommend:



```text

Next.js

TypeScript

React

```



Why?



Because we don't actually need:



```text

React frontend

&#x20;       +

Express backend

&#x20;       +

separate API deployment

```



for this project.



Instead:



```text

Next.js

├── Public UI

├── Admin UI

├── Server Components

├── API routes / Route Handlers

├── Server-side validation

├── Authentication integration

└── Business logic

```



One codebase.



One deployment.



One repository.



Much easier for the next IT batch to understand.



And v0.4 already says the candidate architecture should be a \*\*single full-stack typed web application\*\*. 



\### Recommendation



\*\*Next.js + TypeScript\*\*



\---



\# 3. Database



\## PostgreSQL



This is the easiest decision.



Our system has relationships everywhere:



```text

Event

&#x20;├── FormVersion

&#x20;│    └── EventField

&#x20;│

&#x20;├── Registration

&#x20;│    ├── Responses

&#x20;│    ├── Team

&#x20;│    │    └── TeamMembers

&#x20;│    └── Payment

&#x20;│

&#x20;└── Media

```



We need:



\* transactions

\* foreign keys

\* unique constraints

\* indexes

\* concurrency control

\* atomic capacity enforcement

\* relational queries



So:



\### \*\*PostgreSQL\*\*



Not MongoDB.



This is a relational business system, not a document store.



The handbook already calls for a managed relational database and specifically emphasizes transactions, constraints and registration correctness. 



\---



\# 4. ORM / Database access



I'd recommend:



\### \*\*Prisma\*\*



Architecture:



```text

Next.js

&#x20;  │

&#x20;  ▼

Prisma

&#x20;  │

&#x20;  ▼

PostgreSQL

```



Why?



Because we have a fairly complicated schema and want:



\* typed queries

\* migrations

\* schema visibility

\* developer productivity

\* easier onboarding for the next IT team



But here's an important rule:



> \*\*Prisma is not the security boundary.\*\*



Database constraints and server-side business logic remain authoritative.



For example:



```text

Prisma validation

&#x20;     +

application validation

&#x20;     +

PostgreSQL constraints

```



not:



```text

"Prisma checked it, therefore we're safe."

```



\---



\# 5. Authentication



We don't need student accounts.



The architecture remains:



```text

PUBLIC USER

&#x20;    │

&#x20;    └── NO ACCOUNT REQUIRED



ADMIN

&#x20;    │

&#x20;    ▼

AUTHENTICATION

&#x20;    │

&#x20;    ▼

ADMIN SESSION

&#x20;    │

&#x20;    ▼

ROLE AUTHORIZATION

```



v0.4 explicitly says public pages and student forms do not require student accounts, while the admin dashboard requires authenticated sessions. 



\### Recommended approach



For only two operational roles:



```text

CCF\_ADMIN

IT\_ADMIN

```



I'd prefer \*\*managed authentication / magic link or OAuth-based authentication\*\* rather than us building password authentication ourselves.



The handbook itself recommends an established identity provider or managed magic-link approach. 



We can decide the exact provider separately.



\---



\# 6. Authorization



Authentication answers:



> Who are you?



Authorization answers:



> What are you allowed to do?



Our architecture:



```text

Authenticated Admin

&#x20;       │

&#x20;       ▼

&#x20;   Role Check

&#x20;       │

&#x20;  ┌────┴────┐

&#x20;  ▼         ▼

CCF\_ADMIN IT\_ADMIN

&#x20;  │         │

&#x20;  └────┬────┘

&#x20;       ▼

Full MVP operational access

```



Both currently have the same operational permissions.



But:



```text

Infrastructure credentials

Database credentials

Hosting ownership

Domain ownership

```



are \*\*not automatically application permissions\*\*.



That distinction matters for handover.



The handbook already establishes this separation. 



\---



\# 7. Media architecture



This is where I don't want us storing everything directly in PostgreSQL.



Database:



```text

media.id

media.url/key

media.type

media.eventId

media.caption

media.order

```



Actual image:



```text

Object Storage

&#x20;     │

&#x20;     ├── events/

&#x20;     ├── members/

&#x20;     ├── gallery/

&#x20;     ├── departments/

&#x20;     └── branding/

```



So:



```text

PostgreSQL

&#x20;   │

&#x20;   └── metadata



Object Storage

&#x20;   │

&#x20;   └── actual files

```



The club's current Google Drive remains the \*\*source of supplied media\*\*, not necessarily our production storage. The handbook explicitly separates those two concepts. 



\### Provider



\*\*TBD\*\*



We can evaluate:



\* Supabase Storage

\* Cloudinary

\* S3-compatible storage



after we settle the rest of the stack.



\---



\# 8. The Event Engine



This is the heart of the application.



```text

EVENT

│

├── Basic Information

│

├── Content

│

├── Eligibility

│

├── Registration

│

├── Capacity

│

├── Team Rules

│

├── Payment

│

├── WhatsApp

│

└── Lifecycle

```



Conceptually:



```text

Event

├── eventType / status

├── title

├── slug

├── poster

├── startAt

├── endAt

├── venue

├── description

├── rules

│

├── eligibility

│   ├── crescentAllowed

│   └── externalAllowed

│

├── registration

│   ├── mode

│   ├── opensAt

│   ├── closesAt

│   └── activeFormVersion

│

├── capacity

│   ├── limit

│   └── mode

│

├── teamConfiguration

│

├── paymentConfiguration

│

└── whatsappConfiguration

```



This directly follows the configurable-event model established in v0.4. 



\---



\# 9. Form Builder Architecture



This is our most interesting subsystem.



```text

Event

&#x20;│

&#x20;└── FormVersion

&#x20;      │

&#x20;      ├── EventField

&#x20;      ├── EventField

&#x20;      ├── EventField

&#x20;      └── EventField

```



Each field:



```text

EventField

├── id

├── type

├── label

├── description

├── required

├── order

├── config

└── validation

```



Types:



```text

SYSTEM

&#x20;├── PARTICIPANT\_TYPE

&#x20;├── CRESCENT\_RRN

&#x20;├── EXTERNAL\_COLLEGE

&#x20;├── EXTERNAL\_ROLL\_NUMBER

&#x20;├── DEPARTMENT

&#x20;├── YEAR

&#x20;├── ACADEMIC\_LEVEL

&#x20;├── PHONE

&#x20;└── etc.



CUSTOM

&#x20;├── TEXT

&#x20;├── LONG\_TEXT

&#x20;├── NUMBER

&#x20;├── EMAIL

&#x20;├── URL

&#x20;├── DATE

&#x20;├── TIME

&#x20;├── SELECT

&#x20;├── RADIO

&#x20;├── CHECKBOX

&#x20;└── FILE

```



And:



```text

ConditionalRule

```



handles:



```text

IF participantType == CRESCENT

&#x20;   SHOW RRN



IF participantType == EXTERNAL

&#x20;   SHOW College

&#x20;   SHOW Roll Number

```



\---



\# 10. Form versioning



This is critical.



```text

Form

&#x20;│

&#x20;├── Version 1

&#x20;│      └── Registrations 1–500

&#x20;│

&#x20;└── Version 2

&#x20;       └── New registrations

```



Never modify historical schema underneath existing registrations.



Example:



```text

v1

Name

RRN

Phone



&#x20;      ↓



CCF reopens event



&#x20;      ↓



v2

Name

RRN

Phone

Portfolio

```



Old registrations remain associated with v1.



New registrations use v2.



This is explicitly required by v0.4. 



\---



\# 11. Registration Engine



This deserves a dedicated service/module.



```text

POST /events/:id/register

&#x20;            │

&#x20;            ▼

&#x20;      Validate Event

&#x20;            │

&#x20;            ▼

&#x20;     Check Event State

&#x20;            │

&#x20;            ▼

&#x20;     Check Eligibility

&#x20;            │

&#x20;            ▼

&#x20;     Resolve Form Version

&#x20;            │

&#x20;            ▼

&#x20;     Validate Fields

&#x20;            │

&#x20;            ▼

&#x20;     Validate Identity

&#x20;            │

&#x20;            ▼

&#x20;     Check Duplicate

&#x20;            │

&#x20;            ▼

&#x20;     Validate Team

&#x20;            │

&#x20;            ▼

&#x20;     Check Capacity

&#x20;            │

&#x20;            ▼

&#x20;     Payment Required?

&#x20;       /           \\

&#x20;     NO             YES

&#x20;     │               │

&#x20;     │          Payment Flow

&#x20;     │               │

&#x20;     └───────┬───────┘

&#x20;             ▼

&#x20;      DATABASE TRANSACTION

&#x20;             │

&#x20;             ▼

&#x20;        REGISTRATION

```



The critical word is:



\### \*\*TRANSACTION\*\*



Because two people could submit at exactly the same time.



We cannot do:



```text

if seats\_available:

&#x20;   create\_registration()

```



without transaction/locking logic.



Otherwise:



```text

Capacity = 100



Request A → sees 100

Request B → sees 100



A registers

B registers



101 students

```



💀



v0.4 explicitly requires atomic capacity enforcement under simultaneous requests. 



\---



\# 12. Participant identity model



We need a polymorphic identity model.



\### Crescent



```text

Participant

├── type = CRESCENT

├── name

├── rrn

└── contact

```



Uniqueness:



```text

EVENT + RRN

```



\### External



```text

Participant

├── type = EXTERNAL

├── name

├── college

├── rollNumber

└── contact

```



Uniqueness:



```text

EVENT + normalizedCollege + normalizedRollNumber

```



This is now locked from v0.4. 



\---



\# 13. Team architecture



I would model:



```text

Registration

&#x20;    │

&#x20;    └── Team

&#x20;          │

&#x20;          ├── TeamMember

&#x20;          ├── TeamMember

&#x20;          ├── TeamMember

&#x20;          └── TeamMember

```



A team member references a participant/registration identity.



Team configuration:



```text

mode:

INDIVIDUAL

TEAM



leaderRequired:

true/false



teamNameRequired:

true/false



minSize:

N



maxSize:

N



mixedParticipants:

ALLOWED

```



Capacity:



```text

capacityMode = STUDENTS

```



means count people.



```text

capacityMode = TEAMS

```



means count teams.



v0.4 explicitly establishes both capacity modes and mixed teams. 



\---



\# 14. Payment architecture



We'll separate it completely.



```text

&#x20;                   PAYMENT

&#x20;                      │

&#x20;            ┌─────────┴─────────┐

&#x20;            │                   │

&#x20;       INTERNAL              EXTERNAL

&#x20;            │                   │

&#x20;            ▼                   ▼

&#x20;       CCF System          Google Form

&#x20;            │                   │

&#x20;       MANUAL\_UPI           External QR/

&#x20;       / Future Provider    UPI workflow

&#x20;            │

&#x20;            ▼

&#x20;     Payment Verification

&#x20;            │

&#x20;            ▼

&#x20;         CONFIRMED

```



\### Internal MVP



```text

Server

&#x20; │

&#x20; ├── amount

&#x20; ├── UPI ID

&#x20; ├── payee

&#x20; └── reference

&#x20;       │

&#x20;       ▼

&#x20;  UPI Deep Link

&#x20;       │

&#x20;       ▼

&#x20;    Student

&#x20;       │

&#x20;       ▼

&#x20;   UPI payment

&#x20;       │

&#x20;       ▼

&#x20;  UTR / Transaction ID

&#x20;       │

&#x20;       ▼

&#x20;Pending Verification

&#x20;       │

&#x20;       ▼

&#x20;  Admin verifies

&#x20;       │

&#x20;       ▼

&#x20;      PAID

```



No Razorpay dependency in MVP unless we later decide we actually need automated payment verification.



\---



\# 15. External registration architecture



This should be almost stupidly simple.



```text

Event

&#x20;│

&#x20;└── registrationMode = EXTERNAL

&#x20;         │

&#x20;         └── externalUrl

```



Public:



```text

EVENT PAGE



\[ REGISTER NOW ]

&#x20;      │

&#x20;      ▼

Google Form

```



Our system does \*\*not\*\* attempt to know:



```text

Did they submit?

Did they pay?

Did CCF verify their UTR?

```



That's external.



This separation is explicitly established in v0.4. 



\---



\# 16. Recruitment architecture



Keep it completely separate from events.



```text

Recruitment

├── status

├── opensAt?\*

├── closesAt?\*

├── applications

│

└── configuration

```



Application:



```text

Name

RRN

Applying Department

Academic Department

Year

WhatsApp Number

```



One application per active recruitment cycle.



And:



```text

Admin deletes

&#x20;     ↓

RRN can apply again

```



as already decided.



\---



\# 17. API architecture



I'd keep the API organized around domains rather than creating random endpoints.



```text

/api

│

├── /events

│

├── /registrations

│

├── /forms

│

├── /teams

│

├── /payments

│

├── /recruitment

│

├── /members

│

├── /departments

│

├── /media

│

└── /admin

```



Public endpoints:



```text

GET  /api/events

GET  /api/events/:slug

POST /api/events/:id/register

POST /api/recruitment/apply

```



Admin endpoints:



```text

POST   /api/admin/events

PATCH  /api/admin/events/:id

DELETE /api/admin/events/:id



POST   /api/admin/events/:id/publish

POST   /api/admin/events/:id/close



GET    /api/admin/registrations

DELETE /api/admin/registrations/:id



POST   /api/admin/registrations/export



POST   /api/admin/payments/:id/verify



GET    /api/admin/recruitment

DELETE /api/admin/recruitment/applications/:id

```



The exact route naming can be finalized when we create the API contract.



\---



\# 18. Admin architecture



```text

/admin

│

├── dashboard

│

├── events

│   ├── list

│   ├── create

│   └── \[event]

│       ├── overview

│       ├── content

│       ├── registration

│       ├── form-builder

│       ├── teams

│       ├── payment

│       ├── registrations

│       └── media

│

├── recruitment

├── members

├── departments

├── media

├── notifications

├── audit

└── settings

```



This is where the IT team spends most of its time.



\---



\# 19. CSV export architecture



Export should happen \*\*server-side\*\*.



```text

Admin

&#x20;│

&#x20;▼

Select Event

&#x20;│

&#x20;▼

Select Export

&#x20;│

&#x20;▼

Server loads:

&#x20;├── registrations

&#x20;├── form version

&#x20;├── field definitions

&#x20;├── teams

&#x20;└── responses

&#x20;│

&#x20;▼

Generate CSV

&#x20;│

&#x20;▼

UTF-8 / Excel-compatible

&#x20;│

&#x20;▼

Download

```



The form version associated with each registration determines the historical schema.



So even if v2 exists:



```text

Registration #1 → Form v1

Registration #501 → Form v2

```



the exporter still understands both.



v0.4 explicitly requires schema-driven exports and historical form interpretation. 



\---



\# 20. Notifications



Don't build a notification microservice. 😂



For MVP:



```text

Registration

&#x20;     │

&#x20;     ▼

Notification Event

&#x20;     │

&#x20;     ├── Admin dashboard notification

&#x20;     │

&#x20;     └── Email notification

```



We can later add Telegram if CCF actually wants it.



The dashboard should aggregate notifications rather than sending:



> 🔔 REGISTERED

> 🔔 REGISTERED

> 🔔 REGISTERED

> 🔔 REGISTERED



every 4 seconds.



\---



\# 21. Security architecture



Our security boundary:



```text

PUBLIC

&#x20;│

&#x20;├── Published content

&#x20;├── Public event info

&#x20;└── Registration endpoints

&#x20;       │

&#x20;       ▼

&#x20;  SERVER VALIDATION

&#x20;       │

&#x20;       ▼

&#x20;    DATABASE



ADMIN

&#x20;│

&#x20;▼

AUTHENTICATION

&#x20;│

&#x20;▼

AUTHORIZATION

&#x20;│

&#x20;▼

ADMIN API

&#x20;│

&#x20;▼

DATABASE

```



Never:



```text

Browser

&#x20; ↓

Database

```



The public browser never gets direct unrestricted DB access.



Security requirements already established in v0.4 include server validation, rate limiting, secure cookies, protected admin routes, CSRF where applicable, secrets management and sensitive-data protection. 



\---



\# 22. Repository architecture



I recommend a \*\*single repository\*\*.



Something like:



```text

ccf-platform/

│

├── app/

│   ├── (public)/

│   ├── admin/

│   └── api/

│

├── components/

│   ├── ui/

│   ├── events/

│   ├── forms/

│   ├── registration/

│   ├── teams/

│   ├── admin/

│   └── gallery/

│

├── lib/

│   ├── auth/

│   ├── db/

│   ├── events/

│   ├── registration/

│   ├── forms/

│   ├── teams/

│   ├── payments/

│   ├── csv/

│   ├── media/

│   ├── notifications/

│   └── validation/

│

├── prisma/

│   ├── schema.prisma

│   └── migrations/

│

├── public/

│

├── tests/

│   ├── unit/

│   ├── integration/

│   ├── e2e/

│   └── load/

│

├── scripts/

│

├── docs/

│

├── .env.example

├── package.json

└── README.md

```



This is intentionally boring.



\*\*Boring architecture is good architecture for a college club.\*\*



The next batch should be able to open the repository and understand it.



\---



\# 23. Environments



Minimum:



```text

Development

&#x20;    ↓

Staging

&#x20;    ↓

Production

```



\### Development



Local machines.



\### Staging



Realistic test environment.



Used for:



\* registration testing

\* payment testing

\* migrations

\* admin testing

\* load testing



\### Production



Real CCF website.



Never test destructive operations against production.



The handbook already requires staged migrations, protected production branches and recovery testing. 



\---



\# 24. Deployment architecture



My recommended direction:



```text

GitHub

&#x20;  │

&#x20;  ▼

CI / Checks

&#x20;  │

&#x20;  ▼

Vercel

&#x20;  │

&#x20;  ├── Next.js application

&#x20;  │

&#x20;  └── Preview deployments

&#x20;         │

&#x20;         ▼

&#x20;     Production

```



Database:



```text

Managed PostgreSQL

```



Storage:



```text

Managed Object Storage

```



Authentication:



```text

Managed Auth

```



This keeps infrastructure low-maintenance for the three-person IT team.



\*\*But:\*\* Vercel/Postgres/provider choices are still \*\*architectural recommendations\*\*, not CCF-confirmed requirements. That's exactly how v0.4 classifies them. 



\---



\# 25. Backup \& recovery



Three layers:



\### Database



Managed automated backups.



\### Registration exports



Operational CSV backup before event-data deletion.



\### Media



Object-storage recovery/versioning where supported.



Flow:



```text

Event Completed

&#x20;     ↓

Generate CSV

&#x20;     ↓

Verify CSV

&#x20;     ↓

Share with CCF

&#x20;     ↓

CCF confirms handover

&#x20;     ↓

Delete event registration data

&#x20;     ↓

Retain required audit information

```



That's already part of the approved architecture. 



\---



\# 26. Observability



MVP doesn't need Datadog-level infrastructure.



We need:



```text

Application errors

&#x20;      ↓

Error monitoring



Admin activity

&#x20;      ↓

AuditLog



Critical operations

&#x20;      ↓

Structured logs



Availability

&#x20;      ↓

Uptime monitoring

```



And especially:



```text

registration failures

payment verification

capacity conflicts

admin deletion

CSV exports

authentication failures

```



should be diagnosable.



\---



\# 27. The final architecture



So if we compress everything into one picture:



```text

&#x20;                          CCF PLATFORM

&#x20;                               │

&#x20;               ┌───────────────┴────────────────┐

&#x20;               │                                │

&#x20;         PUBLIC APPLICATION                ADMIN APPLICATION

&#x20;               │                                │

&#x20;       ┌───────┼────────┐              ┌────────┼────────┐

&#x20;       │       │        │              │        │        │

&#x20;     Pages   Events  Join Us         Events  Registr. Recruitment

&#x20;               │                       │        │

&#x20;               ▼                       │        │

&#x20;         Registration                  │        │

&#x20;               │                       │        │

&#x20;       ┌───────┼────────────┐          │        │

&#x20;       │       │            │          │        │

&#x20;    Internal External      None        │        │

&#x20;       │       │                       │        │

&#x20;       ▼       ▼                       │        │

&#x20;   Form      Google                     │        │

&#x20;  Builder     Form                      │        │

&#x20;       │                                │        │

&#x20;       └────────────┬───────────────────┘        │

&#x20;                    │                            │

&#x20;                    ▼                            │

&#x20;             APPLICATION SERVER ◄────────────────┘

&#x20;                    │

&#x20;       ┌────────────┼────────────┐

&#x20;       │            │            │

&#x20;       ▼            ▼            ▼

&#x20;  PostgreSQL    Object Store   External

&#x20;       │                         │

&#x20;       │                    ┌────┼────┐

&#x20;       │                    │    │    │

&#x20;       │                   UPI  WhatsApp

&#x20;       │                        Google Forms

&#x20;       │                        Email

&#x20;       │

&#x20;       ▼

&#x20;   TRANSACTIONS

&#x20;   CONSTRAINTS

&#x20;   AUDIT LOG

&#x20;   BACKUPS

```



\---



\# 🔒 What I would lock now



\### \*\*Confirmed from CCF / v0.4\*\*



\* Single maintainable platform direction

\* Public website + private admin

\* No student accounts

\* PostgreSQL-class relational architecture

\* Server-side validation

\* Transactional registration

\* Dynamic forms

\* Internal/external/none registration

\* Mixed participants

\* Mixed teams

\* Manual UPI for internal MVP

\* External payment remains external

\* Dynamic CSV

\* Object-based media storage

\* Authenticated admin

\* Audit logging

\* Staging → production

\* Backup/recovery



\### \*\*Architectural recommendation — pending our approval\*\*



| Decision     | My recommendation                                            |

| ------------ | ------------------------------------------------------------ |

| Frontend     | \*\*Next.js + React\*\*                                          |

| Language     | \*\*TypeScript\*\*                                               |

| Backend      | \*\*Next.js server/API layer\*\*                                 |

| Database     | \*\*PostgreSQL\*\*                                               |

| ORM          | \*\*Prisma\*\*                                                   |

| Auth         | \*\*Managed auth / magic link\*\*                                |

| Hosting      | \*\*Vercel\*\*                                                   |

| Media        | \*\*S3-compatible / Cloudinary / Supabase Storage — evaluate\*\* |

| Payments     | \*\*Manual UPI MVP\*\*                                           |

| Repository   | \*\*Single GitHub monorepo/repository\*\*                        |

| Architecture | \*\*Modular monolith\*\*                                         |



\## And that last term is important:



\### \*\*Modular Monolith.\*\*



Not:



> "one giant spaghetti Next.js app."



And not:



> "17 microservices because we're feeling ambitious."



It's:



```text

ONE APPLICATION

│

├── Events Module

├── Forms Module

├── Registration Module

├── Teams Module

├── Payments Module

├── Recruitment Module

├── Members Module

├── Media Module

├── Notifications Module

├── Admin Module

└── Audit Module

```



Each module has clear responsibilities and interfaces, but everything lives in one deployable application.



\*\*For CCF, that's the sweet spot.\*\*



\---


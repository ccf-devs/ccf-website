\# CCF DB Architecture v0.2 — Constraints Specification



\---



\## 1. `admin\_users`



```text

PRIMARY KEY

&#x20;   id



UNIQUE

&#x20;   email



NOT NULL

&#x20;   email

&#x20;   name

&#x20;   role

&#x20;   active

&#x20;   created\_at

&#x20;   updated\_at



DEFAULT

&#x20;   active = true

```



\### Role



```text

CCF\_ADMIN

IT\_ADMIN

```



\---



\# 2. `departments`



```text

PRIMARY KEY

&#x20;   id



UNIQUE

&#x20;   slug

&#x20;   name



NOT NULL

&#x20;   slug

&#x20;   name

&#x20;   active

&#x20;   created\_at

&#x20;   updated\_at



DEFAULT

&#x20;   active = true

```



\---



\# 3. `members`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   department\_id → departments.id

&#x20;   photo\_media\_id → media.id



NOT NULL

&#x20;   name

&#x20;   visibility

&#x20;   display\_order

&#x20;   created\_at

&#x20;   updated\_at



DEFAULT

&#x20;   visibility = true

&#x20;   display\_order = 0

```



\### Important



```text

RRN

&#x20;   NOT STORED



Private phone number

&#x20;   NOT STORED

```



\---



\# 4. `events`



```text

PRIMARY KEY

&#x20;   id



UNIQUE

&#x20;   slug



FOREIGN KEY

&#x20;   active\_form\_version\_id → form\_versions.id



NOT NULL

&#x20;   slug

&#x20;   name

&#x20;   status

&#x20;   capacity\_mode

&#x20;   registration\_mode

&#x20;   eligibility\_crescent

&#x20;   eligibility\_external

&#x20;   payment\_mode

&#x20;   created\_at

&#x20;   updated\_at

```



\### Capacity



```text

capacity IS NULL

&#x20;   → UNLIMITED



capacity > 0

&#x20;   → LIMITED

```



```text

capacity >= 0

```



\### Registration schedule



```text

registration\_opens\_at < registration\_closes\_at

```



when both values exist.



\### Eligibility



```text

registration\_mode != NONE

&#x20;   →

eligibility\_crescent = true

OR

eligibility\_external = true

```



\### Payment



```text

payment\_mode = FREE

&#x20;   →

fee\_amount = 0 OR NULL

payment\_method = NULL

```



```text

payment\_mode = PAID

&#x20;   →

fee\_amount > 0

payment\_method IS NOT NULL

```



\### Event status



```text

DRAFT

PUBLISHED

CLOSED

ARCHIVED

```



\### Registration mode



```text

INTERNAL

EXTERNAL

NONE

```



> \*\*Note:\*\* Since we support events containing both Crescent and external students, the event should not use `INTERNAL`/`EXTERNAL` as mutually exclusive registration modes when both are allowed. Those values describe the supported participant source; the actual architecture should allow `CRESCENT`, `EXTERNAL`, or `MIXED`. This is one enum I'd update before implementation.



\### Capacity mode



```text

STUDENTS

TEAMS

```



\### Payment mode



```text

FREE

PAID

```



\### Payment method



```text

MANUAL\_UPI

PROVIDER

```



\---



\# 5. `event\_content`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   event\_id → events.id



UNIQUE

&#x20;   event\_id



NOT NULL

&#x20;   event\_id

&#x20;   updated\_at

```



\### Relationship



```text

ONE EVENT

&#x20;   →

ONE EVENT\_CONTENT

```



\---



\# 6. `form\_versions`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   event\_id → events.id

&#x20;   created\_by → admin\_users.id



UNIQUE

&#x20;   (event\_id, version\_number)



NOT NULL

&#x20;   event\_id

&#x20;   version\_number

&#x20;   status

&#x20;   created\_by

&#x20;   created\_at

```



\### Version number



```text

version\_number > 0

```



\### Version lifecycle



```text

DRAFT

PUBLISHED

CLOSED

```



\### Immutability



```text

PUBLISHED version

&#x20;   →

CANNOT be modified

```



Changes require:



```text

PUBLISHED v1

&#x20;   ↓

NEW v2

```



\---



\# 7. `event\_fields`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   form\_version\_id → form\_versions.id



UNIQUE

&#x20;   (form\_version\_id, key)



NOT NULL

&#x20;   form\_version\_id

&#x20;   key

&#x20;   label

&#x20;   type

&#x20;   field\_scope

&#x20;   required

&#x20;   display\_order

```



\### Display order



```text

display\_order >= 0

```



\### Field scope



```text

SYSTEM

CUSTOM

```



\### Response representation



```text

value\_text IS NOT NULL

XOR

value\_json IS NOT NULL

```



Only one response representation should be populated.



\---



\# 8. `registrations`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   event\_id → events.id

&#x20;   form\_version\_id → form\_versions.id



UNIQUE

&#x20;   registration\_code



NOT NULL

&#x20;   event\_id

&#x20;   form\_version\_id

&#x20;   registration\_mode

&#x20;   participant\_type

&#x20;   participant\_name

&#x20;   status

&#x20;   registration\_code

&#x20;   created\_at

&#x20;   updated\_at

```



\### Participant type



```text

CRESCENT

EXTERNAL

```



\### Registration mode



```text

INDIVIDUAL

TEAM

```



\### Registration status



```text

PENDING

CONFIRMED

CANCELLED

```



\### Event/Form consistency



```text

registration.event\_id

&#x20;   =

form\_version.event\_id

```



A registration cannot use a form belonging to another event.



\---



\# 9. `registration\_responses`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   registration\_id → registrations.id

&#x20;   event\_field\_id → event\_fields.id



UNIQUE

&#x20;   (registration\_id, event\_field\_id)



NOT NULL

&#x20;   registration\_id

&#x20;   event\_field\_id

```



\### Response value



```text

value\_text IS NOT NULL

XOR

value\_json IS NOT NULL

```



\---



\# 10. `teams`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   registration\_id → registrations.id



UNIQUE

&#x20;   registration\_id



NOT NULL

&#x20;   registration\_id

&#x20;   created\_at

```



\### Relationship



```text

ONE REGISTRATION

&#x20;   →

ZERO OR ONE TEAM

```



\---



\# 11. `team\_members`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   team\_id → teams.id



NOT NULL

&#x20;   team\_id

&#x20;   participant\_type

&#x20;   name

&#x20;   is\_leader

```



\### Participant type



```text

CRESCENT

EXTERNAL

```



\### Mixed teams



```text

CRESCENT + CRESCENT       → ALLOWED

CRESCENT + EXTERNAL       → ALLOWED

EXTERNAL + EXTERNAL       → ALLOWED

```



\### Team size



Team minimum/maximum constraints are \*\*event-specific\*\*, therefore they should be validated against the event/form configuration rather than hard-coded into `team\_members`.



```text

min\_team\_size <= actual\_team\_size <= max\_team\_size

```



when configured.



\### Leader requirement



```text

leader\_required = true

&#x20;   →

exactly one team member must have

is\_leader = true

```



If the event doesn't require a leader:



```text

leader\_required = false

&#x20;   →

no leader constraint

```



\---



\# 12. `event\_participants`



\*\*NEW / CRITICAL TABLE\*\*



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   event\_id → events.id

&#x20;   registration\_id → registrations.id



NOT NULL

&#x20;   event\_id

&#x20;   registration\_id

&#x20;   participant\_type

&#x20;   identifier\_normalized

&#x20;   created\_at

```



\### Purpose



```text

EVENT\_PARTICIPANT

&#x20;   =

ACTIVE PARTICIPATION / IDENTITY LOCK

```



It does \*\*not\*\* replace:



```text

registrations

team\_members

```



\---



\## Crescent uniqueness



```text

UNIQUE

&#x20;   (event\_id, identifier\_normalized)



WHERE

&#x20;   participant\_type = CRESCENT

```



Therefore:



```text

EVENT A + RRN 123

&#x20;   → ONLY ONE ACTIVE PARTICIPATION

```



\---



\## External uniqueness



```text

UNIQUE

&#x20;   (event\_id, college\_normalized, identifier\_normalized)



WHERE

&#x20;   participant\_type = EXTERNAL

```



Therefore:



```text

EVENT A + ABC COLLEGE + 12345

&#x20;   → ONLY ONE ACTIVE PARTICIPATION

```



But:



```text

EVENT A + XYZ COLLEGE + 12345

&#x20;   → ALLOWED

```



\---



\## Registration relationship



```text

ONE REGISTRATION

&#x20;   →

ONE OR MANY EVENT\_PARTICIPANTS

```



Individual:



```text

Registration

&#x20;   └── 1 EventParticipant

```



Team:



```text

Registration

&#x20;   └── N EventParticipants

```



\---



\## Re-registration rule



When registration is cancelled/deleted:



```text

registration

&#x20;   ↓

event\_participants released

&#x20;   ↓

participant can register again

```



\---



\# 13. `payments`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   registration\_id → registrations.id

&#x20;   verified\_by → admin\_users.id



UNIQUE

&#x20;   registration\_id



NOT NULL

&#x20;   registration\_id

&#x20;   method

&#x20;   status

&#x20;   amount

&#x20;   currency

&#x20;   created\_at

&#x20;   updated\_at

```



\### Amount



```text

amount > 0

```



\### Currency



```text

currency = INR

```



\### Payment status



```text

PENDING

VERIFIED

REJECTED

EXPIRED

REFUNDED

```



\### Important



```text

Payment status

&#x20;   =

SINGLE SOURCE OF TRUTH

```



No:



```text

registrations.payment\_status

```



\---



\# 14. `recruitment\_applications`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   department\_id → departments.id



NOT NULL

&#x20;   rrn\_normalized

&#x20;   name

&#x20;   department\_id

&#x20;   academic\_department

&#x20;   year

&#x20;   phone

&#x20;   status

&#x20;   created\_at

&#x20;   updated\_at

```



\### Active recruitment uniqueness



```text

UNIQUE

&#x20;   rrn\_normalized



WHERE

&#x20;   application is active

```



\### Re-application



```text

DELETE application

&#x20;   ↓

RRN becomes available

&#x20;   ↓

student can apply again

```



\---



\# 15. `media`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   event\_id → events.id



NOT NULL

&#x20;   object\_key

&#x20;   mime\_type

&#x20;   visibility

&#x20;   display\_order

&#x20;   created\_at

```



\### Event relationship



```text

event\_id = NULL

&#x20;   →

general/member/site asset



event\_id != NULL

&#x20;   →

event media

```



\### File storage



```text

DATABASE

&#x20;   →

stores metadata/object key



OBJECT STORAGE

&#x20;   →

stores actual image/file

```



\---



\# 16. `notifications`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   target\_admin\_id → admin\_users.id



NOT NULL

&#x20;   type

&#x20;   title

&#x20;   body

&#x20;   severity

&#x20;   created\_at

```



\### Target



```text

target\_admin\_id = NULL

&#x20;   →

GLOBAL notification



target\_admin\_id != NULL

&#x20;   →

ADMIN-SPECIFIC notification

```



\### Read state



```text

read\_at = NULL

&#x20;   →

UNREAD



read\_at != NULL

&#x20;   →

READ

```



\---



\# 17. `audit\_logs`



```text

PRIMARY KEY

&#x20;   id



FOREIGN KEY

&#x20;   actor\_id → admin\_users.id



NOT NULL

&#x20;   action

&#x20;   entity\_type

&#x20;   created\_at

```



\### Example actions



```text

EVENT\_CREATED

EVENT\_UPDATED

EVENT\_PUBLISHED

EVENT\_CLOSED



FORM\_CREATED

FORM\_PUBLISHED

FORM\_VERSION\_CREATED



REGISTRATION\_DELETED

REGISTRATION\_DATA\_PURGED



PAYMENT\_VERIFIED

PAYMENT\_REJECTED



CSV\_EXPORTED



RECRUITMENT\_APPLICATION\_DELETED

```



\### Privacy constraint



```text

DO NOT STORE

&#x20;   deleted student's PII

&#x20;   phone numbers

&#x20;   RRN

&#x20;   raw registration responses

&#x20;   payment secrets

```



Metadata should contain operational information only.



\---



\# 18. `site\_settings`



```text

PRIMARY KEY

&#x20;   key



FOREIGN KEY

&#x20;   updated\_by → admin\_users.id



NOT NULL

&#x20;   key

&#x20;   value

&#x20;   updated\_by

&#x20;   updated\_at

```



\### Example keys



```text

club\_email

instagram\_url

linkedin\_url

contact\_location

recruitment\_status

recruitment\_whatsapp\_url

```



\### Security



```text

SECRETS

&#x20;   NOT STORED HERE

```



\---



\# Cross-table constraints



These are the constraints that \*\*cannot be understood by looking at one table alone\*\*.



\## C1 — Event/Form consistency



```text

registrations.event\_id

&#x20;       =

form\_versions.event\_id

```



\---



\## C2 — Event Participant consistency



```text

event\_participants.event\_id

&#x20;       =

registrations.event\_id

```



A participant lock cannot belong to an unrelated event.



\---



\## C3 — Participant uniqueness



\### Crescent



```text

EVENT + RRN

&#x20;   →

ONE ACTIVE PARTICIPATION

```



\### External



```text

EVENT + COLLEGE + ROLL\_NUMBER

&#x20;   →

ONE ACTIVE PARTICIPATION

```



\---



\## C4 — Individual registration



```text

INDIVIDUAL registration

&#x20;   →

exactly ONE EventParticipant

```



\---



\## C5 — Team registration



```text

TEAM registration

&#x20;   →

ONE Team

&#x20;   →

ONE OR MORE TeamMembers

&#x20;   →

CORRESPONDING EventParticipants

```



\---



\## C6 — Team participant uniqueness



```text

Crescent RRN

&#x20;   →

cannot exist in two active teams

within the same event

```



because both teams would attempt to create:



```text

EVENT + RRN

```



inside `event\_participants`.



\---



\## C7 — Cross-mode uniqueness



This is important.



A student cannot do:



```text

Individual registration

\+

Team registration

```



for the same event.



Example:



```text

Rohith

&#x20;  ↓

Individual Registration

&#x20;  ↓

EVENT\_PARTICIPANT

&#x20;  ↓

Magnora + RRN001

```



Then:



```text

Rohith

&#x20;  ↓

Team Registration

&#x20;  ↓

EVENT\_PARTICIPANT

&#x20;  ↓

Magnora + RRN001

```



❌ Database rejects it.



\---



\## C8 — External identity



```text

Same Roll Number

\+

Different College

=

DIFFERENT PARTICIPANTS

```



Example:



```text

ABC + 12345

XYZ + 12345

```



✅ Allowed.



But:



```text

ABC + 12345

ABC + 12345

```



❌ Rejected.



\---



\## C9 — Event capacity



For student-based capacity:



```text

active\_event\_participants

&#x20;   <= event.capacity

```



For team-based capacity:



```text

active\_registrations

&#x20;   <= event.capacity

```



This check must happen \*\*inside a transaction\*\* so two simultaneous registrations can't both consume the final available slot.



\---



\## C10 — Registration window



Registration allowed only when:



```text

CURRENT\_TIME >= registration\_opens\_at

AND

CURRENT\_TIME < registration\_closes\_at

```



Additionally:



```text

event.status = PUBLISHED

```



and:



```text

capacity not reached

```



\---



\## C11 — Closed form



```text

form\_version.status = CLOSED

&#x20;   →

NO NEW REGISTRATIONS

```



\---



\## C12 — Published form immutability



```text

PUBLISHED FORM VERSION

&#x20;   →

IMMUTABLE

```



Modification:



```text

v1

&#x20;↓

create v2

&#x20;↓

publish v2

```



\---



\## C13 — Payment consistency



```text

event.payment\_mode = FREE

&#x20;   →

NO PAYMENT REQUIRED

```



```text

event.payment\_mode = PAID

&#x20;   →

PAYMENT RECORD REQUIRED

```



for internal registrations.



\---



\## C14 — External Google Form



When the event uses the external fallback:



```text

external\_registration\_url != NULL

```



then:



```text

INTERNAL registration form

&#x20;   →

NOT REQUIRED

```



and:



```text

External payment

&#x20;   →

NOT STORED IN CCF PAYMENT TABLE

```



\---



\# Deletion constraints



These are especially important.



\## Registration deletion



When an admin deletes an active registration:



```text

REGISTRATION

&#x20;   ↓

REGISTRATION\_RESPONSES

&#x20;   ↓

TEAM

&#x20;   ↓

TEAM\_MEMBERS

&#x20;   ↓

PAYMENT

&#x20;   ↓

EVENT\_PARTICIPANTS

```



must be removed/released.



All of this must happen within:



```text

ONE DATABASE TRANSACTION

```



\---



\## Event registration-data deletion



When CCF wants an entire event's registration data removed:



```text

WHERE event\_id = TARGET\_EVENT

```



delete:



```text

REGISTRATION\_RESPONSES

TEAM\_MEMBERS

TEAMS

PAYMENTS

EVENT\_PARTICIPANTS

REGISTRATIONS

```



\### Retain



```text

EVENT

EVENT\_CONTENT

MEDIA

```



\### Retain operational audit



```text

AUDIT\_LOG

```



without deleted participant PII.



\---



\## Event itself



```text

EVENT

&#x20;   →

DO NOT CASCADE DELETE REGISTRATION DATA

```



Instead:



```text

EVENT

&#x20;   ↓

ARCHIVED

```



and use the dedicated registration-data purge operation.



\---



\# Indexes



Finally, these are the indexes I'd explicitly define.



```text

EVENTS

&#x20;   INDEX(status)

&#x20;   INDEX(registration\_opens\_at, registration\_closes\_at)



REGISTRATIONS

&#x20;   INDEX(event\_id, created\_at)

&#x20;   INDEX(form\_version\_id)



EVENT\_PARTICIPANTS

&#x20;   INDEX(event\_id)

&#x20;   INDEX(registration\_id)



TEAM\_MEMBERS

&#x20;   INDEX(team\_id)



REGISTRATION\_RESPONSES

&#x20;   INDEX(registration\_id)



PAYMENTS

&#x20;   INDEX(status)



RECRUITMENT\_APPLICATIONS

&#x20;   INDEX(status)

```



And the critical unique indexes:



```text

EVENT\_PARTICIPANTS



UNIQUE(event\_id, identifier\_normalized)

WHERE participant\_type = CRESCENT



UNIQUE(event\_id, college\_normalized, identifier\_normalized)

WHERE participant\_type = EXTERNAL

```



\---



\## One correction I'd make before we freeze this



There's one thing in the \*\*old specification\*\* that we should explicitly change now: `events.registration\_mode = INTERNAL | EXTERNAL | NONE` isn't sufficient for our new requirement that \*\*the same event can accept both Crescent and external students\*\*. The architecture needs a `MIXED` capability (or separate eligibility flags as the actual source of truth), which the earlier document already had via `eligibility\_crescent` and `eligibility\_external`. 



So I'd make the implementation rule:



```text

eligibility\_crescent = true

eligibility\_external = false

&#x20;   → CRESCENT ONLY



eligibility\_crescent = false

eligibility\_external = true

&#x20;   → EXTERNAL ONLY



eligibility\_crescent = true

eligibility\_external = true

&#x20;   → MIXED

```



That is cleaner than relying on a three-value `registration\_mode` enum.



\*\*This is the constraint sheet I'd hand to the person implementing the PostgreSQL/Prisma schema.\*\*




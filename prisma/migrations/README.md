# CCF Prisma Migrations

## Partial Unique Indexes

Prisma's schema DSL does not support partial (conditional) unique indexes.
The following critical indexes **must** be added via raw SQL in the migration files.

---

### `event_participants` — Crescent identity uniqueness

```sql
CREATE UNIQUE INDEX ep_crescent_unique
  ON event_participants (event_id, identifier_normalized)
  WHERE participant_type = 'CRESCENT';
```

This enforces: one Crescent student (identified by normalized RRN) can have
only one active registration per event.

---

### `event_participants` — External identity uniqueness

```sql
CREATE UNIQUE INDEX ep_external_unique
  ON event_participants (event_id, college_normalized, identifier_normalized)
  WHERE participant_type = 'EXTERNAL';
```

This enforces: one external participant (identified by normalized college +
normalized roll number) can have only one active registration per event.

Note: same roll number at a different college = different participant (allowed).

---

### `recruitment_applications` — Active RRN uniqueness

```sql
CREATE UNIQUE INDEX ra_active_rrn_unique
  ON recruitment_applications (rrn_normalized)
  WHERE status = 'ACTIVE';
```

This enforces: a student (identified by normalized RRN) can have only one
active recruitment application at a time. After deletion, they may apply again.

---

## Circular FK — `events` ↔ `form_versions`

There is a deliberate circular FK:
- `events.active_form_version_id → form_versions.id`
- `form_versions.event_id → events.id`

Prisma generates this correctly in the schema, but the initial migration SQL
must handle the creation order:

1. Create `events` table WITHOUT the `active_form_version_id` FK constraint.
2. Create `form_versions` table with `event_id → events.id` FK.
3. Add `active_form_version_id` FK via `ALTER TABLE events ADD CONSTRAINT ...`.

This ordering is required to avoid PostgreSQL FK resolution deadlock during
initial table creation.

When running `prisma migrate dev` for the first time, inspect the generated SQL
and ensure this ordering is present. If Prisma generates the FK inline with
the `CREATE TABLE` statement, move it to a separate `ALTER TABLE` statement.

---

## CHECK Constraints

The following CHECK constraints are required but cannot be expressed in Prisma DSL.
They should be added to the initial migration SQL:

```sql
-- events: capacity must be positive when not null
ALTER TABLE events
  ADD CONSTRAINT chk_events_capacity CHECK (capacity IS NULL OR capacity > 0);

-- events: fee_amount must be positive when payment_mode = PAID (application-enforced)
-- No CHECK constraint needed at DB level for payment_mode consistency —
-- enforced in registration transaction logic.

-- payments: amount must be positive
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_amount CHECK (amount > 0);

-- payments: currency must be INR
ALTER TABLE payments
  ADD CONSTRAINT chk_payments_currency CHECK (currency = 'INR');

-- event_fields: display_order must be non-negative
ALTER TABLE event_fields
  ADD CONSTRAINT chk_event_fields_display_order CHECK (display_order >= 0);

-- members: display_order must be non-negative
ALTER TABLE members
  ADD CONSTRAINT chk_members_display_order CHECK (display_order >= 0);

-- media: display_order must be non-negative
ALTER TABLE media
  ADD CONSTRAINT chk_media_display_order CHECK (display_order >= 0);

-- form_versions: version_number must be positive
ALTER TABLE form_versions
  ADD CONSTRAINT chk_form_versions_version_number CHECK (version_number > 0);
```

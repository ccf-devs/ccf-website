import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listFormVersions, POST as createFormVersion } from "@/app/api/admin/events/[id]/forms/route";
import { GET as getFormVersion, DELETE as deleteFormVersion } from "@/app/api/admin/events/[id]/forms/[versionId]/route";
import { POST as publishFormVersion } from "@/app/api/admin/events/[id]/forms/[versionId]/publish/route";
import { POST as addField } from "@/app/api/admin/events/[id]/forms/[versionId]/fields/route";
import { PATCH as updateField, DELETE as deleteField } from "@/app/api/admin/events/[id]/forms/[versionId]/fields/[fieldId]/route";
import { POST as reorderFields } from "@/app/api/admin/events/[id]/forms/[versionId]/reorder/route";
import { GET as getPublicForm } from "@/app/api/events/[slug]/form/route";
import { AdminRole, FormVersionStatus, FieldType, FieldScope, RegistrationMode } from "@prisma/client";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

// Mock auth session
vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

// Mock database client
vi.mock("@/lib/db/client", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    formVersion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    eventField: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock audit log helper
vi.mock("@/lib/audit/log", () => ({
  createAuditLog: vi.fn().mockResolvedValue({ id: "audit-123" }),
}));

describe("Phase 7: Dynamic Form Engine API Routes", () => {
  const mockAdmin = {
    id: "admin-uuid-1",
    name: "Lead Admin",
    email: "lead@crescent.education",
    role: AdminRole.CCF_ADMIN,
  };

  const sampleEvent = {
    id: "event-123",
    name: "Magnora’26 Finance Symposium",
    slug: "magnora-26",
    registrationMode: RegistrationMode.INTERNAL,
    activeFormVersionId: "ver-pub-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
  });

  describe("1. GET /api/admin/events/[id]/forms", () => {
    it("returns 401 if unauthenticated", async () => {
      (getCurrentAdmin as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/admin/events/event-123/forms");
      const res = await listFormVersions(req, { params: Promise.resolve({ id: "event-123" }) });
      expect(res.status).toBe(401);
    });

    it("returns 404 if event is not found", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/admin/events/non-existent/forms");
      const res = await listFormVersions(req, { params: Promise.resolve({ id: "non-existent" }) });
      expect(res.status).toBe(404);
    });

    it("returns form versions for valid event", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(sampleEvent);
      (prisma.formVersion.findMany as any).mockResolvedValue([
        {
          id: "ver-draft-2",
          eventId: "event-123",
          versionNumber: 2,
          status: FormVersionStatus.DRAFT,
          publishedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { fields: 5 },
        },
        {
          id: "ver-pub-1",
          eventId: "event-123",
          versionNumber: 1,
          status: FormVersionStatus.PUBLISHED,
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { fields: 5 },
        },
      ]);

      const req = new NextRequest("http://localhost/api/admin/events/event-123/forms");
      const res = await listFormVersions(req, { params: Promise.resolve({ id: "event-123" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(2);
      expect(data[0].versionNumber).toBe(2);
      expect(data[0].fieldsCount).toBe(5);
    });
  });

  describe("2. POST /api/admin/events/[id]/forms (Create / Clone Version)", () => {
    it("creates a brand new draft form version (v1)", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(sampleEvent);
      (prisma.formVersion.findFirst as any).mockResolvedValue(null); // No previous version

      const newVersion = {
        id: "ver-new-1",
        eventId: "event-123",
        versionNumber: 1,
        status: FormVersionStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        fields: [],
      };

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          formVersion: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(newVersion),
          },
        });
      });

      const req = new NextRequest("http://localhost/api/admin/events/event-123/forms", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await createFormVersion(req, { params: Promise.resolve({ id: "event-123" }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.versionNumber).toBe(1);
      expect(data.status).toBe(FormVersionStatus.DRAFT);
    });

    it("clones fields from a source version into a new draft version", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(sampleEvent);

      const sourceFields = [
        {
          id: "f1",
          key: "participant_name",
          label: "Full Name",
          type: FieldType.TEXT,
          fieldScope: FieldScope.PARTICIPANT,
          required: true,
          displayOrder: 1,
          config: {},
          validation: {},
          conditionalLogic: null,
        },
      ];

      const newVersion = {
        id: "ver-draft-2",
        eventId: "event-123",
        versionNumber: 2,
        status: FormVersionStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        fields: sourceFields,
      };

      (prisma.formVersion.findUnique as any).mockImplementation(({ where }: any) => {
        if (where.id === "ver-pub-1") {
          return Promise.resolve({
            id: "ver-pub-1",
            eventId: "event-123",
            versionNumber: 1,
            fields: sourceFields,
          });
        }
        return Promise.resolve(newVersion);
      });

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          formVersion: {
            findFirst: vi.fn().mockResolvedValue({ versionNumber: 1 }),
            create: vi.fn().mockResolvedValue(newVersion),
          },
          eventField: {
            findMany: vi.fn().mockResolvedValue(sourceFields),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        });
      });

      const req = new NextRequest("http://localhost/api/admin/events/event-123/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVersionId: "ver-pub-1" }),
      });

      const res = await createFormVersion(req, { params: Promise.resolve({ id: "event-123" }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.versionNumber).toBe(2);
    });
  });

  describe("3. Immutability Enforcement on Published Versions", () => {
    const publishedVersion = {
      id: "ver-pub-1",
      eventId: "event-123",
      versionNumber: 1,
      status: FormVersionStatus.PUBLISHED,
      publishedAt: new Date(),
    };

    it("rejects DELETE on a published form version with 409 Conflict", async () => {
      (prisma.formVersion.findFirst as any).mockResolvedValue(publishedVersion);

      const req = new NextRequest("http://localhost/api/admin/events/event-123/forms/ver-pub-1", {
        method: "DELETE",
      });

      const res = await deleteFormVersion(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-pub-1" }),
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("FORM_VERSION_IMMUTABLE");
    });

    it("rejects POST (add field) on a published form version with 409 Conflict", async () => {
      (prisma.formVersion.findFirst as any).mockResolvedValue(publishedVersion);

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-pub-1/fields",
        {
          method: "POST",
          body: JSON.stringify({
            key: "new_field",
            label: "New Field",
            type: FieldType.TEXT,
            fieldScope: FieldScope.PARTICIPANT,
          }),
        }
      );

      const res = await addField(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-pub-1" }),
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("FORM_VERSION_IMMUTABLE");
    });

    it("rejects PATCH (update field) on a published form version with 409 Conflict", async () => {
      (prisma.formVersion.findFirst as any).mockResolvedValue(publishedVersion);

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-pub-1/fields/f1",
        {
          method: "PATCH",
          body: JSON.stringify({ label: "Updated Label" }),
        }
      );

      const res = await updateField(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-pub-1", fieldId: "f1" }),
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("FORM_VERSION_IMMUTABLE");
    });

    it("rejects DELETE (delete field) on a published form version with 409 Conflict", async () => {
      (prisma.formVersion.findFirst as any).mockResolvedValue(publishedVersion);

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-pub-1/fields/f1",
        {
          method: "DELETE",
        }
      );

      const res = await deleteField(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-pub-1", fieldId: "f1" }),
      });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("FORM_VERSION_IMMUTABLE");
    });
  });

  describe("4. POST /api/admin/events/[id]/forms/[versionId]/publish", () => {
    it("atomically publishes draft version, closes prior active version, and updates event.activeFormVersionId", async () => {
      const draftVersion = {
        id: "ver-draft-2",
        eventId: "event-123",
        versionNumber: 2,
        status: FormVersionStatus.DRAFT,
        eventFields: [{ id: "f1", key: "participant_name" }],
      };

      (prisma.formVersion.findFirst as any).mockResolvedValue(draftVersion);

      const publishedVersion = {
        ...draftVersion,
        status: FormVersionStatus.PUBLISHED,
        publishedAt: new Date(),
      };

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          formVersion: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }), // Close previous active
            update: vi.fn().mockResolvedValue(publishedVersion),
          },
          event: {
            update: vi.fn().mockResolvedValue({
              ...sampleEvent,
              activeFormVersionId: "ver-draft-2",
            }),
          },
        });
      });

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-draft-2/publish",
        { method: "POST" }
      );

      const res = await publishFormVersion(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-draft-2" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe(FormVersionStatus.PUBLISHED);
      expect(data.id).toBe("ver-draft-2");
    });

    it("rejects publishing an empty form version (0 fields)", async () => {
      const emptyDraft = {
        id: "ver-draft-empty",
        eventId: "event-123",
        versionNumber: 2,
        status: FormVersionStatus.DRAFT,
        eventFields: [], // No fields
      };

      (prisma.formVersion.findFirst as any).mockResolvedValue(emptyDraft);

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-draft-empty/publish",
        { method: "POST" }
      );

      const res = await publishFormVersion(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-draft-empty" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("EMPTY_FORM_VERSION");
    });
  });

  describe("5. POST /api/admin/events/[id]/forms/[versionId]/fields (Field Addition)", () => {
    it("rejects duplicate field key within same form version", async () => {
      const draftVersion = {
        id: "ver-draft-1",
        eventId: "event-123",
        versionNumber: 1,
        status: FormVersionStatus.DRAFT,
      };

      (prisma.formVersion.findFirst as any).mockResolvedValue(draftVersion);
      (prisma.eventField.findFirst as any).mockResolvedValue({
        id: "existing-field",
        key: "participant_name",
      });

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-draft-1/fields",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "participant_name",
            label: "Duplicate Field",
            type: FieldType.TEXT,
            fieldScope: FieldScope.PARTICIPANT,
          }),
        }
      );

      const res = await addField(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-draft-1" }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("DUPLICATE_FIELD_KEY");
    });

    it("successfully creates a new field with auto-incremented displayOrder", async () => {
      const draftVersion = {
        id: "ver-draft-1",
        eventId: "event-123",
        versionNumber: 1,
        status: FormVersionStatus.DRAFT,
      };

      (prisma.formVersion.findFirst as any).mockResolvedValue(draftVersion);
      (prisma.eventField.findFirst as any).mockImplementation(({ where }: any) => {
        if (where.key) return null; // No duplicate
        return { displayOrder: 2 }; // Highest existing displayOrder
      });

      const createdField = {
        id: "new-f3",
        versionId: "ver-draft-1",
        key: "department",
        label: "Department",
        type: FieldType.TEXT,
        fieldScope: FieldScope.PARTICIPANT,
        required: true,
        displayOrder: 3,
        config: {},
        validation: {},
        conditionalLogic: null,
      };

      (prisma.eventField.create as any).mockResolvedValue(createdField);

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-draft-1/fields",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "department",
            label: "Department",
            type: FieldType.TEXT,
            fieldScope: FieldScope.PARTICIPANT,
            required: true,
          }),
        }
      );

      const res = await addField(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-draft-1" }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.displayOrder).toBe(3);
      expect(data.key).toBe("department");
    });
  });

  describe("6. POST /api/admin/events/[id]/forms/[versionId]/reorder", () => {
    it("rejects reordering when submitted field does not belong to form version (cross-version injection)", async () => {
      const draftVersion = {
        id: "ver-draft-1",
        eventId: "event-123",
        status: FormVersionStatus.DRAFT,
      };

      (prisma.formVersion.findFirst as any).mockResolvedValue(draftVersion);
      (prisma.eventField.findMany as any).mockResolvedValue([
        { id: "f1", formVersionId: "ver-draft-1" },
        { id: "f2", formVersionId: "ver-draft-1" },
      ]);

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-draft-1/reorder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: [
              { id: "f1", displayOrder: 1 },
              { id: "foreign-field-999", displayOrder: 2 },
            ],
          }),
        }
      );

      const res = await reorderFields(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-draft-1" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_FIELD_REORDER");
      expect(data.invalidIds).toContain("foreign-field-999");
    });

    it("rejects reorder request with duplicate field IDs", async () => {
      const draftVersion = {
        id: "ver-draft-1",
        eventId: "event-123",
        status: FormVersionStatus.DRAFT,
      };

      (prisma.formVersion.findFirst as any).mockResolvedValue(draftVersion);

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-draft-1/reorder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: [
              { id: "f1", displayOrder: 1 },
              { id: "f1", displayOrder: 2 },
            ],
          }),
        }
      );

      const res = await reorderFields(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-draft-1" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_FIELD_REORDER");
    });

    it("successfully reorders fields within transaction", async () => {
      const draftVersion = {
        id: "ver-draft-1",
        eventId: "event-123",
        status: FormVersionStatus.DRAFT,
      };

      (prisma.formVersion.findFirst as any).mockResolvedValue(draftVersion);
      (prisma.eventField.findMany as any)
        .mockResolvedValueOnce([
          { id: "f1", formVersionId: "ver-draft-1" },
          { id: "f2", formVersionId: "ver-draft-1" },
        ])
        .mockResolvedValueOnce([
          { id: "f2", formVersionId: "ver-draft-1", displayOrder: 1, key: "b", label: "B", type: FieldType.TEXT, fieldScope: FieldScope.PARTICIPANT, required: true },
          { id: "f1", formVersionId: "ver-draft-1", displayOrder: 2, key: "a", label: "A", type: FieldType.TEXT, fieldScope: FieldScope.PARTICIPANT, required: true },
        ]);

      (prisma.$transaction as any).mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-draft-1/reorder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: [
              { id: "f2", displayOrder: 1 },
              { id: "f1", displayOrder: 2 },
            ],
          }),
        }
      );

      const res = await reorderFields(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-draft-1" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.fields).toHaveLength(2);
      expect(data.fields[0].id).toBe("f2");
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("returns generic INTERNAL_ERROR (500) and does not leak raw database errors on unexpected failure", async () => {
      (prisma.formVersion.findFirst as any).mockRejectedValue(new Error("FATAL: relation \"event_fields\" does not exist (SQLSTATE 42P01)"));

      const req = new NextRequest(
        "http://localhost/api/admin/events/event-123/forms/ver-draft-1/reorder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: [{ id: "f1", displayOrder: 1 }],
          }),
        }
      );

      const res = await reorderFields(req, {
        params: Promise.resolve({ id: "event-123", versionId: "ver-draft-1" }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.code).toBe("INTERNAL_ERROR");
      expect(data.error).toBe("An internal server error occurred.");
      expect(data.error).not.toContain("relation");
      expect(data.error).not.toContain("SQLSTATE");
    });
  });

  describe("7. GET /api/events/[slug]/form (Public Active Form Endpoint)", () => {
    it("returns 404 when event slug does not exist", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/events/non-existent/form");
      const res = await getPublicForm(req, { params: Promise.resolve({ slug: "non-existent" }) });
      expect(res.status).toBe(404);
    });

    it("returns 400 when event is EXTERNAL registration mode", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: "event-ext",
        name: "External Symposium",
        slug: "ext-symposium",
        registrationMode: RegistrationMode.EXTERNAL,
      });

      const req = new NextRequest("http://localhost/api/events/ext-symposium/form");
      const res = await getPublicForm(req, { params: Promise.resolve({ slug: "ext-symposium" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("EXTERNAL_REGISTRATION_MODE");
    });

    it("returns 404 when event has no active published form version", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...sampleEvent,
        activeFormVersionId: null,
      });

      const req = new NextRequest("http://localhost/api/events/magnora-26/form");
      const res = await getPublicForm(req, { params: Promise.resolve({ slug: "magnora-26" }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.code).toBe("NO_ACTIVE_FORM_VERSION");
    });

    it("returns active form version and sorted fields for valid INTERNAL event", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...sampleEvent,
        activeFormVersion: {
          id: "ver-pub-1",
          versionNumber: 1,
          status: FormVersionStatus.PUBLISHED,
          eventFields: [
            {
              id: "f1",
              key: "participant_name",
              label: "Full Name",
              type: FieldType.TEXT,
              fieldScope: FieldScope.PARTICIPANT,
              required: true,
              displayOrder: 1,
              config: {},
              validation: {},
              conditionalLogic: null,
            },
          ],
          fields: [
            {
              id: "f1",
              key: "participant_name",
              label: "Full Name",
              type: FieldType.TEXT,
              fieldScope: FieldScope.PARTICIPANT,
              required: true,
              displayOrder: 1,
              config: {},
              validation: {},
              conditionalLogic: null,
            },
          ],
        },
      });

      const req = new NextRequest("http://localhost/api/events/magnora-26/form");
      const res = await getPublicForm(req, { params: Promise.resolve({ slug: "magnora-26" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.versionNumber).toBe(1);
      expect(data.fields).toHaveLength(1);
      expect(data.fields[0].key).toBe("participant_name");
    });
  });
});

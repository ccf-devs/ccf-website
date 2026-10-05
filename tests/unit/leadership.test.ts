import { describe, it, expect, vi, beforeEach } from "vitest";
import { getActiveLeadership, LEADERSHIP_ROLES } from "@/lib/data/leadership";
import { prisma } from "@/lib/db/client";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    member: {
      findMany: vi.fn(),
    },
  },
}));

describe("lib/data/leadership - getActiveLeadership()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports supported leadership roles covering both Vice President and Vice-President", () => {
    expect(LEADERSHIP_ROLES).toContain("President");
    expect(LEADERSHIP_ROLES).toContain("Vice President");
    expect(LEADERSHIP_ROLES).toContain("Vice-President");
    expect(LEADERSHIP_ROLES).toContain("Managing Director");
  });

  it("resolves all 3 executive leaders when database stores hyphenated Vice-President", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValueOnce([
      {
        id: "mem-01",
        name: "Remi Kaayalvizhi",
        position: "President",
        displayOrder: 0,
        photo: null,
      },
      {
        id: "mem-02",
        name: "Fizza Fathima",
        position: "Vice-President",
        displayOrder: 1,
        photo: null,
      },
      {
        id: "mem-03",
        name: "Zayan Ahmed",
        position: "Managing Director",
        displayOrder: 2,
        photo: { objectKey: "photos/zayan.webp" },
      },
    ] as any);

    const leaders = await getActiveLeadership();

    expect(prisma.member.findMany).toHaveBeenCalledWith({
      where: {
        visibility: true,
        position: {
          in: [
            "President",
            "Vice President",
            "Vice-President",
            "Managing Director",
          ],
        },
      },
      include: {
        photo: true,
      },
      orderBy: [
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });

    expect(leaders).toHaveLength(3);
    expect(leaders[0]).toEqual({
      id: "mem-01",
      name: "Remi Kaayalvizhi",
      role: "President",
      initials: "RK",
      photoObjectKey: undefined,
      displayOrder: 0,
    });
    expect(leaders[1]).toEqual({
      id: "mem-02",
      name: "Fizza Fathima",
      role: "Vice-President",
      initials: "FF",
      photoObjectKey: undefined,
      displayOrder: 1,
    });
    expect(leaders[2]).toEqual({
      id: "mem-03",
      name: "Zayan Ahmed",
      role: "Managing Director",
      initials: "ZA",
      photoObjectKey: "photos/zayan.webp",
      displayOrder: 2,
    });
  });

  it("resolves all 3 executive leaders when database stores unhyphenated Vice President", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValueOnce([
      {
        id: "mem-03",
        name: "Zayan Ahmed",
        position: "Managing Director",
        displayOrder: 2,
        photo: null,
      },
      {
        id: "mem-02",
        name: "Fizza Fathima",
        position: "Vice President",
        displayOrder: 1,
        photo: null,
      },
      {
        id: "mem-01",
        name: "Remi Kaayalvizhi",
        position: "President",
        displayOrder: 0,
        photo: null,
      },
    ] as any);

    const leaders = await getActiveLeadership();

    expect(leaders).toHaveLength(3);
    // Correctly sorts by hierarchy rank regardless of DB retrieval order
    expect(leaders[0].name).toBe("Remi Kaayalvizhi");
    expect(leaders[0].role).toBe("President");
    expect(leaders[1].name).toBe("Fizza Fathima");
    expect(leaders[1].role).toBe("Vice President");
    expect(leaders[2].name).toBe("Zayan Ahmed");
    expect(leaders[2].role).toBe("Managing Director");
  });

  it("falls back to confirmed CCF_LEADERSHIP when database returns 0 records", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValueOnce([]);

    const leaders = await getActiveLeadership();

    expect(leaders).toHaveLength(3);
    expect(leaders.map((l) => l.name)).toEqual([
      "Remi Kayalvizhi",
      "Fizza Fathima",
      "Zayan Ahmed",
    ]);
  });

  it("falls back to confirmed CCF_LEADERSHIP when database throws an error", async () => {
    vi.mocked(prisma.member.findMany).mockRejectedValueOnce(
      new Error("Neon connection failed")
    );

    const leaders = await getActiveLeadership();

    expect(leaders).toHaveLength(3);
    expect(leaders.map((l) => l.name)).toEqual([
      "Remi Kayalvizhi",
      "Fizza Fathima",
      "Zayan Ahmed",
    ]);
  });
});

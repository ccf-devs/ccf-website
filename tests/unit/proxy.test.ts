import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy, config } from "@/proxy";
import * as nextAuthJwt from "next-auth/jwt";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

describe("Next.js 16 Proxy Authentication Interceptor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret-123";
  });

  it("exports correct route matcher for admin paths", () => {
    expect(config.matcher).toEqual(["/admin/:path*"]);
  });

  it("redirects unauthenticated admin requests to login with callbackUrl", async () => {
    vi.mocked(nextAuthJwt.getToken).mockResolvedValueOnce(null);

    const req = new NextRequest("https://ccf.crescent.education/admin/dashboard");
    const response = await proxy(req);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/admin/auth/login");
    expect(location).toContain("callbackUrl=%2Fadmin%2Fdashboard");
  });

  it("redirects inactive administrators to login with error=inactive", async () => {
    vi.mocked(nextAuthJwt.getToken).mockResolvedValueOnce({
      id: "admin-1",
      email: "test@crescent.education",
      role: "CCF_ADMIN",
      active: false,
    });

    const req = new NextRequest("https://ccf.crescent.education/admin/events");
    const response = await proxy(req);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/admin/auth/login");
    expect(location).toContain("error=inactive");
  });

  it("allows active authenticated administrators through to admin routes", async () => {
    vi.mocked(nextAuthJwt.getToken).mockResolvedValueOnce({
      id: "admin-2",
      email: "active@crescent.education",
      role: "CCF_ADMIN",
      active: true,
    });

    const req = new NextRequest("https://ccf.crescent.education/admin/dashboard");
    const response = await proxy(req);

    // In Next.js NextResponse.next() returns a 200 response with x-middleware-next header
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.status).toBe(200);
  });

  it("bypasses authentication check for /admin/auth/login", async () => {
    const req = new NextRequest("https://ccf.crescent.education/admin/auth/login");
    const response = await proxy(req);

    expect(nextAuthJwt.getToken).not.toHaveBeenCalled();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("bypasses authentication check for /admin/auth/verify", async () => {
    const req = new NextRequest("https://ccf.crescent.education/admin/auth/verify?token=abc");
    const response = await proxy(req);

    expect(nextAuthJwt.getToken).not.toHaveBeenCalled();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

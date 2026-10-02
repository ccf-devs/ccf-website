import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TestRenderer from "react-test-renderer";
const { act } = TestRenderer;
import { RegistrationListTable } from "@/components/admin/registrations/registration-list-table";

// Mock nested dialogs
vi.mock("@/components/admin/registrations/team-roster-dialog", () => ({
  TeamRosterDialog: () => <div data-testid="mock-team-dialog" />,
}));
vi.mock("@/components/admin/registrations/payment-verification-dialog", () => ({
  PaymentVerificationDialog: () => <div data-testid="mock-payment-dialog" />,
}));

// Mock URL.createObjectURL for blob download
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();
global.document = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  createElement: vi.fn(() => ({ click: vi.fn() })),
  body: { appendChild: vi.fn(), removeChild: vi.fn() }
} as any;
global.window = { URL: global.URL, confirm: vi.fn() } as any;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;


const mockRegistrations: any[] = [];
const mockEvents = [
  { id: "event-1", slug: "event-1", name: "Event One" },
  { id: "event-2", slug: "event-2", name: "Event Two" },
] as any[];

describe("Registration List Table - Export Control Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Disposition": 'attachment; filename="test.csv"' }),
      blob: () => Promise.resolve(new Blob(["test"], { type: "text/csv" })),
    });
  });

  it("1. renders the Export button disabled by default (no event selected)", () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<RegistrationListTable registrations={mockRegistrations} events={mockEvents} />, { createNodeMock: () => ({ contains: () => false }) });
    });
    const root = renderer.root;
    
    // Find Export button by text "Export" inside a Button
    const buttons = root.findAllByType("button");
    const exportBtn = buttons.find((b: any) => b.props.title === "Select a specific event to export registrations" || b.props.title === "Export registrations");
    
    expect(exportBtn).toBeDefined();
    expect(exportBtn.props.disabled).toBe(true);
    expect(exportBtn.props["aria-expanded"]).toBe(false);
  });

  it("2. enables the Export button when an event is selected, and opens dropdown on click", () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<RegistrationListTable registrations={mockRegistrations} events={mockEvents} />, { createNodeMock: () => ({ contains: () => false }) });
    });
    const root = renderer.root;
    
    // Select an event (the event filter select)
    const selects = root.findAllByType("select");
    const eventSelect = selects.find((s: any) => s.props["aria-label"] === "Filter by Event");
    
    act(() => {
      eventSelect.props.onChange({ target: { value: "event-1" } });
    });
    
    const exportBtn = root.findAllByType("button").find((b: any) => b.props.title === "Export registrations");
    expect(exportBtn.props.disabled).toBe(false);
    expect(exportBtn.props["aria-expanded"]).toBe(false);
    
    // Click Export
    act(() => {
      exportBtn.props.onClick();
    });
    
    expect(exportBtn.props["aria-expanded"]).toBe(true);
    
    // Check dropdown contents
    const menu = root.findByProps({ role: "menu" });
    const menuItems = menu.findAllByProps({ role: "menuitem" });
    expect(menuItems.length).toBe(2);
    expect(menuItems[0].props.children).toBe("Export CSV");
    expect(menuItems[1].props.children).toBe("Export XLSX");
  });

  it("3. CSV selection calls export API, sets loading state, and closes menu", async () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<RegistrationListTable registrations={mockRegistrations} events={mockEvents} />, { createNodeMock: () => ({ contains: () => false }) });
    });
    const root = renderer.root;
    
    // Setup event-1 and open dropdown
    act(() => {
      const eventSelect = root.findAllByType("select").find((s: any) => s.props["aria-label"] === "Filter by Event");
      eventSelect.props.onChange({ target: { value: "event-1" } });
    });
    
    const exportBtn = root.findAllByType("button").find((b: any) => b.props.title === "Export registrations");
    act(() => {
      exportBtn.props.onClick();
    });
    
    const csvBtn = root.findAllByProps({ role: "menuitem" }).find((b: any) => b.props.children === "Export CSV");
    
    // Trigger CSV Export
    let promise: any;
    act(() => {
      promise = csvBtn.props.onClick();
    });
    
    // Synchronous state changes: menu closes, loading state begins
    expect(exportBtn.props["aria-expanded"]).toBe(false);
    expect(exportBtn.props.disabled).toBe(true);
    
    // Wait for async fetch to finish
    await act(async () => {
      await promise;
    });
    
    expect(global.fetch).toHaveBeenCalledWith("/api/admin/events/event-1/registrations/export");
    
    // Re-enabled after completion
    expect(exportBtn.props.disabled).toBe(false);
  });

  it("4. XLSX selection calls export-xlsx API, sets loading state, and closes menu", async () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<RegistrationListTable registrations={mockRegistrations} events={mockEvents} />, { createNodeMock: () => ({ contains: () => false }) });
    });
    const root = renderer.root;
    
    act(() => {
      const eventSelect = root.findAllByType("select").find((s: any) => s.props["aria-label"] === "Filter by Event");
      eventSelect.props.onChange({ target: { value: "event-2" } }); // Selecting event-2
    });
    
    const exportBtn = root.findAllByType("button").find((b: any) => b.props.title === "Export registrations");
    act(() => {
      exportBtn.props.onClick();
    });
    
    const xlsxBtn = root.findAllByProps({ role: "menuitem" }).find((b: any) => b.props.children === "Export XLSX");
    
    let promise: any;
    act(() => {
      promise = xlsxBtn.props.onClick();
    });
    
    // Synchronous state changes
    expect(exportBtn.props["aria-expanded"]).toBe(false);
    expect(exportBtn.props.disabled).toBe(true);
    
    await act(async () => {
      await promise;
    });
    
    expect(global.fetch).toHaveBeenCalledWith("/api/admin/events/event-2/registrations/export-xlsx");
    expect(exportBtn.props.disabled).toBe(false);
  });
  
  it("5. dropdown closes when clicking outside or pressing Escape", () => {
    // This is tested via global events added in useEffect
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<RegistrationListTable registrations={mockRegistrations} events={mockEvents} />, { createNodeMock: () => ({ contains: () => false }) });
    });
    const root = renderer.root;
    
    act(() => {
      const eventSelect = root.findAllByType("select").find((s: any) => s.props["aria-label"] === "Filter by Event");
      eventSelect.props.onChange({ target: { value: "event-1" } });
    });
    
    const exportBtn = root.findAllByType("button").find((b: any) => b.props.title === "Export registrations");
    act(() => { exportBtn.props.onClick(); });
    expect(exportBtn.props["aria-expanded"]).toBe(true);
    
    // Simulate Escape key
    act(() => {
      const escapeEvent = { key: "Escape" } as any;
      (document.addEventListener as any).mock.calls.find((call: any) => call[0] === "keydown")[1](escapeEvent);
    });
    
    expect(exportBtn.props["aria-expanded"]).toBe(false);
    
    // Open again
    act(() => { exportBtn.props.onClick(); });
    expect(exportBtn.props["aria-expanded"]).toBe(true);
    
    // Simulate Click Outside
    act(() => {
      const clickEvent = { target: {} } as any;
      (document.addEventListener as any).mock.calls.find((call: any) => call[0] === "mousedown")[1](clickEvent);
    });
    
    expect(exportBtn.props["aria-expanded"]).toBe(false);
  });
});

import React from "react";
import { describe, it, expect, vi } from "vitest";
import TestRenderer from "react-test-renderer";
const { act } = TestRenderer;
import { EventForm } from "@/components/admin/events/event-form";
import { RegistrationMode } from "@prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/rich-text-editor", () => ({
  RichTextEditor: (props: any) => (
    <textarea
      data-testid="mock-rte"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

describe("EventForm Date Input Restrictions", () => {
  it("removes min attribute on startsAt and endsAt when registrationMode is NONE in create mode", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<EventForm mode="create" />);
    });

    const root = renderer!.root;
    const startsAtInput = root.findByProps({ id: "event-starts-at" });
    const endsAtInput = root.findByProps({ id: "event-ends-at" });

    // In create mode with default registrationMode=NONE, min should be undefined
    expect(startsAtInput.props.min).toBeUndefined();
    expect(endsAtInput.props.min).toBeUndefined();
  });

  it("enforces min attribute on startsAt and endsAt when registrationMode is INTERNAL or EXTERNAL", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <EventForm
          mode="create"
          initialData={{ registrationMode: RegistrationMode.INTERNAL }}
        />
      );
    });

    const root = renderer!.root;
    const startsAtInput = root.findByProps({ id: "event-starts-at" });
    const endsAtInput = root.findByProps({ id: "event-ends-at" });

    // With registration enabled, min must be defined (pointing to current time)
    expect(startsAtInput.props.min).toBeDefined();
    expect(typeof startsAtInput.props.min).toBe("string");
    expect(endsAtInput.props.min).toBeDefined();
  });

  it("dynamically toggles min attribute when registration mode is switched", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<EventForm mode="create" />);
    });

    const root = renderer!.root;
    const regModeSelect = root.findByProps({ id: "event-reg-mode" });
    let startsAtInput = root.findByProps({ id: "event-starts-at" });

    // Initial state: registrationMode=NONE -> min is undefined
    expect(startsAtInput.props.min).toBeUndefined();

    // Switch to INTERNAL
    act(() => {
      regModeSelect.props.onChange({
        target: { value: RegistrationMode.INTERNAL },
      });
    });

    startsAtInput = root.findByProps({ id: "event-starts-at" });
    expect(startsAtInput.props.min).toBeDefined();
    expect(typeof startsAtInput.props.min).toBe("string");

    // Switch back to NONE
    act(() => {
      regModeSelect.props.onChange({
        target: { value: RegistrationMode.NONE },
      });
    });

    startsAtInput = root.findByProps({ id: "event-starts-at" });
    expect(startsAtInput.props.min).toBeUndefined();
  });
});

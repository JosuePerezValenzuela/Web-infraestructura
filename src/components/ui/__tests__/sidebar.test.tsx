import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { SidebarProvider, Sidebar, SidebarTrigger } from "../sidebar";

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql: MediaQueryList = {
    matches,
    media: "(max-width: 767px)",
    onchange: null,
    addEventListener: (_event, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_event, listener) => {
      listeners.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: (event) => {
      listeners.forEach((listener) => listener(event));
      return true;
    },
  } as MediaQueryList;
  vi.stubGlobal("matchMedia", () => mql);
}

describe("Sidebar responsive behavior", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa el drawer (sheet) en pantallas pequenas y el trigger lo abre", async () => {
    window.innerWidth = 500;
    mockMatchMedia(true);
    const user = userEvent.setup();

    render(
      <SidebarProvider>
        <SidebarTrigger aria-label="toggle" />
        <Sidebar collapsible="offcanvas">
          <div>Menu movil</div>
        </Sidebar>
      </SidebarProvider>
    );

    expect(screen.queryByText(/Menu movil/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/toggle/i));

    expect(await screen.findByText(/Menu movil/i)).toBeInTheDocument();
  });

  it("mantiene el gap en desktop sin overlay", () => {
    window.innerWidth = 1280;
    mockMatchMedia(false);

    render(
      <SidebarProvider>
        <Sidebar collapsible="offcanvas">
          <div>Menu desktop</div>
        </Sidebar>
      </SidebarProvider>
    );

    expect(document.querySelector('[data-slot="sidebar-gap"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="sidebar-container"]')).not.toBeNull();
  });
});

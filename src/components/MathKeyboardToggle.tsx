"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Keyboard = EventTarget & { visible: boolean };

const keyboard = (): Keyboard | undefined =>
  (window as unknown as { mathVirtualKeyboard?: Keyboard }).mathVirtualKeyboard;

const CLOSE_CLASS = "ml-close-inject";

/**
 * One floating button for the whole editor, rather than one on every answer.
 *
 * MathLive's keyboard is a single shared panel, so a button per field was
 * both noisy and misleading: closing it from one answer left the others
 * looking open. This sits bottom right and is the only control.
 *
 * It also puts a close button inside the keyboard itself, because once the
 * panel is covering the lower third of the screen, the button that opened it
 * is the least convenient place to look for the way out.
 */
export default function MathKeyboardToggle() {
  const [open, setOpen] = useState(false);

  /**
   * MathLive publishes no height, and on a phone the panel takes a third of
   * the screen. Measure it and hand the number to CSS so the button can sit
   * above it instead of on top of the keys.
   */
  const trackHeight = useCallback(() => {
    const root = document.documentElement;
    const panel = document.querySelector(".ML__keyboard");
    if (!panel) {
      root.style.setProperty("--mlk-height", "0px");
      return;
    }
    const observer = new ResizeObserver(() => {
      const height = panel.getBoundingClientRect().height;
      root.style.setProperty("--mlk-height", `${Math.round(height)}px`);
    });
    observer.observe(panel);
    return observer;
  }, []);

  const addCloseButton = useCallback((panel: Keyboard) => {
    // The panel is built lazily, so wait for the frame it appears in.
    requestAnimationFrame(() => {
      const container = document.querySelector(".ML__keyboard");
      if (!container || container.querySelector(`.${CLOSE_CLASS}`)) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = CLOSE_CLASS;
      button.textContent = "Close";
      button.setAttribute("aria-label", "Close the maths keyboard");
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        panel.visible = false;
        setOpen(false);
      });
      container.appendChild(button);
    });
  }, []);

  // Follow the panel however it was closed: our button, its own close, or Escape.
  useEffect(() => {
    const panel = keyboard();
    if (!panel) return;
    const sync = () => setOpen(Boolean(panel.visible));
    panel.addEventListener("virtual-keyboard-toggle", sync);
    return () => panel.removeEventListener("virtual-keyboard-toggle", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const panel = keyboard();
      if (!panel) return;
      panel.visible = false;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const observer = useRef<ResizeObserver | undefined>(undefined);

  const toggle = () => {
    const panel = keyboard();
    if (!panel) return;
    const next = !panel.visible;
    panel.visible = next;
    setOpen(next);

    if (next) {
      addCloseButton(panel);
      requestAnimationFrame(() => {
        observer.current?.disconnect();
        observer.current = trackHeight();
      });
    } else {
      observer.current?.disconnect();
      observer.current = undefined;
      document.documentElement.style.setProperty("--mlk-height", "0px");
    }
  };

  useEffect(
    () => () => {
      observer.current?.disconnect();
      document.documentElement.style.setProperty("--mlk-height", "0px");
    },
    [],
  );

  return (
    <button
      className={`math-fab${open ? " is-open" : ""}`}
      type="button"
      onClick={toggle}
      aria-pressed={open}
      title={open ? "Close the maths keyboard" : "Open the maths keyboard"}
      aria-label={open ? "Close the maths keyboard" : "Open the maths keyboard"}
      // Keep the caret in whichever answer was being edited.
      onMouseDown={(event) => event.preventDefault()}
    >
      <span className="math-fab-glyph" aria-hidden="true">
        {open ? "✕" : "√x"}
      </span>
      <span className="math-fab-label">{open ? "Close" : "Maths"}</span>
    </button>
  );
}

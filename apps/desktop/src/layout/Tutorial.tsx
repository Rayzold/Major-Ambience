// Coachmark overlay — spotlight + tooltip walkthrough.
// One <Tutorial> renders one tutorial's full step sequence.
//
// Each step points at a DOM element via a CSS selector (typically
// data-mc-tour="..."). The dark overlay punches a hole over the target
// via a big inset box-shadow; the tooltip floats next to it.

import { useEffect, useLayoutEffect, useState } from "react";
import { Glyph, T } from "@mc/ui";

export type TutorialStep = {
  title: string;
  body: string;
  /** CSS selector for the element to highlight, or undefined for centered. */
  target?: string;
  /** Preferred placement of the tooltip. Defaults to auto. */
  placement?: "top" | "bottom" | "left" | "right" | "center";
};

export type TutorialProps = {
  steps: TutorialStep[];
  onComplete: () => void;
  onDismiss: () => void;
};

type Rect = { x: number; y: number; width: number; height: number };

const PADDING = 8;
const TOOLTIP_WIDTH = 360;
const TOOLTIP_GAP = 14;

export function Tutorial({ steps, onComplete, onDismiss }: TutorialProps) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[idx];

  // Recompute the highlight rect whenever step changes or the window resizes.
  useLayoutEffect(() => {
    function update() {
      if (!step?.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.target);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        x: r.left - PADDING,
        y: r.top - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  // Keyboard shortcuts: arrows + esc.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, steps.length]);

  if (!step) return null;

  function next() {
    if (idx + 1 >= steps.length) {
      onComplete();
    } else {
      setIdx(idx + 1);
    }
  }
  function prev() {
    if (idx > 0) setIdx(idx - 1);
  }

  const tooltipPos = computeTooltipPosition(rect, step.placement);

  return (
    <>
      {/* Translucent overlay with a hole punched at `rect`. */}
      {rect ? (
        <div
          onClick={onDismiss}
          style={{
            position: "fixed",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            borderRadius: 10,
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.7), 0 0 0 2px ${T.gold}88, 0 0 30px ${T.gold}44`,
            pointerEvents: "auto",
            zIndex: 200,
            cursor: "pointer",
          }}
          aria-hidden
        />
      ) : (
        <div
          onClick={onDismiss}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 200,
            cursor: "pointer",
          }}
          aria-hidden
        />
      )}

      {/* Tooltip card. */}
      <div
        role="dialog"
        aria-label={step.title}
        style={{
          position: "fixed",
          left: tooltipPos.x,
          top: tooltipPos.y,
          width: TOOLTIP_WIDTH,
          padding: "16px 18px",
          background: T.bgRaise,
          border: `1px solid ${T.goldEdge}`,
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          color: T.ink,
          zIndex: 201,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div className="mc-eyebrow" style={{ color: T.gold }}>
            Tutorial · step {idx + 1} of {steps.length}
          </div>
          <button
            onClick={onDismiss}
            title="Close tutorial"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: T.bgChip,
              color: T.ink3,
              border: `1px solid ${T.rule}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Glyph name="close" size={11} />
          </button>
        </div>

        <div
          className="mc-display"
          style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}
        >
          {step.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: T.ink2,
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {step.body}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
            gap: 8,
          }}
        >
          <button
            onClick={onDismiss}
            style={{
              fontSize: 11,
              color: T.ink3,
              padding: "6px 10px",
              borderRadius: 6,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Skip tour
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={prev}
              disabled={idx === 0}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                background: T.bgChip,
                color: idx === 0 ? T.ink3 : T.ink2,
                fontSize: 12,
                fontWeight: 500,
                cursor: idx === 0 ? "not-allowed" : "pointer",
                opacity: idx === 0 ? 0.5 : 1,
              }}
            >
              Back
            </button>
            <button
              onClick={next}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                background: T.gold,
                color: "#1a1108",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {idx + 1 === steps.length ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function computeTooltipPosition(
  rect: Rect | null,
  placement: TutorialStep["placement"],
): { x: number; y: number } {
  const w = TOOLTIP_WIDTH;
  const h = 200; // rough estimate; clamp below
  const margin = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect || placement === "center") {
    return { x: Math.max(margin, (vw - w) / 2), y: Math.max(margin, vh / 2 - h / 2) };
  }

  // Auto: prefer below the target if there's room, else above.
  let x = rect.x + rect.width / 2 - w / 2;
  let y = rect.y + rect.height + TOOLTIP_GAP;

  if (placement === "top" || (placement === undefined && y + h + margin > vh)) {
    y = rect.y - h - TOOLTIP_GAP;
  }
  if (placement === "right") {
    x = rect.x + rect.width + TOOLTIP_GAP;
    y = rect.y;
  }
  if (placement === "left") {
    x = rect.x - w - TOOLTIP_GAP;
    y = rect.y;
  }

  // Clamp to viewport.
  x = Math.max(margin, Math.min(x, vw - w - margin));
  y = Math.max(margin, Math.min(y, vh - margin - h));
  return { x, y };
}

// Smoke + regression tests for DesktopTransport.
//
// The first concrete payoff of the post-0.0.33 review's #3 item: a
// safety net for the class of bug shipped + caught manually this
// session. PR #65 (scrubber-flicker fix) is the canonical example —
// the scrubber bug was a behaviour regression (click resolves to a
// seek call with the right ratio) that a render-test would have
// caught the moment a future refactor broke `handleScrubClick`.
//
// happy-dom doesn't lay out elements (every getBoundingClientRect()
// returns zeros), so we install a per-test override on the scrub
// container's bounding rect to simulate a real 800px-wide bar at a
// known viewport position. That lets us assert the *ratio math* —
// the part that would silently regress if someone "simplified" the
// click handler.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DesktopTransport, type DesktopTransportProps } from "./DesktopTransport.js";
import type { Track } from "@mc/core";

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "t1",
    uri: "asset://test.mp3",
    title: "Test track",
    pack: "Pack",
    category: "combat",
    durationMs: 60_000,
    grade: null,
    playCount: 0,
    ...overrides,
  };
}

function makeProps(over: Partial<DesktopTransportProps> = {}): DesktopTransportProps {
  return {
    track: makeTrack(),
    currentSec: 0,
    durationSec: 60,
    playing: false,
    fadeMs: 800,
    masterVolume: 1,
    duckingPct: 0.4,
    onTogglePlay: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onSeek: vi.fn(),
    onCycleGrade: vi.fn(),
    onSetFadeMs: vi.fn(),
    onSetVolume: vi.fn(),
    onSetDuckingPct: vi.fn(),
    onStopAll: vi.fn(),
    anyPlaying: false,
    loopMode: "off",
    onCycleLoop: vi.fn(),
    dmMode: false,
    ...over,
  };
}

/**
 * happy-dom returns all-zero rects from getBoundingClientRect, which
 * makes the scrubber's click-ratio math degenerate. Stub a real rect
 * so the click handler's `(e.clientX - rect.left) / rect.width`
 * produces a meaningful seek target. Width 800, x 50 → 50% click is
 * at clientX 450.
 */
function stubScrubRect(): void {
  const original = Element.prototype.getBoundingClientRect;
  // The transport renders exactly one tall, narrow ref'd div for the
  // scrubber; intercept ALL bounding-rect calls and return our shape.
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 50,
      y: 100,
      left: 50,
      right: 850,
      top: 100,
      bottom: 104,
      width: 800,
      height: 4,
      toJSON: () => ({}),
    } as DOMRect;
  };
  // Restore on test teardown so the next test doesn't inherit it.
  afterTeardown(() => {
    Element.prototype.getBoundingClientRect = original;
  });
}

// Tiny per-test teardown hook — vitest's `afterEach` is global, this
// stays scoped to the test that called `stubScrubRect`.
const _teardowns: Array<() => void> = [];
function afterTeardown(fn: () => void): void {
  _teardowns.push(fn);
}
import { afterEach } from "vitest";
afterEach(() => {
  while (_teardowns.length) _teardowns.pop()!();
});

describe("DesktopTransport — render shape", () => {
  it("renders the track title", () => {
    render(<DesktopTransport {...makeProps()} />);
    expect(screen.getByText("Test track")).toBeInTheDocument();
  });

  it("shows duration and current time formatted as m:ss", () => {
    render(<DesktopTransport {...makeProps({ currentSec: 12, durationSec: 95 })} />);
    expect(screen.getByText("0:12")).toBeInTheDocument();
    expect(screen.getByText("1:35")).toBeInTheDocument();
  });
});

describe("DesktopTransport — scrubber click (regression for #65)", () => {
  it("calls onSeek with the click position as a ratio of duration", () => {
    stubScrubRect();
    const onSeek = vi.fn();
    const { container } = render(
      <DesktopTransport
        {...makeProps({ onSeek, durationSec: 100 })}
      />,
    );

    // Find the scrubber — only div in the transport with a click
    // handler and a percentage-width fill child. We locate it by the
    // 4px progress track styling; the test would need updating if
    // that wrapper is ever swapped for a slider element.
    const scrub = Array.from(container.querySelectorAll("div")).find(
      (el) => el.style.height === "4px" && el.style.cursor === "pointer",
    );
    expect(scrub).toBeTruthy();

    // Click at clientX 450 → relative 400 / width 800 = 0.5 → seek to
    // 50% of 100s = 50s.
    fireEvent.click(scrub!, { clientX: 450, clientY: 102 });
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(50);
  });

  it("clamps clicks past the right edge to the end of the track", () => {
    stubScrubRect();
    const onSeek = vi.fn();
    const { container } = render(
      <DesktopTransport {...makeProps({ onSeek, durationSec: 100 })} />,
    );
    const scrub = Array.from(container.querySelectorAll("div")).find(
      (el) => el.style.height === "4px" && el.style.cursor === "pointer",
    )!;
    // clientX 1000 is past the 850 right edge — ratio gets clamped to 1.
    fireEvent.click(scrub, { clientX: 1000, clientY: 102 });
    expect(onSeek).toHaveBeenCalledWith(100);
  });

  it("clamps clicks before the left edge to 0", () => {
    stubScrubRect();
    const onSeek = vi.fn();
    const { container } = render(
      <DesktopTransport {...makeProps({ onSeek, durationSec: 100 })} />,
    );
    const scrub = Array.from(container.querySelectorAll("div")).find(
      (el) => el.style.height === "4px" && el.style.cursor === "pointer",
    )!;
    fireEvent.click(scrub, { clientX: 10, clientY: 102 });
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it("ignores clicks when duration is unknown (0)", () => {
    stubScrubRect();
    const onSeek = vi.fn();
    const { container } = render(
      <DesktopTransport {...makeProps({ onSeek, durationSec: 0 })} />,
    );
    const scrub = Array.from(container.querySelectorAll("div")).find(
      (el) => el.style.height === "4px",
    )!;
    fireEvent.click(scrub, { clientX: 450, clientY: 102 });
    expect(onSeek).not.toHaveBeenCalled();
  });
});

describe("DesktopTransport — transport buttons", () => {
  it("loop button cycles through the three modes via onCycleLoop", () => {
    const onCycleLoop = vi.fn();
    render(<DesktopTransport {...makeProps({ onCycleLoop, loopMode: "off" })} />);
    // Loop button identifies itself via its title text per mode.
    fireEvent.click(screen.getByTitle(/loop off/i));
    expect(onCycleLoop).toHaveBeenCalledTimes(1);
  });

  it("prev / next / stop-all buttons all wire to their respective callbacks", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onStopAll = vi.fn();
    render(
      <DesktopTransport
        {...makeProps({ onPrev, onNext, onStopAll, anyPlaying: true })}
      />,
    );
    fireEvent.click(screen.getByTitle(/previous in queue/i));
    fireEvent.click(screen.getByTitle(/next in queue/i));
    fireEvent.click(screen.getByTitle(/stop all sound/i));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onStopAll).toHaveBeenCalledTimes(1);
  });
});

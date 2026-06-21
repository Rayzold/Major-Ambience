import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearDiagnostics,
  getDiagnostics,
  logEvent,
  sampleHeapMB,
} from "./diag";

type PerfWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
};

const setHeap = (used: number) => {
  (performance as PerfWithMemory).memory = {
    usedJSHeapSize: used,
    totalJSHeapSize: used + 2 * 1024 * 1024,
    jsHeapSizeLimit: 4 * 1024 * 1024 * 1024,
  };
};

const clearHeap = () => {
  delete (performance as PerfWithMemory).memory;
};

describe("diag — heap probe", () => {
  beforeEach(() => {
    clearDiagnostics();
    clearHeap();
  });

  afterEach(() => {
    clearHeap();
  });

  it("sampleHeapMB returns null when performance.memory is absent (happy-dom default)", () => {
    expect(sampleHeapMB()).toBeNull();
  });

  it("sampleHeapMB returns MB-rounded {used, peak, limit} when available", () => {
    setHeap(50 * 1024 * 1024);
    const s = sampleHeapMB();
    expect(s).toEqual({ used: 50, peak: 50, limit: 4096 });
  });

  it("audio.* logEvent calls auto-attach heap into the entry message", () => {
    setHeap(40 * 1024 * 1024);
    logEvent("audio.play.start", { trackId: "t1" });
    // Filter — peak emit may or may not have fired depending on
    // cross-test module state; we only care that our event has heap.
    const audioStart = getDiagnostics().find(
      (e) => e.tag === "audio.play.start",
    );
    expect(audioStart).toBeDefined();
    expect(audioStart!.msg).toContain('"heap"');
    expect(audioStart!.msg).toContain('"trackId":"t1"');
  });

  it("non-audio logEvent calls do NOT attach heap (no extra cost)", () => {
    setHeap(40 * 1024 * 1024);
    logEvent("sync.push.start", { count: 7 });
    const e = getDiagnostics().find((x) => x.tag === "sync.push.start");
    expect(e).toBeDefined();
    expect(e!.msg).not.toContain("heap");
  });

  it("emits an audio.heap.peak entry when a new session peak is hit", () => {
    // Drive the peak well past any cross-test residual so we know the
    // emit threshold is crossed regardless of test ordering.
    setHeap(500 * 1024 * 1024);
    logEvent("audio.play.start", { trackId: "tBigPeak" });
    const peaks = getDiagnostics().filter((e) => e.tag === "audio.heap.peak");
    expect(peaks.length).toBeGreaterThanOrEqual(1);
    const last = peaks[peaks.length - 1]!;
    expect(last.msg).toContain('"peakMB":500');
  });

  it("does not re-emit audio.heap.peak when heap stays below the +1 MB threshold", () => {
    // Establish a fresh ceiling first…
    setHeap(600 * 1024 * 1024);
    logEvent("audio.play.start", { trackId: "establishPeak" });
    const before = getDiagnostics().filter((e) => e.tag === "audio.heap.peak")
      .length;
    // …then move within ±delta of it. peak is monotonic, _lastPeakEmit
    // just caught up to it, so no new peak event should fire.
    setHeap(600 * 1024 * 1024 + 100 * 1024); // +100 KB
    logEvent("audio.play.start", { trackId: "noNewPeak" });
    const after = getDiagnostics().filter((e) => e.tag === "audio.heap.peak")
      .length;
    expect(after).toBe(before);
  });
});

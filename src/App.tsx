import {
  CheckIcon,
  CopyIcon,
  Link2Icon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Controls } from "@/components/Controls";
import { Timeline } from "@/components/Timeline";
import { Button } from "@/components/ui/button";
import { useOverlapParams } from "@/lib/params";
import {
  computeOffsets,
  dayOffsetOf,
  fmtAnchorDate,
  fmtLocal,
  fmtUTC,
  type Region,
  snapToGrid,
  wrapMin,
} from "@/lib/tz";

const COPY_SUCCESS_TTL_MS = 1500; // how long the checkmark stays after a successful copy
const COPY_FAIL_TTL_MS = 3000; // longer display for failure so the user sees it

function App() {
  const [params, setParams] = useOverlapParams();
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const [shareState, setShareState] = useState<"idle" | "ok">("idle");
  // Individual refs for the header parts so handleLiveChange can surgically update
  // only the time range and duration without re-rendering React or losing the date span
  const headerContainerRef = useRef<HTMLDivElement>(null);
  const timeRangeRef = useRef<HTMLSpanElement>(null);
  const durRef = useRef<HTMLSpanElement>(null);
  // Ref so handleCopy doesn't need copyState in its dep array (rule: useRef for transient values)
  const copyStateRef = useRef(copyState);
  copyStateRef.current = copyState;

  const regions = params.regions as Region[];
  const dateBasis = params.date;
  const workStart = params.ws;
  const workEnd = params.we;
  const dur = params.dur;

  // Snap slot to 30-min grid — simple arithmetic, no useMemo needed (rule: don't memo primitives)
  const slot = snapToGrid(params.slot, dur);

  const withOffsets = useMemo(
    () => computeOffsets(regions, dateBasis),
    [regions, dateBasis],
  );

  const startT = slot;
  const endT = (startT + dur) % 1440;

  // Update only the time-range and duration spans during drag — no re-render needed
  const handleLiveChange = useCallback((s: number, d: number) => {
    if (timeRangeRef.current)
      timeRangeRef.current.textContent = `${fmtUTC(s)} – ${fmtUTC(wrapMin(s + d))} UTC`;
    if (durRef.current) durRef.current.textContent = `${d} min`;
  }, []);

  const handleShareLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setShareState("ok");
      setTimeout(() => setShareState("idle"), COPY_SUCCESS_TTL_MS);
    });
  }, []);

  const handleCopy = useCallback(() => {
    const anchorDate = fmtAnchorDate(0, dateBasis);
    let text = `Proposed meeting time (${anchorDate}, ${fmtUTC(startT)} – ${fmtUTC(endT)} UTC):\n`;
    withOffsets.forEach((r) => {
      const rawStart = startT + r.offset;
      const rawEnd = rawStart + dur;
      const localStart = wrapMin(rawStart);
      const localEnd = wrapMin(rawEnd);
      const startDate = fmtAnchorDate(dayOffsetOf(rawStart), dateBasis);
      const endDate = fmtAnchorDate(dayOffsetOf(rawEnd), dateBasis);
      // Only show date when it adds info: skip if both endpoints are on the anchor date
      let dateNote = "";
      if (startDate !== endDate) {
        dateNote = ` (${startDate} – ${endDate})`;
      } else if (startDate !== anchorDate) {
        dateNote = ` (${startDate})`;
      }
      text += `- ${r.name}: ${fmtLocal(localStart)} – ${fmtLocal(localEnd)}${dateNote}\n`;
    });

    const doFallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        setCopyState(ok ? "ok" : "fail");
      } catch {
        setCopyState("fail");
      }
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => setCopyState("ok"))
        .catch(doFallback);
    } else {
      doFallback();
    }

    setTimeout(
      () => setCopyState("idle"),
      copyStateRef.current === "fail" ? COPY_FAIL_TTL_MS : COPY_SUCCESS_TTL_MS,
    );
  }, [startT, endT, dur, dateBasis, withOffsets]);

  return (
    <>
      {/* Grain texture — SVG feTurbulence noise, purely visual depth layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[100]"
        style={{
          backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
          backgroundSize: "200px 200px",
          opacity: 0.04,
        }}
      />
      {/* Portrait mobile gate — shown only in portrait on small screens */}
      <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-app-bg px-8 text-center mobile-pt:flex">
        <RotateCcwIcon className="size-10 text-app-muted" strokeWidth={1.5} />
        <div>
          <p className="text-base font-semibold tracking-tight text-app-fg">
            Rotate to landscape
          </p>
          <p className="mt-1 text-[0.8125rem] text-app-muted">
            Rotate your phone to see the full timeline.
          </p>
        </div>
      </div>

      <div
        className="dark min-h-screen font-mono text-app-fg mobile-ls:overflow-x-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 15% 0%, #1e2330, #14171c)",
        }}
      >
        <div className="mx-auto w-[90%] max-w-375 px-0 py-8 pb-20 mobile-ls:w-[96%] mobile-ls:min-w-135 mobile-ls:py-3 mobile-ls:pb-4">
          <Controls
            workStart={workStart}
            workEnd={workEnd}
            dateBasis={dateBasis}
            onWorkStartChange={(v) => setParams({ ws: v, slot: -1 })}
            onWorkEndChange={(v) => setParams({ we: v, slot: -1 })}
            onDateChange={(v) => setParams({ date: v, slot: -1 })}
          />

          {/* Header line: date · [TIME RANGE] · duration — copy + share inline */}
          <div
            ref={headerContainerRef}
            className="mt-5 flex items-center justify-between gap-2 mobile-ls:mt-2"
          >
            <div className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate font-mono text-[0.9375rem] font-semibold tracking-tight text-app-fg">
              <span>{fmtAnchorDate(0, dateBasis)}</span>
              <span className="opacity-30">·</span>
              <span ref={timeRangeRef}>
                {`${fmtUTC(startT)} – ${fmtUTC(endT)} UTC`}
              </span>
              <span className="opacity-30">·</span>
              <span ref={durRef}>{dur} min</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {/* Share link */}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-app-muted hover:text-app-fg"
                onClick={handleShareLink}
                title="Copy shareable link"
              >
                {shareState === "ok" ? (
                  <CheckIcon className="size-4 text-green-400" />
                ) : (
                  <Link2Icon className="size-4" />
                )}
              </Button>
              {/* Copy meeting times */}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-app-muted hover:text-app-fg"
                onClick={handleCopy}
                title="Copy meeting times as text"
              >
                {copyState === "ok" ? (
                  <CheckIcon className="size-4 text-green-400" />
                ) : copyState === "fail" ? (
                  <XIcon className="size-4 text-red-400" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="relative mt-2.5 rounded-[0.625rem] border border-app-border bg-app-card p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_40px_rgba(0,0,0,0.5)] mobile-ls:p-2">
            <Timeline
              regions={regions}
              slotUTC={slot}
              dur={dur}
              dateBasis={dateBasis}
              workStart={workStart}
              workEnd={workEnd}
              onRegionsChange={(r) => setParams({ regions: r, slot })}
              onSlotChange={(s) => setParams({ slot: s })}
              onDurChange={(d) => setParams({ dur: d })}
              onLiveChange={handleLiveChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;

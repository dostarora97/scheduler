import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  computeOffsets,
  fmtUTC,
  type Region,
  snapToGrid,
  TZ_OPTIONS,
  timeStrToMin,
  wrapMin,
} from "@/lib/tz";
import { RegionRow } from "./RegionRow";

const MIN_DUR = 30; // minimum meeting duration (minutes) = one grid cell

// Overlay positioning — kept in sync with RegionRow label column widths and index.css --label-w
const LABEL_W_FALLBACK = "22.25rem"; // grip (w-5=1.25rem) + ml-2 gap (0.5rem) + label (w-82=20.5rem)
const REMOVE_W = "2rem"; // remove button allocation (ml-2 + size-6 = 8px + 24px = 32px)

const CELL_MINUTES = 30; // grid resolution: one cell = 30 min
const FP_EPSILON = 1e-6; // guards resize math at exact cell boundary float imprecision
const DRAG_ACTIVATION_PX = 5; // pointer must move this far before a drag starts
const DROP_ANIMATION_MS = 200; // overlay drop animation duration

// Slot selection window visual style — elevation via CSS class so clip-path hover works
const SLOT_STYLE = {
  background: "rgba(232,230,225,0.10)",
  border: "2px solid rgba(232,230,225,0.95)",
  borderRadius: "5px",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 20px rgba(0,0,0,0.55)",
} as const;

// Drag overlay clone style (elevated, slightly scaled up)
const DRAG_CLONE_STYLE = {
  boxShadow: "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(232,230,225,0.08)",
  borderRadius: "6px",
  background: "var(--color-app-elevated)",
  transform: "scale(1.015)",
} as const;

// Hoist static DnD modifier array — prevents new array reference on every render (rule: hoist static JSX)
const DRAG_MODIFIERS = [restrictToVerticalAxis];

interface TimelineProps {
  regions: Region[];
  slotUTC: number;
  dur: number;
  dateBasis: string;
  workStart: string;
  workEnd: string;
  onRegionsChange: (regions: Region[]) => void;
  onSlotChange: (slot: number) => void;
  onDurChange: (dur: number) => void;
  onLiveChange?: (slot: number, dur: number) => void;
}

export function Timeline({
  regions,
  slotUTC,
  dur,
  dateBasis,
  workStart,
  workEnd,
  onRegionsChange,
  onSlotChange,
  onDurChange,
  onLiveChange,
}: TimelineProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);
  const trackWidthRef = useRef(0); // keeps rAF loop free of stale closures
  const [trackWidth, setTrackWidth] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const [labelW, setLabelW] = useState(LABEL_W_FALLBACK);

  // Live values: update every drag/resize frame so rows and cells respond instantly
  const [liveSlot, setLiveSlot] = useState(slotUTC);
  const [liveDur, setLiveDur] = useState(dur);

  // Sync when slot/dur change from outside (cell click, URL paste, keyboard)
  useEffect(() => setLiveSlot(slotUTC), [slotUTC]);
  useEffect(() => setLiveDur(dur), [dur]);

  // Keep ref in sync so the rAF loop below never closes over a stale trackWidth
  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  // Current UTC time indicator — direct DOM write every frame, zero React overhead
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const w = trackWidthRef.current;
      if (nowLineRef.current && w > 0) {
        const n = new Date();
        const utcMin =
          n.getUTCHours() * 60 + n.getUTCMinutes() + n.getUTCSeconds() / 60;
        nowLineRef.current.style.left = `${(utcMin / 1440) * w}px`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Read --label-w CSS variable so the overlay tracks the responsive label column width
  useEffect(() => {
    const updateLabelW = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--label-w")
        .trim();
      setLabelW(v || LABEL_W_FALLBACK);
    };
    updateLabelW();
    window.addEventListener("resize", updateLabelW);
    window.addEventListener("orientationchange", updateLabelW);
    return () => {
      window.removeEventListener("resize", updateLabelW);
      window.removeEventListener("orientationchange", updateLabelW);
    };
  }, []);

  // Always-mounted ResizeObserver so dimensions are ready immediately
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setTrackWidth(el.offsetWidth);
      setTrackHeight(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pxPerMin = trackWidth > 0 ? trackWidth / 1440 : 0;
  const cellPx = trackWidth > 0 ? trackWidth / 48 : 0;
  const winX = slotUTC * pxPerMin;
  const winW = Math.max(cellPx, dur * pxPerMin);

  // Use live values for cell highlighting. Math.round instead of floor/ceil so that
  // sub-integer FP error in liveSlot/liveDur (which are multiples of 30) never adds
  // a phantom extra cell at the boundaries.
  const selectedStartCol = Math.round(liveSlot / 30);
  const selectedEndCol = Math.round((liveSlot + liveDur) / 30);

  const withOffsets = useMemo(
    () => computeOffsets(regions, dateBasis),
    [regions, dateBasis],
  );
  // Memoize workStart/End minutes — timeStrToMin runs every drag frame without this (rule: narrow effect deps)
  const workStartMin = useMemo(() => timeStrToMin(workStart), [workStart]);
  const workEndMin = useMemo(() => timeStrToMin(workEnd), [workEnd]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_PX },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  // Disable row pointer-events while the slot window is being dragged or resized
  // — prevents the hover:bg-white/[0.03] tint from flickering as the resize handle moves over rows
  const [slotInteracting, setSlotInteracting] = useState(false);
  const activeRegion = activeId
    ? (withOffsets.find((r) => r.id === activeId) ?? null)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = regions.findIndex((r) => r.id === active.id);
    const newIdx = regions.findIndex((r) => r.id === over.id);
    onRegionsChange(arrayMove(regions, oldIdx, newIdx));
  }

  const handleCellClick = useCallback(
    (col: number) => {
      onSlotChange(snapToGrid(col * 30, dur));
    },
    [dur, onSlotChange],
  );

  const handleSlotKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSlotChange(snapToGrid(Math.max(0, slotUTC - CELL_MINUTES), dur));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onSlotChange(
          snapToGrid(Math.min(1440 - dur, slotUTC + CELL_MINUTES), dur),
        );
      }
    },
    [slotUTC, dur, onSlotChange],
  );

  // Memoize addOptions — builds a Set + filters 16 items on every drag frame without this (rule: memoize non-trivial render-path work)
  const addOptions = useMemo(() => {
    const usedTz = new Set(regions.map((r) => r.tz));
    return TZ_OPTIONS.filter(([v]) => !usedTz.has(v));
  }, [regions]);
  const [addRegionOpen, setAddRegionOpen] = useState(false);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={DRAG_MODIFIERS}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext
        items={regions.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
      >
        {/* Rows wrapper — position:relative so the overlay can be absolutely positioned */}
        <div className="relative">
          {/* pointer-events-none while slot is dragged/resized — prevents row hover tint from flickering */}
          <div className={slotInteracting ? "pointer-events-none" : ""}>
            {withOffsets.map((r) => (
              <RegionRow
                key={r.id}
                region={r}
                offset={r.offset}
                workStart={workStartMin}
                workEnd={workEndMin}
                slotUTC={liveSlot}
                dur={liveDur}
                dateBasis={dateBasis}
                selectedStartCol={selectedStartCol}
                selectedEndCol={selectedEndCol}
                canRemove={regions.length > 1}
                onNameChange={(name) =>
                  onRegionsChange(
                    regions.map((x) => (x.id === r.id ? { ...x, name } : x)),
                  )
                }
                onRemove={() =>
                  onRegionsChange(regions.filter((x) => x.id !== r.id))
                }
                onCellClick={handleCellClick}
              />
            ))}
          </div>

          {/* Overlay — ALWAYS mounted so ResizeObserver fires on first render.
              Positioned over the track cells only (after label and before remove btn). */}
          <div
            ref={overlayRef}
            className="pointer-events-none absolute inset-y-0"
            style={{ left: labelW, right: REMOVE_W, zIndex: 10 }}
          >
            {/* Option B: hairline + top dot — current UTC time, rAF-driven */}
            <div
              ref={nowLineRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -translate-x-px"
              style={{ zIndex: 6 }}
            >
              {/* dot at top — HDR white, no glow */}
              <div className="absolute top-0 -left-[3px] size-[6px] rounded-full bg-white" />
              {/* hairline — HDR bright with glow */}
              <div className="absolute inset-y-0 left-0 w-px bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.5)]" />
            </div>
            {trackWidth > 0 && (
              <Rnd
                key={`${slotUTC}-${dur}-${trackHeight}`}
                className="pointer-events-auto"
                style={SLOT_STYLE}
                bounds="parent"
                dragAxis="x"
                dragGrid={[cellPx, 0]}
                resizeGrid={[cellPx || 1, 1]}
                default={{ x: winX, y: 0, width: winW, height: trackHeight }}
                minWidth={cellPx}
                enableResizing={{
                  left: true,
                  right: true,
                  top: false,
                  bottom: false,
                  topLeft: false,
                  topRight: false,
                  bottomLeft: false,
                  bottomRight: false,
                }}
                resizeHandleStyles={{
                  left: { width: "14px", left: "-7px", cursor: "ew-resize" },
                  right: { width: "14px", right: "-7px", cursor: "ew-resize" },
                }}
                onDrag={(_e, d) => {
                  setSlotInteracting(true);
                  if (pxPerMin <= 0) return;
                  const s = snapToGrid(d.x / pxPerMin, liveDur);
                  setLiveSlot(s);
                  onLiveChange?.(s, liveDur);
                }}
                onDragStop={(_e, d) => {
                  setSlotInteracting(false);
                  onSlotChange(snapToGrid(d.x / pxPerMin, dur));
                }}
                onResize={(_e, dir, ref, _delta, pos) => {
                  setSlotInteracting(true);
                  if (pxPerMin <= 0 || cellPx <= 0) return;
                  // Compute in cellPx space to avoid pxPerMin FP conversion errors.
                  // Tiny epsilon (1e-6) corrects for exact-boundary float imprecision:
                  //   floor(12.0000001 + 1e-6) = 12   (not 13)
                  //   ceil(6.0000001 - 1e-6)   = 6    (not 7)
                  const slotCell =
                    dir === "left"
                      ? Math.floor(pos.x / cellPx + FP_EPSILON)
                      : Math.round(pos.x / cellPx);
                  const durCells = Math.ceil(
                    ref.offsetWidth / cellPx - FP_EPSILON,
                  );
                  const s = Math.max(0, slotCell * CELL_MINUTES);
                  const d = Math.max(MIN_DUR, durCells * CELL_MINUTES);
                  setLiveSlot(s);
                  setLiveDur(d);
                  onLiveChange?.(s, d);
                }}
                onResizeStop={(_e, dir, ref, _delta, pos) => {
                  setSlotInteracting(false);
                  if (cellPx <= 0) return;
                  const slotCell =
                    dir === "left"
                      ? Math.floor(pos.x / cellPx + FP_EPSILON)
                      : Math.round(pos.x / cellPx);
                  const durCells = Math.ceil(
                    ref.offsetWidth / cellPx - FP_EPSILON,
                  );
                  const newSlot = Math.max(0, slotCell * CELL_MINUTES);
                  const newDur = Math.max(MIN_DUR, durCells * CELL_MINUTES);
                  onSlotChange(newSlot);
                  onDurChange(newDur);
                }}
              >
                <div
                  tabIndex={0}
                  role="slider"
                  aria-label={`Meeting slot: ${fmtUTC(slotUTC)} – ${fmtUTC(wrapMin(slotUTC + dur))} UTC. Left/Right arrows to move by 30 minutes.`}
                  aria-valuemin={0}
                  aria-valuemax={1410}
                  aria-valuenow={slotUTC}
                  onKeyDown={handleSlotKeyDown}
                  className="absolute inset-0 cursor-grab rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:cursor-grabbing"
                  style={{ pointerEvents: "none" }}
                />
              </Rnd>
            )}
          </div>
        </div>

        {/* Add region — custom popover dropdown, no native <select> */}
        {addOptions.length > 0 && (
          <Popover open={addRegionOpen} onOpenChange={setAddRegionOpen}>
            <PopoverTrigger
              render={
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Add region"
                  className="mt-1 flex cursor-pointer items-center justify-center rounded-md border border-dashed border-app-border py-1.5 text-app-muted transition-colors hover:border-app-muted/60 hover:bg-white/5 hover:text-app-fg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setAddRegionOpen(true);
                  }}
                >
                  <PlusIcon className="size-4" />
                  <span className="ml-1 text-xs">Add region</span>
                </div>
              }
            />
            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={4}
              className="w-56 overflow-hidden border border-app-border/70 bg-app-card p-1 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
            >
              <div className="max-h-64 overflow-y-auto">
                {[
                  {
                    label: "Americas",
                    tzs: [
                      "America/Los_Angeles",
                      "America/New_York",
                      "America/Chicago",
                      "America/Denver",
                      "America/Sao_Paulo",
                    ],
                  },
                  {
                    label: "Europe",
                    tzs: ["Europe/Berlin", "Europe/London", "Europe/Paris"],
                  },
                  {
                    label: "Asia & Pacific",
                    tzs: [
                      "Asia/Kolkata",
                      "Asia/Dubai",
                      "Asia/Singapore",
                      "Asia/Shanghai",
                      "Asia/Tokyo",
                      "Australia/Sydney",
                      "Pacific/Auckland",
                    ],
                  },
                  { label: "UTC", tzs: ["UTC"] },
                ].map(({ label, tzs }) => {
                  const groupOptions = addOptions.filter(([v]) =>
                    tzs.includes(v),
                  );
                  if (groupOptions.length === 0) return null;
                  return (
                    <div key={label}>
                      <p className="px-2 pt-2 pb-0.5 text-[10px] font-semibold tracking-widest text-app-muted/60 uppercase first:pt-1">
                        {label}
                      </p>
                      {groupOptions.map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left font-mono text-xs text-app-fg transition-colors hover:bg-white/[0.06]"
                          onClick={() => {
                            onRegionsChange([
                              ...regions,
                              {
                                id: String(Date.now()),
                                name: l.split(" / ")[0],
                                tz: v,
                              },
                            ]);
                            setAddRegionOpen(false);
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </SortableContext>

      {/* Floating clone that follows the cursor during row-reorder drag */}
      <DragOverlay
        dropAnimation={{
          duration: DROP_ANIMATION_MS,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {activeRegion && (
          <div
            style={DRAG_CLONE_STYLE}
            className="animate-[cloneEnter_150ms_ease-out]"
          >
            <RegionRow
              region={activeRegion}
              offset={activeRegion.offset}
              workStart={workStartMin}
              workEnd={workEndMin}
              slotUTC={liveSlot}
              dur={liveDur}
              dateBasis={dateBasis}
              selectedStartCol={selectedStartCol}
              selectedEndCol={selectedEndCol}
              canRemove={false}
              dragOverlay
              onNameChange={() => {}}
              onRemove={() => {}}
              onCellClick={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

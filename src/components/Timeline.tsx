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
  addDaysToISO,
  computeOffsets,
  fmtUTC,
  type Region,
  snapToGrid,
  TZ_OPTIONS,
  timeStrToMin,
  wrapMin,
} from "@/lib/tz";
import { RegionRowLeft, RegionRowRemoveButton } from "./RegionRow";
import { TrackCells } from "./TrackCells";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_DUR = 30;
const CELL_MINUTES = 30;
const FP_EPSILON = 1e-6;
const DRAG_ACTIVATION_PX = 5;
const DROP_ANIMATION_MS = 200;

/** Day copies rendered side-by-side for infinite scroll. */
const COPIES = 5;
/** Viewport always shows 1 full day + this fraction of the next day as a peek. */
const DAY_PEEK_FACTOR = 1.1;
/** Index of the "today" copy within COPIES. */
const CENTER_COPY = 2;

const LABEL_W_FALLBACK = "22.25rem";
const REMOVE_W = "2rem";

const SLOT_STYLE = {
  background: "rgba(232,230,225,0.10)",
  border: "2px solid rgba(232,230,225,0.95)",
  borderRadius: "5px",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 20px rgba(0,0,0,0.55)",
} as const;

const DRAG_CLONE_STYLE = {
  boxShadow: "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(232,230,225,0.08)",
  borderRadius: "6px",
  background: "var(--color-app-elevated)",
  transform: "scale(1.015)",
} as const;

const DRAG_MODIFIERS = [restrictToVerticalAxis];

// ─── Interface ────────────────────────────────────────────────────────────────

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
  onDateChange: (date: string) => void;
  onLiveChange?: (slot: number, dur: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  onDateChange,
  onLiveChange,
}: TimelineProps) {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollInnerRef = useRef<HTMLDivElement>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);
  const singleDayWidthRef = useRef(0);
  const isTeleportingRef = useRef(false);

  // ── State ─────────────────────────────────────────────────────────────────
  const [singleDayWidth, setSingleDayWidth] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const [labelW, setLabelW] = useState(LABEL_W_FALLBACK);
  const [liveSlot, setLiveSlot] = useState(slotUTC);
  const [liveDur, setLiveDur] = useState(dur);
  const [slotInteracting, setSlotInteracting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addRegionOpen, setAddRegionOpen] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // ── Stale-ref sync ────────────────────────────────────────────────────────
  useEffect(() => {
    singleDayWidthRef.current = singleDayWidth;
  }, [singleDayWidth]);
  useEffect(() => setLiveSlot(slotUTC), [slotUTC]);
  useEffect(() => setLiveDur(dur), [dur]);

  // ── ResizeObserver: viewport width → singleDayWidth; rows height → trackHeight
  // Two separate observers: scrollRef for width (DAY_PEEK_FACTOR), scrollInnerRef
  // for height so the Rnd slot doesn't extend into the Add Region button area.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const dayW = el.offsetWidth / DAY_PEEK_FACTOR;
      setSingleDayWidth(dayW);
      singleDayWidthRef.current = dayW;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollInnerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTrackHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Center scroll on first layout and on dateBasis change ────────────────
  useEffect(() => {
    if (singleDayWidth > 0 && scrollRef.current) {
      scrollRef.current.scrollLeft = CENTER_COPY * singleDayWidth;
    }
  }, [singleDayWidth, dateBasis]);

  // ── Infinite scroll teleport ──────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    const dayW = singleDayWidthRef.current;
    if (!el || dayW <= 0 || isTeleportingRef.current) return;
    const sl = el.scrollLeft;
    if (sl < dayW * 0.5) {
      isTeleportingRef.current = true;
      el.scrollLeft = sl + dayW * 2;
      requestAnimationFrame(() => {
        isTeleportingRef.current = false;
      });
    } else if (sl > dayW * (COPIES - 1.5)) {
      isTeleportingRef.current = true;
      el.scrollLeft = sl - dayW * 2;
      requestAnimationFrame(() => {
        isTeleportingRef.current = false;
      });
    }
  }, []);

  // ── Responsive label width from CSS variable ──────────────────────────────
  useEffect(() => {
    const update = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--label-w")
        .trim();
      setLabelW(v || LABEL_W_FALLBACK);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // ── rAF: now line pinned at today (CENTER_COPY) ───────────────────────────
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const dayW = singleDayWidthRef.current;
      if (nowLineRef.current && dayW > 0) {
        const n = new Date();
        const utcMin =
          n.getUTCHours() * 60 + n.getUTCMinutes() + n.getUTCSeconds() / 60;
        nowLineRef.current.style.left = `${CENTER_COPY * dayW + (utcMin / 1440) * dayW}px`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const pxPerMin = singleDayWidth > 0 ? singleDayWidth / 1440 : 0;
  const cellPx = singleDayWidth > 0 ? singleDayWidth / 48 : 0;
  const totalTrackWidth = COPIES * singleDayWidth;

  const winX = CENTER_COPY * singleDayWidth + slotUTC * pxPerMin;
  const winW = Math.max(cellPx, dur * pxPerMin);

  const selectedStartCol = Math.round(liveSlot / 30);
  const selectedEndCol = Math.round((liveSlot + liveDur) / 30);

  const workStartMin = useMemo(() => timeStrToMin(workStart), [workStart]);
  const workEndMin = useMemo(() => timeStrToMin(workEnd), [workEnd]);

  // Per-copy DST-aware offsets
  const allCopyOffsets = useMemo(
    () =>
      Array.from({ length: COPIES }, (_, i) =>
        computeOffsets(regions, addDaysToISO(dateBasis, i - CENTER_COPY)),
      ),
    [regions, dateBasis],
  );

  const centerRegions = allCopyOffsets[CENTER_COPY];

  const addOptions = useMemo(() => {
    const usedTz = new Set(regions.map((r) => r.tz));
    return TZ_OPTIONS.filter(([v]) => !usedTz.has(v));
  }, [regions]);

  // ── Commit slot: resolve absolute scroll-content x → UTC + dayOffset ─────
  const commitSlotPosition = useCallback(
    (absoluteX: number, newDur?: number) => {
      const dayW = singleDayWidthRef.current;
      if (dayW <= 0) return;
      const copyIndex = Math.min(
        COPIES - 1,
        Math.max(0, Math.floor(absoluteX / dayW)),
      );
      const dayOffset = copyIndex - CENTER_COPY;
      const xWithinDay = absoluteX - copyIndex * dayW;
      const newSlot = snapToGrid(xWithinDay / pxPerMin, newDur ?? MIN_DUR);
      onSlotChange(newSlot);
      if (newDur !== undefined) onDurChange(newDur);
      if (dayOffset !== 0) onDateChange(addDaysToISO(dateBasis, dayOffset));
    },
    [pxPerMin, onSlotChange, onDurChange, onDateChange, dateBasis],
  );

  // ── DnD ───────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_PX },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeRegion = activeId
    ? (centerRegions.find((r) => r.id === activeId) ?? null)
    : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = regions.findIndex((r) => r.id === active.id);
    const newIdx = regions.findIndex((r) => r.id === over.id);
    onRegionsChange(arrayMove(regions, oldIdx, newIdx));
  }

  const handleCellClick = useCallback(
    (copyIndex: number, col: number) => {
      const dayOffset = copyIndex - CENTER_COPY;
      const newSlotUTC = snapToGrid(col * CELL_MINUTES, dur);
      onSlotChange(newSlotUTC);
      if (dayOffset !== 0) onDateChange(addDaysToISO(dateBasis, dayOffset));
    },
    [dur, onSlotChange, onDateChange, dateBasis],
  );

  const handleSlotKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const absMin = CENTER_COPY * 1440 + slotUTC - CELL_MINUTES;
        const newCopyIdx = Math.floor(absMin / 1440);
        const newSlotUTC = ((absMin % 1440) + 1440) % 1440;
        onSlotChange(snapToGrid(newSlotUTC, dur));
        const dayOff = newCopyIdx - CENTER_COPY;
        if (dayOff !== 0) onDateChange(addDaysToISO(dateBasis, dayOff));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const absMin = CENTER_COPY * 1440 + slotUTC + CELL_MINUTES;
        const newCopyIdx = Math.floor(absMin / 1440);
        const newSlotUTC = absMin % 1440;
        onSlotChange(snapToGrid(Math.min(1440 - dur, newSlotUTC), dur));
        const dayOff = newCopyIdx - CENTER_COPY;
        if (dayOff !== 0) onDateChange(addDaysToISO(dateBasis, dayOff));
      }
    },
    [slotUTC, dur, onSlotChange, onDateChange, dateBasis],
  );

  // ── Render ────────────────────────────────────────────────────────────────
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
        <div className="flex items-stretch">
          {/* LEFT FIXED: grip + name/tz + times */}
          <div className="flex-none" style={{ width: labelW }}>
            {centerRegions.map((r) => (
              <RegionRowLeft
                key={r.id}
                region={r}
                offset={r.offset}
                workStart={workStartMin}
                workEnd={workEndMin}
                slotUTC={liveSlot}
                dur={liveDur}
                dateBasis={dateBasis}
                canRemove={regions.length > 1}
                isHovered={hoveredRowId === r.id}
                onHoverEnter={() => setHoveredRowId(r.id)}
                onHoverLeave={() => setHoveredRowId(null)}
                onNameChange={(name) =>
                  onRegionsChange(
                    regions.map((x) => (x.id === r.id ? { ...x, name } : x)),
                  )
                }
              />
            ))}
            {addOptions.length > 0 && <div className="mt-1 h-8" />}
          </div>

          {/* CENTER SCROLLABLE: N day copies side-by-side + Rnd + now line */}
          <div
            ref={scrollRef}
            className="scrollbar-hidden relative flex-1 overflow-x-scroll"
            onScroll={handleScroll}
          >
            <div
              ref={scrollInnerRef}
              className="relative"
              style={{
                width:
                  totalTrackWidth > 0
                    ? `${totalTrackWidth}px`
                    : `${COPIES * 100}%`,
              }}
            >
              {/* Stacked track rows */}
              <div className={slotInteracting ? "pointer-events-none" : ""}>
                {centerRegions.map((r, rowIndex) => (
                  <div
                    key={r.id}
                    className={`flex h-[3.75rem] items-stretch py-1.5 ${rowIndex > 0 ? "border-t border-app-border" : ""}`}
                    style={{
                      background:
                        hoveredRowId === r.id
                          ? "rgba(255,255,255,0.03)"
                          : undefined,
                    }}
                    onMouseEnter={() => setHoveredRowId(r.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    {Array.from({ length: COPIES }, (_, copyIndex) => {
                      const copyRegion = allCopyOffsets[copyIndex].find(
                        (cr) => cr.id === r.id,
                      );
                      const absStart = selectedStartCol - copyIndex * 48;
                      const absEnd = selectedEndCol - copyIndex * 48;
                      return (
                        <TrackCells
                          key={copyIndex}
                          regionName={r.name}
                          offset={copyRegion?.offset ?? r.offset}
                          workStart={workStartMin}
                          workEnd={workEndMin}
                          selectedStartCol={Math.max(0, absStart)}
                          selectedEndCol={Math.min(48, absEnd)}
                          onCellClick={(col) => handleCellClick(copyIndex, col)}
                          isFirstCopy={copyIndex > 0}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Overlay: now line + Rnd slot */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{ zIndex: 10 }}
              >
                {/* Now line — rAF-driven, pinned to CENTER_COPY */}
                <div
                  ref={nowLineRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -translate-x-px"
                  style={{ zIndex: 6, left: 0 }}
                >
                  <div className="absolute top-0 -left-[3px] size-[6px] rounded-full bg-white" />
                  <div className="absolute inset-y-0 left-0 w-px bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
                </div>

                {/* Slot window */}
                {singleDayWidth > 0 && (
                  <Rnd
                    key={`${slotUTC}-${dur}-${trackHeight}-${dateBasis}`}
                    className="pointer-events-auto"
                    style={SLOT_STYLE}
                    dragAxis="x"
                    dragGrid={[cellPx || 1, 0]}
                    resizeGrid={[cellPx || 1, 1]}
                    default={{
                      x: winX,
                      y: 0,
                      width: winW,
                      height: trackHeight,
                    }}
                    minWidth={cellPx || 1}
                    bounds="parent"
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
                      left: {
                        width: "14px",
                        left: "-7px",
                        cursor: "ew-resize",
                      },
                      right: {
                        width: "14px",
                        right: "-7px",
                        cursor: "ew-resize",
                      },
                    }}
                    onDrag={(_e, d) => {
                      setSlotInteracting(true);
                      if (pxPerMin <= 0) return;
                      const dayW = singleDayWidthRef.current;
                      const xInDay = d.x % (dayW || 1);
                      const s = snapToGrid(xInDay / pxPerMin, liveDur);
                      setLiveSlot(s);
                      onLiveChange?.(s, liveDur);
                    }}
                    onDragStop={(_e, d) => {
                      setSlotInteracting(false);
                      commitSlotPosition(d.x);
                    }}
                    onResize={(_e, dir, ref, _delta, pos) => {
                      setSlotInteracting(true);
                      if (pxPerMin <= 0 || cellPx <= 0) return;
                      const slotCell =
                        dir === "left"
                          ? Math.floor(pos.x / cellPx + FP_EPSILON)
                          : Math.round(pos.x / cellPx);
                      const durCells = Math.ceil(
                        ref.offsetWidth / cellPx - FP_EPSILON,
                      );
                      const s = Math.max(0, slotCell * CELL_MINUTES);
                      const d2 = Math.max(MIN_DUR, durCells * CELL_MINUTES);
                      setLiveSlot(s);
                      setLiveDur(d2);
                      onLiveChange?.(s, d2);
                    }}
                    onResizeStop={(_e, _dir, ref, _delta, pos) => {
                      setSlotInteracting(false);
                      if (cellPx <= 0) return;
                      const durCells = Math.ceil(
                        ref.offsetWidth / cellPx - FP_EPSILON,
                      );
                      const newDur = Math.max(MIN_DUR, durCells * CELL_MINUTES);
                      commitSlotPosition(pos.x, newDur);
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

            {/* Add region */}
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
                      const opts = addOptions.filter(([v]) => tzs.includes(v));
                      if (!opts.length) return null;
                      return (
                        <div key={label}>
                          <p className="px-2 pt-2 pb-0.5 text-[10px] font-semibold tracking-widest text-app-muted/60 uppercase first:pt-1">
                            {label}
                          </p>
                          {opts.map(([v, l]) => (
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
          </div>

          {/* RIGHT FIXED: remove buttons */}
          <div className="flex-none" style={{ width: REMOVE_W }}>
            {centerRegions.map((r) => (
              <RegionRowRemoveButton
                key={r.id}
                region={r}
                canRemove={regions.length > 1}
                isHovered={hoveredRowId === r.id}
                onHoverEnter={() => setHoveredRowId(r.id)}
                onHoverLeave={() => setHoveredRowId(null)}
                onRemove={() =>
                  onRegionsChange(regions.filter((x) => x.id !== r.id))
                }
              />
            ))}
            {addOptions.length > 0 && <div className="mt-1 h-8" />}
          </div>
        </div>
      </SortableContext>

      {/* Drag overlay clone */}
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
            <RegionRowLeft
              region={activeRegion}
              offset={activeRegion.offset}
              workStart={workStartMin}
              workEnd={workEndMin}
              slotUTC={liveSlot}
              dur={liveDur}
              dateBasis={dateBasis}
              canRemove={false}
              isHovered
              dragOverlay
              onNameChange={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

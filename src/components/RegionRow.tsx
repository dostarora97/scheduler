import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  dayOffsetOf,
  fmtAnchorDate,
  fmtLocal,
  instantLevel,
  type PainLevel,
  type Region,
  tzAbbrev,
  wrapMin,
} from "@/lib/tz";
import { TrackCells } from "./TrackCells";

const LEVEL_COLOR: Record<PainLevel, string> = {
  ok: "text-green-400",
  mild: "text-amber-400",
  heavy: "text-red-400",
};

const REGION_NAME_MAX_LEN = 40; // cap name length to keep label column stable
const REGION_NAME_MIN_SIZE = 4; // minimum input size attribute (characters)
const DAY_BADGE_TOP_OFFSET = "-0.4em"; // superscript lift for the +1/-1 day badge

interface RegionRowProps {
  region: Region;
  offset: number;
  workStart: number;
  workEnd: number;
  slotUTC: number;
  dur: number;
  dateBasis: string;
  selectedStartCol: number;
  selectedEndCol: number;
  canRemove: boolean;
  dragOverlay?: boolean;
  onNameChange: (name: string) => void;
  onRemove: () => void;
  onCellClick: (col: number) => void;
}

export function RegionRow({
  region,
  offset,
  workStart,
  workEnd,
  slotUTC,
  dur,
  dateBasis,
  selectedStartCol,
  selectedEndCol,
  canRemove,
  dragOverlay,
  onNameChange,
  onRemove,
  onCellClick,
}: RegionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: region.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // When dragging, make original slot invisible (space preserved) so DragOverlay clone is the only visible copy
    opacity: isDragging && !dragOverlay ? 0 : 1,
  };

  // Local draft so edits don't fire onNameChange (→ URL update) on every keystroke
  const [draftName, setDraftName] = useState(region.name);
  useEffect(() => setDraftName(region.name), [region.name]);

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== region.name) {
      onNameChange(trimmed);
    } else {
      setDraftName(region.name); // revert empty or unchanged
    }
  };

  const rawStart = slotUTC + offset;
  const rawEnd = rawStart + dur;
  const localStart = wrapMin(rawStart);
  const localEnd = wrapMin(rawEnd);
  const startDayOff = dayOffsetOf(rawStart);
  const endDayOff = dayOffsetOf(rawEnd);

  const startColor = LEVEL_COLOR[instantLevel(localStart, workStart, workEnd)];
  const endColor = LEVEL_COLOR[instantLevel(localEnd, workStart, workEnd)];
  const tzLabel = useMemo(() => tzAbbrev(region.tz), [region.tz]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-stretch border-t border-app-border py-1.5 transition-colors duration-75 first:border-t-0 hover:bg-white/[0.03]"
    >
      {/* Grip — w-5 = 20px, 6-dot drag indicator */}
      <button
        {...attributes}
        {...listeners}
        className="flex w-5 shrink-0 cursor-grab items-center justify-center text-app-muted opacity-0 transition-opacity group-hover:opacity-60 focus-visible:opacity-60 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>

      {/* Label column — w-[20.5rem] desktop, w-[13.5rem] mobile landscape; ml-2 gap after grip */}
      <div className="flex w-82 shrink-0 items-stretch gap-1.5 pr-2 ml-2 mobile-ls:w-54">
        {/* Name + tz abbrev */}
        <div className="flex min-w-20 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
          <input
            id={`region-name-${region.id}`}
            name={`region-name-${region.id}`}
            className="truncate bg-transparent text-[0.8125rem] font-semibold text-app-fg outline-none focus-visible:rounded-sm focus-visible:ring-1 focus-visible:ring-[#8b92a0]/50"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              else if (e.key === "Escape") {
                setDraftName(region.name);
                e.currentTarget.blur();
              }
            }}
            size={Math.max(REGION_NAME_MIN_SIZE, draftName.length)}
            maxLength={REGION_NAME_MAX_LEN}
            aria-label="Region name"
          />
          <span className="text-[11px] text-app-muted">{tzLabel}</span>
        </div>

        {/* Start time — horizontal [time][+N superscript] */}
        <div className="flex w-28 shrink-0 items-center font-mono text-lg font-medium">
          <span className={startColor}>{fmtLocal(localStart)}</span>
          <span
            className={`relative ml-0.5 text-[0.7em] font-normal text-app-muted ${startDayOff === 0 ? "invisible" : ""}`}
            style={{ top: DAY_BADGE_TOP_OFFSET }}
            title={
              startDayOff !== 0
                ? fmtAnchorDate(startDayOff, dateBasis)
                : undefined
            }
          >
            {startDayOff !== 0
              ? `${startDayOff > 0 ? "+" : ""}${startDayOff}`
              : "+0"}
          </span>
        </div>

        {/* End time — hidden on mobile landscape to save label width */}
        <div className="flex w-28 shrink-0 items-center font-mono text-lg font-medium mobile-ls:hidden">
          <span className={endColor}>{fmtLocal(localEnd)}</span>
          <span
            className={`relative ml-0.5 text-[0.7em] font-normal text-app-muted ${endDayOff === 0 ? "invisible" : ""}`}
            style={{ top: DAY_BADGE_TOP_OFFSET }}
            title={
              endDayOff !== 0 ? fmtAnchorDate(endDayOff, dateBasis) : undefined
            }
          >
            {endDayOff !== 0 ? `${endDayOff > 0 ? "+" : ""}${endDayOff}` : "+0"}
          </span>
        </div>
      </div>

      {/* Track cells */}
      <TrackCells
        regionName={region.name}
        offset={offset}
        workStart={workStart}
        workEnd={workEnd}
        selectedStartCol={selectedStartCol}
        selectedEndCol={selectedEndCol}
        onCellClick={onCellClick}
      />

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="ml-2 size-6 shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        style={{ visibility: canRemove ? "visible" : "hidden" }}
        onClick={onRemove}
        aria-label={region.name ? `Delete ${region.name}` : "Delete region"}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}

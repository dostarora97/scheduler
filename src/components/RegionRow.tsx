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

const LEVEL_COLOR: Record<PainLevel, string> = {
  ok: "text-signal-ok",
  mild: "text-signal-mild",
  heavy: "text-signal-heavy",
};

const REGION_NAME_MAX_LEN = 40;
const REGION_NAME_MIN_SIZE = 4;
const DAY_BADGE_TOP_OFFSET = "-0.4em";

interface RowBaseProps {
  region: Region;
  offset: number;
  workStart: number;
  workEnd: number;
  slotUTC: number;
  dur: number;
  dateBasis: string;
  canRemove: boolean;
  /** Whether the row is hovered (synced externally so grip + remove button show together) */
  isHovered?: boolean;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
}

// ─── Left column: grip + name/tz + times ─────────────────────────────────────

interface RegionRowLeftProps extends RowBaseProps {
  dragOverlay?: boolean;
  onNameChange: (name: string) => void;
}
export function RegionRowLeft({
  region,
  offset,
  workStart,
  workEnd,
  slotUTC,
  dur,
  dateBasis,
  isHovered = false,
  dragOverlay = false,
  onHoverEnter,
  onHoverLeave,
  onNameChange,
}: RegionRowLeftProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: region.id, disabled: dragOverlay });

  const [draftName, setDraftName] = useState(region.name);
  useEffect(() => setDraftName(region.name), [region.name]);

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== region.name) {
      onNameChange(trimmed);
    } else {
      setDraftName(region.name);
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !dragOverlay ? 0 : 1,
        background: isHovered ? "rgba(255,255,255,0.03)" : undefined,
      }}
      className="flex h-[3.75rem] items-center border-t border-app-border py-1.5 transition-colors duration-75 first:border-t-0"
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {/* Grip */}
      <button
        {...attributes}
        {...listeners}
        className="flex w-5 shrink-0 cursor-grab items-center justify-center text-app-muted transition-opacity focus-visible:opacity-60 active:cursor-grabbing"
        style={{ opacity: isHovered ? 0.6 : 0 }}
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

      {/* Label column */}
      <div className="ml-2 flex w-82 shrink-0 items-center gap-1.5 pr-2 mobile-ls:w-54">
        {/* Name + tz abbrev */}
        <div className="flex min-w-20 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
          <input
            id={`region-name-${region.id}`}
            name={`region-name-${region.id}`}
            className="truncate bg-transparent text-[0.8125rem] font-semibold text-app-fg outline-none"
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
          <span className="text-[11px] text-app-fg opacity-50">{tzLabel}</span>
        </div>

        {/* Start time */}
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

        {/* End time — hidden on mobile landscape */}
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
    </div>
  );
}

// ─── Right column: remove button ─────────────────────────────────────────────

interface RegionRowRemoveProps {
  region: Region;
  canRemove: boolean;
  isHovered?: boolean;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
  onRemove: () => void;
}

export function RegionRowRemoveButton({
  region,
  canRemove,
  isHovered = false,
  onHoverEnter,
  onHoverLeave,
  onRemove,
}: RegionRowRemoveProps) {
  return (
    <div
      className="flex h-[3.75rem] items-center border-t border-app-border py-1.5 transition-colors duration-75 first:border-t-0"
      style={{ background: isHovered ? "rgba(255,255,255,0.03)" : undefined }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <Button
        variant="ghost"
        size="icon"
        className="ml-2 size-6 shrink-0 self-center transition-opacity focus-visible:opacity-100"
        style={{
          visibility: canRemove ? "visible" : "hidden",
          opacity: isHovered ? 1 : 0,
        }}
        onClick={onRemove}
        aria-label={region.name ? `Delete ${region.name}` : "Delete region"}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}

// ─── Legacy export: full row for DragOverlay clone ───────────────────────────
// Renders only the left-column content (track is in the shared scroll container)

export { RegionRowLeft as RegionRow };

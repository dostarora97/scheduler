import { fmtLocal, instantLevel, type PainLevel, wrapMin } from "@/lib/tz";

const CELLS = 48;
const CELL_MINUTES = 30; // each cell represents 30 minutes
const HOUR_GRIDLINE = "1px solid rgba(0,0,0,0.20)"; // darker line every 60 min
const HALF_HOUR_GRIDLINE = "1px solid rgba(0,0,0,0.08)"; // lighter line every 30 min
// Midnight boundary — box-shadow so it is purely visual (zero layout pixels)
const MIDNIGHT_SHADOW = "inset 2px 0 0 rgba(255,255,255,0.18)";

const pastelBg: Record<PainLevel, string> = {
  ok: "var(--color-green-pastel)",
  mild: "var(--color-amber-pastel)",
  heavy: "var(--color-red-pastel)",
};
const solidBg: Record<PainLevel, string> = {
  ok: "var(--color-green)",
  mild: "var(--color-amber)",
  heavy: "var(--color-red)",
};

interface TrackCellsProps {
  regionName: string;
  offset: number;
  workStart: number;
  workEnd: number;
  selectedStartCol: number;
  selectedEndCol: number;
  onCellClick: (col: number) => void;
  /** True when this track strip starts a new day copy (shows midnight boundary line) */
  isFirstCopy?: boolean;
}

export function TrackCells({
  regionName,
  offset,
  workStart,
  workEnd,
  selectedStartCol,
  selectedEndCol,
  onCellClick,
  isFirstCopy = false,
}: TrackCellsProps) {
  return (
    <div
      className="flex h-full flex-1 cursor-pointer overflow-hidden rounded-sm"
      aria-label={`${regionName} timeline`}
    >
      {Array.from({ length: CELLS }, (_, i) => {
        const t = i * CELL_MINUTES;
        const localMin = wrapMin(t + offset);
        const lvl = instantLevel(localMin, workStart, workEnd);
        const isSelected = i >= selectedStartCol && i < selectedEndCol;
        const bg = isSelected ? solidBg[lvl] : pastelBg[lvl];

        // Midnight boundary: box-shadow on the very first cell of a non-first copy
        const midnightShadow =
          isFirstCopy && i === 0 ? MIDNIGHT_SHADOW : undefined;

        // Normal hourly / half-hourly gridlines (left border on cells > 0)
        const borderLeft =
          i === 0 ? "none" : i % 2 === 0 ? HOUR_GRIDLINE : HALF_HOUR_GRIDLINE;

        return (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            title={`${regionName}: ${fmtLocal(localMin)}`}
            aria-label={`${regionName}: ${fmtLocal(localMin)}, move meeting to this time`}
            className="h-full flex-1 cursor-pointer border-0 p-0"
            style={{
              background: bg,
              borderLeft,
              boxShadow: midnightShadow,
            }}
            onClick={() => onCellClick(i)}
          />
        );
      })}
    </div>
  );
}

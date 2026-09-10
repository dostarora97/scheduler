import { fmtLocal, instantLevel, type PainLevel, wrapMin } from "@/lib/tz";

const CELLS = 48;
const CELL_MINUTES = 30; // each cell represents 30 minutes
const HOUR_GRIDLINE = "1px solid rgba(0,0,0,0.35)"; // darker line every 60 min (every 2 cells)
const HALF_HOUR_GRIDLINE = "1px solid rgba(0,0,0,0.12)"; // lighter line every 30 min

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
}

export function TrackCells({
  regionName,
  offset,
  workStart,
  workEnd,
  selectedStartCol,
  selectedEndCol,
  onCellClick,
}: TrackCellsProps) {
  return (
    <div
      className="flex h-12 flex-1 cursor-pointer overflow-hidden rounded-sm mobile-ls:h-9"
      aria-label={`${regionName} timeline`}
    >
      {Array.from({ length: CELLS }, (_, i) => {
        const t = i * CELL_MINUTES;
        const localMin = wrapMin(t + offset);
        const lvl = instantLevel(localMin, workStart, workEnd);
        const isSelected = i >= selectedStartCol && i < selectedEndCol;
        const bg = isSelected ? solidBg[lvl] : pastelBg[lvl];
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
              borderLeft:
                i === 0
                  ? "none"
                  : i % 2 === 0
                    ? HOUR_GRIDLINE
                    : HALF_HOUR_GRIDLINE,
            }}
            onClick={() => onCellClick(i)}
          />
        );
      })}
    </div>
  );
}

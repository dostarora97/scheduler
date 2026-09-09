import { instantLevel, fmtLocal, wrapMin, type PainLevel } from '@/lib/tz'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const CELLS = 48

const pastelBg: Record<PainLevel, string> = {
  ok: 'var(--color-green-pastel)',
  mild: 'var(--color-amber-pastel)',
  heavy: 'var(--color-red-pastel)',
}
const solidBg: Record<PainLevel, string> = {
  ok: 'var(--color-green)',
  mild: 'var(--color-amber)',
  heavy: 'var(--color-red)',
}

interface TrackCellsProps {
  regionName: string
  offset: number
  workStart: number
  workEnd: number
  selectedStartCol: number
  selectedEndCol: number
  onCellClick: (col: number) => void
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
      className="flex h-12 mobile-ls:h-9 flex-1 cursor-pointer overflow-hidden rounded-sm"
      aria-label={`${regionName} timeline`}
    >
      {Array.from({ length: CELLS }, (_, i) => {
        const t = i * 30
        const localMin = wrapMin(t + offset)
        const lvl = instantLevel(localMin, workStart, workEnd)
        const isSelected = i >= selectedStartCol && i < selectedEndCol
        const bg = isSelected ? solidBg[lvl] : pastelBg[lvl]
        return (
          <Tooltip key={i}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${regionName}: ${fmtLocal(localMin)}, move meeting to this time`}
                  className="h-full flex-1 cursor-pointer border-0 p-0 transition-colors duration-100"
                  style={{
                    background: bg,
                    borderLeft: i === 0 ? 'none' : i % 2 === 0 ? '1px solid rgba(0,0,0,0.35)' : '1px solid rgba(0,0,0,0.12)',
                  }}
                  onClick={() => onCellClick(i)}
                />
              }
            />
            <TooltipContent side="top" className="font-mono text-xs">
              {regionName}: {fmtLocal(localMin)}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

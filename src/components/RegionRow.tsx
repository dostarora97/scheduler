import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrackCells } from './TrackCells'
import {
  fmtLocal,
  fmtAnchorDate,
  computeStatus,
  wrapMin,
  dayOffsetOf,
  tzAbbrev,
  type Region,
} from '@/lib/tz'

interface RegionRowProps {
  region: Region
  offset: number
  workStart: number
  workEnd: number
  slotUTC: number
  dur: number
  dateBasis: string
  selectedStartCol: number
  selectedEndCol: number
  canRemove: boolean
  onNameChange: (name: string) => void
  onRemove: () => void
  onCellClick: (col: number) => void
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
  onNameChange,
  onRemove,
  onCellClick,
}: RegionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: region.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const rawStart = slotUTC + offset
  const rawEnd = rawStart + dur
  const localStart = wrapMin(rawStart)
  const localEnd = wrapMin(rawEnd)
  const startDayOff = dayOffsetOf(rawStart)
  const endDayOff = dayOffsetOf(rawEnd)
  const status = computeStatus(localStart, dur, workStart, workEnd)

  const startColor =
    status.pain === 0
      ? 'text-green-400'
      : status.direction === 'before'
        ? 'text-red-400'
        : 'text-amber-400'
  const endColor =
    status.pain === 0
      ? 'text-green-400'
      : status.direction === 'after'
        ? 'text-red-400'
        : 'text-amber-400'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-stretch border-t border-[#2a2f3a] py-1 first:border-t-0"
    >
      {/* Grip — w-4 = 16px */}
      <button
        {...attributes}
        {...listeners}
        className="flex w-4 shrink-0 cursor-grab items-center justify-center text-[#8b92a0] opacity-0 transition-opacity group-hover:opacity-60 focus-visible:opacity-60 active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-3" />
      </button>

      {/* Label column — w-[19rem] desktop, w-[13rem] mobile landscape */}
      <div className="flex w-[19rem] mobile-ls:w-[13rem] shrink-0 items-stretch gap-1.5 pr-2">
        {/* Name + tz abbrev */}
        <div className="flex min-w-[5rem] flex-1 flex-col justify-center gap-0.5 overflow-hidden">
          <input
            className="truncate bg-transparent text-[0.8125rem] font-semibold text-[#e8e6e1] outline-none"
            value={region.name}
            onChange={e => onNameChange(e.target.value)}
            size={Math.max(4, region.name.length)}
            maxLength={40}
            aria-label="Region name"
          />
          <span className="text-[10px] text-[#8b92a0]">{tzAbbrev(region.tz)}</span>
        </div>

        {/* Start time */}
        <div className="flex w-[5.75rem] shrink-0 flex-col justify-center items-start font-mono text-[0.8125rem] font-medium">
          <span className={startColor}>{fmtLocal(localStart)}</span>
          {startDayOff !== 0 && (
            <span
              className="text-[9px] text-[#8b92a0]"
              title={fmtAnchorDate(startDayOff, dateBasis)}
            >
              {startDayOff > 0 ? '+' : ''}{startDayOff}d
            </span>
          )}
        </div>

        {/* End time — hidden on mobile landscape to save label width */}
        <div className="flex w-[5.75rem] mobile-ls:hidden shrink-0 flex-col justify-center items-start font-mono text-[0.8125rem] font-medium">
          <span className={endColor}>{fmtLocal(localEnd)}</span>
          {endDayOff !== 0 && (
            <span
              className="text-[9px] text-[#8b92a0]"
              title={fmtAnchorDate(endDayOff, dateBasis)}
            >
              {endDayOff > 0 ? '+' : ''}{endDayOff}d
            </span>
          )}
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
        className="ml-1 size-5 shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        style={{ visibility: canRemove ? 'visible' : 'hidden' }}
        onClick={onRemove}
        aria-label={`Remove ${region.name}`}
      >
        <XIcon className="size-3" />
      </Button>
    </div>
  )
}

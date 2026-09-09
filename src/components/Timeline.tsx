import { useRef, useCallback, useEffect, useState } from 'react'
import { Rnd } from 'react-rnd'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { PlusIcon } from 'lucide-react'
import { RegionRow } from './RegionRow'
import { computeOffsets, timeStrToMin, snapToGrid, fmtUTC, wrapMin, TZ_OPTIONS, type Region } from '@/lib/tz'

const MIN_DUR = 30

// Fallback label width; the live value comes from the --label-w CSS variable
const LABEL_W_FALLBACK = '20rem'
// Must match RegionRow remove button: ml-1 + size-5 ≈ 1.75rem
const REMOVE_W = '1.75rem'

interface TimelineProps {
  regions: Region[]
  slotUTC: number
  dur: number
  dateBasis: string
  workStart: string
  workEnd: string
  onRegionsChange: (regions: Region[]) => void
  onSlotChange: (slot: number) => void
  onDurChange: (dur: number) => void
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
}: TimelineProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [trackWidth, setTrackWidth] = useState(0)
  const [trackHeight, setTrackHeight] = useState(0)
  const [labelW, setLabelW] = useState(LABEL_W_FALLBACK)

  // Read --label-w CSS variable so the overlay tracks the responsive label column width
  useEffect(() => {
    const updateLabelW = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--label-w').trim()
      setLabelW(v || LABEL_W_FALLBACK)
    }
    updateLabelW()
    window.addEventListener('resize', updateLabelW)
    window.addEventListener('orientationchange', updateLabelW)
    return () => {
      window.removeEventListener('resize', updateLabelW)
      window.removeEventListener('orientationchange', updateLabelW)
    }
  }, [])

  // Always-mounted ResizeObserver so dimensions are ready immediately
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setTrackWidth(el.offsetWidth)
      setTrackHeight(el.offsetHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pxPerMin = trackWidth > 0 ? trackWidth / 1440 : 0
  const cellPx = trackWidth > 0 ? trackWidth / 48 : 0
  const winX = slotUTC * pxPerMin
  const winW = Math.max(cellPx, dur * pxPerMin)

  const selectedStartCol = Math.floor(slotUTC / 30)
  const selectedEndCol = Math.ceil((slotUTC + dur) / 30)

  const withOffsets = computeOffsets(regions, dateBasis)
  const workStartMin = timeStrToMin(workStart)
  const workEndMin = timeStrToMin(workEnd)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = regions.findIndex(r => r.id === active.id)
    const newIdx = regions.findIndex(r => r.id === over.id)
    onRegionsChange(arrayMove(regions, oldIdx, newIdx))
  }

  const handleCellClick = useCallback(
    (col: number) => {
      onSlotChange(snapToGrid(col * 30, dur))
    },
    [dur, onSlotChange],
  )

  const handleSlotKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onSlotChange(snapToGrid(Math.max(0, slotUTC - 30), dur))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onSlotChange(snapToGrid(Math.min(1440 - dur, slotUTC + 30), dur))
      }
    },
    [slotUTC, dur, onSlotChange],
  )

  const usedTz = new Set(regions.map(r => r.tz))
  const addOptions = TZ_OPTIONS.filter(([v]) => !usedTz.has(v))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={regions.map(r => r.id)} strategy={verticalListSortingStrategy}>
        {/* Rows wrapper — position:relative so the overlay can be absolutely positioned */}
        <div className="relative">
          <div>
            {withOffsets.map(r => (
              <RegionRow
                key={r.id}
                region={r}
                offset={r.offset}
                workStart={workStartMin}
                workEnd={workEndMin}
                slotUTC={slotUTC}
                dur={dur}
                dateBasis={dateBasis}
                selectedStartCol={selectedStartCol}
                selectedEndCol={selectedEndCol}
                canRemove={regions.length > 1}
                onNameChange={name =>
                  onRegionsChange(regions.map(x => (x.id === r.id ? { ...x, name } : x)))
                }
                onRemove={() => onRegionsChange(regions.filter(x => x.id !== r.id))}
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
            {trackWidth > 0 && (
              <Rnd
                key={`${slotUTC}-${dur}`}
                className="pointer-events-auto"
                style={{
                  background: 'rgba(232,230,225,0.06)',
                  border: '2px solid rgba(232,230,225,0.82)',
                  borderRadius: '5px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                }}
                bounds="parent"
                dragAxis="x"
                dragGrid={[cellPx, 0]}
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
                  left: { width: '14px', left: '-7px', cursor: 'ew-resize' },
                  right: { width: '14px', right: '-7px', cursor: 'ew-resize' },
                }}
                onDragStop={(_e, d) => {
                  onSlotChange(snapToGrid(d.x / pxPerMin, dur))
                }}
                onResizeStop={(_e, _dir, ref, _delta, pos) => {
                  const newSlot = snapToGrid(pos.x / pxPerMin, MIN_DUR)
                  const newDur = Math.max(MIN_DUR, Math.round(ref.offsetWidth / pxPerMin / 30) * 30)
                  onSlotChange(newSlot)
                  onDurChange(newDur)
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
                  className="absolute inset-0 rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </Rnd>
            )}
          </div>
        </div>

        {/* Add region row — outside the position:relative wrapper so Rnd doesn't cover it */}
        {regions.length < 6 && addOptions.length > 0 && (
          <div className="relative mt-1">
            <div className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-[#2a2f3a] py-1.5 text-[#8b92a0] transition-colors hover:border-[#8b92a0] hover:bg-white/5 hover:text-[#e8e6e1]">
              <PlusIcon className="size-4" />
              <span className="ml-1 text-xs">Add region</span>
            </div>
            <select
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Add region"
              value=""
              onChange={e => {
                const found = TZ_OPTIONS.find(([v]) => v === e.target.value)
                if (!found) return
                const [tz, label] = found
                onRegionsChange([
                  ...regions,
                  { id: String(Date.now()), name: label.split(' / ')[0], tz },
                ])
              }}
            >
              <option value="" disabled>Add region</option>
              {addOptions.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        )}
      </SortableContext>
    </DndContext>
  )
}

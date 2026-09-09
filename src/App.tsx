import { useMemo, useCallback } from 'react'
import { CopyIcon, CheckIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Controls } from '@/components/Controls'
import { Timeline } from '@/components/Timeline'
import { useOverlapParams } from '@/lib/params'
import {
  computeOffsets,
  findBestSlot,
  fmtUTC,
  fmtAnchorDate,
  fmtLocal,
  wrapMin,
  dayOffsetOf,
  timeStrToMin,
  computeStatus,
  statusText,
  snapToGrid,
  type Region,
} from '@/lib/tz'
import { useState } from 'react'

function App() {
  const [params, setParams] = useOverlapParams()
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')

  const regions = params.regions as Region[]
  const dateBasis = params.date
  const workStart = params.ws
  const workEnd = params.we
  const dur = params.dur

  const workStartMin = timeStrToMin(workStart)
  const workEndMin = timeStrToMin(workEnd)

  // If slot is -1 (initial / auto), find best
  const slot = useMemo(() => {
    if (params.slot === -1) {
      return findBestSlot(regions, dur, workStartMin, workEndMin, dateBasis)
    }
    return snapToGrid(params.slot, dur)
  }, [params.slot, regions, dur, workStartMin, workEndMin, dateBasis])

  const withOffsets = useMemo(
    () => computeOffsets(regions, dateBasis),
    [regions, dateBasis],
  )

  const startT = slot
  const endT = (startT + dur) % 1440
  const headerLabel = `${fmtAnchorDate(0, dateBasis)} · ${fmtUTC(startT)} – ${fmtUTC(endT)} UTC · ${dur} min`

  const handleCopy = useCallback(() => {
    let text = `Proposed meeting time (${fmtAnchorDate(0, dateBasis)}, ${fmtUTC(startT)} – ${fmtUTC(endT)} UTC):\n`
    withOffsets.forEach(r => {
      const rawStart = startT + r.offset
      const rawEnd = rawStart + dur
      const localStart = wrapMin(rawStart)
      const localEnd = wrapMin(rawEnd)
      const status = computeStatus(localStart, dur, workStartMin, workEndMin)
      const startDate = fmtAnchorDate(dayOffsetOf(rawStart), dateBasis)
      const endDate = fmtAnchorDate(dayOffsetOf(rawEnd), dateBasis)
      const dateNote = startDate === endDate ? ` (${startDate})` : ` (${startDate} – ${endDate})`
      text += `- ${r.name}: ${fmtLocal(localStart)} – ${fmtLocal(localEnd)}${dateNote}${status.pain > 0 ? ` (${statusText(status)})` : ''}\n`
    })

    const doFallback = () => {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.cssText = 'position:fixed;opacity:0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        setCopyState(ok ? 'ok' : 'fail')
      } catch {
        setCopyState('fail')
      }
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => setCopyState('ok')).catch(doFallback)
    } else {
      doFallback()
    }

    setTimeout(() => setCopyState('idle'), copyState === 'fail' ? 3000 : 1500)
  }, [startT, endT, dur, dateBasis, withOffsets, workStartMin, workEndMin, copyState])

  return (
    <TooltipProvider delay={200}>
      <div className="dark min-h-screen bg-[#14171c] text-[#e8e6e1] font-mono">
        <div className="mx-auto w-[90%] max-w-[93.75rem] px-0 py-8 pb-20">
          <header className="mb-7 flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <h1 className="text-[1.375rem] font-semibold tracking-tight">Overlap Finder</h1>
          </header>

          <Controls
            workStart={workStart}
            workEnd={workEnd}
            dateBasis={dateBasis}
            onWorkStartChange={v => setParams({ ws: v, slot: -1 })}
            onWorkEndChange={v => setParams({ we: v, slot: -1 })}
            onDateChange={v => setParams({ date: v, slot: -1 })}
          />

          <div className="mt-6 flex items-center justify-between gap-2">
            <h2 className="text-[0.8125rem] font-semibold text-[#8b92a0]">{headerLabel}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
              title="Copy meeting times as text"
            >
              {copyState === 'ok' ? (
                <CheckIcon className="size-4 text-green-400" />
              ) : copyState === 'fail' ? (
                <XIcon className="size-4 text-red-400" />
              ) : (
                <CopyIcon className="size-4" />
              )}
            </Button>
          </div>

          <div className="relative mt-2.5 rounded-[0.625rem] border border-[#2a2f3a] bg-[#1b1f27] p-4">
            <Timeline
              regions={regions}
              slotUTC={slot}
              dur={dur}
              dateBasis={dateBasis}
              workStart={workStart}
              workEnd={workEnd}
              onRegionsChange={r => setParams({ regions: r, slot })}
              onSlotChange={s => setParams({ slot: s })}
              onDurChange={d => setParams({ dur: d })}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App

import { useMemo, useCallback, useRef } from 'react'
import { CopyIcon, CheckIcon, XIcon, RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Controls } from '@/components/Controls'
import { Timeline } from '@/components/Timeline'
import { useOverlapParams } from '@/lib/params'
import {
  computeOffsets,
  fmtUTC,
  fmtAnchorDate,
  fmtLocal,
  wrapMin,
  dayOffsetOf,
  snapToGrid,
  type Region,
} from '@/lib/tz'
import { useState } from 'react'

function App() {
  const [params, setParams] = useOverlapParams()
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const headerRef = useRef<HTMLHeadingElement>(null)

  const regions = params.regions as Region[]
  const dateBasis = params.date
  const workStart = params.ws
  const workEnd = params.we
  const dur = params.dur

  // Snap slot to 30-min grid
  const slot = useMemo(
    () => snapToGrid(params.slot, dur),
    [params.slot, dur],
  )

  const withOffsets = useMemo(
    () => computeOffsets(regions, dateBasis),
    [regions, dateBasis],
  )

  const startT = slot
  const endT = (startT + dur) % 1440
  const headerLabel = `${fmtAnchorDate(0, dateBasis)} · ${fmtUTC(startT)} – ${fmtUTC(endT)} UTC · ${dur} min`

  // Update header text directly during drag — no React re-render needed per frame
  const handleLiveChange = useCallback((s: number, d: number) => {
    if (!headerRef.current) return
    headerRef.current.textContent = `${fmtAnchorDate(0, dateBasis)} · ${fmtUTC(s)} – ${fmtUTC(wrapMin(s + d))} UTC · ${d} min`
  }, [dateBasis])

  const handleCopy = useCallback(() => {
    let text = `Proposed meeting time (${fmtAnchorDate(0, dateBasis)}, ${fmtUTC(startT)} – ${fmtUTC(endT)} UTC):\n`
    withOffsets.forEach(r => {
      const rawStart = startT + r.offset
      const rawEnd = rawStart + dur
      const localStart = wrapMin(rawStart)
      const localEnd = wrapMin(rawEnd)
      const startDate = fmtAnchorDate(dayOffsetOf(rawStart), dateBasis)
      const endDate = fmtAnchorDate(dayOffsetOf(rawEnd), dateBasis)
      const dateNote = startDate === endDate ? ` (${startDate})` : ` (${startDate} – ${endDate})`
      text += `- ${r.name}: ${fmtLocal(localStart)} – ${fmtLocal(localEnd)}${dateNote}\n`
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
  }, [startT, endT, dur, dateBasis, withOffsets, copyState])

  return (
    <TooltipProvider delay={200}>
      {/* Portrait mobile gate — shown only in portrait on small screens */}
      <div className="mobile-pt:flex hidden fixed inset-0 z-50 flex-col items-center justify-center gap-4 bg-[#14171c] px-8 text-center">
        <RotateCcwIcon className="size-10 text-[#8b92a0]" strokeWidth={1.5} />
        <div>
          <p className="text-[1rem] font-semibold tracking-tight text-[#e8e6e1]">Rotate to landscape</p>
          <p className="mt-1 text-[0.8125rem] text-[#8b92a0]">This timeline needs the full width to work.</p>
        </div>
      </div>

      <div className="dark min-h-screen bg-[#14171c] text-[#e8e6e1] font-mono mobile-ls:overflow-x-auto">
        <div className="mx-auto w-[90%] max-w-[93.75rem] mobile-ls:w-[96%] mobile-ls:min-w-[540px] px-0 py-8 pb-20 mobile-ls:py-3 mobile-ls:pb-4">
          <header className="mb-7 mobile-ls:mb-2 flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <h1 className="text-[1.375rem] mobile-ls:text-[1.1rem] font-semibold tracking-tight">Overlap Finder</h1>
          </header>

          <Controls
            workStart={workStart}
            workEnd={workEnd}
            dateBasis={dateBasis}
            onWorkStartChange={v => setParams({ ws: v, slot: -1 })}
            onWorkEndChange={v => setParams({ we: v, slot: -1 })}
            onDateChange={v => setParams({ date: v, slot: -1 })}
          />

          <div className="mt-6 mobile-ls:mt-2 flex items-center justify-between gap-2">
            <h2 ref={headerRef} className="text-[0.8125rem] font-semibold text-[#8b92a0]">{headerLabel}</h2>
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

          <div className="relative mt-2.5 rounded-[0.625rem] border border-[#2a2f3a] bg-[#1b1f27] p-4 mobile-ls:p-2">
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
              onLiveChange={handleLiveChange}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App

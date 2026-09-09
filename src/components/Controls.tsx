import { format } from 'date-fns'
import { CalendarIcon, ClockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ControlsProps {
  workStart: string
  workEnd: string
  dateBasis: string
  onWorkStartChange: (v: string) => void
  onWorkEndChange: (v: string) => void
  onDateChange: (v: string) => void
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateToISO(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

export function Controls({
  workStart,
  workEnd,
  dateBasis,
  onWorkStartChange,
  onWorkEndChange,
  onDateChange,
}: ControlsProps) {
  const date = isoToDate(dateBasis)

  return (
    <div className="flex flex-wrap items-center gap-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <ClockIcon className="size-4 shrink-0" />
        <span className="text-xs">Work hours</span>
        <Input
          type="time"
          value={workStart}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onWorkStartChange(e.target.value)}
          className="h-7 w-28 font-mono text-xs"
          aria-label="Work start time"
        />
        <span>–</span>
        <Input
          type="time"
          value={workEnd}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onWorkEndChange(e.target.value)}
          className="h-7 w-28 font-mono text-xs"
          aria-label="Work end time"
        />
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-2">
        <CalendarIcon className="size-4 shrink-0" />
        <span className="text-xs">Date (DST)</span>
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="h-7 gap-1.5 font-mono text-xs">
                {format(date, 'MM/dd/yyyy')}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d: Date | undefined) => d && onDateChange(dateToISO(d))}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

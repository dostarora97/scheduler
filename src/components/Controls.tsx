import { format } from "date-fns";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Custom segmented time widget — replaces browser-native <input type="time">
// Value in / out: "HH:MM" 24-hour string (e.g. "09:00", "17:30")
function TimeField({
  id,
  name,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  "aria-label": string;
}) {
  const [hStr = "09", mStr = "00"] = value.split(":");
  const h24 = parseInt(hStr) || 0;
  const min = parseInt(mStr) || 0;
  const isPM = h24 >= 12;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;

  const emit = (newH24: number, newMin: number) => {
    onChange(
      `${String(Math.max(0, Math.min(23, newH24))).padStart(2, "0")}:${String(Math.max(0, Math.min(59, newMin))).padStart(2, "0")}`,
    );
  };

  const onHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value);
    if (isNaN(raw) || raw < 1 || raw > 12) return;
    const h24new = isPM ? (raw === 12 ? 12 : raw + 12) : raw === 12 ? 0 : raw;
    emit(h24new, min);
  };

  const onMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value);
    if (!isNaN(raw)) emit(h24, raw);
  };

  const togglePeriod = () => {
    emit(isPM ? (h24 === 12 ? 0 : h24 - 12) : h24 === 0 ? 12 : h24 + 12, min);
  };

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      className="flex h-7 cursor-default items-center rounded-md border border-app-border/50 bg-white/[0.04] px-2 font-mono text-xs text-app-fg transition-colors focus-within:border-app-muted/60"
    >
      <input
        name={`${name}-h`}
        type="number"
        min={1}
        max={12}
        value={String(h12).padStart(2, "0")}
        onChange={onHourChange}
        onFocus={(e) => e.target.select()}
        className="w-5 [appearance:textfield] bg-transparent text-center outline-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
        aria-label="hours"
      />
      <span className="text-app-muted/40 select-none">:</span>
      <input
        name={`${name}-m`}
        type="number"
        min={0}
        max={59}
        value={String(min).padStart(2, "0")}
        onChange={onMinuteChange}
        onFocus={(e) => e.target.select()}
        className="w-5 [appearance:textfield] bg-transparent text-center outline-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
        aria-label="minutes"
      />
      <button
        type="button"
        onClick={togglePeriod}
        className="ml-1.5 rounded px-1 py-px text-[10px] text-app-muted transition-colors select-none hover:text-app-fg"
        aria-label={`Toggle AM/PM, currently ${isPM ? "PM" : "AM"}`}
      >
        {isPM ? "PM" : "AM"}
      </button>
    </div>
  );
}

interface ControlsProps {
  workStart: string;
  workEnd: string;
  dateBasis: string;
  onWorkStartChange: (v: string) => void;
  onWorkEndChange: (v: string) => void;
  onDateChange: (v: string) => void;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToISO(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function Controls({
  workStart,
  workEnd,
  dateBasis,
  onWorkStartChange,
  onWorkEndChange,
  onDateChange,
}: ControlsProps) {
  const date = isoToDate(dateBasis);

  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      {/* Work hours group */}
      <div className="flex items-center gap-2">
        <ClockIcon className="size-3.5 shrink-0 text-app-muted" />
        <span
          className="text-xs text-app-muted"
          title="The shared window used to rate how well each timezone overlaps"
        >
          Work hours
        </span>
        <TimeField
          id="work-start"
          name="work-start"
          value={workStart}
          onChange={onWorkStartChange}
          aria-label="Work start time"
        />
        <span className="text-xs text-app-fg/60">–</span>
        <TimeField
          id="work-end"
          name="work-end"
          value={workEnd}
          onChange={onWorkEndChange}
          aria-label="Work end time"
        />
      </div>

      <div className="h-4 w-px bg-app-fg/20" />

      {/* Date group */}
      <div className="flex items-center gap-2">
        <CalendarIcon className="size-3.5 shrink-0 text-app-muted" />
        <span
          className="text-xs text-app-muted"
          title="Sets the meeting date and adjusts UTC offsets for DST-observing timezones"
        >
          Date
        </span>
        <Popover>
          <PopoverTrigger
            render={
              <button className="flex h-7 cursor-pointer items-center rounded-md border border-app-border/50 bg-white/[0.04] px-2.5 font-mono text-xs text-app-fg transition-colors hover:border-app-muted/60 hover:bg-white/[0.06]">
                {format(date, "MMM d, yyyy")}
              </button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d: Date | undefined) =>
                d && onDateChange(dateToISO(d))
              }
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

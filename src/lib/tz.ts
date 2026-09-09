export const TZ_OPTIONS: [string, string][] = [
  ['America/Los_Angeles', 'Palo Alto / Pacific'],
  ['America/New_York', 'New York / Eastern'],
  ['America/Chicago', 'Chicago / Central'],
  ['America/Denver', 'Denver / Mountain'],
  ['America/Sao_Paulo', 'São Paulo'],
  ['Europe/Berlin', 'Germany / Berlin'],
  ['Europe/London', 'London'],
  ['Europe/Paris', 'Paris'],
  ['Asia/Kolkata', 'India / Kolkata'],
  ['Asia/Dubai', 'Dubai'],
  ['Asia/Singapore', 'Singapore'],
  ['Asia/Shanghai', 'China / Shanghai'],
  ['Asia/Tokyo', 'Tokyo'],
  ['Australia/Sydney', 'Sydney'],
  ['Pacific/Auckland', 'Auckland'],
  ['UTC', 'UTC'],
]

export interface Region {
  id: string
  name: string
  tz: string
}

export type PainLevel = 'ok' | 'mild' | 'heavy'

/** Returns the UTC offset in minutes for a given timezone on a given date. */
export function getOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(date)
  const map: Record<string, number> = {}
  parts.forEach(p => {
    if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10)
  })
  let hour = map.hour
  if (hour === 24) hour = 0
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second)
  return Math.round((asUTC - date.getTime()) / 60000)
}

export function timeStrToMin(str: string): number {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}

export function wrapMin(raw: number): number {
  return ((raw % 1440) + 1440) % 1440
}

export function dayOffsetOf(raw: number): number {
  return Math.floor(raw / 1440)
}

export function fmtLocal(mins: number): string {
  mins = wrapMin(mins)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

export function fmtUTC(mins: number): string {
  mins = wrapMin(mins)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function fmtAnchorDate(offsetDays: number, baseDateISO: string): string {
  const [y, mo, d] = baseDateISO.split('-').map(Number)
  const base = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
  const shifted = new Date(base.getTime() + offsetDays * 86400000)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(shifted)
}

export function tzAbbrev(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date())
    return parts.find(p => p.type === 'timeZoneName')?.value ?? tz
  } catch {
    return tz
  }
}

function inRangeWrap(x: number, a: number, b: number): boolean {
  a = wrapMin(a)
  b = wrapMin(b)
  x = wrapMin(x)
  if (a <= b) return x >= a && x < b
  return x >= a || x < b
}

export function instantLevel(localMin: number, workStart: number, workEnd: number): PainLevel {
  if (inRangeWrap(localMin, workStart, workEnd)) return 'ok'
  if (
    inRangeWrap(localMin, workStart - 60, workStart) ||
    inRangeWrap(localMin, workEnd, workEnd + 60)
  )
    return 'mild'
  return 'heavy'
}

export interface SlotStatus {
  pain: number
  direction: 'ok' | 'before' | 'after'
}

export function computeStatus(
  localStart: number,
  dur: number,
  workStart: number,
  workEnd: number,
): SlotStatus {
  const localEnd = localStart + dur
  const before = Math.max(0, workStart - localStart)
  const after = Math.max(0, localEnd - workEnd)
  const pain = before + after
  const direction = before > 0 ? 'before' : after > 0 ? 'after' : 'ok'
  return { pain, direction }
}

export function computeOffsets(
  regions: Region[],
  baseDateISO: string,
): (Region & { offset: number })[] {
  const [y, mo, d] = baseDateISO.split('-').map(Number)
  const base = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
  return regions.map(r => ({ ...r, offset: getOffsetMinutes(base, r.tz) }))
}

/** Round UTC minutes to nearest 30-min boundary, clamped to valid range. */
export function snapToGrid(t: number, dur: number): number {
  const maxStart = 1440 - dur
  return Math.max(0, Math.min(maxStart, Math.round(t / 30) * 30))
}

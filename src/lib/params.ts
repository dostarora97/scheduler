import { parseAsInteger, parseAsString, createParser, useQueryStates } from 'nuqs'

export interface RegionParam {
  id: string
  name: string
  tz: string
}

const DEFAULT_REGIONS: RegionParam[] = [
  { id: '1', name: 'Palo Alto', tz: 'America/Los_Angeles' },
  { id: '2', name: 'Germany', tz: 'Europe/Berlin' },
  { id: '3', name: 'India', tz: 'Asia/Kolkata' },
]

function todayISO(): string {
  const d = new Date()
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

/** Encodes regions as "id~name~tz" pairs joined by "|" */
const parseAsRegions = createParser<RegionParam[]>({
  parse(raw) {
    try {
      return raw.split('|').map(part => {
        const [id, name, tz] = part.split('~')
        if (!id || !name || !tz) throw new Error('bad')
        return { id, name: decodeURIComponent(name), tz: decodeURIComponent(tz) }
      })
    } catch {
      return DEFAULT_REGIONS
    }
  },
  serialize(regions) {
    return regions
      .map(r => `${r.id}~${encodeURIComponent(r.name)}~${encodeURIComponent(r.tz)}`)
      .join('|')
  },
})

export const searchParams = {
  regions: parseAsRegions.withDefault(DEFAULT_REGIONS),
  slot: parseAsInteger.withDefault(-1), // -1 = auto-find best
  dur: parseAsInteger.withDefault(60),
  date: parseAsString.withDefault(todayISO()),
  ws: parseAsString.withDefault('09:00'),
  we: parseAsString.withDefault('18:00'),
}

export function useOverlapParams() {
  return useQueryStates(searchParams, { history: 'replace' })
}

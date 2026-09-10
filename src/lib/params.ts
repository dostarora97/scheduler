import {
  createParser,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import { getOffsetMinutes, TZ_OPTIONS } from "./tz";

export interface RegionParam {
  id: string;
  name: string;
  tz: string;
}

const DEFAULT_WORK_START = "09:00";
const DEFAULT_WORK_END = "17:00";
const DEFAULT_DURATION_MIN = 60;

/** Find the TZ_OPTIONS entry whose UTC offset is closest to the user's local zone. */
function detectLocalRegion(): RegionParam {
  try {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Exact match — user's zone is one of our supported ones
    const exact = TZ_OPTIONS.find(([tz]) => tz === localTz);
    if (exact) {
      return { id: "1", name: exact[1].split(" / ")[0], tz: exact[0] };
    }

    // Closest by current UTC-offset delta
    const now = new Date();
    const localOffset = getOffsetMinutes(now, localTz);
    let closest = TZ_OPTIONS[0];
    let minDiff = Infinity;
    for (const entry of TZ_OPTIONS) {
      const diff = Math.abs(getOffsetMinutes(now, entry[0]) - localOffset);
      if (diff < minDiff) {
        minDiff = diff;
        closest = entry;
      }
    }
    return { id: "1", name: closest[1].split(" / ")[0], tz: closest[0] };
  } catch {
    return { id: "1", name: "Palo Alto", tz: "America/Los_Angeles" };
  }
}

/** Next upcoming UTC 30-minute boundary from now. */
function nextSlotUTC(): number {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const next = Math.ceil((utcMinutes + 1) / 30) * 30; // +1 avoids landing exactly on the current mark
  return next >= 1440 ? 0 : next;
}

// Computed once at page load; URL params override both when present
const DEFAULT_REGION = detectLocalRegion();
// TODO: swap with findBestSlot once best-slot logic is re-wired
const DEFAULT_SLOT_UTC = nextSlotUTC();

function todayISO(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/** Encodes regions as "id~name~tz" pairs joined by "|" */
const parseAsRegions = createParser<RegionParam[]>({
  parse(raw) {
    try {
      return raw.split("|").map((part) => {
        const [id, name, tz] = part.split("~");
        if (!id || !name || !tz) throw new Error("bad");
        return {
          id,
          name: decodeURIComponent(name),
          tz: decodeURIComponent(tz),
        };
      });
    } catch {
      return [DEFAULT_REGION];
    }
  },
  serialize(regions) {
    return regions
      .map(
        (r) =>
          `${r.id}~${encodeURIComponent(r.name)}~${encodeURIComponent(r.tz)}`,
      )
      .join("|");
  },
});

export const searchParams = {
  regions: parseAsRegions.withDefault([DEFAULT_REGION]),
  slot: parseAsInteger.withDefault(DEFAULT_SLOT_UTC),
  dur: parseAsInteger.withDefault(DEFAULT_DURATION_MIN),
  date: parseAsString.withDefault(todayISO()),
  ws: parseAsString.withDefault(DEFAULT_WORK_START),
  we: parseAsString.withDefault(DEFAULT_WORK_END),
};

export function useOverlapParams() {
  return useQueryStates(searchParams, { history: "replace" });
}

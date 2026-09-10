import {
  createParser,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";

export interface RegionParam {
  id: string;
  name: string;
  tz: string;
}

const DEFAULT_REGIONS: RegionParam[] = [
  { id: "1", name: "Palo Alto", tz: "America/Los_Angeles" },
  { id: "2", name: "Germany", tz: "Europe/Berlin" },
  { id: "3", name: "India", tz: "Asia/Kolkata" },
];

const DEFAULT_WORK_START = "09:00";
const DEFAULT_WORK_END = "17:00";
// TODO: seed via findBestSlot(DEFAULT_REGIONS, DEFAULT_DURATION_MIN, workStart, workEnd, todayISO())
//   so first-load picks the least-painful time instead of a hardcoded 09:00 UTC
const DEFAULT_SLOT_UTC = 540; // 09:00 UTC — hardcoded for now
const DEFAULT_DURATION_MIN = 60;

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
      return DEFAULT_REGIONS;
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
  regions: parseAsRegions.withDefault(DEFAULT_REGIONS),
  slot: parseAsInteger.withDefault(DEFAULT_SLOT_UTC),
  dur: parseAsInteger.withDefault(DEFAULT_DURATION_MIN),
  date: parseAsString.withDefault(todayISO()),
  ws: parseAsString.withDefault(DEFAULT_WORK_START),
  we: parseAsString.withDefault(DEFAULT_WORK_END),
};

export function useOverlapParams() {
  return useQueryStates(searchParams, { history: "replace" });
}

// import { UsagePages } from "./HidUsageTables-1.5.json";
// Filtered with `cat src/HidUsageTables-1.5.json | jq '{ UsagePages: [.UsagePages[] | select([.Id] |inside([7, 12]))] }' > src/keyboard-and-consumer-usage-tables.json`
import { UsagePages } from "./keyboard-and-consumer-usage-tables.json";
import HidOverrides from "./hid-usage-name-overrides.json";

interface HidLabels {
  short?: string;
  med?: string;
  long?: string;
}

const overrides: Record<string, Record<string, HidLabels>> = HidOverrides;

export interface UsageId {
  Id: number;
  Name: string;
}

export interface UsagePageInfo {
  Name: string;
  UsageIds: UsageId[];
}

export const hid_usage_from_page_and_id = (page: number, id: number) =>
  (page << 16) + id;

export const hid_usage_page_and_id_from_usage = (
  usage: number
): [number, number] => [(usage >> 16) & 0xffff, usage & 0xffff];

export const hid_usage_page_get_ids = (
  usage_page: number
): UsagePageInfo | undefined => UsagePages.find((p) => p.Id === usage_page);

export const hid_usage_get_label = (
  usage_page: number,
  usage_id: number
): string | undefined =>
  overrides[usage_page.toString()]?.[usage_id.toString()]?.short ||
  UsagePages.find((p) => p.Id === usage_page)?.UsageIds?.find(
    (u) => u.Id === usage_id
  )?.Name;

export const hid_usage_get_labels = (
  usage_page: number,
  usage_id: number
): { short?: string; med?: string; long?: string } =>
  overrides[usage_page.toString()]?.[usage_id.toString()] || {
    short: UsagePages.find((p) => p.Id === usage_page)?.UsageIds?.find(
      (u) => u.Id === usage_id
    )?.Name,
  };

const IMPLICIT_MOD_SHORT_NAMES: { flag: number; short: string }[] = [
  { flag: 0x01, short: "LCtrl" },
  { flag: 0x02, short: "LShift" },
  { flag: 0x04, short: "LAlt" },
  { flag: 0x08, short: "LGUI" },
  { flag: 0x10, short: "RCtrl" },
  { flag: 0x20, short: "RShift" },
  { flag: 0x40, short: "RAlt" },
  { flag: 0x80, short: "RGUI" },
];

export const format_hid_usage_display = (usage?: number): string => {
  if (!usage) return "None";
  const [rawPage, id] = hid_usage_page_and_id_from_usage(usage);
  const page = rawPage & 0xff;
  const modFlags = (usage >>> 24) & 0xff;
  const baseLabel =
    hid_usage_get_label(page, id)?.replace(/^Keyboard /, "") ||
    `Page ${page} #${id}`;

  if (!modFlags) return baseLabel;
  const activeMods = IMPLICIT_MOD_SHORT_NAMES.filter(
    (m) => (modFlags & m.flag) !== 0
  ).map((m) => m.short);
  return `${activeMods.join(" + ")} + ${baseLabel}`;
};

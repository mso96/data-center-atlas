import type { DataCenter } from "./data-center";

/** Source placeholders are missing information, not publishable values. */
export function knownText(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text || /^(?:t\.?b\.?[cd]\.?|n\/?a|unknown|not available|not specified|to be (?:confirmed|determined)|[-–—]+)$/i.test(text)) return null;
  return text;
}
export function presentFacility<T extends DataCenter>(record: T): T {
  return {...record, operator: knownText(record.operator), city: knownText(record.city),
    // An address containing a placeholder is incomplete; do not present it as a street address.
    address: /\b(?:t\.?b\.?[cd]\.?|to be confirmed|to be determined)\b/i.test(record.address ?? "") ? null : knownText(record.address),
    tier: record.tier ? {...record.tier, certification: knownText(record.tier.certification)} : null};
}

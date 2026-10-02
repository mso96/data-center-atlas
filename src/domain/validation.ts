import { z } from "zod";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
countries.registerLocale(en);
export const statuses = ["planned", "under-construction", "operational", "closed"] as const;
const text = z.string().trim().min(1).nullable();
const httpUrl = z.url().refine(value => ["http:", "https:"].includes(new URL(value).protocol), "Must be an HTTP(S) URL").nullable();
export const dataCenterSchema = z.object({
  id: z.string().min(1), sourceId: text, name: z.string().trim().min(1), operator: text,
  countryCode: z.string().refine(value => /^[A-Z]{2}$/.test(value) && countries.isValid(value), "Invalid ISO country code").nullable(),
  country: text, city: text, address: text,
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(),
  description: text, imageUrl: httpUrl, status: z.enum(statuses).nullable(),
  powerCapacityMw: z.number().nonnegative().nullable(), facilityAreaSqM: z.number().nonnegative().nullable(),
  tier: z.object({ level: z.enum(["I", "II", "III", "IV"]).nullable(), certification: text }).nullable(),
  pue: z.number().min(1).nullable(), operationalYear: z.number().int().min(1800).max(2200).nullable(),
  sourceUrl: httpUrl, sourceUpdatedAt: z.union([z.iso.date(), z.iso.datetime({ offset: true })]).nullable(),
  importedAt: z.iso.datetime(), isDemo: z.boolean(),
}).strict();
export function normalizeCountry(value: string): { code: string; name: string } {
  const input = value.trim();
  const code = input.toUpperCase() === "UK" ? "GB" :
    input.length === 2 && countries.isValid(input.toUpperCase()) ? input.toUpperCase() :
    input.length === 3 ? countries.alpha3ToAlpha2(input.toUpperCase()) : countries.getAlpha2Code(input, "en");
  if (!code) throw new Error(`Unknown or ambiguous country: ${value}; supply an ISO alpha-2 code`);
  return { code, name: countries.getName(code, "en")! };
}

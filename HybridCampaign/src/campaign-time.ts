import type { CampaignDate, CampaignDocketActivity, CampaignDocketEntry } from './types';

export const DAYS_PER_CAMPAIGN_MONTH = 28;
export const MONTHS_PER_CAMPAIGN_YEAR = 12;
export const DAYS_PER_CAMPAIGN_YEAR = DAYS_PER_CAMPAIGN_MONTH * MONTHS_PER_CAMPAIGN_YEAR;
export const docketActivities: CampaignDocketActivity[] = ['preparation', 'transit', 'operation', 'return', 'market-visit', 'downtime', 'repair-recovery-training', 'deadline', 'custom'];
export const docketPresets = [1, 3, 7, 14] as const;

export function validateCampaignDate(date: CampaignDate): CampaignDate {
  if (!date || !Number.isInteger(date.year) || date.year < 1 || date.era !== 'M42' || !Number.isInteger(date.month) || date.month < 1 || date.month > MONTHS_PER_CAMPAIGN_YEAR || !Number.isInteger(date.day) || date.day < 1 || date.day > DAYS_PER_CAMPAIGN_MONTH || !date.imperialOrigin?.trim()) throw new Error('Campaign dates must use M1-M12 and day 1-28.');
  return date;
}

export function campaignDayIndex(date: CampaignDate) { validateCampaignDate(date); return ((date.year - 1) * DAYS_PER_CAMPAIGN_YEAR) + ((date.month - 1) * DAYS_PER_CAMPAIGN_MONTH) + (date.day - 1); }

export function addCampaignDays(date: CampaignDate, days: number): CampaignDate {
  validateCampaignDate(date);
  if (!Number.isInteger(days) || days < 0) throw new Error('Campaign time may only advance by a whole positive number of days.');
  const index = campaignDayIndex(date) + days;
  const year = Math.floor(index / DAYS_PER_CAMPAIGN_YEAR) + 1;
  const yearDay = index % DAYS_PER_CAMPAIGN_YEAR;
  return { year, era: 'M42', month: Math.floor(yearDay / DAYS_PER_CAMPAIGN_MONTH) + 1, day: (yearDay % DAYS_PER_CAMPAIGN_MONTH) + 1, imperialOrigin: date.imperialOrigin };
}

export function createDocketEntry(input: Omit<CampaignDocketEntry, 'effectiveStart' | 'effectiveEnd'>, start: CampaignDate): CampaignDocketEntry {
  if (!input.id?.trim() || !Number.isInteger(input.sequence) || input.sequence < 1 || !docketActivities.includes(input.activity) || !Number.isInteger(input.durationDays) || input.durationDays < 1 || input.durationDays > DAYS_PER_CAMPAIGN_YEAR || !input.note.trim() || !input.actorId.trim()) throw new Error('A docket entry needs an activity, a 1-336 day duration, a note, and an actor.');
  return { ...input, note: input.note.trim(), effectiveStart: structuredClone(start), effectiveEnd: addCampaignDays(start, input.durationDays) };
}

export function deriveDocket(start: CampaignDate, entries: CampaignDocketEntry[]) {
  validateCampaignDate(start);
  let cursor = structuredClone(start);
  return [...entries].sort((a, b) => a.sequence - b.sequence).map((entry) => {
    const next = { ...entry, effectiveStart: structuredClone(cursor), effectiveEnd: addCampaignDays(cursor, entry.durationDays) };
    if (!entry.supersededAt) cursor = structuredClone(next.effectiveEnd);
    return next;
  });
}

const EFFECTIVE_RUNWAY_SENTINEL = 999;
const HEALTHY_RUNWAY_LABEL = "90+";
const HEALTHY_RUNWAY_PHRASE = "more than 90";

export function isEffectivelyUnlimitedRunway(
  runwayDays: number | null,
): boolean {
  return runwayDays != null && runwayDays >= EFFECTIVE_RUNWAY_SENTINEL;
}

export function formatRunwayDaysValue(runwayDays: number | null): string {
  if (isEffectivelyUnlimitedRunway(runwayDays)) {
    return HEALTHY_RUNWAY_LABEL;
  }

  return String(runwayDays ?? 0);
}

export function formatRunwayDaysPhrase(runwayDays: number | null): string {
  if (isEffectivelyUnlimitedRunway(runwayDays)) {
    return `${HEALTHY_RUNWAY_PHRASE} days`;
  }

  return `${runwayDays ?? 0} days`;
}

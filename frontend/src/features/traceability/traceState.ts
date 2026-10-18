import type {
  PublicFarmerOriginResponse,
  PublicOutputItemResponse,
  PublicTraceResponse,
} from '../../types/api';

/**
 * Pure presentation rules for the public trace page (F-701).
 *
 * Kept out of the component so the name-visibility rule — the one with a consent obligation
 * behind it — can be tested directly.
 */

/** The API may send empty strings rather than null; treat both as "not provided". */
function present(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * The name to show at the top of the page.
 *
 * `originVillage` is what a shopper reads first ("where is this from"). `originLabel` is the
 * batch's own free-text origin, which may be a landmark or a wider area. The enterprise name is
 * the last resort, because "which company" is not the same answer as "which village" — but an
 * unnamed trace is worse than a coarse one.
 */
export function originHeading(trace: PublicTraceResponse): string | null {
  if (present(trace.originVillage)) return trace.originVillage;
  if (present(trace.originLabel)) return trace.originLabel;
  if (present(trace.enterpriseName)) return trace.enterpriseName;
  return null;
}

/**
 * Whether a single origin may show a farmer's name.
 *
 * The backend only fills `farmerName` in when **both** `TraceRecord.showFarmerNames` and
 * `Farmer.consentPublicName` are true, and sends `null` otherwise. This check exists so the
 * client never invents a name from the group or the village when the API withheld one — a name
 * shown here is a real person who agreed to be shown.
 */
export function hasFarmerName(origin: PublicFarmerOriginResponse): boolean {
  return present(origin.farmerName);
}

/** True when at least one origin in the batch consented to being named. */
export function hasAnyFarmerName(trace: PublicTraceResponse): boolean {
  return (trace.farmerOrigins ?? []).some(hasFarmerName);
}

/**
 * The line identifying an origin: the group, or the village when there is no group.
 * The backend already falls back to a kebele or "Local Community Group", but guard anyway —
 * an origin rendered as a bare comma is worse than showing nothing.
 */
export function originGroupLabel(origin: PublicFarmerOriginResponse): string | null {
  if (present(origin.cooperativeGroup)) return origin.cooperativeGroup;
  if (present(origin.village)) return origin.village;
  return null;
}

/** "12 kg" — the quantity and unit travel together, so they are joined once. */
export function formatOutputQuantity(output: PublicOutputItemResponse): string | null {
  if (typeof output.quantity !== 'number') return present(output.unit) ? output.unit : null;
  const unit = present(output.unit) ? ` ${output.unit}` : '';
  return `${output.quantity}${unit}`;
}

/** Deduplicate origins the way the backend does, in case a caller passes raw rows. */
export function dedupeOrigins(
  origins: PublicFarmerOriginResponse[]
): PublicFarmerOriginResponse[] {
  const seen = new Set<string>();
  const result: PublicFarmerOriginResponse[] = [];
  for (const origin of origins) {
    const key = `${origin.village}|${origin.cooperativeGroup}|${origin.farmerName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(origin);
  }
  return result;
}

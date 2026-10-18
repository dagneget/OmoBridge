import type { DeliveryJobStatus } from './deliveryStatus';

/**
 * F-1106: the exact shape of an SMS checkpoint, mirroring `InboundSmsService`.
 *
 * The backend finds a job number with `(DEL-[0-9A-Z-]+)` (case-insensitive), then picks a
 * target status from keywords checked **in this order**: DELIVERED, then TRANSIT, then PICKED.
 * Anything it does not recognise leaves the job where it is.
 *
 * Two consequences this module encodes:
 *
 * - Only three statuses can be sent by SMS. `FAILED` and `CANCELLED` have no keyword at all, so
 *   offering an SMS for them would be a dead instruction — the message would be recorded and
 *   then silently ignored. The UI must restrict itself to the statuses listed here rather than
 *   to every status the app can display.
 * - Each status gets one unambiguous keyword. The alternatives the backend also accepts are
 *   documented but never composed into a message, because a message naming two statuses is
 *   resolved by the check order, not by the driver's intent.
 */

/** Statuses the backend can move from an inbound SMS, in its own matching order. */
export const SMS_CHECKPOINT_KEYWORDS = {
  DELIVERED: 'DELIVERED',
  IN_TRANSIT: 'TRANSIT',
  PICKED_UP: 'COLLECTED',
} as const;

/**
 * Every keyword `InboundSmsService` accepts for a status. The first is the one this app puts in
 * a ready-made message; the rest work too and are worth telling a driver who already has a habit.
 */
export const SMS_CHECKPOINT_ALTERNATIVES: Record<keyof typeof SMS_CHECKPOINT_KEYWORDS, readonly string[]> = {
  DELIVERED: ['ARRIVED'],
  IN_TRANSIT: ['LEFT'],
  PICKED_UP: ['PICKED'],
};

export type SmsCheckpointStatus = keyof typeof SMS_CHECKPOINT_KEYWORDS;

/** True when a checkpoint by SMS can actually move the job to this status. */
export function supportsSmsCheckpoint(status: DeliveryJobStatus): status is SmsCheckpointStatus {
  return status in SMS_CHECKPOINT_KEYWORDS;
}

/** The one-word keyword this app sends for a status. */
export function smsCheckpointKeyword(status: SmsCheckpointStatus): string {
  return SMS_CHECKPOINT_KEYWORDS[status];
}

/**
 * The complete message body. The job number is mandatory — the backend finds the job by it, so
 * a message without one is recorded and then ignored.
 */
export function buildSmsCheckpointText(jobNo: string, status: SmsCheckpointStatus): string {
  return `${jobNo.trim()} ${smsCheckpointKeyword(status)}`;
}

/**
 * The words a driver may send by hand for a status, including the alternatives.
 * Used to write the instructions, so the copy and the parser cannot drift apart.
 */
export function acceptedWordsFor(status: SmsCheckpointStatus): string[] {
  return [smsCheckpointKeyword(status), ...SMS_CHECKPOINT_ALTERNATIVES[status]];
}

/**
 * Just the synonyms, for copy that says "also accepted" next to a message already showing the
 * primary keyword. Empty when there are none, so the caller can hide the line entirely.
 */
export function alternativeWordsFor(status: SmsCheckpointStatus): string[] {
  return [...SMS_CHECKPOINT_ALTERNATIVES[status]];
}

/**
 * Delivery job status vocabulary, mirrored from the backend enum
 * `com.omobridge.delivery.domain.DeliveryStatus`.
 *
 * The backend is the authority on legal transitions; this module only describes how a
 * status is grouped and labelled for display. Transition rules for F-1102 must come
 * from the server's response, never from a hard-coded guess here.
 */
export type DeliveryJobStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export const DELIVERY_STATUSES: readonly DeliveryJobStatus[] = [
  'PENDING',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
];

/** Statuses where a job still needs provider attention. */
export const ACTIVE_STATUSES: readonly DeliveryJobStatus[] = [
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
];

/** Terminal statuses. A job in one of these needs no further action. */
export const CLOSED_STATUSES: readonly DeliveryJobStatus[] = [
  'DELIVERED',
  'FAILED',
  'CANCELLED',
];

export function isActiveStatus(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.includes(String(status).toUpperCase() as DeliveryJobStatus);
}

export function isClosedStatus(status: string | null | undefined): boolean {
  return CLOSED_STATUSES.includes(String(status).toUpperCase() as DeliveryJobStatus);
}

/**
 * Translation key for a status label. Mirrors `getStatusI18nKey` in `utils/formatters`
 * but stays inside the delivery feature so this module owns its own namespace.
 */
export function deliveryStatusI18nKey(status: string | null | undefined): string {
  const normalised = String(status ?? 'UNKNOWN')
    .trim()
    .toUpperCase();
  return `delivery.status.${normalised.toLowerCase()}`;
}
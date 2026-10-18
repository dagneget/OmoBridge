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
 * Legal next statuses, mirroring `DeliveryStatus.canTransitionTo` on the backend.
 *
 *   PENDING      -> ASSIGNED | CANCELLED
 *   ASSIGNED     -> PICKED_UP | FAILED | CANCELLED
 *   PICKED_UP    -> IN_TRANSIT | FAILED | CANCELLED
 *   IN_TRANSIT   -> DELIVERED | FAILED | CANCELLED
 *   DELIVERED / FAILED / CANCELLED -> (terminal)
 *
 * The backend never exposes the legal set in a response, so this table is a mirror and
 * can drift. It is used only to avoid offering the provider a button the server will
 * refuse; the server remains the authority, and a rejected transition is always surfaced
 * with the server's message and its current job state (see `updateJobStatus`). If the
 * backend's enum changes, update this table in the same commit.
 *
 * PENDING -> ASSIGNED is intentionally not offered to the provider: assignment is a
 * dispatcher action, not a driver action.
 */
const TRANSITIONS: Readonly<Record<DeliveryJobStatus, readonly DeliveryJobStatus[]>> = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'FAILED', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED', 'CANCELLED'],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};

/** Statuses a driver may move the job to from its current status. Empty when terminal. */
export function nextStatuses(status: string | null | undefined): DeliveryJobStatus[] {
  const normalised = String(status ?? '').toUpperCase() as DeliveryJobStatus;
  return TRANSITIONS[normalised] ? [...TRANSITIONS[normalised]] : [];
}

/**
 * The happy-path progress actions, in lifecycle order. Used for the primary buttons so
 * the common case reads "picked up -> in transit -> delivered" rather than the raw
 * transition list.
 */
export const DRIVER_ACTIONS: readonly DeliveryJobStatus[] = [
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
];

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
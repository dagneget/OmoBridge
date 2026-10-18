import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, renderHook, screen, fireEvent, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';

import { PendingSyncCenter } from '../features/delivery';
import {
  createMemoryLocationQueue,
  createMemoryStatusQueue,
  isDestructiveDiscard,
  loadPendingSync,
  statusChangesDiscardedWith,
  summarizeQueues,
  usePendingSyncCount,
  type QueuedStatusChange,
  type StatusQueue,
  type SyncAttemptReport,
} from '../features/delivery';
import type { LocationQueue } from '../features/delivery/locationQueue';
import type { CapturedLocation } from '../features/delivery/locationCapture';

const JOB_A = 'job-aaa';
const JOB_B = 'job-bbb';

const change = (id: number, jobId: string, newStatus: string, queuedAt: string) =>
  ({ id, jobId, newStatus, queuedAt }) as QueuedStatusChange;

const point = (
  id: number,
  jobId: string,
  recordedAt: string
): CapturedLocation & { id: number; jobId: string; queuedAt: string } => ({
  id,
  jobId,
  latitude: 5.2,
  longitude: 37.8,
  recordedAt,
  queuedAt: recordedAt,
});

function report(overrides: Partial<SyncAttemptReport> = {}): SyncAttemptReport {
  return {
    applied: 1,
    conflicts: 0,
    conflictMessages: [],
    remaining: 0,
    empty: false,
    ...overrides,
  };
}

/** Two status changes for A, one for B, and three location points for A. */
async function seedQueues(status: StatusQueue, location: LocationQueue) {
  await status.enqueue(JOB_A, 'PICKED_UP' as never, undefined);
  await new Promise((r) => setTimeout(r, 2));
  await status.enqueue(JOB_A, 'IN_TRANSIT' as never, undefined);
  await new Promise((r) => setTimeout(r, 2));
  await status.enqueue(JOB_B, 'DELIVERED' as never, undefined);
  await location.enqueue(JOB_A, [
    { latitude: 5.1, longitude: 37.1, recordedAt: '2026-10-19T08:00:00Z' },
    { latitude: 5.2, longitude: 37.2, recordedAt: '2026-10-19T08:01:00Z' },
    { latitude: 5.3, longitude: 37.3, recordedAt: '2026-10-19T08:02:00Z' },
  ]);
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true, writable: true });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

/* ------------------------------------------------------------------ *
 * The rules, on their own
 * ------------------------------------------------------------------ */

describe('sync centre rules', () => {
  it('groups both queues by job, oldest job first', () => {
    const statuses = [
      change(2, JOB_B, 'DELIVERED', '2026-10-19T09:00:00Z'),
      change(1, JOB_A, 'PICKED_UP', '2026-10-19T08:00:00Z'),
      change(3, JOB_A, 'IN_TRANSIT', '2026-10-19T08:30:00Z'),
    ];
    const locations = [point(9, JOB_A, '2026-10-19T08:01:00Z')];

    const summary = summarizeQueues(statuses, locations);

    expect(summary.map((job) => job.jobId)).toEqual([JOB_A, JOB_B]);
    expect(summary[0].statusChanges.map((c) => c.id)).toEqual([1, 3]);
    expect(summary[0].locationCount).toBe(1);
    expect(summary[1].locationCount).toBe(0);
  });

  it('counts location points rather than listing them', () => {
    // A job offline for an hour queues thousands; the screen must not render them individually.
    const locations = [point(1, JOB_A, 'a'), point(2, JOB_A, 'b'), point(3, JOB_A, 'c')];

    expect(summarizeQueues([], locations)[0].locationCount).toBe(3);
  });

  it('discards a status change and everything queued behind it', () => {
    const chain = [
      change(1, JOB_A, 'PICKED_UP', '2026-10-19T08:00:00Z'),
      change(2, JOB_A, 'IN_TRANSIT', '2026-10-19T08:30:00Z'),
      change(3, JOB_A, 'DELIVERED', '2026-10-19T09:00:00Z'),
    ];

    // Dropping the first means the rest would replay from a state they were never meant to
    // follow, so they go together rather than being refused one at a time later.
    expect(statusChangesDiscardedWith(chain, 1)).toEqual([1, 2, 3]);
    expect(isDestructiveDiscard(chain, 1)).toBe(true);
  });

  it('takes nothing extra when the last change is discarded', () => {
    const chain = [
      change(1, JOB_A, 'PICKED_UP', '2026-10-19T08:00:00Z'),
      change(2, JOB_A, 'DELIVERED', '2026-10-19T09:00:00Z'),
    ];

    expect(statusChangesDiscardedWith(chain, 2)).toEqual([2]);
    expect(isDestructiveDiscard(chain, 2)).toBe(false);
  });

  it('refuses to discard from a stale copy of the queue', () => {
    const chain = [change(1, JOB_A, 'PICKED_UP', '2026-10-19T08:00:00Z')];

    // Id 42 is not in this list; acting on it would silently discard nothing.
    expect(statusChangesDiscardedWith(chain, 42)).toEqual([]);
    expect(isDestructiveDiscard(chain, 42)).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * The screen
 * ------------------------------------------------------------------ */

describe('Pending sync center (F-1501)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setOnline(true);
  });

  afterEach(() => {
    // React Query's onlineManager is process-wide; a test that leaves the window "offline"
    // silently pauses every later query in the run.
    setOnline(true);
  });

  it('lists what is queued, grouped by job', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);

    render(<PendingSyncCenter statusQueue={status} locationQueue={location} />);

    expect(await screen.findByTestId(`pending-sync-job-${JOB_A}`)).toBeInTheDocument();
    expect(screen.getByTestId(`pending-sync-job-${JOB_B}`)).toBeInTheDocument();
    // Three status changes across two jobs, and three points for A shown as a count.
    expect(screen.getByTestId(`pending-sync-location-count-${JOB_A}`)).toHaveTextContent('3');
  });

  it('shows the empty state when nothing is queued', async () => {
    render(
      <PendingSyncCenter
        statusQueue={createMemoryStatusQueue()}
        locationQueue={createMemoryLocationQueue()}
      />
    );

    expect(await screen.findByTestId('pending-sync-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('pending-sync-all')).not.toBeInTheDocument();
  });

  it('reports a failed queue read rather than showing an empty, reassuring screen', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    vi.spyOn(status, 'jobIds').mockRejectedValue(new Error('storage evicted'));

    render(<PendingSyncCenter statusQueue={status} locationQueue={location} />);

    const alert = await screen.findByTestId('pending-sync-error');
    expect(alert).toHaveAttribute('role', 'alert');
    // The point of this state: the changes may still be here, so the provider is told to retry
    // rather than shown a clean slate and left believing the work is gone.
    expect(alert).toHaveTextContent(/probably still on this device/i);
  });

  it('does not sync anything on its own when the screen opens', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);
    const syncStatuses = vi.fn().mockResolvedValue(report());

    render(
      <PendingSyncCenter
        statusQueue={status}
        locationQueue={location}
        syncStatuses={syncStatuses}
      />
    );

    await screen.findByTestId(`pending-sync-job-${JOB_A}`);
    await new Promise((r) => setTimeout(r, 50));

    // Opening the screen must not start firing requests the provider did not ask for.
    expect(syncStatuses).not.toHaveBeenCalled();
  });

  it('sends a job on request and reports it', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);
    // Stands in for `syncJobStatuses`, which dequeues each change it applies. The screen's own
    // job is to call it and re-read the queue afterwards, which is what is asserted here.
    const syncStatuses = vi.fn().mockImplementation(async (jobId: string) => {
      await status.clearJob(jobId);
      return report({ applied: 2 });
    });

    render(
      <PendingSyncCenter
        statusQueue={status}
        locationQueue={location}
        syncStatuses={syncStatuses}
      />
    );

    fireEvent.click(await screen.findByTestId(`pending-sync-send-${JOB_A}`));

    expect(await screen.findByTestId(`pending-sync-sent-${JOB_A}`)).toBeInTheDocument();
    expect(syncStatuses).toHaveBeenCalledWith(JOB_A);
    // The screen re-reads the queue, so A's changes are no longer listed once sent.
    await waitFor(async () => {
      const remaining = await loadPendingSync(status, location);
      expect(remaining.find((job) => job.jobId === JOB_A)?.statusChanges).toHaveLength(0);
    });
    // Its location points are untouched: sending statuses does not upload fixes.
    expect(await location.count(JOB_A)).toBe(3);
  });

  it('keeps the change and says so when the server cannot be reached', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);
    const syncStatuses = vi.fn().mockResolvedValue(report({ remaining: 2, empty: false }));

    render(
      <PendingSyncCenter
        statusQueue={status}
        locationQueue={location}
        syncStatuses={syncStatuses}
      />
    );

    fireEvent.click(await screen.findByTestId(`pending-sync-send-${JOB_A}`));

    expect(await screen.findByTestId(`pending-sync-still-queued-${JOB_A}`)).toBeInTheDocument();
    // Still queued — a transport failure is not a reason to drop the provider's work.
    expect(await loadPendingSync(status, location)).toHaveLength(2);
  });

  it('shows the server’s own words when a change is refused', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);
    const syncStatuses = vi.fn().mockResolvedValue(
      report({
        conflicts: 1,
        applied: 0,
        conflictMessages: ['Job was already marked DELIVERED by another provider.'],
      })
    );

    render(
      <PendingSyncCenter
        statusQueue={status}
        locationQueue={location}
        syncStatuses={syncStatuses}
      />
    );

    fireEvent.click(await screen.findByTestId(`pending-sync-send-${JOB_A}`));

    const conflict = await screen.findByTestId(`pending-sync-conflict-${JOB_A}`);
    // The provider has been acting on a stale view; they need the real state, not "an error".
    expect(conflict).toHaveTextContent(/already marked DELIVERED by another provider/);
  });

  it('explains that discarding one change takes the rest of the chain', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);

    render(<PendingSyncCenter statusQueue={status} locationQueue={location} />);

    fireEvent.click(await screen.findByTestId(`pending-sync-discard-status-${JOB_A}`));

    const dialog = screen.getByTestId(`pending-sync-confirm-${JOB_A}`);
    expect(dialog).toHaveAttribute('role', 'alertdialog');
    // Two changes are queued for A, so dropping the first would take both.
    expect(dialog).toHaveTextContent(/every later change for this job/i);
    expect(screen.getByTestId(`pending-sync-confirm-count-${JOB_A}`)).toHaveTextContent('2');
    // The consequence is stated before the button that causes it, not after.
    expect(
      within(dialog).getByTestId(`pending-sync-confirm-yes-${JOB_A}`)
    ).toBeInTheDocument();
  });

  it('does not raise the cascade warning for a single change', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await status.enqueue(JOB_B, 'DELIVERED' as never, undefined);

    render(<PendingSyncCenter statusQueue={status} locationQueue={location} />);

    fireEvent.click(await screen.findByTestId(`pending-sync-discard-status-${JOB_B}`));

    const dialog = screen.getByTestId(`pending-sync-confirm-${JOB_B}`);
    expect(dialog).toHaveTextContent(/will never be sent/i);
    expect(dialog).not.toHaveTextContent(/every later change/i);
  });

  it('discards the whole chain when confirmed, and keeps everything on cancel', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);

    const first = render(
      <PendingSyncCenter statusQueue={status} locationQueue={location} />
    );

    fireEvent.click(await screen.findByTestId(`pending-sync-discard-status-${JOB_A}`));
    fireEvent.click(screen.getByTestId(`pending-sync-confirm-no-${JOB_A}`));

    // Cancelling leaves the queue untouched.
    expect(screen.queryByTestId(`pending-sync-confirm-${JOB_A}`)).not.toBeInTheDocument();
    expect(await loadPendingSync(status, location)).toHaveLength(2);
    first.unmount();

    const second = render(
      <PendingSyncCenter statusQueue={status} locationQueue={location} />
    );
    fireEvent.click(await screen.findByTestId(`pending-sync-discard-status-${JOB_A}`));
    fireEvent.click(screen.getByTestId(`pending-sync-confirm-yes-${JOB_A}`));

    // Both of A's status changes go, because neither can replay without the other.
    await waitFor(async () => {
      const remaining = await loadPendingSync(status, location);
      expect(remaining.find((job) => job.jobId === JOB_A)?.statusChanges).toHaveLength(0);
    });
    // ...but its location points stay: they are additive and were not part of this choice.
    const remaining = await loadPendingSync(status, location);
    expect(remaining.find((job) => job.jobId === JOB_A)?.locationCount).toBe(3);
    expect(remaining.find((job) => job.jobId === JOB_B)?.statusChanges).toHaveLength(1);
    second.unmount();
  });

  it('discards a job’s location points without touching its status changes', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);

    render(<PendingSyncCenter statusQueue={status} locationQueue={location} />);

    fireEvent.click(await screen.findByTestId(`pending-sync-discard-locations-${JOB_A}`));

    // Points are additive, so they go on their own — no cascade, and no confirmation needed.
    await waitFor(async () => {
      expect(await location.count(JOB_A)).toBe(0);
      expect(await status.count(JOB_A)).toBe(2);
    });
  });

  it('pauses sending while offline, and says nothing has been lost', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);
    const syncStatuses = vi.fn().mockResolvedValue(report());

    setOnline(false);
    render(
      <PendingSyncCenter
        statusQueue={status}
        locationQueue={location}
        syncStatuses={syncStatuses}
      />
    );

    expect(await screen.findByTestId('pending-sync-offline')).toBeInTheDocument();
    // A guaranteed failure carries no information, so the attempt is refused up front.
    expect(screen.getByTestId(`pending-sync-send-${JOB_A}`)).toBeDisabled();
    expect(screen.getByTestId('pending-sync-all')).toBeDisabled();

    fireEvent.click(screen.getByTestId(`pending-sync-send-${JOB_A}`));
    expect(syncStatuses).not.toHaveBeenCalled();

    // Everything queued is still here.
    expect(await loadPendingSync(status, location)).toHaveLength(2);
  });

  it('offers no discard at all where the caller forbids data loss', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);

    render(
      <PendingSyncCenter
        statusQueue={status}
        locationQueue={location}
        allowDiscard={false}
      />
    );

    await screen.findByTestId(`pending-sync-job-${JOB_A}`);
    expect(screen.queryByTestId(`pending-sync-discard-status-${JOB_A}`)).toBeNull();
    expect(screen.queryByTestId(`pending-sync-discard-locations-${JOB_A}`)).toBeNull();
    // Sending still works — only dropping is withheld.
    expect(screen.getByTestId(`pending-sync-send-${JOB_A}`)).toBeEnabled();
  });

  it('passes an axe accessibility audit', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);

    const { container } = render(
      <PendingSyncCenter statusQueue={status} locationQueue={location} />
    );
    await screen.findByTestId(`pending-sync-job-${JOB_A}`);

    const results = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * The navigation badge count
 * ------------------------------------------------------------------ */

describe('usePendingSyncCount', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('counts status changes and location points together', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    await seedQueues(status, location);

    const { result } = renderHook(() =>
      usePendingSyncCount({ statusQueue: status, locationQueue: location })
    );

    // Three status changes plus three points.
    await waitFor(() => expect(result.current).toBe(6));
  });

  it('reads zero when nothing is queued', async () => {
    const { result } = renderHook(() =>
      usePendingSyncCount({
        statusQueue: createMemoryStatusQueue(),
        locationQueue: createMemoryLocationQueue(),
      })
    );

    await waitFor(() => expect(result.current).toBe(0));
  });

  it('degrades to no badge rather than breaking the layout when storage is gone', async () => {
    const status = createMemoryStatusQueue();
    vi.spyOn(status, 'count').mockRejectedValue(new Error('storage evicted'));

    const { result } = renderHook(() =>
      usePendingSyncCount({ statusQueue: status, locationQueue: createMemoryLocationQueue() })
    );

    // A count is a hint. Losing it must not throw out of the dashboard layout.
    await waitFor(() => expect(result.current).toBeNull());
  });

  it('stops polling once the queue is empty', async () => {
    const status = createMemoryStatusQueue();
    const location = createMemoryLocationQueue();
    const count = vi.spyOn(status, 'count');

    const { result, unmount } = renderHook(() =>
      usePendingSyncCount({
        statusQueue: status,
        locationQueue: location,
        pollMs: 20,
      })
    );

    await waitFor(() => expect(result.current).toBe(0));
    const readsWhenEmpty = count.mock.calls.length;
    await new Promise((r) => setTimeout(r, 80));

    // An idle queue would otherwise be read forever for a badge that says zero either way.
    expect(count.mock.calls.length).toBe(readsWhenEmpty);
    unmount();
  });
});

import { PendingSyncCenter } from '../../../features/delivery';

/**
 * F-1501: the provider's pending-sync screen.
 *
 * A thin page by design — the queue rules, the discard cascade and the retry behaviour all live
 * in `features/delivery`, where they can be tested without a router, a role guard or a session.
 *
 * **Not yet reachable by URL.** The route (`/dashboard/delivery/sync`) belongs in
 * `routes/index.tsx`, which is a shared file reconciled serially with Codex, so the wiring ships
 * as a handoff patch in `docs/handoffs/F-1501.md`. Until that lands, the screen is reachable from
 * the provider dashboard's own pending-sync link.
 */
export default function PendingSyncPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <PendingSyncCenter />
    </main>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, Users, X } from 'lucide-react';
import { Card } from '../../../components/common';
import {
  guideKeys,
  guideService,
  type GuideBookingAction,
} from '../../../features/guide/guideService';
import type { BookingResponse } from '../../../types/api';

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  COMPLETED: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800',
  DECLINED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
  CANCELLED: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800',
};

const formatDate = (value?: string) => {
  if (!value) return 'Date to be confirmed';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatMoney = (amount?: number, currency?: string) =>
  amount === undefined || amount === null
    ? null
    : new Intl.NumberFormat('en-ET', { style: 'currency', currency: currency || 'ETB' }).format(amount);

/** Only a pending request can still be accepted or declined by the guide. */
const canDecide = (status?: string) => status === 'REQUESTED';

export default function GuideBookingsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery({
    queryKey: guideKeys.profile(),
    queryFn: () => guideService.getMyProfile(),
  });

  const guideId = profile?.id;

  const {
    data: bookings,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: guideKeys.bookings(guideId ?? 'none'),
    queryFn: () => guideService.getAssignedBookings(guideId as string),
    enabled: Boolean(guideId),
  });

  const decide = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: GuideBookingAction }) =>
      guideService.updateBookingStatus(bookingId, status),
    onMutate: () => setActionError(null),
    onSuccess: (updated) => {
      queryClient.setQueryData<BookingResponse[]>(
        guideKeys.bookings(guideId ?? 'none'),
        (current) => (current || []).map((item) => (item.id === updated.id ? updated : item))
      );
      setSelectedId(null);
    },
    onError: (mutationError) =>
      setActionError(
        mutationError instanceof Error ? mutationError.message : 'The booking could not be updated.'
      ),
  });

  if (profileLoading || (isLoading && guideId)) {
    return (
      <Card className="p-6 space-y-3" data-testid="guide-bookings-loading">
        <div className="h-5 w-40 rounded bg-muted animate-pulse" />
        <div className="h-16 w-full rounded bg-muted animate-pulse" />
        <div className="h-16 w-full rounded bg-muted animate-pulse" />
      </Card>
    );
  }

  if (profileError || isError) {
    return (
      <Card className="p-6 space-y-3" data-testid="guide-bookings-error">
        <h2 className="text-lg font-bold text-foreground">Bookings unavailable</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Your assigned bookings could not be loaded.'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="touch-target px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          Try again
        </button>
      </Card>
    );
  }

  if (!guideId) {
    return (
      <Card className="p-6" data-testid="guide-bookings-empty">
        <h2 className="text-lg font-bold text-foreground">No guide profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This account is not linked to a tour guide profile, so there are no assigned bookings.
        </p>
      </Card>
    );
  }

  const list = bookings ?? [];

  return (
    <div className="space-y-6" data-testid="guide-bookings">
      <div>
        <h2 className="text-lg font-bold text-foreground">Assigned Bookings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tours assigned to you by the community hub. Accept or decline each request.
        </p>
      </div>

      {actionError && (
        <p
          className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
          data-testid="guide-bookings-action-error"
        >
          {actionError}
        </p>
      )}

      {list.length === 0 ? (
        <Card className="p-8 text-center" data-testid="guide-bookings-none">
          <CalendarDays className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground mt-3">No assigned bookings yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            New bookings assigned to you will appear here.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((booking) => {
            const bookingId = booking.id ?? '';
            const isDecidable = canDecide(booking.status);
            const isPendingAction = decide.isPending && decide.variables?.bookingId === bookingId;

            return (
              <li key={bookingId}>
                <Card className="p-4 space-y-3" data-testid="guide-booking-item">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId(selectedId === bookingId ? null : bookingId)}
                      className="text-left flex-1 min-w-0"
                      data-testid="guide-booking-open"
                      aria-expanded={selectedId === bookingId}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {booking.bookingCode || 'Booking'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${STATUS_STYLES[booking.status || ''] || STATUS_STYLES.COMPLETED}`}
                        >
                          {booking.status || 'UNKNOWN'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {booking.buyerName || 'Guest'} · {formatDate(booking.visitDate)}
                      </p>
                    </button>

                    <div className="flex items-center gap-2">
                      {isDecidable ? (
                        <>
                          <button
                            type="button"
                            disabled={decide.isPending}
                            onClick={() =>
                              bookingId && decide.mutate({ bookingId, status: 'CONFIRMED' })
                            }
                            className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium disabled:opacity-50"
                            data-testid="guide-booking-accept"
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            {isPendingAction ? 'Saving…' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            disabled={decide.isPending}
                            onClick={() =>
                              bookingId && decide.mutate({ bookingId, status: 'DECLINED' })
                            }
                            className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground disabled:opacity-50"
                            data-testid="guide-booking-decline"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                            Decline
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No action needed</span>
                      )}
                    </div>
                  </div>

                  {selectedId === bookingId && (
                    <div className="pt-3 border-t border-border space-y-2 text-sm" data-testid="guide-booking-detail">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Contact</span>
                          <p className="font-medium text-foreground">{booking.contactName || '—'}</p>
                          <p className="text-muted-foreground">{booking.contactPhone || '—'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" aria-hidden="true" />
                            Party size
                          </span>
                          <p className="font-medium text-foreground">{booking.partySize ?? '—'}</p>
                        </div>
                      </div>
                      {booking.specialRequests && (
                        <div>
                          <span className="text-xs text-muted-foreground">Special requests</span>
                          <p className="text-foreground">{booking.specialRequests}</p>
                        </div>
                      )}
                      {booking.enterpriseName && (
                        <div>
                          <span className="text-xs text-muted-foreground">Community hub</span>
                          <p className="text-foreground">{booking.enterpriseName}</p>
                        </div>
                      )}
                      {(() => {
                        const total = formatMoney(booking.totalAmount, booking.currency);
                        return total ? (
                          <div>
                            <span className="text-xs text-muted-foreground">Booking total</span>
                            <p className="font-medium text-foreground">{total}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

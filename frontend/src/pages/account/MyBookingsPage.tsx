import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Users,
  AlertCircle,
  Eye,
  XCircle,
  CreditCard,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  Card,
  Button,
  StatusChip,
  Skeleton,
  EmptyState,
  Modal,
} from '../../components/common';
import { bookingService } from '../../features/bookings/bookingService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import type { BookingResponse } from '../../types/api';

type StatusFilter = 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [cancellingBooking, setCancellingBooking] = useState<BookingResponse | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BookingResponse[]>({
    queryKey: ['bookings', 'my'],
    queryFn: () => bookingService.getMyBookings(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      bookingService.updateStatus(id, {
        status: 'CANCELLED',
        notes: cancelReason || 'Cancelled by guest',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my'] });
      setCancellingBooking(null);
      setCancelReason('');
    },
  });

  const filteredBookings = useMemo(() => {
    if (filter === 'ALL') return bookings;
    if (filter === 'UPCOMING') {
      return bookings.filter(
        (b) => b.status === 'REQUESTED' || b.status === 'CONFIRMED' || b.status === 'PAID'
      );
    }
    if (filter === 'COMPLETED') {
      return bookings.filter((b) => b.status === 'COMPLETED');
    }
    if (filter === 'CANCELLED') {
      return bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'DECLINED');
    }
    return bookings;
  }, [bookings, filter]);

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6" data-testid="my-bookings-loading">
        <Skeleton className="h-8 w-48 rounded-md" />
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-6 space-y-3">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-4 w-60 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Could Not Load Bookings</h2>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Please check your connection.'}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6" data-testid="my-bookings-page">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            My Tourism Bookings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            View your authentic experiences, confirmed guides, and past South Omo reservations.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/tourism')}
          className="self-start sm:self-auto touch-target text-xs font-semibold"
        >
          Browse Experiences
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
        {(
          [
            { id: 'ALL', label: 'All Bookings' },
            { id: 'UPCOMING', label: 'Active & Upcoming' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled / Declined' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            data-testid={`filter-tab-${tab.id}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap touch-target ${
              filter === tab.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List or Empty State */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          title="No Bookings Found"
          description={
            filter === 'ALL'
              ? "You haven't made any tourism or experience bookings yet. Browse our verified community packages in South Omo."
              : 'There are no bookings matching this status filter.'
          }
          action={
            <Button onClick={() => navigate('/tourism')} className="touch-target">
              Explore Experiences
            </Button>
          }
          className="py-12"
        />
      ) : (
        <div className="space-y-4" data-testid="bookings-list">
          {filteredBookings.map((b) => {
            const status = b.status || 'REQUESTED';
            const canCancel = status === 'REQUESTED' || status === 'CONFIRMED';
            const canPay = status === 'CONFIRMED';
            const itemName =
              b.items && b.items.length > 0
                ? b.items[0].itemNameSnapshot
                : 'Cultural Tour Experience';

            return (
              <Card
                key={b.id}
                className="p-5 sm:p-6 transition-all hover:border-primary/40 shadow-xs"
                data-testid={`booking-card-${b.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {b.bookingCode || b.id?.slice(0, 8)}
                      </span>
                      <StatusChip status={status} data-testid={`status-chip-${b.id}`} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">{itemName}</h3>
                    <p className="text-xs text-muted-foreground">
                      Host: <strong className="text-foreground">{b.enterpriseName || 'Community Cooperative'}</strong>
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0 space-y-0.5">
                    <div className="text-xs text-muted-foreground">Total Price</div>
                    <div className="text-lg font-black text-primary">
                      {formatCurrency(b.totalAmount || b.subtotal || 0, {
                        currencyCode: b.currency || 'ETB',
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>{b.visitDate ? formatDateTime(b.visitDate, 'dateOnly') : 'Flexible'}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span>{b.partySize || 1} guest(s)</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0">
                    {canPay && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/checkout?bookingId=${b.id}`)}
                        className="text-xs font-bold flex items-center gap-1 touch-target"
                        data-testid={`pay-btn-${b.id}`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </Button>
                    )}

                    <Link to={`/booking/confirmation/${b.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs flex items-center gap-1 touch-target"
                        data-testid={`view-voucher-btn-${b.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Voucher</span>
                        <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </Link>

                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingBooking(b)}
                        className="text-xs text-destructive hover:bg-destructive/10 touch-target"
                        data-testid={`cancel-btn-${b.id}`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={Boolean(cancellingBooking)}
        onClose={() => setCancellingBooking(null)}
        title="Cancel Experience Booking?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel booking{' '}
            <strong className="text-foreground">{cancellingBooking?.bookingCode}</strong>? This
            will release your reservation.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="cancelReasonInput" className="text-xs font-semibold text-foreground">
              Reason for cancellation (optional):
            </label>
            <textarea
              id="cancelReasonInput"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Flight changes, rescheduled tour..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancellingBooking(null)}
              disabled={cancelMutation.isPending}
            >
              Keep Booking
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (cancellingBooking?.id) {
                  cancelMutation.mutate(cancellingBooking.id);
                }
              }}
              disabled={cancelMutation.isPending}
              data-testid="confirm-cancel-my-booking-btn"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

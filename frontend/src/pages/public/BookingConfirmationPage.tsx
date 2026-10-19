import BookingReviews from '../../features/reviews/BookingReviews';
import RefundDetails from '../../features/payments/RefundDetails';
import { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Copy,
  Check,
  CreditCard,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Printer,
  ChevronLeft,
  Info,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  StatusChip,
  Skeleton,
  Modal,
} from '../../components/common';
import { bookingService } from '../../features/bookings/bookingService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { formatEthiopianPhoneDisplay } from '../../utils/phone';
import { TelebirrPaymentModal } from '../../features/payments';
import type { BookingResponse } from '../../types/api';

const STATUS_STEPS = [
  { key: 'REQUESTED', label: 'Requested', desc: 'Awaiting host confirmation' },
  { key: 'CONFIRMED', label: 'Confirmed', desc: 'Host accepted, ready for payment' },
  { key: 'PAID', label: 'Paid & Active', desc: 'Payment verified, experience secured' },
  { key: 'COMPLETED', label: 'Completed', desc: 'Tour successfully concluded' },
];

export default function BookingConfirmationPage() {
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const bookingId = paramId || searchParams.get('id') || '';

  const [copied, setCopied] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery<BookingResponse>({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBookingById(bookingId),
    enabled: Boolean(bookingId),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      bookingService.updateStatus(bookingId, {
        status: 'CANCELLED',
        notes: cancelReason || 'Cancelled by guest',
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['booking', bookingId], updated);
      setShowCancelModal(false);
    },
  });

  const handleCopyCode = () => {
    if (booking?.bookingCode) {
      navigator.clipboard.writeText(booking.bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!bookingId) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">No Booking Specified</h2>
        <p className="text-sm text-muted-foreground">
          Please check your confirmation link or look up your booking in your account.
        </p>
        <Button onClick={() => navigate('/tourism')}>Browse Experiences</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-12 space-y-6" data-testid="booking-loading">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4">
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Booking Record Not Found</h2>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Could not retrieve booking details.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/tourism')}>
              Catalog
            </Button>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  const status = booking.status || 'REQUESTED';
  const isDeclined = status === 'DECLINED';
  const isCancelled = status === 'CANCELLED';
  const isTerminalNegative = isDeclined || isCancelled;

  // Map step index for progress bar
  let currentStepIndex = 0;
  if (status === 'CONFIRMED') currentStepIndex = 1;
  else if (status === 'PAID') currentStepIndex = 2;
  else if (status === 'COMPLETED') currentStepIndex = 3;

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 space-y-8" data-testid="booking-confirmation-page">
      {/* Back button */}
      <div className="flex items-center justify-between no-print">
        <Link
          to="/tourism"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Tourism
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-xs touch-target"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Voucher</span>
        </Button>
      </div>

      {/* Main Header Confirmation Card */}
      <Card className="border-primary/20 bg-primary/5 text-center p-6 sm:p-8 space-y-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
          {isTerminalNegative ? (
            <XCircle className="w-8 h-8 text-destructive" />
          ) : status === 'PAID' || status === 'COMPLETED' ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Clock className="w-8 h-8 text-primary" />
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Booking Reference
            </span>
            <StatusChip status={status} data-testid="booking-status-chip" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
              {booking.bookingCode || booking.id?.slice(0, 8)}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              title="Copy Booking Code"
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all touch-target"
              aria-label="Copy booking code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          {status === 'REQUESTED' &&
            'Your booking request has been submitted to the community enterprise. You will receive an SMS when confirmed.'}
          {status === 'CONFIRMED' &&
            'Your booking is confirmed by the host! Complete payment to secure your private session.'}
          {status === 'PAID' &&
            'Your booking is fully paid and confirmed! Please present this code to your guide on arrival.'}
          {status === 'COMPLETED' &&
            'Thank you for visiting South Omo! This experience has been completed.'}
          {status === 'DECLINED' &&
            'This booking request could not be accepted by the host. Any pre-authorized charges have been released.'}
          {status === 'CANCELLED' && 'This booking has been cancelled.'}
        </p>
      </Card>

      {/* Status Timeline */}
      <Card className="p-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Booking Progress</span>
            <span className="text-xs font-normal text-muted-foreground">Status Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isTerminalNegative ? (
            <div
              className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm flex items-center gap-3"
              role="alert"
            >
              <XCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">
                  {isDeclined ? 'Booking Declined by Host' : 'Booking Cancelled'}
                </p>
                <p className="text-xs opacity-90">
                  {isDeclined
                    ? 'The enterprise was unable to accommodate this schedule or party size.'
                    : 'This reservation has been terminated and will not proceed.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative pt-2 pb-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div
                      key={step.key}
                      className={`flex flex-col items-center space-y-1.5 relative ${
                        isCurrent
                          ? 'text-primary'
                          : isDone
                            ? 'text-foreground'
                            : 'text-muted-foreground opacity-60'
                      }`}
                      data-testid={`timeline-step-${step.key}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                          isDone
                            ? 'bg-primary text-primary-foreground border-primary'
                            : isCurrent
                              ? 'bg-primary/10 border-primary text-primary ring-4 ring-primary/10'
                              : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="text-xs font-bold">{step.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                        {step.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Experience & Reservation Details */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-bold">Experience Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Community Host Enterprise</div>
              <div className="font-bold text-foreground">
                {booking.enterpriseName || 'Regional Community Cooperative'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Scheduled Date</div>
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  {booking.visitDate ? formatDateTime(booking.visitDate, 'dateOnly') : 'Flexible'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Party Size</div>
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                <span>{booking.partySize || 1} guest(s)</span>
              </div>
            </div>

            {booking.assignedGuideName && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Assigned Community Guide</div>
                <div className="font-bold text-foreground">{booking.assignedGuideName}</div>
              </div>
            )}
          </div>

          {/* Booked Items List */}
          {booking.items && booking.items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reserved Items
              </div>
              <div className="divide-y divide-border/40">
                {booking.items.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground">
                        {item.itemNameSnapshot || 'Cultural Experience'}
                      </span>
                      <span className="text-muted-foreground ml-2">x{item.quantity || 1}</span>
                    </div>
                    <span className="font-bold text-foreground">
                      {formatCurrency(item.lineTotal || item.unitPriceSnapshot || 0, {
                        currencyCode: booking.currency || 'ETB',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="mt-4 pt-4 border-t border-border/60 text-xs space-y-1">
              <div className="text-muted-foreground font-semibold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-primary" />
                <span>Special Requests / Notes:</span>
              </div>
              <p className="text-foreground italic bg-muted/30 p-2.5 rounded-lg border border-border/40">
                &ldquo;{booking.specialRequests}&rdquo;
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Details & Financial Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info Card */}
        <Card>
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground">Name:</span>{' '}
              <strong className="text-foreground">{booking.contactName}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>{' '}
              <strong className="text-foreground font-mono">
                {formatEthiopianPhoneDisplay(booking.contactPhone || '')}
              </strong>
            </div>
            {booking.contactEmail && (
              <div>
                <span className="text-muted-foreground">Email:</span>{' '}
                <strong className="text-foreground">{booking.contactEmail}</strong>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Price Summary Card */}
        <Card>
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold">Price Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium text-foreground">
                {formatCurrency(booking.subtotal || 0, { currencyCode: booking.currency || 'ETB' })}
              </span>
            </div>

            {Boolean(booking.taxAmount) && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Tax (VAT)</span>
                <span>
                  {formatCurrency(booking.taxAmount || 0, {
                    currencyCode: booking.currency || 'ETB',
                  })}
                </span>
              </div>
            )}

            {Boolean(booking.feeAmount) && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Platform & Community Service</span>
                <span>
                  {formatCurrency(booking.feeAmount || 0, {
                    currencyCode: booking.currency || 'ETB',
                  })}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between font-bold text-sm text-foreground">
              <span>Total Price</span>
              <span className="text-base text-primary font-black" data-testid="booking-total-price">
                {formatCurrency(booking.totalAmount || booking.subtotal || 0, {
                  currencyCode: booking.currency || 'ETB',
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/80 no-print">
        <div>
          {status === 'CONFIRMED' && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowPaymentModal(true)}
              className="w-full sm:w-auto font-bold shadow-md flex items-center gap-2 touch-target"
              data-testid="pay-booking-cta"
            >
              <CreditCard className="w-4 h-4" />
              <span>Proceed to Telebirr Payment</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          {status === 'PAID' && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Payment Confirmed. Have a great experience!
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {(status === 'REQUESTED' || status === 'CONFIRMED') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="text-destructive hover:bg-destructive/10 text-xs touch-target"
              data-testid="cancel-booking-btn"
            >
              Cancel Reservation
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tourism')}
            className="text-xs touch-target"
          >
            Browse More
          </Button>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel This Booking?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel booking{' '}
            <strong className="text-foreground">{booking.bookingCode}</strong>? This will release
            your reserved spots back to the community host.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="cancelReason" className="text-xs font-semibold text-foreground">
              Reason for cancellation (optional):
            </label>
            <textarea
              id="cancelReason"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule change, travel delays..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelMutation.isPending}
            >
              Keep Booking
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="confirm-cancel-btn"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>

      <BookingReviews bookingId={bookingId} />
      <RefundDetails bookingId={booking.id} />

      {/* Telebirr Payment Modal */}
      <TelebirrPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        bookingId={booking.id}
        amount={booking.totalAmount || booking.subtotal || 0}
        currency={booking.currency || 'ETB'}
        referenceCode={booking.bookingCode}
        payerPhone={booking.contactPhone}
        onPaymentSuccess={() => {
          queryClient.setQueryData(['booking', bookingId], (old: BookingResponse | undefined) => {
            if (!old) return old;
            return {
              ...old,
              status: 'PAID',
            };
          });
        }}
      />
    </div>
  );
}

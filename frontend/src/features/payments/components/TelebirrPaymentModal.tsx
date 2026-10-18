import { useState, useRef, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Modal, Button } from '../../../components/common';
import { paymentService } from '../paymentService';
import { generateIdempotencyKey } from '../../../utils/idempotency';
import { formatCurrency } from '../../../utils/formatters';
import type { PaymentAttemptResponse } from '../../../types/api';

export type PaymentFlowStatus = 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';

export interface TelebirrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  orderId?: string;
  amount: number;
  currency?: string;
  referenceCode?: string;
  payerPhone?: string;
  onPaymentSuccess?: (attempt: PaymentAttemptResponse) => void;
}

export function TelebirrPaymentModal({
  isOpen,
  onClose,
  bookingId,
  orderId,
  amount,
  currency = 'ETB',
  referenceCode = '',
  payerPhone = '',
  onPaymentSuccess,
}: TelebirrPaymentModalProps) {
  const [status, setStatus] = useState<PaymentFlowStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [attemptResult, setAttemptResult] = useState<PaymentAttemptResponse | null>(null);

  // Stable idempotency key: reused on retry of the same action
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when opened with a new reference/booking
  useEffect(() => {
    if (isOpen) {
      setStatus('IDLE');
      setErrorMessage('');
      setAttemptResult(null);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [isOpen, bookingId, orderId]);

  const handlePay = async () => {
    if (status === 'PENDING') return;

    setStatus('PENDING');
    setErrorMessage('');

    // Safety timeout: 25 seconds
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus((current) => (current === 'PENDING' ? 'TIMEOUT' : current));
    }, 25000);

    try {
      const attempt = await paymentService.createAttempt({
        bookingId,
        orderId,
        provider: 'TELEBIRR',
        idempotencyKey: idempotencyKeyRef.current,
      });

      if (timerRef.current) clearTimeout(timerRef.current);

      if (attempt.status === 'SUCCESS') {
        setStatus('SUCCESS');
        setAttemptResult(attempt);
        if (onPaymentSuccess) {
          onPaymentSuccess(attempt);
        }
      } else {
        setStatus('FAILED');
        setErrorMessage('Payment was not completed by the Telebirr gateway. Please check your balance.');
      }
    } catch (err: unknown) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus('FAILED');
      const msg = err instanceof Error ? err.message : 'Telebirr payment attempt failed';
      setErrorMessage(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (status !== 'PENDING') {
          onClose();
        }
      }}
      title="Telebirr Mobile Payment"
    >
      <div className="space-y-5" data-testid="telebirr-payment-modal">
        {/* Payment Summary */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Amount Due</div>
            <div className="text-2xl font-black text-primary" data-testid="payment-modal-amount">
              {formatCurrency(amount, { currencyCode: currency })}
            </div>
            {referenceCode && (
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Ref: {referenceCode}
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-primary font-bold text-xs shadow-xs">
            telebirr
          </div>
        </div>

        {/* State 1: IDLE */}
        {status === 'IDLE' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Smartphone className="w-4 h-4 text-primary" />
                <span>Mobile Confirmation Prompt</span>
              </div>
              <p>
                A push notification or USSD authorization request will be sent to your registered Telebirr number
                {payerPhone ? ` (${payerPhone})` : ''} to authorize this payment.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secured through National Bank of Ethiopia compliance rules</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handlePay}
                className="font-bold flex items-center gap-2 touch-target"
                data-testid="confirm-telebirr-pay-btn"
              >
                <span>Authorize & Pay</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* State 2: PENDING */}
        {status === 'PENDING' && (
          <div className="py-8 text-center space-y-4" data-testid="payment-pending-state">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Waiting for Telebirr Confirmation...</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Please check your mobile phone and enter your Telebirr PIN to approve the transaction.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
              <Clock className="w-3 h-3 text-primary" />
              <span>Verifying server signature</span>
            </div>
          </div>
        )}

        {/* State 3: SUCCESS */}
        {status === 'SUCCESS' && (
          <div className="py-6 text-center space-y-4" data-testid="payment-success-state">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Payment Verified!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Your payment of {formatCurrency(amount, { currencyCode: currency })} has been confirmed by the server.
              </p>
              {attemptResult?.providerReference && (
                <p className="text-[11px] font-mono text-muted-foreground">
                  Txn ID: {attemptResult.providerReference}
                </p>
              )}
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={onClose}
              className="w-full font-bold touch-target"
              data-testid="payment-success-close-btn"
            >
              Done & View Voucher
            </Button>
          </div>
        )}

        {/* State 4: FAILED */}
        {status === 'FAILED' && (
          <div className="py-4 space-y-4" data-testid="payment-failed-state">
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive flex items-start gap-3 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Payment Attempt Failed</p>
                <p className="opacity-90">{errorMessage}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              You can retry payment immediately using the same session authorization.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handlePay}
                className="font-bold flex items-center gap-1.5 touch-target"
                data-testid="retry-payment-btn"
              >
                <RotateCw className="w-4 h-4" />
                <span>Retry Payment</span>
              </Button>
            </div>
          </div>
        )}

        {/* State 5: TIMEOUT */}
        {status === 'TIMEOUT' && (
          <div className="py-4 space-y-4" data-testid="payment-timeout-state">
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 flex items-start gap-3 text-xs">
              <Clock className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Confirmation Timed Out</p>
                <p className="opacity-90">
                  The payment network did not respond in time. Please check your Telebirr SMS or balance before retrying.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handlePay}
                className="font-bold flex items-center gap-1.5 touch-target"
                data-testid="timeout-retry-btn"
              >
                <RotateCw className="w-4 h-4" />
                <span>Retry Authorization</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default TelebirrPaymentModal;

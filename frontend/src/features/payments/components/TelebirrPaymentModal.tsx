import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../auth';
import { usePaymentFlow } from '../usePaymentFlow';
export type { PaymentFlowStatus } from '../usePaymentFlow';
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
import { formatCurrency } from '../../../utils/formatters';
import type { PaymentAttemptResponse } from '../../../types/api';

export interface TelebirrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  orderId?: string;
  amount: number;
  currency?: string;
  referenceCode?: string;
  payerPhone?: string;
  onPaymentSuccess?: (attempt?: PaymentAttemptResponse) => void;
}

function PaymentSession({
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
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    status,
    errorMessage,
    attemptResult,
    pay: handlePay,
    refresh,
  } = usePaymentFlow({ bookingId, orderId, onPaymentSuccess });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = contentRef.current?.closest(
      '[role="dialog"]',
    ) as HTMLElement | null;
    if (!dialog) return;
    const buttons = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = buttons();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    buttons()[0]?.focus();
    dialog.addEventListener('keydown', trap);
    return () => {
      dialog.removeEventListener('keydown', trap);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (status !== 'PENDING') {
          onClose();
        }
      }}
      title="Telebirr Mobile Payment"
      panelClassName="bg-[var(--bg-surface)] text-[var(--text-main)]"
    >
      <div
        ref={contentRef}
        className="space-y-5"
        data-testid="telebirr-payment-modal"
        aria-live="polite"
        aria-atomic="false"
      >
        {/* Payment Summary */}
        <div className="p-4 rounded-xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Amount Due</div>
            <div
              className="text-2xl font-black text-brand-primary"
              data-testid="payment-modal-amount"
            >
              {formatCurrency(amount, { currencyCode: currency })}
            </div>
            {referenceCode && (
              <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                Ref: {referenceCode}
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-brand-primary font-bold text-xs shadow-xs">
            telebirr
          </div>
        </div>

        {/* State 1: IDLE */}
        {status === 'IDLE' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2 text-[var(--text-main)] font-semibold">
                <Smartphone className="w-4 h-4 text-brand-primary" />
                <span>Mobile Confirmation Prompt</span>
              </div>
              <p>
                Follow the instructions from your payment provider on your
                registered Telebirr number
                {payerPhone ? ` (${payerPhone})` : ''} to authorize this
                payment. Never enter your PIN on this website.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Payment is confirmed only after the server verifies it.
                </span>
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
                className="bg-brand-primary hover:bg-brand-primary-hover focus-visible:ring-brand-primary font-bold flex items-center gap-2 touch-target"
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
          <div
            className="py-8 text-center space-y-4"
            data-testid="payment-pending-state"
          >
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--text-main)]">
                Waiting for Telebirr Confirmation...
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Please check your mobile phone and enter your Telebirr PIN to
                approve the transaction.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface-subtle)] px-3 py-1 rounded-full">
              <Clock className="w-3 h-3 text-brand-primary" />
              <span>Waiting for server-confirmed settlement</span>
            </div>
          </div>
        )}

        {status !== 'IDLE' && status !== 'SUCCESS' && (
          <div className="space-y-2">
            {status === 'PENDING' && errorMessage && (
              <p role="status" className="text-sm">
                {errorMessage}
              </p>
            )}
            <Button
              variant="outline"
              onClick={refresh}
              data-testid="refresh-payment-status-btn"
            >
              Refresh server status
            </Button>
          </div>
        )}

        {/* State 3: SUCCESS */}
        {status === 'SUCCESS' && (
          <div
            className="py-6 text-center space-y-4"
            data-testid="payment-success-state"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[var(--text-main)]">
                Payment Verified!
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Your payment of{' '}
                {formatCurrency(amount, { currencyCode: currency })} has been
                confirmed by the server.
              </p>
              {attemptResult?.providerReference && (
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Txn ID: {attemptResult.providerReference}
                </p>
              )}
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={onClose}
              className="bg-brand-primary hover:bg-brand-primary-hover focus-visible:ring-brand-primary w-full font-bold touch-target"
              data-testid="payment-success-close-btn"
            >
              Done
            </Button>
          </div>
        )}

        {/* State 4: FAILED */}
        {status === 'FAILED' && (
          <div className="py-4 space-y-4" data-testid="payment-failed-state">
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-start gap-3 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="bg-brand-primary hover:bg-brand-primary-hover focus-visible:ring-brand-primary font-bold">
                  Payment Attempt Failed
                </p>
                <p className="opacity-90">{errorMessage}</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Refresh server status before retrying. Retrying reuses this
              attempt key and may return the same failure.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handlePay}
                className="bg-brand-primary hover:bg-brand-primary-hover focus-visible:ring-brand-primary font-bold flex items-center gap-1.5 touch-target"
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
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300 flex items-start gap-3 text-xs">
              <Clock className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="bg-brand-primary hover:bg-brand-primary-hover focus-visible:ring-brand-primary font-bold">
                  Confirmation Timed Out
                </p>
                <p className="opacity-90">
                  The payment network did not respond in time. Payment may still
                  complete. Refresh server status before retrying with the same
                  attempt key.
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
                className="bg-brand-primary hover:bg-brand-primary-hover focus-visible:ring-brand-primary font-bold flex items-center gap-1.5 touch-target"
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

export function TelebirrPaymentModal(props: TelebirrPaymentModalProps) {
  const token = useAuthStore((state) => state.token);
  const buyerId = useAuthStore((state) => state.user?.id);
  if (!props.isOpen) return null;
  return (
    <PaymentSession
      key={`${buyerId}:${token}:${props.bookingId || ''}:${props.orderId || ''}`}
      {...props}
    />
  );
}

export default TelebirrPaymentModal;

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../auth';
import { bookingService } from '../bookings/bookingService';
import { orderService } from '../orders/orderService';
import { paymentService } from './paymentService';
import { generateIdempotencyKey } from '../../utils/idempotency';
import type { PaymentAttemptResponse } from '../../types/api';

export type PaymentFlowStatus =
  'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
interface Options {
  bookingId?: string;
  orderId?: string;
  onPaymentSuccess?: (attempt?: PaymentAttemptResponse) => void;
}
const TIMEOUT = 25_000;
const POLL_DELAY = 3_000;

export function usePaymentFlow({
  bookingId,
  orderId,
  onPaymentSuccess,
}: Options) {
  const buyerId = useAuthStore((state) => state.user?.id);
  const [status, setStatus] = useState<PaymentFlowStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptResult, setAttemptResult] = useState<PaymentAttemptResponse>();
  const [idempotencyKey] = useState(() => {
    const storageKey = `omobridge:payment:${buyerId || 'session'}:${bookingId ? 'booking' : 'order'}:${bookingId || orderId}`;
    // Reopening or remounting an uncertain attempt must not generate a second charge key.
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) return stored;
      const key = generateIdempotencyKey();
      sessionStorage.setItem(storageKey, key);
      return key;
    } catch {
      return generateIdempotencyKey();
    }
  });
  const run = useRef<{
    controller: AbortController;
    timeout: ReturnType<typeof setTimeout>;
    poll?: ReturnType<typeof setTimeout>;
  } | null>(null);
  const attempt = useRef<PaymentAttemptResponse | undefined>(undefined);
  const completed = useRef(false);
  const callback = useRef(onPaymentSuccess);
  useEffect(() => {
    callback.current = onPaymentSuccess;
  }, [onPaymentSuccess]);
  function stop() {
    const active = run.current;
    run.current = null;
    if (active) {
      active.controller.abort();
      clearTimeout(active.timeout);
      clearTimeout(active.poll);
    }
  }
  useEffect(() => () => stop(), []);

  function begin() {
    if (run.current || completed.current) return null;
    const controller = new AbortController();
    const active = {
      controller,
      timeout: setTimeout(() => {
        if (run.current?.controller !== controller) return;
        stop();
        setStatus('TIMEOUT');
      }, TIMEOUT),
      poll: undefined as ReturnType<typeof setTimeout> | undefined,
    };
    run.current = active;
    setStatus('PENDING');
    setErrorMessage('');
    return active;
  }

  async function verify(active: NonNullable<typeof run.current>) {
    const signal = active.controller.signal;
    try {
      let settled = false;
      if (bookingId) {
        const booking = await bookingService.getBookingById(bookingId, signal);
        if (booking.id !== bookingId)
          throw new Error('Unexpected booking returned by the server.');
        settled = booking.status === 'PAID' || booking.status === 'COMPLETED';
        if (booking.status === 'CANCELLED') {
          if (signal.aborted) return;
          stop();
          setStatus('FAILED');
          setErrorMessage('This booking has been cancelled.');
          return;
        }
      } else if (orderId && buyerId) {
        // Verify buyer ownership before using the existing payment lookup endpoint.
        const order = await orderService.detail(orderId, buyerId, signal);
        const payment = await orderService.payment(order, buyerId, signal);
        settled = payment.status === 'HELD' || payment.status === 'RELEASED';
        if (
          payment.status === 'FAILED' ||
          payment.status === 'REFUNDED' ||
          order.status === 'CANCELLED'
        ) {
          if (signal.aborted) return;
          stop();
          setStatus('FAILED');
          setErrorMessage(
            'The server reports that this payment is failed, refunded, or cancelled.',
          );
          return;
        }
      } else throw new Error('Sign in to check this order payment.');
      if (signal.aborted) return;
      if (settled) {
        stop();
        completed.current = true;
        setStatus('SUCCESS');
        callback.current?.(attempt.current);
        return;
      }
    } catch (error) {
      if (signal.aborted) return;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Status is unavailable. Refresh to check again.',
      );
    }
    if (!signal.aborted)
      active.poll = setTimeout(() => {
        void verify(active);
      }, POLL_DELAY);
  }

  async function pay() {
    if (Boolean(bookingId) === Boolean(orderId)) {
      setStatus('FAILED');
      setErrorMessage('Select exactly one booking or order to pay.');
      return;
    }
    const active = begin();
    if (!active) return;
    try {
      if (orderId) {
        if (!buyerId) throw new Error('Sign in before paying for an order.');
        await orderService.detail(orderId, buyerId, active.controller.signal);
        if (active.controller.signal.aborted) return;
      }
      const result = await paymentService.createAttempt(
        { bookingId, orderId, provider: 'TELEBIRR', idempotencyKey },
        active.controller.signal,
      );
      if (active.controller.signal.aborted) return;
      if (
        !result.attemptId ||
        !result.paymentId ||
        !['INITIATED', 'SUCCESS', 'FAILED'].includes(result.status || '') ||
        (result.idempotencyKey && result.idempotencyKey !== idempotencyKey)
      ) {
        throw new Error(
          'The payment response could not be verified. Refresh the server status before retrying.',
        );
      }
      attempt.current = result;
      setAttemptResult(result);
      if (result.status === 'FAILED') {
        stop();
        setStatus('FAILED');
        setErrorMessage(
          'The payment attempt failed. Refresh status before retrying; the same attempt key will be reused.',
        );
        return;
      }
      // Attempt SUCCESS is a gateway response, not settlement. Only a server read can confirm payment.
      await verify(active);
    } catch (error) {
      if (active.controller.signal.aborted) return;
      stop();
      setStatus('FAILED');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Payment response unavailable. Refresh before retrying.',
      );
    }
  }

  function refresh() {
    if (completed.current) return;
    stop();
    const active = begin();
    if (active) void verify(active);
  }
  return { status, errorMessage, attemptResult, pay, refresh };
}

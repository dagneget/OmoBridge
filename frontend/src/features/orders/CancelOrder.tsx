import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useAuthStore } from '../auth';
import type { OrderDetailResponse } from '../../types/api';
import { orderService } from './orderService';
import { orderControl } from './useOrdersText';
import en from './locales/cancel.en.json';
import am from './locales/cancel.am.json';
i18n.addResourceBundle('en', 'orderCancellation', en, true, true);
i18n.addResourceBundle('am', 'orderCancellation', am, true, true);
const allowed = new Set(['PLACED', 'PAID', 'PACKED', 'IN_TRANSIT']);
type Phase =
  'IDLE' | 'CONFIRM' | 'SENDING' | 'UNCERTAIN' | 'CHECKING' | 'SUCCESS';
interface Props {
  order: OrderDetailResponse;
  enabled: boolean;
  onCancelled: (order: OrderDetailResponse) => void | Promise<void>;
  onRefresh: () => Promise<boolean>;
}
export default function CancelOrder({
  order,
  enabled,
  onCancelled,
  onRefresh,
}: Props) {
  const { t } = useTranslation('orderCancellation');
  const text = (key: keyof typeof en, values: Record<string, string> = {}) =>
    t(key, { ...values, fallbackLng: ['am', 'en'] });
  const { user, token, isAuthenticated } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('IDLE');
  const active = useRef<AbortController | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  const heading = useId();
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (phase === 'CONFIRM') {
      opened.current = true;
      confirmButton.current?.focus();
    } else if (phase === 'IDLE' && opened.current) {
      opened.current = false;
      startButton.current?.focus();
    }
  }, [phase]);
  const owned = !!user?.id && order.buyerId === user.id && isAuthenticated;
  const eligible = allowed.has(order.status || '');
  const currentSession = (controller: AbortController) =>
    !controller.signal.aborted &&
    useAuthStore.getState().token === token &&
    useAuthStore.getState().user?.id === user?.id &&
    useAuthStore.getState().isAuthenticated;
  async function submit() {
    if (
      !enabled ||
      !owned ||
      !eligible ||
      phase !== 'CONFIRM' ||
      active.current
    )
      return;
    const controller = new AbortController();
    active.current = controller;
    setPhase('SENDING');
    try {
      const updated = await orderService.cancel(
        order.orderId!,
        user!.id!,
        controller.signal,
      );
      if (!currentSession(controller)) return;
      await onCancelled(updated);
      if (currentSession(controller)) setPhase('SUCCESS');
    } catch {
      if (currentSession(controller)) setPhase('UNCERTAIN');
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  async function recheck() {
    if (!enabled || !owned || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPhase('CHECKING');
    try {
      const verified = await onRefresh();
      if (currentSession(controller)) setPhase(verified ? 'IDLE' : 'UNCERTAIN');
    } catch {
      if (currentSession(controller)) setPhase('UNCERTAIN');
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  if (!owned) return null;
  return (
    <section
      className="space-y-3 rounded-lg border border-slate-300 p-4"
      aria-labelledby={heading}
    >
      <h2 id={heading} className="text-xl font-semibold">
        {text('title')}
      </h2>
      <p>{text('refundNotice')}</p>
      {phase === 'SUCCESS' && <p role="status">{text('success')}</p>}
      {!eligible ? (
        phase !== 'SUCCESS' && <p>{text('forbidden')}</p>
      ) : (
        <>
          {!enabled && <p role="status">{text('unverified')}</p>}
          {phase === 'IDLE' && (
            <button
              ref={startButton}
              type="button"
              className={orderControl}
              disabled={!enabled}
              onClick={() => setPhase('CONFIRM')}
            >
              {text('start')}
            </button>
          )}
          {phase === 'CONFIRM' && (
            <div className="space-y-3">
              <p>
                {text('question', {
                  reference: order.orderNo || order.orderId!,
                })}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  ref={confirmButton}
                  type="button"
                  className={orderControl}
                  disabled={!enabled}
                  onClick={() => {
                    void submit();
                  }}
                >
                  {text('confirm')}
                </button>
                <button
                  type="button"
                  className={orderControl}
                  onClick={() => setPhase('IDLE')}
                >
                  {text('keep')}
                </button>
              </div>
            </div>
          )}
          {phase === 'SENDING' && <p role="status">{text('sending')}</p>}
          {(phase === 'UNCERTAIN' || phase === 'CHECKING') && (
            <>
              <p role="alert">{text('uncertain')}</p>
              {phase === 'CHECKING' && <p role="status">{text('checking')}</p>}
              <button
                type="button"
                className={orderControl}
                disabled={!enabled || phase === 'CHECKING'}
                onClick={() => {
                  void recheck();
                }}
              >
                {text('recheck')}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}

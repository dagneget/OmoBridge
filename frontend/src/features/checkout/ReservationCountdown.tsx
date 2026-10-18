import { useEffect, useState } from 'react';
import { useCheckoutResultText } from './useCheckoutResultText';

interface Props {
  /** Only a server-supplied deadline belongs here; never derive it from createdAt. */
  expiresAt?: string;
  /** True only when the backend explicitly reports reservation expiry. */
  expired?: boolean;
}
export function ReservationCountdown({ expiresAt, expired = false }: Props) {
  const t = useCheckoutResultText();
  const [now, setNow] = useState(Date.now);
  const deadline =
    expiresAt && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(expiresAt)
      ? Date.parse(expiresAt)
      : NaN;
  useEffect(() => {
    if (!Number.isFinite(deadline) || expired) return;
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [deadline, expired]);
  if (expired) return <p role="status">{t('expired')}</p>;
  if (!Number.isFinite(deadline)) return <p>{t('deadlineUnknown')}</p>;
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  if (!seconds) return <p role="status">{t('elapsed')}</p>;
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <div>
      <p role="timer" aria-live="off">
        {t('remaining', { time })}
      </p>
      <p className="text-sm">{t('deviceClock')}</p>
    </div>
  );
}

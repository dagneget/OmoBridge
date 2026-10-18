import { Smartphone, MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import defaultI18n from '../../i18n';

/**
 * F-1108: the honest version of what "background tracking" means in a PWA.
 *
 * A browser can only read geolocation while the page is open, in the foreground, and the screen
 * is on. This is a platform limit, not a bug we can fix, so the provider is told plainly rather
 * than discovering a gap in the breadcrumb after the fact.
 *
 * The SMS checkpoint is the real fallback: `InboundSmsService` reads the job number
 * (`DEL-…`) plus a checkpoint word out of an inbound message and applies the transition,
 * provided it is legal and the sender is the assigned provider's phone. The job number is
 * passed in so the example is the provider's own.
 */
export interface TrackingLimitNoticeProps {
  /** The provider's real job number, used to prefill the SMS example. */
  jobNo: string;
}

export function TrackingLimitNotice({ jobNo }: TrackingLimitNoticeProps) {
  const { i18n } = useTranslation();
  // i18n is not initialised in tests, so fall back to the instance from src/i18n.
  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;
  const tr = (key: string, fallback: string): string => {
    const value = String(activeI18n.t(key) ?? '');
    return !value || value.includes(key) ? fallback : value;
  };

  return (
    <div
      data-testid="tracking-limit-notice"
      className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {tr('delivery.trackingLimitTitle', 'Tracking stops when you leave this app')}
          </p>
          <p className="text-sm text-muted-foreground">
            {tr(
              'delivery.trackingLimitBody',
              'Your phone only shares location while this page is open, in front, and the screen is on. Locking the phone, switching apps, or closing the browser stops new points from being recorded.'
            )}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 border-t border-border pt-3">
        <MessageSquareText
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            {tr('delivery.smsFallbackTitle', 'No signal? Send a checkpoint by SMS')}
          </p>
          <p className="text-sm text-muted-foreground">
            {tr(
              'delivery.smsFallbackBody',
              'Text your job number with the checkpoint word, from the phone number registered to your account. Nothing to install and no data needed.'
            )}
          </p>

          {/*
            DELIVERED is deliberately NOT a translation key: the backend matches it with
            `body.contains("DELIVERED")`, so translating it would make the checkpoint silently
            stop working for anyone reading the UI in Amharic. The words stay as the server
            parses them; only the sentence around them is translated.
          */}
          <p
            data-testid="tracking-sms-example"
            className="break-all rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs text-foreground"
          >
            {jobNo} DELIVERED
          </p>

          <p className="text-xs text-muted-foreground">
            {tr(
              'delivery.smsFallbackWords',
              'Accepted words: PICKED or COLLECTED, LEFT or TRANSIT, ARRIVED or DELIVERED.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

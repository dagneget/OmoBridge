import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, MessageSquareText } from 'lucide-react';

import defaultI18n from '../../i18n';
import type { DeliveryJobStatus } from './deliveryStatus';
import {
  alternativeWordsFor,
  buildSmsCheckpointText,
  supportsSmsCheckpoint,
  type SmsCheckpointStatus,
} from './smsCheckpoint';

/**
 * F-1106: a ready-made SMS checkpoint for when there is no data.
 *
 * Only the statuses the backend can actually move by SMS are listed. Offering `FAILED` or
 * `CANCELLED` here would be a dead instruction — `InboundSmsService` has no keyword for either,
 * so the message would be recorded and then silently ignored. That is the worst possible
 * outcome for a driver who believes they have reported a problem.
 *
 * Each entry carries the provider's real job number, so the text can be sent as-is. It is shown
 * in a read-only field as well as behind a copy button: clipboard access needs a secure context
 * and is not reliable on every handset, and long-press selection must always work.
 */
export interface SmsCheckpointFallbackProps {
  /** Absent means there is nothing the backend could match on, so no message is worth showing. */
  jobNo?: string;
  /** The statuses this job may move to next. Unsupported ones are filtered out, not shown. */
  statuses: DeliveryJobStatus[];
  /** Renders a human name for a status, reusing the page's existing translation helper. */
  statusLabel: (status: string) => string;
}

export function SmsCheckpointFallback({ jobNo, statuses, statusLabel }: SmsCheckpointFallbackProps) {
  const { i18n } = useTranslation();
  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;
  const tr = (key: string, fallback: string): string => {
    const value = String(activeI18n.t(key) ?? '');
    return !value || value.includes(key) ? fallback : value;
  };

  const [copied, setCopied] = useState<SmsCheckpointStatus | null>(null);

  const sendable = jobNo ? statuses.filter(supportsSmsCheckpoint) : [];

  // Nothing here can be sent by SMS — either the status has no keyword, or there is no job
  // number for the backend to find the job by — so show nothing rather than an empty box.
  if (!jobNo || sendable.length === 0) return null;

  const copy = async (status: SmsCheckpointStatus) => {
    const text = buildSmsCheckpointText(jobNo, status);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(status);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      // No clipboard available (insecure context, older handset). The read-only field below is
      // still there to select by hand, so this is not an error worth surfacing as a failure.
      setCopied(null);
    }
  };

  return (
    <details data-testid="sms-checkpoint-fallback" className="rounded-lg border border-border">
      <summary className="cursor-pointer list-none rounded-lg p-3.5 text-sm font-medium text-foreground touch-target flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {tr('delivery.smsFallbackTitle', 'No signal? Send a checkpoint by SMS')}
      </summary>

      <div className="space-y-4 border-t border-border p-3.5">
        <p className="text-sm text-muted-foreground">
          {tr(
            'delivery.smsFallbackIntro',
            'Send from the phone number registered to your account. Include the job number — without it the message is ignored.'
          )}
        </p>

        <ul className="space-y-3">
          {sendable.map((status) => {
            const text = buildSmsCheckpointText(jobNo, status);
            // The primary keyword is already visible in the field below; repeating it would
            // only make the line look copy-pasted from the parser.
            const alternatives = alternativeWordsFor(status);
            return (
              <li key={status} className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">{statusLabel(status)}</p>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    readOnly
                    value={text}
                    aria-label={tr(
                      'delivery.smsExampleLabel',
                      'SMS text for {{status}}'
                    ).replace('{{status}}', statusLabel(status))}
                    data-testid={`sms-text-${status.toLowerCase()}`}
                    onFocus={(event) => event.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => void copy(status)}
                    data-testid={`sms-copy-${status.toLowerCase()}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium touch-target cursor-pointer hover:bg-muted"
                  >
                    {copied === status ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {copied === status
                      ? tr('delivery.smsCopied', 'Copied')
                      : tr('delivery.smsCopy', 'Copy')}
                  </button>
                </div>

                {alternatives.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {tr('delivery.smsAlsoAccepted', 'Also accepted: {{words}}').replace(
                      '{{words}}',
                      alternatives.join(', ')
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-muted-foreground">
          {tr(
            'delivery.smsOrderNote',
            'Send each checkpoint as it happens. A message for a step the job has not reached yet will not move it.'
          )}
        </p>
      </div>
    </details>
  );
}

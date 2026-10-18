import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, QrCode, RefreshCw } from 'lucide-react';

import { Skeleton } from '../../components/common';
import defaultI18n from '../../i18n';

/**
 * F-703: the batch QR code, served by the API and printed.
 *
 * ## Why this displays the server's PNG instead of drawing a code locally
 * `PublicTraceController.getQrCode` encodes `app.traceability.base-url + publicToken` — by
 * default `https://omobridge.et/trace/{token}`, which is exactly the frontend's `/trace/:token`
 * route. The *content* of the code is the backend's decision, so redrawing it here with a
 * client-side library would risk printing a code that resolves somewhere other than where the
 * server intended. Pointing an `<img>` at the endpoint is the only way "the printed QR scans to
 * the trace page" can be guaranteed.
 *
 * ## No blob, no object URL
 * The image is loaded straight from the endpoint and left in the browser's HTTP cache, which the
 * server governs with `Cache-Control: max-age=86400`. Fetching the bytes into a Blob and wrapping
 * them in an object URL would need an effect to create and revoke the handle, would not reuse the
 * HTTP cache, and would only gain a React Query cache the browser already has.
 *
 * Reusable by design: F-906 (enterprise trace management) imports these rather than building a
 * second QR/print implementation.
 */

export interface TraceQrCodeProps {
  publicToken: string;
  /** Edge length in CSS pixels. Also the size requested from the server. */
  size?: number;
  /** Overrides the default description; defaults to a translated string. */
  alt?: string;
  className?: string;
  /** Extra classes applied only when printing. */
  printClassName?: string;
}

export function TraceQrCode({
  publicToken,
  size = 224,
  alt,
  className = '',
  printClassName = '',
}: TraceQrCodeProps) {
  const { i18n } = useTranslation();
  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;
  const tr = (key: string, fallback: string): string => {
    const value = String(activeI18n.t(key) ?? '');
    return !value || value.includes(key) ? fallback : value;
  };

  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // A retry must not be answered from a negative HTTP cache entry, so bust it deliberately.
  const [attempt, setAttempt] = useState(0);

  const src =
    `/api/v1/trace/${encodeURIComponent(publicToken)}/qr` +
    `?width=${size}&height=${size}${attempt > 0 ? `&retry=${attempt}` : ''}`;

  if (failed) {
    return (
      <div
        data-testid="trace-qr-error"
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center ${className}`}
        style={{ width: size, height: size }}
      >
        <QrCode className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">
          {alt ?? tr('trace.qrUnavailable', 'QR code unavailable')}
        </p>
        <button
          type="button"
          onClick={() => {
            setAttempt((n) => n + 1);
            setLoaded(false);
            setFailed(false);
          }}
          data-testid="trace-qr-retry"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline touch-target"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          {tr('trace.qrRetry', 'Retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {!loaded && (
        <Skeleton
          variant="rectangular"
          width={size}
          height={size}
          className="absolute inset-0"
          data-testid="trace-qr-loading"
        />
      )}
      <img
        src={src}
        width={size}
        height={size}
        alt={alt ?? tr('trace.qrAlt', 'QR code linking to this product’s trace page')}
        data-testid="trace-qr-image"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full rounded-lg bg-white p-2 print:bg-white print:p-2 ${printClassName} print:w-56 print:h-56`}
      />
    </div>
  );
}

export interface TraceQrLabelProps {
  publicToken: string;
  batchCode?: string;
  enterpriseName?: string;
  /** Shown under the code so a damaged label can still be typed in. */
  originLabel?: string;
  /** Hides the print button when the caller only wants the image. */
  showPrintButton?: boolean;
}

/**
 * The printable label: QR, batch code and who produced it, black on white.
 *
 * Everything outside the label is hidden when printing (Tailwind's `print:` variant, so no
 * global stylesheet change is needed), which is what makes `window.print()` produce a label
 * rather than a screenshot of the page.
 */
export function TraceQrLabel({
  publicToken,
  batchCode,
  enterpriseName,
  originLabel,
  showPrintButton = true,
}: TraceQrLabelProps) {
  const { i18n } = useTranslation();
  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;
  const tr = (key: string, fallback: string): string => {
    const value = String(activeI18n.t(key) ?? '');
    return !value || value.includes(key) ? fallback : value;
  };

  // The address the label falls back to if the code is damaged. Derived from where the user
  // actually is; the printed code itself encodes the backend's configured base URL.
  const traceUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/trace/${publicToken}`;

  return (
    <div className="space-y-3" data-testid="trace-qr-label">
      <div
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-background p-6 text-center print:border-0 print:p-0"
        data-testid="trace-qr-printable"
      >
        <TraceQrCode publicToken={publicToken} size={224} />

        <div className="space-y-1">
          {enterpriseName && (
            <p className="text-base font-semibold text-foreground print:text-black">
              {enterpriseName}
            </p>
          )}
          {batchCode && (
            <p className="font-mono text-sm text-foreground print:text-black break-all">
              {tr('trace.qrBatch', 'Batch')} {batchCode}
            </p>
          )}
          {originLabel && (
            <p className="text-sm text-muted-foreground print:text-black">{originLabel}</p>
          )}
          <p className="text-xs text-muted-foreground print:text-black break-all">{traceUrl}</p>
        </div>
      </div>

      {showPrintButton && (
        <button
          type="button"
          onClick={() => window.print()}
          data-testid="trace-qr-print"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium touch-target cursor-pointer hover:bg-muted print:hidden"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          {tr('trace.qrPrint', 'Print label')}
        </button>
      )}
    </div>
  );
}

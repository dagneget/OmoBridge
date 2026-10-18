import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import type {
  BookingResponse,
  OrderDetailResponse,
  ProductPriceBreakdownResponse,
} from '../../types/api';
import { formatETB } from '../../utils/formatters';
import en from './locales/en.json';
import am from './locales/am.json';

// Keep this component's strings separate from the locale files used by page work.
i18n.addResourceBundle('en', 'pricing', en, true, true);
i18n.addResourceBundle('am', 'pricing', am, true, true);

type PriceSource =
  | { kind: 'product'; data: ProductPriceBreakdownResponse | null; currency: string }
  | { kind: 'booking'; data: BookingResponse | null }
  | { kind: 'order'; data: OrderDetailResponse | null };

export type PriceBreakdownProps = PriceSource & {
  isLoading?: boolean;
  hasError?: boolean;
  isOffline?: boolean;
  className?: string;
  /** A translated, unique heading when multiple breakdowns share one page. */
  title?: string;
};

type Label = keyof typeof en;
type Row = { label: Label; amount: number | undefined };

export function PriceBreakdown(props: PriceBreakdownProps) {
  const { t } = useTranslation('pricing');
  const headingId = useId();
  const text = (key: Label) => t(key, { fallbackLng: ['am', 'en'] });
  const data = props.data;
  const currency = props.kind === 'product' ? props.currency : props.data?.currency;
  const money = (amount: number | undefined) =>
    typeof amount === 'number' && Number.isFinite(amount) && currency?.trim()
      ? formatETB(amount, { currencyCode: currency })
      : text('unavailable');
  const rows: Row[] = [];
  let total: number | undefined;
  let items: { label: string; amount: number | undefined }[] = [];

  if (props.kind === 'product' && props.data) {
    const product = props.data;
    rows.push(
      { label: 'purchaseCost', amount: product.purchaseCost },
      { label: 'processingCost', amount: product.processingCost },
      { label: 'packagingCost', amount: product.packagingCost },
      { label: 'laborCost', amount: product.laborCost },
      { label: 'transportCost', amount: product.transportCost },
      { label: 'enterpriseMargin', amount: product.enterpriseMargin },
      { label: 'communityFund', amount: product.communityFund },
      { label: 'tax', amount: product.taxAmount },
      { label: 'platformFee', amount: product.platformFee }
    );
    total = product.totalPrice;
  } else if (props.kind === 'booking' && props.data) {
    const booking = props.data;
    rows.push(
      { label: 'subtotal', amount: booking.subtotal },
      { label: 'tax', amount: booking.taxAmount },
      { label: 'bookingFee', amount: booking.feeAmount }
    );
    items = (booking.items ?? []).map((item) => ({
      label: item.itemNameSnapshot || text('item'),
      amount: item.lineTotal,
    }));
    total = booking.totalAmount;
  } else if (props.kind === 'order' && props.data) {
    const order = props.data;
    rows.push(
      { label: 'subtotal', amount: order.subtotal },
      { label: 'tax', amount: order.tax },
      { label: 'platformFee', amount: order.platformFee },
      { label: 'deliveryFee', amount: order.deliveryFee }
    );
    items = (order.items ?? []).map((item) => ({
      label: item.productName || text('item'),
      amount: item.lineTotal,
    }));
    total = order.totalAmount;
  }

  const visibleRows = rows.filter((row) => row.amount != null);
  const empty = !data || (visibleRows.length === 0 && items.length === 0 && total == null);
  return (
    <section
      aria-labelledby={headingId}
      aria-busy={props.isLoading || undefined}
      className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${props.className ?? ''}`}
    >
      <h2 id={headingId} className="mb-4 text-lg font-semibold">
        {props.title ?? text('title')}
      </h2>
      {props.isLoading ? (
        <p role="status">{text('loading')}</p>
      ) : props.hasError ? (
        <p role="alert">{text('error')}</p>
      ) : empty ? (
        <p role="status">{text('empty')}</p>
      ) : (
        <>
          {props.isOffline && (
            <p role="status" className="mb-4 text-sm">
              {text('offline')}
            </p>
          )}
          {items.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 font-medium">{text('items')}</h3>
              <dl className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1"
                  >
                    <dt className="min-w-0 break-words [overflow-wrap:anywhere]">{item.label}</dt>
                    <dd className="ml-auto break-words text-right tabular-nums">
                      {money(item.amount)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <dl className="space-y-3">
            {visibleRows.map((row) => (
              <div key={row.label} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt>{text(row.label)}</dt>
                <dd className="ml-auto text-right tabular-nums">{money(row.amount)}</dd>
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-slate-200 pt-3 font-semibold dark:border-slate-700">
              <dt>{text('total')}</dt>
              <dd className="ml-auto text-right tabular-nums">{money(total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{text('notice')}</p>
        </>
      )}
    </section>
  );
}

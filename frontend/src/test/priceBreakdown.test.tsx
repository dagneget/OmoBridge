import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import i18n from '../i18n';
import { PriceBreakdown } from '../components/pricing';
import type {
  BookingResponse,
  OrderDetailResponse,
  ProductPriceBreakdownResponse,
} from '../types/api';

function valueFor(label: string) {
  return within(screen.getByText(label, { selector: 'dt' }).parentElement!).getByRole('definition');
}

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});

describe('Price transparency (F-507)', () => {
  it('renders product costs, zero fees and the supplied total without summing components', () => {
    const data: ProductPriceBreakdownResponse = {
      purchaseCost: 100,
      processingCost: 20,
      communityFund: 4,
      platformFee: 0,
      taxAmount: 5,
      totalPrice: 999.99,
    };
    render(<PriceBreakdown kind="product" currency="ETB" data={data} />);
    expect(valueFor('Producer purchase cost')).toHaveTextContent('100.00 ETB');
    expect(valueFor('Platform fee')).toHaveTextContent('0.00 ETB');
    expect(valueFor('Total')).toHaveTextContent('999.99 ETB');
    expect(screen.queryByText('Delivery fee')).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('renders order item snapshots and supplied fees without multiplying quantity or deriving total', () => {
    const data: OrderDetailResponse = {
      currency: 'USD',
      subtotal: 100,
      tax: 10,
      platformFee: 3,
      deliveryFee: 12,
      totalAmount: 456.78,
      items: [{ productName: 'Honey', quantity: 7, unitPrice: 2, lineTotal: 100 }],
    };
    render(<PriceBreakdown kind="order" data={data} />);
    expect(valueFor('Honey')).toHaveTextContent('100.00 USD');
    expect(valueFor('Delivery fee')).toHaveTextContent('12.00 USD');
    expect(valueFor('Total')).toHaveTextContent('456.78 USD');
  });

  it('keeps booking fees distinct from platform fees', () => {
    const data: BookingResponse = {
      currency: 'ETB',
      subtotal: 120,
      feeAmount: 7,
      taxAmount: 3,
      totalAmount: 130,
      items: [
        { itemNameSnapshot: 'Village visit', quantity: 2, unitPriceSnapshot: 60, lineTotal: 120 },
      ],
    };
    render(<PriceBreakdown kind="booking" data={data} />);
    expect(valueFor('Village visit')).toHaveTextContent('120.00 ETB');
    expect(valueFor('Booking fee')).toHaveTextContent('7.00 ETB');
    expect(screen.queryByText('Platform fee')).not.toBeInTheDocument();
  });

  it('does not substitute zero or calculate a missing total', () => {
    render(<PriceBreakdown kind="order" data={{ currency: 'ETB', subtotal: 120 }} />);
    expect(valueFor('Total')).toHaveTextContent('Unavailable');
    expect(screen.queryByText('Tax')).not.toBeInTheDocument();
  });

  it('does not turn nonfinite values or unknown currency into an ETB amount', () => {
    const { rerender } = render(
      <PriceBreakdown
        kind="order"
        data={{ currency: 'ETB', subtotal: NaN, totalAmount: Infinity }}
      />
    );
    expect(valueFor('Subtotal')).toHaveTextContent('Unavailable');
    expect(valueFor('Total')).toHaveTextContent('Unavailable');
    rerender(<PriceBreakdown kind="order" data={{ totalAmount: 50 }} />);
    expect(valueFor('Total')).toHaveTextContent('Unavailable');
    expect(screen.queryByText(/ETB/)).not.toBeInTheDocument();
  });

  it('preserves negative server adjustments and two decimal places', () => {
    render(
      <PriceBreakdown
        kind="product"
        currency="ETB"
        data={{ enterpriseMargin: -12.34, totalPrice: 1234.56 }}
      />
    );
    expect(valueFor('Community Hub margin')).toHaveTextContent('-12.34 ETB');
    expect(valueFor('Total')).toHaveTextContent('1,234.56 ETB');
  });

  it('provides loading, error, empty and offline states without exposing stale prices on errors', () => {
    const data: OrderDetailResponse = { currency: 'ETB', totalAmount: 42 };
    const { rerender } = render(<PriceBreakdown kind="order" data={data} isLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading price breakdown');
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    rerender(<PriceBreakdown kind="order" data={data} hasError />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    expect(screen.queryByText('42.00 ETB')).not.toBeInTheDocument();
    rerender(<PriceBreakdown kind="order" data={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('not available yet');
    rerender(<PriceBreakdown kind="order" data={{}} />);
    expect(screen.getByRole('status')).toHaveTextContent('not available yet');
    rerender(<PriceBreakdown kind="order" data={data} isOffline />);
    expect(screen.getByRole('status')).toHaveTextContent('Offline');
    expect(valueFor('Total')).toHaveTextContent('42.00 ETB');
  });

  it('uses Amharic and falls back to Amharic for unsupported languages', async () => {
    await i18n.changeLanguage('am');
    const { rerender } = render(
      <PriceBreakdown kind="product" currency="ETB" data={{ totalPrice: 50 }} />
    );
    expect(screen.getByRole('heading', { name: 'የዋጋ ዝርዝር' })).toBeInTheDocument();
    await i18n.changeLanguage('fr');
    rerender(<PriceBreakdown kind="product" currency="ETB" data={{ totalPrice: 50 }} />);
    expect(screen.getByRole('heading', { name: 'የዋጋ ዝርዝር' })).toBeInTheDocument();
  });

  it('has distinct accessible region names when rendered multiple times and no automated accessibility violations', async () => {
    const { container } = render(
      <main>
        <PriceBreakdown
          title="Order price breakdown"
          kind="order"
          data={{ currency: 'ETB', totalAmount: 42 }}
        />
        <PriceBreakdown
          title="Booking price breakdown"
          kind="booking"
          data={{ currency: 'ETB', totalAmount: 50 }}
        />
      </main>
    );
    const regions = [
      screen.getByRole('region', { name: 'Order price breakdown' }),
      screen.getByRole('region', { name: 'Booking price breakdown' }),
    ];
    expect(regions[0].getAttribute('aria-labelledby')).not.toBe(
      regions[1].getAttribute('aria-labelledby')
    );
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { mockCheckout, mockOrderConfirmation } from '../mocks/checkoutHandler';
import { mockUsers, createMockAuthResponse } from '../mocks/fixtures/users';
import type { CheckoutRequest } from '../types/api';
const payload: CheckoutRequest = {
  idempotencyKey: 'checkout-mock-test',
  items: [{ productId: 'ffffffff-ffff-4fff-8fff-000000000001', quantity: 1 }],
  deliveryAddress: 'Jinka market',
  deliveryPhone: '+251911000001',
};
function post(body: CheckoutRequest, authenticated = true) {
  return fetch('http://localhost/api/v1/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authenticated
        ? {
            Authorization: `Bearer ${createMockAuthResponse(mockUsers.buyer).accessToken}`,
          }
        : {}),
    },
    body: JSON.stringify(body),
  });
}
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
describe('Checkout MSW demo contract', () => {
  it('requires a known mock session', async () => {
    expect((await post(payload, false)).status).toBe(401);
  });
  it('returns the typed fixed demo confirmation and replays it for the same action', async () => {
    const first = await post(payload);
    expect(first.status).toBe(201);
    expect((await first.json()).data).toEqual(mockCheckout);
    const retry = await post({
      ...payload,
      deliveryAddress: 'Changed address ignored by idempotent replay',
    });
    expect((await retry.json()).data).toEqual(mockCheckout);
  });
  it('returns generated order details only to a session with a completed demo checkout', async () => {
    await post({ ...payload, idempotencyKey: 'result-demo-test' });
    const url = `http://localhost/api/v1/orders/${mockOrderConfirmation.orderId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${createMockAuthResponse(mockUsers.buyer).accessToken}`,
      },
    });
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(mockOrderConfirmation);
    expect(
      (
        await fetch(url, {
          headers: {
            Authorization: `Bearer ${createMockAuthResponse(mockUsers.guide).accessToken}`,
          },
        })
      ).status,
    ).toBe(404);
    expect((await fetch(url)).status).toBe(401);
  });
  it('lists only the current account’s completed demo checkout, with snapshot detail and no invented payment', async () => {
    await post({ ...payload, idempotencyKey: 'my-orders-demo' });
    const buyerHeaders = {
      Authorization: `Bearer ${createMockAuthResponse(mockUsers.buyer).accessToken}`,
    };
    const guideHeaders = {
      Authorization: `Bearer ${createMockAuthResponse(mockUsers.guide).accessToken}`,
    };
    const list = await fetch('http://localhost/api/v1/orders', {
      headers: buyerHeaders,
    });
    expect((await list.json()).data).toEqual(mockCheckout.orders);
    const other = await fetch('http://localhost/api/v1/orders', {
      headers: guideHeaders,
    });
    expect((await other.json()).data).toEqual([]);
    expect(
      (
        await fetch(
          `http://localhost/api/v1/payments/order/${mockOrderConfirmation.orderId}`,
          { headers: buyerHeaders },
        )
      ).status,
    ).toBe(404);
  });
  it('rejects unsupported demo carts explicitly rather than inventing their totals', async () => {
    const response = await post({
      ...payload,
      idempotencyKey: 'unsupported-cart',
      items: [{ ...payload.items[0], quantity: 2 }],
    });
    expect(response.status).toBe(422);
  });
});

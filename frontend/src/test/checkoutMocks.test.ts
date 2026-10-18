import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { server } from '../mocks/server';
import { mockCheckout } from '../mocks/checkoutHandler';
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
  it('rejects unsupported demo carts explicitly rather than inventing their totals', async () => {
    const response = await post({
      ...payload,
      idempotencyKey: 'unsupported-cart',
      items: [{ ...payload.items[0], quantity: 2 }],
    });
    expect(response.status).toBe(422);
  });
});

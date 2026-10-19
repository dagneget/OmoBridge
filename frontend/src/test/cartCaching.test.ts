import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

describe('Built service worker cart revalidation routing', () => {
  it('sends fresh cart checks to NetworkOnly before the public stale cache rule', () => {
    type Route = { method?: string; match: unknown; strategy: { kind: string } | undefined };
    const routes: Route[] = [];
    const workbox = new Proxy({}, {
      get: (_, name) => name === 'registerRoute'
        ? (match: unknown, strategy: Route['strategy'], method?: string) => routes.push({ match, strategy, method })
        : function () { return { kind: String(name) }; },
    });
    const define = (_deps: string[], factory: (api: object) => void) => factory(workbox);
    const code = fs.readFileSync(path.resolve(__dirname, '../../dist/sw.js'), 'utf8');
    vm.runInNewContext(code, { define, self: { define, addEventListener() {}, skipWaiting() {}, clients: { claim() {} } } });
    function strategyFor(pathname: string, cache: RequestCache, cacheControl?: string, method = 'GET') {
      const input = { url: new URL(`http://localhost:8080${pathname}`), request: { method, cache, headers: new Headers(cacheControl ? { 'Cache-Control': cacheControl } : {}) } };
      return routes.find(({ match, method: routeMethod }) => (routeMethod ?? 'GET') === method && typeof match === 'function' && match(input))?.strategy?.kind;
    }
    expect(strategyFor('/api/v1/public/products/product-id', 'default', 'no-cache')).toBe('NetworkOnly');
    expect(strategyFor('/api/v1/public/products/product-id', 'no-store')).toBe('NetworkOnly');
    expect(strategyFor('/api/v1/public/products/product-id', 'default')).toBe('StaleWhileRevalidate');
    expect(strategyFor('/api/v1/orders/order-id', 'default')).toBe('NetworkOnly');
    expect(strategyFor('/api/v1/checkout', 'default')).toBe('NetworkOnly');
    expect(strategyFor('/api/v1/checkout', 'default', undefined, 'POST')).toBe('NetworkOnly');
    expect(strategyFor('/api/v1/auth/me', 'no-store')).toBe('NetworkOnly');
  });
});

import type { Plugin } from 'vite';

export function productionPolicy(apiBase: string): string {
  let connect = "'self'";
  if (apiBase !== '/') {
    const api = new URL(apiBase);
    if (
      !['http:', 'https:'].includes(api.protocol) ||
      api.username ||
      api.password ||
      api.search ||
      api.hash
    ) {
      throw new Error(
        'VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query or fragment, or /',
      );
    }
    connect += ` ${api.origin}`;
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-src 'none'",
  ].join('; ');
}

// Build-only: Vite HMR and local Figma previews keep their existing development behavior.
export function securityBuildPlugin(): Plugin {
  let policy = '';
  return {
    name: 'omobridge-production-security',
    apply: 'build',
    configResolved(config) {
      policy = productionPolicy(
        config.env.VITE_API_BASE_URL || 'http://localhost:8080',
      );
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: `/*\n  Content-Security-Policy: ${policy}; frame-ancestors 'self'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(self), geolocation=(self), microphone=()\n`,
      });
    },
  };
}

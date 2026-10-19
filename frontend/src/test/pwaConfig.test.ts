import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Manifest & Caching Rules (F-105 & F-106)', () => {
  const distDir = path.resolve(__dirname, '../../dist');
  const manifestPath = path.join(distDir, 'manifest.webmanifest');
  const swPath = path.join(distDir, 'sw.js');

  it('generates a valid web manifest with standalone display, theme color, and icons', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe('Kinka - South Omo Digital Platform');
    expect(manifest.short_name).toBe('Kinka');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#047857');
    expect(manifest.background_color).toBe('#f8fafc');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.lang).toBe('en');

    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    const has192 = manifest.icons.some(
      (icon: { sizes: string; src: string }) => icon.sizes === '192x192' && icon.src.includes('192')
    );
    const has512 = manifest.icons.some(
      (icon: { sizes: string; src: string }) => icon.sizes === '512x512' && icon.src.includes('512')
    );
    const hasMaskable = manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === 'maskable'
    );

    expect(has192).toBe(true);
    expect(has512).toBe(true);
    expect(hasMaskable).toBe(true);
  });

  it('implements Workbox caching rules in the service worker', () => {
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, 'utf-8');

    // Navigation fallback denylist for /api
    expect(swContent).toContain('/^\\/api/');

    // Private routes use NetworkOnly
    expect(swContent).toContain('NetworkOnly');
    expect(swContent).toContain('/api/v1/auth');
    expect(swContent).toContain('/api/v1/payments');
    expect(swContent).toContain('/api/v1/orders');
    expect(swContent).toContain('/api/v1/delivery');

    // Public GET content uses StaleWhileRevalidate
    expect(swContent).toContain('StaleWhileRevalidate');
    expect(swContent).toContain('public-api-cache');
    expect(swContent).toContain('/api/v1/public/products');

    // Media assets use CacheFirst
    expect(swContent).toContain('CacheFirst');
    expect(swContent).toContain('media-assets-cache');
  });
});

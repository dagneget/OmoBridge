// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkProductionSecurity } from '../../scripts/check-production-security.mjs';
const fixtures: string[] = [];
async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'omobridge-security-'));
  fixtures.push(dir);
  await writeFile(
    path.join(dir, 'index.html'),
    '<meta http-equiv="Content-Security-Policy" content="script-src &#39;self&#39;">',
  );
  await writeFile(
    path.join(dir, '_headers'),
    "Content-Security-Policy: frame-ancestors 'self'\nX-Content-Type-Options: nosniff",
  );
  return dir;
}
async function check(dir: string) {
  const result = await checkProductionSecurity(dir);
  return {
    status: result.issues.length ? 1 : 0,
    output: result.issues.join('\n'),
  };
}
afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
describe('production artifact security gate', () => {
  it('accepts a clean build with security policy artifacts', async () => {
    expect((await check(await fixture())).status).toBe(0);
  });
  it('rejects demo credentials without printing the matched token', async () => {
    const dir = await fixture();
    const token = 'mock-jwt-token-for-negative-security-canary';
    await writeFile(path.join(dir, 'bundle.js'), `const token = '${token}';`);
    const result = await check(dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain('mock credential');
    expect(result.output).not.toContain(token);
  });
  it('rejects published source maps', async () => {
    const dir = await fixture();
    await writeFile(path.join(dir, 'bundle.js.map'), '{}');
    expect((await check(dir)).output).toContain('published source map');
    expect((await check(dir)).status).toBe(1);
  });
  it('rejects private key literals without printing their content', async () => {
    const dir = await fixture();
    await writeFile(
      path.join(dir, 'bundle.js'),
      '-----BEGIN PRIVATE KEY-----\nprivate-canary-value',
    );
    const result = await check(dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain('private key');
    expect(result.output).not.toContain('private-canary-value');
  });
  it('rejects a script policy weakened with inline execution', async () => {
    const dir = await fixture();
    await writeFile(
      path.join(dir, 'index.html'),
      '<meta http-equiv="Content-Security-Policy" content="script-src &#39;self&#39; &#39;unsafe-inline&#39;">',
    );
    expect((await check(dir)).output).toContain(
      'Unsafe production script policy',
    );
    expect((await check(dir)).status).toBe(1);
  });
  it('rejects a missing content security policy', async () => {
    const dir = await fixture();
    await writeFile(path.join(dir, 'index.html'), '<html></html>');
    expect((await check(dir)).output).toContain('Missing production CSP');
    expect((await check(dir)).status).toBe(1);
  });
});

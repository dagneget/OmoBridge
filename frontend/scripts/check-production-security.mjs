import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(path.join(dir, entry.name))
          : path.join(dir, entry.name),
      ),
    )
  ).flat();
}
export async function checkProductionSecurity(root) {
  const paths = await files(root);
  const issues = [];
  const html = (
    await readFile(path.join(root, 'index.html'), 'utf8')
  ).replaceAll('&#39;', "'");
  const headers = await readFile(path.join(root, '_headers'), 'utf8');
  const policy = html.match(
    /<meta\b(?=[^>]*http-equiv="Content-Security-Policy")[^>]*\bcontent="([^"]*)"[^>]*>/i,
  )?.[1];
  const script = policy
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('script-src '));
  if (!policy) issues.push('Missing production CSP');
  else if (script !== "script-src 'self'")
    issues.push('Unsafe production script policy');
  const headerPolicy = headers.match(
    /Content-Security-Policy:\s*([^\r\n]+)/i,
  )?.[1];
  const ancestors = headerPolicy
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('frame-ancestors '));
  if (ancestors !== "frame-ancestors 'self'" || !headers.includes('nosniff'))
    issues.push('Missing deployment security headers');
  for (const file of paths) {
    if (file.endsWith('.map'))
      issues.push(`${path.relative(root, file)}: published source map`);
    if (!/\.(?:js|html|json|css|txt)$/.test(file)) continue;
    const text = await readFile(file, 'utf8');
    for (const [name, pattern] of [
      ['mock credential', /mock-jwt-token-for-|Password123!/],
      ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
      ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
      [
        'JWT literal',
        /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\b/,
      ],
      ['source map reference', /sourceMappingURL\s*=/],
    ])
      if (pattern.test(text))
        issues.push(`${path.relative(root, file)}: ${name}`);
  }
  return { files: paths.length, issues };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const root = process.argv[2]
      ? path.resolve(process.argv[2])
      : fileURLToPath(new URL('../dist/', import.meta.url));
    const result = await checkProductionSecurity(root);
    // Only labels and paths are emitted. Never print a matched credential.
    if (result.issues.length) throw new Error(result.issues.join('\n'));
    console.log(
      `Production security artifact checks passed (${result.files} files).`,
    );
  } catch (error) {
    console.error(
      error instanceof Error && error.message.includes('ENOENT')
        ? 'Build the frontend before checking its production security artifacts.'
        : error.message,
    );
    process.exitCode = 1;
  }
}

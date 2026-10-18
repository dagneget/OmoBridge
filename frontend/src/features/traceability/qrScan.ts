/**
 * QR scanning for the public trace flow (F-702).
 *
 * The logic lives here, away from React and away from the camera, so it can be tested without a
 * device: jsdom has neither `navigator.mediaDevices` nor `BarcodeDetector`, and a real scan
 * cannot be driven from a test.
 *
 * ## Why there is a manual path
 * `BarcodeDetector` ships in Chromium and on Android Chrome, but not in Safari or Firefox, and
 * no fallback decoder library is installed (`jsqr`/`@zxing/browser` are absent — logged as gap
 * F-702-E1, package files belong to Codex). Shipping a camera-only scanner would therefore mean
 * "works on some phones and nowhere else". Entering the code by hand needs no dependency at all,
 * so it is always offered rather than only as an error state.
 */

/**
 * The shape of the W3C `BarcodeDetector` this code uses. Declared locally because the type is
 * not in TypeScript's DOM lib yet.
 */
export interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
}

export type BarcodeDetectorCtor = new (options: { formats?: string[] }) => BarcodeDetectorLike;

/** Longest scanned string treated as a trace token; anything larger is not one. */
const MAX_TOKEN_LENGTH = 128;

/**
 * Turn whatever the camera read into the token the trace route expects, or `null` if it is not
 * a trace code at all.
 *
 * Accepts the three shapes a scanner can produce: an absolute URL (what the QR on packaging
 * actually encodes), the `/trace/{token}` path, and a bare token. A string that is none of those
 * is rejected here rather than passed to the API — a Wi-Fi or vCard code should not become a
 * network request.
 */
export function resolveTraceTarget(scanned: string | null | undefined): string | null {
  if (typeof scanned !== 'string') return null;
  const value = scanned.trim();
  if (!value || value.length > MAX_TOKEN_LENGTH) return null;
  if (/\s/.test(value)) return null; // multi-word text is prose, not a code

  // Absolute URL: take its path and handle it below.
  if (/^https?:\/\//i.test(value)) {
    try {
      const pathname = new URL(value).pathname;
      return resolveTraceTarget(pathname);
    } catch {
      return null;
    }
  }

  const pathMatch = /^\/trace\/([^/?#]+)\/?$/i.exec(value);
  if (pathMatch) return decodeToken(pathMatch[1]);

  // A bare token: no path separators, and none of the punctuation that marks a structured QR
  // payload (`WIFI:`, `MAILTO:`, `tel:` and friends all carry a colon, and vCard/Wi-Fi add `;`).
  // `ProductionBatchService` mints tokens from `UUID.randomUUID()` plus a hex timestamp, so
  // letters, digits, `-` and `_` are all a real token can contain.
  //
  // Rejecting here matters for more than tidiness: passing junk through would navigate the user
  // to a dead trace page for something that was never a product code.
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const token = decodeToken(value);
  return token.length > 0 && token.length <= MAX_TOKEN_LENGTH ? token : null;
}

function decodeToken(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    // A malformed percent-escape is a damaged code, not a crash.
    return raw.trim();
  }
}

/** True when the browser can decode a code from the camera without a bundled library. */
export function isBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export type CameraFailure =
  /** The person said no, or has previously said no for this site. */
  | 'denied'
  /** No camera on this device, or none that satisfies the constraints. */
  | 'unavailable'
  /** `getUserMedia` needs HTTPS; the page is on plain HTTP. */
  | 'insecure'
  | 'unknown';

/**
 * Classify a `getUserMedia` rejection. These error names are specified, so they are stable
 * across browsers, unlike the message text — which is why nothing here reads `error.message`
 * for anything user-facing.
 */
export function cameraFailureOf(error: unknown): CameraFailure {
  if (error && typeof error === 'object' && 'name' in error) {
    switch (String((error as { name?: string }).name)) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
      case 'SecurityError':
        return 'denied';
      case 'NotFoundError':
      case 'OverconstrainedError':
      case 'NotReadableError':
        return 'unavailable';
      default:
        break;
    }
  }
  return 'unknown';
}

/** `getUserMedia` is unavailable outside a secure context. */
export function isCameraAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

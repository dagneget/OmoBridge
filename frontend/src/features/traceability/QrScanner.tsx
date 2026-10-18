import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, CameraOff, ScanLine, KeyRound } from 'lucide-react';

import defaultI18n from '../../i18n';
import {
  cameraFailureOf,
  isBarcodeDetectorSupported,
  isCameraAvailable,
  resolveTraceTarget,
  type BarcodeDetectorCtor,
  type BarcodeDetectorLike,
  type CameraFailure,
} from './qrScan';

/**
 * F-702: scan a product's code and open its trace page.
 *
 * Two independent ways in, because neither can cover everyone:
 *
 * - **Camera**, via the native `BarcodeDetector`. No bundled decoder is needed, but the API
 *   exists only in Chromium and Android Chrome. Where it is missing — Safari, Firefox, any
 *   desktop without one — the camera button is not offered at all rather than failing on click.
 *   (A fallback library would close that gap; see F-702-E1.)
 * - **Typing the code**, which needs no camera, no permission and no decoder, and is therefore
 *   always shown rather than only after a camera error.
 *
 * The component never decides *where* a token goes — it hands the resolved token to `onResolved`
 * — so the same scanner can be reused by any screen that wants a trace code.
 */

export interface QrScannerProps {
  /** Called with the trace token once a code is read or typed. */
  onResolved: (token: string) => void;
  className?: string;
}

type ScanState = 'idle' | 'starting' | 'scanning' | 'failed';

/**
 * Run `fn` on the next frame, and return the matching cancellation.
 *
 * Falls back to a timer because `requestAnimationFrame` only exists in jsdom when it is built
 * with `pretendToBeVisual`, and this repo's Vite config does not ask for that. The loop must not
 * depend on a shared config file for that reason — and the fallback is what a background tab
 * gets too, where a frame may never be scheduled at all.
 */
function schedule(fn: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(fn, 50);
  return () => clearTimeout(id);
}

export function QrScanner({ onResolved, className = '' }: QrScannerProps) {
  const { i18n } = useTranslation();
  const activeI18n = i18n?.isInitialized ? i18n : defaultI18n;
  const tr = (key: string, fallback: string): string => {
    const value = String(activeI18n.t(key) ?? '');
    return !value || value.includes(key) ? fallback : value;
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const cancelFrameRef = useRef<(() => void) | null>(null);
  const stoppedRef = useRef(false);

  const [state, setState] = useState<ScanState>('idle');
  const [failure, setFailure] = useState<CameraFailure | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState(false);

  const detectorSupported = isBarcodeDetectorSupported();
  const cameraAvailable = isCameraAvailable();

  const stopCamera = useCallback(() => {
    stoppedRef.current = true;
    cancelFrameRef.current?.();
    cancelFrameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;
    setState('idle');
  }, []);

  // Detach the camera on unmount: a live stream keeps the indicator lit and the battery down.
  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (!detectorSupported) {
      setFailure('unavailable');
      return;
    }
    setState('starting');
    setFailure(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
      const detector = new Ctor({ formats: ['qr_code'] });
      detectorRef.current = detector;

      const video = videoRef.current;
      if (!video) throw new Error('Video element missing');
      video.srcObject = stream;
      // jsdom and some browsers return undefined from play() rather than a Promise.
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(() => undefined);
      }

      stoppedRef.current = false;
      setState('scanning');

      const tick = async () => {
        if (stoppedRef.current) return;
        try {
          const results = await detector.detect(video);
          const raw = results[0]?.rawValue;
          const token = resolveTraceTarget(raw);
          if (token) {
            stopCamera();
            onResolved(token);
            return;
          }
          // Not a trace code — keep scanning silently. Announcing every mismatch would be noise.
        } catch {
          // A transient detect failure (e.g. the video is between frames) is not fatal.
        }
        cancelFrameRef.current = schedule(() => void tick());
      };
      cancelFrameRef.current = schedule(() => void tick());
    } catch (error) {
      setFailure(cameraFailureOf(error));
      setState('failed');
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [detectorSupported, onResolved, stopCamera]);

  const submitManual = (event: React.FormEvent) => {
    event.preventDefault();
    const token = resolveTraceTarget(manualValue);
    if (!token) {
      setManualError(true);
      return;
    }
    setManualError(false);
    setManualValue('');
    onResolved(token);
  };

  const failureMessage: Record<CameraFailure, string> = {
    denied: tr(
      'trace.cameraDenied',
      'Camera access was blocked. Allow it for this site in your browser settings, or type the code below.'
    ),
    unavailable: tr(
      'trace.cameraUnavailable',
      'No camera could be used here. Type the code below instead.'
    ),
    insecure: tr(
      'trace.cameraInsecure',
      'The camera needs a secure connection. Type the code below instead.'
    ),
    unknown: tr(
      'trace.cameraError',
      'The camera could not start. Type the code below instead.'
    ),
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="qr-scanner">
      {/* Manual entry is always present: it needs no camera, no permission and no decoder. */}
      <form onSubmit={submitManual} className="space-y-2" data-testid="qr-manual-form">
        <label htmlFor="trace-code-input" className="block text-sm font-medium text-foreground">
          {tr('trace.manualLabel', 'Enter the code from your label')}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="trace-code-input"
            value={manualValue}
            onChange={(event) => {
              setManualValue(event.target.value);
              if (manualError) setManualError(false);
            }}
            data-testid="qr-manual-input"
            aria-invalid={manualError || undefined}
            aria-describedby={manualError ? 'trace-code-error' : undefined}
            placeholder={tr('trace.manualPlaceholder', 'e.g. trace-honey-001')}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <button
            type="submit"
            data-testid="qr-manual-submit"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground touch-target cursor-pointer"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {tr('trace.manualSubmit', 'Trace it')}
          </button>
        </div>
        {manualError && (
          <p
            id="trace-code-error"
            role="alert"
            data-testid="qr-manual-error"
            className="text-sm text-destructive"
          >
            {tr(
              'trace.manualInvalid',
              'That does not look like a trace code. Check the label and try again.'
            )}
          </p>
        )}
      </form>

      {/* The camera path is only offered where it can actually work. */}
      {detectorSupported && cameraAvailable && (
        <div className="space-y-3">
          {state === 'scanning' || state === 'starting' ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  data-testid="qr-camera-video"
                  className="h-56 w-full object-cover"
                />
                {state === 'starting' && (
                  <p
                    role="status"
                    data-testid="qr-camera-starting"
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white"
                  >
                    {tr('trace.cameraStarting', 'Starting the camera…')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={stopCamera}
                data-testid="qr-camera-stop"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium touch-target cursor-pointer hover:bg-muted"
              >
                <CameraOff className="h-4 w-4" aria-hidden="true" />
                {tr('trace.cameraStop', 'Stop camera')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void startCamera()}
              data-testid="qr-camera-start"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium touch-target cursor-pointer hover:bg-muted"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {tr('trace.cameraStart', 'Scan with camera')}
            </button>
          )}
        </div>
      )}

      {state === 'failed' && failure && (
        <p
          role="alert"
          data-testid="qr-camera-error"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {failureMessage[failure]}
        </p>
      )}

      {/* Told plainly when the browser simply cannot do camera scanning. */}
      {!detectorSupported && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="qr-no-detector">
          <ScanLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {tr(
            'trace.noDetector',
            'This browser cannot read codes with the camera, so you can type the code above.'
          )}
        </p>
      )}
    </div>
  );
}

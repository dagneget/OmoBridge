import { useEffect, useRef, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
const DISMISSED_KEY = 'omobridge_install_dismissed';

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}
function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return (
    ios &&
    /Safari/.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent)
  );
}

export function usePwaInstall() {
  const [installed, setInstalled] = useState(
    () =>
      typeof window !== 'undefined' &&
      (Boolean((navigator as Navigator & { standalone?: boolean }).standalone) ||
        Boolean(window.matchMedia?.('(display-mode: standalone)').matches))
  );
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [available, setAvailable] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const busyRef = useRef(false);
  const dismissedRef = useRef(dismissed);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const media = window.matchMedia?.('(display-mode: standalone)');
    const onInstalled = () => {
      promptRef.current = null;
      setAvailable(false);
      setInstalled(true);
      setHasError(false);
    };
    const onDisplayMode = (event: MediaQueryListEvent) => {
      if (event.matches) onInstalled();
    };
    const onPrompt = (event: Event) => {
      if (
        dismissedRef.current ||
        media?.matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      )
        return;
      if (!('prompt' in event) || typeof event.prompt !== 'function' || !('userChoice' in event))
        return;
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
      setHasError(false);
      setAvailable(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media?.addEventListener?.('change', onDisplayMode);
    return () => {
      mounted.current = false;
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener?.('change', onDisplayMode);
    };
  }, []);

  const dismiss = () => {
    dismissedRef.current = true;
    promptRef.current = null;
    setAvailable(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      /* Storage is optional. */
    }
  };
  const install = async () => {
    const event = promptRef.current;
    if (!event || busyRef.current) return;
    // The event can only be used once; claim it before awaiting or rerendering.
    promptRef.current = null;
    busyRef.current = true;
    setIsPrompting(true);
    try {
      await event.prompt();
      await event.userChoice;
      if (mounted.current) setAvailable(false);
    } catch {
      if (mounted.current) {
        setAvailable(false);
        setHasError(true);
      }
    } finally {
      busyRef.current = false;
      if (mounted.current) setIsPrompting(false);
    }
  };
  return {
    isVisible: !installed && !dismissed && (available || isIosSafari() || hasError),
    canPrompt: available,
    isIos: isIosSafari(),
    isPrompting,
    hasError,
    dismiss,
    install,
  };
}

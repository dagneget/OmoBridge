import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-amber-600 text-white px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 shadow-sm animate-in fade-in"
      >
        <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>You are currently offline. You can browse cached content; online actions are disabled.</span>
      </div>
    );
  }

  if (wasOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-emerald-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 shadow-sm animate-in fade-in transition-opacity duration-300"
      >
        <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Internet connection restored.</span>
      </div>
    );
  }

  return null;
};

export default OfflineBanner;

import { useParams } from 'react-router-dom';

export default function LiveTrackingPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6" data-testid="live-tracking-page">
      <div>
        <h1 className="text-2xl font-bold">Live Delivery Tracking</h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time GPS transit monitoring across South Omo.
        </p>
      </div>
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <span className="text-xs text-slate-500 font-semibold uppercase">Tracking Number</span>
        <p className="font-mono text-base font-bold text-slate-800 dark:text-slate-100">{token || 'TRK-OMO-9876'}</p>
      </div>
    </div>
  );
}

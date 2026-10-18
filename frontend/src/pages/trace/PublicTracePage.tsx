import { useParams } from 'react-router-dom';

export default function PublicTracePage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" data-testid="public-trace-page">
      <div>
        <h1 className="text-2xl font-bold">Product Origin & Traceability Story</h1>
        <p className="text-sm text-slate-500 mt-1">
          Verifiable batch lineage from South Omo smallholders.
        </p>
      </div>
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Token</span>
        <p className="font-mono text-base font-bold text-emerald-900 dark:text-emerald-100">{token || 'TRACE-HONEY-001'}</p>
      </div>
    </div>
  );
}

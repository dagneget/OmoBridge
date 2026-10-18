export default function EnterpriseDashboardPage() {
  return (
    <div className="space-y-6" data-testid="enterprise-dashboard">
      <div>
        <h1 className="text-2xl font-bold">Enterprise Management Hub</h1>
        <p className="text-sm text-slate-500 mt-1">
          Oversee rural farmer suppliers, agricultural inventory, product listings, and tourism packages.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 uppercase">Registered Farmers</span>
          <p className="text-2xl font-bold mt-1 text-emerald-700">48</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 uppercase">Pending Deliveries</span>
          <p className="text-2xl font-bold mt-1 text-amber-600">6</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 uppercase">Active Lots</span>
          <p className="text-2xl font-bold mt-1 text-emerald-700">14</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 uppercase">Completed Batches</span>
          <p className="text-2xl font-bold mt-1 text-emerald-700">32</p>
        </div>
      </div>
    </div>
  );
}

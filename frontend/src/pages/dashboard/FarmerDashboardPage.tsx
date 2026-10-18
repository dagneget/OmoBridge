export default function FarmerDashboardPage() {
  return (
    <div className="space-y-6" data-testid="farmer-dashboard">
      <div>
        <h1 className="text-2xl font-bold font-ethiopic">የአርሶ አደር ዳሽቦርድ / Farmer Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track crop delivery receipts, verified weights, net payments, and USSD mobile money notifications.
        </p>
      </div>
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">USSD Fast Access: *844#</h3>
        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
          Check your crop balances without internet from any basic mobile phone by dialing *844#.
        </p>
      </div>
    </div>
  );
}

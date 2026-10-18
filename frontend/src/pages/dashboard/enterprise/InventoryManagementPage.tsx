import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Warehouse,
  History,
  Search,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  ChevronRight,
  MapPin,
  Tag,
  Scale,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { enterpriseService } from '../../../features/enterprise/enterpriseService';
import { queryKeys } from '../../../services/queryKeys';
import type {
  InventoryLotResponse,
  InventoryLocationRequest,
} from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? isoString : d.toLocaleDateString();
  } catch {
    return isoString;
  }
}

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? isoString : d.toLocaleString();
  } catch {
    return isoString;
  }
}

export default function InventoryManagementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  // Filters & Search state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Lot for Movement History Modal
  const [selectedLotForMovements, setSelectedLotForMovements] = useState<InventoryLotResponse | null>(null);

  // New Location Modal state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationForm, setLocationForm] = useState<InventoryLocationRequest>({
    name: '',
    locationType: 'WAREHOUSE',
    description: '',
  });
  const [locationFormError, setLocationFormError] = useState<string | null>(null);
  const [locationFormSuccess, setLocationFormSuccess] = useState<string | null>(null);

  // Queries
  const {
    data: lots = [],
    isLoading: lotsLoading,
    isError: lotsError,
    refetch: refetchLots,
  } = useQuery({
    queryKey: queryKeys.enterprise.lots(enterpriseId, statusFilter === 'ALL' ? undefined : statusFilter),
    queryFn: () =>
      enterpriseService.getEnterpriseLots(
        enterpriseId,
        statusFilter === 'ALL' ? undefined : statusFilter
      ),
  });

  const {
    data: locations = [],
    isLoading: locationsLoading,
    refetch: refetchLocations,
  } = useQuery({
    queryKey: queryKeys.enterprise.locations(enterpriseId),
    queryFn: () => enterpriseService.getLocations(enterpriseId),
  });

  const {
    data: movements = [],
    isLoading: movementsLoading,
    isError: movementsError,
  } = useQuery({
    queryKey: queryKeys.enterprise.movements(enterpriseId, selectedLotForMovements?.id || ''),
    queryFn: () =>
      selectedLotForMovements?.id
        ? enterpriseService.getLotMovements(enterpriseId, selectedLotForMovements.id)
        : Promise.resolve([]),
    enabled: !!selectedLotForMovements?.id,
  });

  // Create Location Mutation
  const createLocationMutation = useMutation({
    mutationFn: (data: InventoryLocationRequest) =>
      enterpriseService.createLocation(enterpriseId, data),
    onSuccess: (newLoc) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.locations(enterpriseId) });
      setLocationFormSuccess(`Storage location "${newLoc.name}" registered successfully.`);
      setLocationForm({ name: '', locationType: 'WAREHOUSE', description: '' });
      setTimeout(() => {
        setIsLocationModalOpen(false);
        setLocationFormSuccess(null);
      }, 1200);
    },
    onError: (err: any) => {
      setLocationFormError(
        err?.response?.data?.message || err?.message || 'Failed to create storage location.'
      );
    },
  });

  const handleCreateLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocationFormError(null);
    if (!locationForm.name.trim()) {
      setLocationFormError('Location name is required.');
      return;
    }
    createLocationMutation.mutate(locationForm);
  };

  // Distinct product types for filter
  const productOptions = useMemo(() => {
    const set = new Set<string>();
    lots.forEach((lot) => {
      if (lot.productTypeName) set.add(lot.productTypeName);
    });
    return Array.from(set).sort();
  }, [lots]);

  // Filtered Lots
  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      if (statusFilter !== 'ALL' && lot.status !== statusFilter) {
        return false;
      }
      if (locationFilter !== 'ALL' && lot.locationName !== locationFilter) {
        return false;
      }
      if (productFilter !== 'ALL' && lot.productTypeName !== productFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = lot.lotCode?.toLowerCase().includes(query) ?? false;
        const nameMatch = lot.productTypeName?.toLowerCase().includes(query) ?? false;
        const locMatch = lot.locationName?.toLowerCase().includes(query) ?? false;
        const gradeMatch = lot.grade?.toLowerCase().includes(query) ?? false;
        if (!codeMatch && !nameMatch && !locMatch && !gradeMatch) {
          return false;
        }
      }
      return true;
    });
  }, [lots, statusFilter, locationFilter, productFilter, searchQuery]);

  // Aggregate KPI stats
  const activeLotsCount = lots.filter((l) => l.status === 'ACTIVE').length;
  const depletedLotsCount = lots.filter((l) => l.status === 'DEPLETED' || Number(l.balanceQty) === 0).length;
  const totalStoredBalanceKg = lots
    .filter((l) => l.status === 'ACTIVE')
    .reduce((sum, l) => sum + (Number(l.balanceQty) || 0), 0);
  const locationCount = locations.length;

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setLocationFilter('ALL');
    setProductFilter('ALL');
    setSearchQuery('');
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        );
      case 'DEPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Clock className="w-3 h-3" />
            Depleted
          </span>
        );
      case 'QUARANTINED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            <AlertCircle className="w-3 h-3" />
            Quarantined
          </span>
        );
      case 'DISPOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
            <XCircle className="w-3 h-3" />
            Disposed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const getMovementBadge = (type?: string) => {
    switch (type) {
      case 'RECEIPT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <ArrowDownLeft className="w-3 h-3" />
            Receipt
          </span>
        );
      case 'CONSUMPTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <ArrowUpRight className="w-3 h-3" />
            Production
          </span>
        );
      case 'TRANSFER_IN':
      case 'TRANSFER_OUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Warehouse className="w-3 h-3" />
            {type === 'TRANSFER_IN' ? 'Transfer In' : 'Transfer Out'}
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Scale className="w-3 h-3" />
            Adjustment
          </span>
        );
      case 'DISPOSAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <XCircle className="w-3 h-3" />
            Disposal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {type || 'Movement'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-800 dark:text-slate-100">
      {/* Breadcrumb & Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-2" aria-label="Breadcrumb">
          <Link to="/dashboard/enterprise" className="hover:text-emerald-700 dark:hover:text-emerald-400">
            Enterprise Dashboard
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Inventory & Storage Lots</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-700 dark:text-emerald-400">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Inventory Lots & Movements
                </h1>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {enterpriseName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Authoritative traceability lots received from harvest intakes, current storage balances, and movement audit history.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                refetchLots();
                refetchLocations();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Refresh inventory lots"
              data-testid="refresh-lots-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                setLocationFormError(null);
                setLocationFormSuccess(null);
                setIsLocationModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shadow-sm transition-colors"
              data-testid="add-location-btn"
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>Add Location</span>
            </button>

            <Link
              to="/dashboard/enterprise/supply"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Supply Intake</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="inventory-kpi-summary">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-700 dark:text-emerald-400">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white" data-testid="kpi-active-lots">
              {lotsLoading ? '—' : activeLotsCount}
            </div>
            <div className="text-[11px] text-slate-500">Active Storage Lots</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-700 dark:text-blue-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white" data-testid="kpi-total-balance">
              {lotsLoading ? '—' : `${totalStoredBalanceKg.toLocaleString()} KG`}
            </div>
            <div className="text-[11px] text-slate-500">Stored Active Balance</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white" data-testid="kpi-depleted-lots">
              {lotsLoading ? '—' : depletedLotsCount}
            </div>
            <div className="text-[11px] text-slate-500">Depleted / Closed Lots</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-700 dark:text-purple-400">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white" data-testid="kpi-locations-count">
              {locationsLoading ? '—' : locationCount}
            </div>
            <div className="text-[11px] text-slate-500">Storage Locations</div>
          </div>
        </div>
      </div>

      {/* Multi-facet Filters and Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Status Tab Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none" data-testid="status-filter-tabs">
            {['ALL', 'ACTIVE', 'DEPLETED', 'QUARANTINED', 'DISPOSED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                data-testid={`status-tab-${tab.toLowerCase()}`}
              >
                {tab === 'ALL' ? 'All Lots' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {(statusFilter !== 'ALL' || locationFilter !== 'ALL' || productFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 underline font-medium"
              data-testid="reset-filters-btn"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search lot code, commodity, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-testid="lots-search-input"
            />
          </div>

          <div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-testid="location-filter"
            >
              <option value="ALL">All Storage Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name} ({loc.locationType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-testid="product-filter"
            >
              <option value="ALL">All Commodities / Types</option>
              {productOptions.map((prod) => (
                <option key={prod} value={prod}>
                  {prod}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Inventory Lots Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Inventory Lots
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredLots.length} of {lots.length} registered batches
            </p>
          </div>
        </div>

        {lotsLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : lotsError ? (
          <div className="p-8 text-center space-y-3" data-testid="inventory-error-state">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Failed to load inventory lots from the enterprise service.
            </p>
            <button
              onClick={() => refetchLots()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800"
            >
              Retry
            </button>
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="p-12 text-center space-y-3" data-testid="empty-lots-state">
            <Boxes className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No inventory lots found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No lots match your current filter criteria. Try adjusting the search query or reset your filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="inventory-lots-table">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Lot Code</th>
                  <th className="py-3 px-4">Commodity & Grade</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4">Balance / Initial</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Intake Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLots.map((lot) => {
                  const balance = Number(lot.balanceQty) || 0;
                  const received = Number(lot.receivedQty) || 0;
                  const percent = received > 0 ? Math.min(100, Math.round((balance / received) * 100)) : 0;

                  return (
                    <tr
                      key={lot.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      data-testid={`lot-row-${lot.id}`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{lot.lotCode || 'LOT-N/A'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {lot.productTypeName || 'Raw Agricultural Item'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lot.grade || 'Standard Grade'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{lot.locationName || 'Unassigned Bay'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {balance.toLocaleString()} {lot.unit || 'KG'}
                            </span>
                            <span className="text-slate-400">
                              / {received.toLocaleString()} {lot.unit || 'KG'}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-32 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                percent > 50
                                  ? 'bg-emerald-600'
                                  : percent > 20
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(lot.status)}</td>

                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(lot.receivedAt || lot.createdAt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLotForMovements(lot)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                          data-testid={`view-movements-btn-${lot.id}`}
                          title="View movement history"
                        >
                          <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement Audit Drawer / Modal */}
      {selectedLotForMovements && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          data-testid="lot-movements-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {selectedLotForMovements.lotCode}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Movement Audit History
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  {selectedLotForMovements.productTypeName} · {selectedLotForMovements.grade} · Location: {selectedLotForMovements.locationName}
                </p>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 pt-1">
                  Current Balance: {Number(selectedLotForMovements.balanceQty).toLocaleString()} {selectedLotForMovements.unit || 'KG'}
                </div>
              </div>

              <button
                onClick={() => setSelectedLotForMovements(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                data-testid="close-movements-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Movements List */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3" data-testid="movements-timeline">
              {movementsLoading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : movementsError ? (
                <div className="py-6 text-center text-xs text-rose-600">
                  Failed to load movement audit trail for this lot.
                </div>
              ) : movements.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No recorded movements for this lot yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {movements.map((mov) => {
                    const qty = Number(mov.quantity) || 0;
                    const isPositive = qty > 0;

                    return (
                      <div
                        key={mov.id}
                        className="relative bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                        data-testid={`movement-item-${mov.id}`}
                      >
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-[27px] top-4 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                            isPositive ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getMovementBadge(mov.movementType)}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {mov.reason || 'Inventory movement'}
                            </span>
                          </div>
                          <span
                            className={`font-mono font-bold text-xs ${
                              isPositive
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {isPositive ? `+${qty}` : `${qty}`} {selectedLotForMovements.unit || 'KG'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <div>
                            Balance After:{' '}
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {Number(mov.balanceAfter).toLocaleString()} {selectedLotForMovements.unit || 'KG'}
                            </span>
                            {mov.referenceType && (
                              <span className="ml-2 px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Ref: {mov.referenceType}
                              </span>
                            )}
                          </div>
                          <div>{formatDateTime(mov.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLotForMovements(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {isLocationModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          data-testid="add-location-modal"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Storage Location
                </h3>
                <p className="text-xs text-slate-500">
                  Register a warehouse bay, cooling unit, or processing room
                </p>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocationSubmit} noValidate className="p-5 space-y-4 text-xs">
              {locationFormError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{locationFormError}</span>
                </div>
              )}

              {locationFormSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-lg text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{locationFormSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Turmi Central Warehouse Bay C"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-testid="location-name-input"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location Type *
                </label>
                <select
                  value={locationForm.locationType}
                  onChange={(e) => setLocationForm({ ...locationForm, locationType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-testid="location-type-select"
                >
                  <option value="WAREHOUSE">Warehouse Bay (Dry storage)</option>
                  <option value="COLD_STORAGE">Cold Storage (Refrigerated)</option>
                  <option value="PROCESSING_BAY">Processing / Sorting Bay</option>
                  <option value="DISTRIBUTION_HUB">Distribution Hub</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Operational Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Temperature-controlled dry pallets for packaged honey."
                  value={locationForm.description || ''}
                  onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-testid="location-desc-input"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLocationMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                  data-testid="submit-location-btn"
                >
                  {createLocationMutation.isPending ? 'Saving...' : 'Register Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

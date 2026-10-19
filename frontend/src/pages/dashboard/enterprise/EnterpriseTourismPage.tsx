import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Compass,
  PlusCircle,
  Search,
  RefreshCw,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Trash2,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { tourismService } from '../../../features/tourism/tourismService';
import { queryKeys } from '../../../services/queryKeys';
import { formatETB } from '../../../utils/formatters';
import type { TourPackageResponse, TourPackageRequest } from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

const PACKAGE_CATEGORIES = [
  'CULTURAL',
  'ECO_TOUR',
  'AGRO_TOURISM',
  'WORKSHOP',
  'RIVER_EXPEDITION',
];

export default function EnterpriseTourismPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TourPackageResponse | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('Keske Wild Honey Harvest Experience');
  const [formCategory, setFormCategory] = useState('AGRO_TOURISM');
  const [formOverview, setFormOverview] = useState(
    'Accompany certified Hamar beekeepers to highland forest apiaries, observe solar extraction, and taste raw wild honey directly from the comb.'
  );
  const [formStory, setFormStory] = useState(
    'Centuries of sustainable beekeeping with hanging logs and strict forest conservation ethics.'
  );
  const [formLocation, setFormLocation] = useState('Keske Village, near Turmi River');
  const [formDurationHours, setFormDurationHours] = useState('4');
  const [formMaxGroupSize, setFormMaxGroupSize] = useState('6');
  const [formPriceAmount, setFormPriceAmount] = useState('1500');
  const [formPriceUnit, setFormPriceUnit] = useState('PER_PERSON');
  const [formCulturalRules, setFormCulturalRules] = useState(
    'Photography requires explicit verbal consent from beekeepers; refrain from touching ceremonial hives; quiet observation during smoke induction.'
  );
  const [formSafetyNotes, setFormSafetyNotes] = useState(
    'Protective beekeeping veils provided. Mandatory accompaniment by certified local guide.'
  );
  const [formApprovalRef, setFormApprovalRef] = useState('ELDERS-COUNCIL-2026-KESKE-08');
  const [formIsActive, setFormIsActive] = useState(true);

  // 1. Fetch Tour Packages
  const {
    data: packages = [],
    isLoading: packagesLoading,
    refetch: refetchPackages,
  } = useQuery({
    queryKey: queryKeys.enterprise.tourismPackages(enterpriseId),
    queryFn: () => tourismService.getEnterprisePackages(enterpriseId),
  });

  // 2. Create Package Mutation
  const createPackageMutation = useMutation({
    mutationFn: (req: TourPackageRequest) => tourismService.createPackage(enterpriseId, req),
    onSuccess: (newPkg) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.tourismPackages(enterpriseId) });
      setModalOpen(false);
      setFeedbackSuccess(`Experience package "${newPkg.name}" successfully published!`);
      setTimeout(() => setFeedbackSuccess(null), 5000);
      refetchPackages();
    },
  });

  // 3. Update Package Mutation
  const updatePackageMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: TourPackageRequest }) =>
      tourismService.updatePackage(enterpriseId, id, req),
    onSuccess: (updatedPkg) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.tourismPackages(enterpriseId) });
      setModalOpen(false);
      setEditingPackage(null);
      setFeedbackSuccess(`Experience package "${updatedPkg.name}" updated!`);
      setTimeout(() => setFeedbackSuccess(null), 5000);
      refetchPackages();
    },
  });

  // 4. Delete Package Mutation
  const deletePackageMutation = useMutation({
    mutationFn: (id: string) => tourismService.deletePackage(enterpriseId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.tourismPackages(enterpriseId) });
      setFeedbackSuccess('Package removed successfully.');
      setTimeout(() => setFeedbackSuccess(null), 4000);
      refetchPackages();
    },
  });

  const openCreateModal = () => {
    setEditingPackage(null);
    setFormName('Keske Wild Honey Harvest Experience');
    setFormCategory('AGRO_TOURISM');
    setFormOverview(
      'Accompany certified Hamar beekeepers to highland forest apiaries, observe solar extraction, and taste raw wild honey directly from the comb.'
    );
    setFormStory('Centuries of sustainable beekeeping with hanging logs and strict forest conservation ethics.');
    setFormLocation('Keske Village, near Turmi River');
    setFormDurationHours('4');
    setFormMaxGroupSize('6');
    setFormPriceAmount('1500');
    setFormPriceUnit('PER_PERSON');
    setFormCulturalRules(
      'Photography requires explicit verbal consent from beekeepers; refrain from touching ceremonial hives; quiet observation during smoke induction.'
    );
    setFormSafetyNotes('Protective beekeeping veils provided. Mandatory accompaniment by certified local guide.');
    setFormApprovalRef('ELDERS-COUNCIL-2026-KESKE-08');
    setFormIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (pkg: TourPackageResponse) => {
    setEditingPackage(pkg);
    setFormName(pkg.name || '');
    setFormCategory(pkg.category || 'CULTURAL');
    setFormOverview(pkg.overview || '');
    setFormStory(pkg.story || '');
    setFormLocation(pkg.locationText || '');
    setFormDurationHours(String(pkg.durationHours || 4));
    setFormMaxGroupSize(String(pkg.maxGroupSize || 8));
    setFormPriceAmount(String(pkg.priceAmount || 1500));
    setFormPriceUnit(pkg.priceUnit || 'PER_PERSON');
    setFormCulturalRules(pkg.culturalRules || '');
    setFormSafetyNotes(pkg.safetyNotes || '');
    setFormApprovalRef(pkg.communityApprovalRef || 'ELDERS-COUNCIL-2026-KESKE-08');
    setFormIsActive(Boolean(pkg.isActive));
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formOverview.trim()) return;

    const req: TourPackageRequest = {
      name: formName.trim(),
      category: formCategory,
      overview: formOverview.trim(),
      story: formStory.trim(),
      locationText: formLocation.trim(),
      durationHours: parseFloat(formDurationHours) || 4,
      maxGroupSize: parseInt(formMaxGroupSize, 10) || 8,
      priceAmount: parseFloat(formPriceAmount) || 1500,
      priceUnit: formPriceUnit,
      currency: 'ETB',
      culturalRules: formCulturalRules.trim(),
      safetyNotes: formSafetyNotes.trim(),
      communityApprovalRef: formApprovalRef.trim(),
      isActive: formIsActive,
    };

    if (editingPackage) {
      updatePackageMutation.mutate({ id: editingPackage.id || '', req });
    } else {
      createPackageMutation.mutate(req);
    }
  };

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesCat = categoryFilter === 'ALL' || pkg.category === categoryFilter;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        (pkg.name && pkg.name.toLowerCase().includes(q)) ||
        (pkg.locationText && pkg.locationText.toLowerCase().includes(q)) ||
        (pkg.overview && pkg.overview.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [packages, categoryFilter, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="enterprise-tourism-page">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/dashboard/enterprise" className="hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-slate-200 font-semibold">Cultural Tourism Experiences</span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Cultural Experiences & Tourism Management
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Community Council Approved (B-303)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {enterpriseName} · Curate ethical cultural immersion tours, set availability, and manage community benefit agreements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => refetchPackages()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
              title="Refresh experiences"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="create-package-btn"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Cultural Experience</span>
            </button>
          </div>
        </div>

        {feedbackSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2" data-testid="tourism-feedback-banner">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackSuccess}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="tourism-kpi-grid">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Active Tour Packages</span>
            <Compass className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100" data-testid="kpi-total-packages">
            {packages.filter((p) => p.isActive).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Live on public portal</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Community Fund Rate</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
            10.0%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Allocated to village water & clinics</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Certified Local Guides</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            8 Guides
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Hamar & Mursi bilingual guides</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Council Approvals</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            100% Verified
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Elders council signed</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setCategoryFilter('ALL')}
            data-testid="filter-cat-ALL"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              categoryFilter === 'ALL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Experiences
          </button>
          {PACKAGE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              data-testid={`filter-cat-${cat}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative flex-1 md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            data-testid="search-packages-input"
            placeholder="Search experience name, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Packages Grid */}
      {packagesLoading ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading cultural experience packages...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500" data-testid="packages-empty-state">
          No cultural experiences found matching the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="packages-grid">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
              data-testid={`package-card-${pkg.id}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {(pkg.category || 'CULTURAL').replace('_', ' ')}
                  </span>
                  <span
                    data-testid={`package-status-${pkg.id}`}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      pkg.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white" data-testid={`package-title-${pkg.id}`}>
                  {pkg.name}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {pkg.overview}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{pkg.locationText}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{pkg.durationHours} hours</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Max {pkg.maxGroupSize} guests</span>
                  </span>
                </div>

                {/* Cultural Rules & Ethical Consent Box */}
                {pkg.culturalRules && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Cultural Guidelines:</span>
                    </div>
                    <p className="line-clamp-2">{pkg.culturalRules}</p>
                  </div>
                )}
              </div>

              {/* Price & Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Tariff</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white" data-testid={`package-price-${pkg.id}`}>
                    {formatETB(pkg.priceAmount)} <span className="text-[10px] font-normal text-slate-500">/ {pkg.priceUnit === 'PER_GROUP' ? 'group' : 'person'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/tourism/${pkg.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                    title="Public storefront preview"
                    data-testid={`preview-pkg-${pkg.id}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEditModal(pkg)}
                    data-testid={`edit-pkg-${pkg.id}`}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                    title="Edit package"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePackageMutation.mutate(pkg.id || '')}
                    data-testid={`delete-pkg-${pkg.id}`}
                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition"
                    title="Delete package"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Experience Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto" data-testid="package-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-600" />
                  <span>{editingPackage ? 'Edit Cultural Experience' : 'Create New Cultural Experience'}</span>
                </h3>
                <p className="text-xs text-slate-500">Define cultural guidelines, safety notes, and community approval records</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Experience Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    data-testid="pkg-name-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    data-testid="pkg-cat-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  >
                    {PACKAGE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Overview & Itinerary Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  data-testid="pkg-overview-input"
                  value={formOverview}
                  onChange={(e) => setFormOverview(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Location</label>
                  <input
                    type="text"
                    data-testid="pkg-location-input"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Duration (Hours)</label>
                  <input
                    type="number"
                    data-testid="pkg-duration-input"
                    value={formDurationHours}
                    onChange={(e) => setFormDurationHours(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Max Group Size</label>
                  <input
                    type="number"
                    data-testid="pkg-groupsize-input"
                    value={formMaxGroupSize}
                    onChange={(e) => setFormMaxGroupSize(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Price Amount (ETB) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    data-testid="pkg-price-input"
                    value={formPriceAmount}
                    onChange={(e) => setFormPriceAmount(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Price Unit</label>
                  <select
                    value={formPriceUnit}
                    onChange={(e) => setFormPriceUnit(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  >
                    <option value="PER_PERSON">Per Person</option>
                    <option value="PER_GROUP">Per Group</option>
                  </select>
                </div>
              </div>

              {/* Cultural Sensitivity & Approval Section */}
              <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Cultural Sensitivity & Community Ethics (B-303)</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Mandatory Cultural Rules (Photography, Conduct, Attire)
                  </label>
                  <textarea
                    rows={2}
                    data-testid="pkg-rules-input"
                    value={formCulturalRules}
                    onChange={(e) => setFormCulturalRules(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Safety Notes</label>
                    <input
                      type="text"
                      data-testid="pkg-safety-input"
                      value={formSafetyNotes}
                      onChange={(e) => setFormSafetyNotes(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Community Approval Reference
                    </label>
                    <input
                      type="text"
                      data-testid="pkg-approval-input"
                      value={formApprovalRef}
                      onChange={(e) => setFormApprovalRef(e.target.value)}
                      className="w-full text-xs p-2 font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pkg-active"
                  data-testid="pkg-active-checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                />
                <label htmlFor="pkg-active" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Publish experience to public tourism portal (/tourism)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-pkg-btn"
                  disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {editingPackage ? 'Save Changes' : 'Create Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

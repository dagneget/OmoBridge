import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Search,
  RefreshCw,
  Clock,
  Users,
  CheckCircle2,
  UserCheck,
  DollarSign,
  Phone,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth/authStore';
import { bookingService } from '../../../features/bookings/bookingService';
import { tourismService } from '../../../features/tourism/tourismService';
import { queryKeys } from '../../../services/queryKeys';
import { formatETB } from '../../../utils/formatters';
import type { BookingResponse, BookingStatusUpdateRequest } from '../../../types/api';

const DEMO_ENTERPRISE_ID = '33333333-3333-3333-3333-333333333333';

export default function EnterpriseBookingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const enterpriseId = user?.enterpriseId || DEMO_ENTERPRISE_ID;
  const enterpriseName = user?.enterpriseName || 'South Omo Community Heritage Cooperative';

  // Filters & State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REQUESTED' | 'CONFIRMED' | 'PAID' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [guideModalBooking, setGuideModalBooking] = useState<BookingResponse | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // 1. Fetch Enterprise Bookings
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: queryKeys.enterprise.bookings(enterpriseId),
    queryFn: () => bookingService.getEnterpriseBookings(enterpriseId),
  });

  // 2. Fetch Certified Local Guides
  const { data: guides = [] } = useQuery({
    queryKey: ['tourism', 'guides'],
    queryFn: () => tourismService.getGuides(),
  });

  // 3. Status Transition Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BookingStatusUpdateRequest }) =>
      bookingService.updateStatus(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enterprise.bookings(enterpriseId) });
      setFeedbackMessage(`Booking ${updated.bookingCode} transitioned to ${updated.status}.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      refetchBookings();
    },
  });

  // 4. Guide Assignment
  const handleAssignGuide = () => {
    if (!guideModalBooking || !selectedGuideId) return;
    const guide = guides.find((g) => g.id === selectedGuideId);
    // In our backend/client, status update can carry notes or guide link
    updateStatusMutation.mutate({
      id: guideModalBooking.id || '',
      payload: {
        status: (guideModalBooking.status || 'CONFIRMED') as any,
        notes: `Assigned certified local guide: ${guide?.fullName || 'Certified Guide'}`,
      },
    });
    setGuideModalBooking(null);
  };

  // KPI Calculations
  const requestedCount = bookings.filter((b) => b.status === 'REQUESTED').length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PAID').length;
  const completedCount = bookings.filter((b) => b.status === 'COMPLETED').length;
  const totalRevenue = bookings
    .filter((b) => b.status === 'PAID' || b.status === 'COMPLETED')
    .reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        (b.bookingCode && b.bookingCode.toLowerCase().includes(q)) ||
        (b.buyerName && b.buyerName.toLowerCase().includes(q)) ||
        (b.contactName && b.contactName.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [bookings, statusFilter, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="enterprise-bookings-page">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/dashboard/enterprise" className="hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-slate-200 font-semibold">Tourist Bookings</span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Tourism Bookings & Guide Assignments
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Capacity Managed (B-311)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {enterpriseName} · Review tourist reservations, verify local guides, and track community fund distributions
              </p>
            </div>
          </div>

          <button
            onClick={() => refetchBookings()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition self-start md:self-auto"
            title="Refresh bookings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {feedbackMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2" data-testid="booking-feedback-banner">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="bookings-kpi-grid">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Pending Confirmation</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400" data-testid="kpi-requested-bookings">
            {requestedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires cooperative acceptance</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Confirmed & Active</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100" data-testid="kpi-confirmed-bookings">
            {confirmedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled visitor arrivals</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Completed Tours</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {completedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ethical visits finalized</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Tourism Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400" data-testid="kpi-total-revenue">
            {formatETB(totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Coop earnings + community fund</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'REQUESTED', 'CONFIRMED', 'PAID', 'COMPLETED', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              data-testid={`filter-booking-${st}`}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative flex-1 md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            data-testid="search-bookings-input"
            placeholder="Search booking code, tourist name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Bookings Table */}
      {bookingsLoading ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading tourist bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500" data-testid="bookings-empty-state">
          No bookings match the selected filter criteria.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" data-testid="bookings-table">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Tourist & Contact</th>
                  <th className="py-3 px-4">Experience & Date</th>
                  <th className="py-3 px-4">Assigned Guide</th>
                  <th className="py-3 px-4">Total Amount (ETB)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition" data-testid={`booking-row-${b.id}`}>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {b.bookingCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white" data-testid={`tourist-name-${b.id}`}>
                        {b.contactName || b.buyerName || 'Tourist'}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        {b.contactPhone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {b.contactPhone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {b.items?.[0]?.itemNameSnapshot || 'Cultural Tour Package'}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{b.visitDate ? new Date(b.visitDate).toLocaleDateString() : 'Scheduled Date'}</span>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{b.partySize} guests</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {b.assignedGuideName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <UserCheck className="w-3 h-3" />
                          <span>{b.assignedGuideName}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setGuideModalBooking(b);
                            setSelectedGuideId(guides[0]?.id || '');
                          }}
                          data-testid={`assign-guide-btn-${b.id}`}
                          className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold underline hover:text-amber-700"
                        >
                          + Assign Guide
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {formatETB(b.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        data-testid={`booking-status-${b.id}`}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : b.status === 'PAID'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : b.status === 'CONFIRMED'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                            : b.status === 'REQUESTED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(b)}
                          data-testid={`view-booking-${b.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        >
                          Details
                        </button>

                        {/* State transitions */}
                        {b.status === 'REQUESTED' && (
                          <button
                            type="button"
                            data-testid={`confirm-booking-btn-${b.id}`}
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: b.id || '',
                                payload: { status: 'CONFIRMED' as any, notes: 'Confirmed by cooperative operator' },
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"
                          >
                            Confirm
                          </button>
                        )}

                        {b.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            data-testid={`mark-paid-btn-${b.id}`}
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: b.id || '',
                                payload: { status: 'PAID' as any, notes: 'Telebirr payment settled' },
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                          >
                            Mark Paid
                          </button>
                        )}

                        {b.status === 'PAID' && (
                          <button
                            type="button"
                            data-testid={`complete-booking-btn-${b.id}`}
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: b.id || '',
                                payload: { status: 'COMPLETED' as any, notes: 'Tour successfully completed' },
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guide Assignment Modal */}
      {guideModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" data-testid="assign-guide-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Assign Certified Local Guide</span>
            </h3>
            <p className="text-xs text-slate-500">
              Booking: <span className="font-mono font-bold">{guideModalBooking.bookingCode}</span>
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Approved Community Guide
              </label>
              <select
                data-testid="guide-select"
                value={selectedGuideId}
                onChange={(e) => setSelectedGuideId(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              >
                {guides.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.fullName} ({g.languages?.join(', ') || 'Hamar, English'}) - {formatETB(g.dailyRate)}/day
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuideModalBooking(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-assign-guide-btn"
                onClick={handleAssignGuide}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Assign Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" data-testid="booking-details-modal">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Booking Details · {selectedBooking.bookingCode}
                </h3>
                <span className="text-xs text-slate-500">Tourist: {selectedBooking.contactName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Special Requests & Dietary</div>
                <div className="text-slate-700 dark:text-slate-300 italic">
                  {selectedBooking.specialRequests || 'None provided'}
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Experience Package:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedBooking.items?.[0]?.itemNameSnapshot || 'Cultural Package'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Party Size:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedBooking.partySize} guests</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatETB(selectedBooking.subtotal)}</span>
                </div>
                <div className="py-2 flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Community Heritage Fund (Included):</span>
                  <span>{formatETB((selectedBooking.subtotal || 0) * 0.1)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-500">
                  <span>VAT & Platform Fee:</span>
                  <span>{formatETB((selectedBooking.taxAmount || 0) + (selectedBooking.feeAmount || 0))}</span>
                </div>
                <div className="pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                  <span>Total Settled:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatETB(selectedBooking.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

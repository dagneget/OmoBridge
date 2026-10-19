import React, { useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Users,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Compass,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  FormField,
  Checkbox,
  Skeleton,
  EmptyState,
} from '../../components/common';
import { tourismService } from '../../features/tourism/tourismService';
import { bookingService } from '../../features/bookings/bookingService';
import { AvailabilityPicker } from '../../features/bookings/components/AvailabilityPicker';
import { useAuthStore } from '../../features/auth/authStore';
import { formatCurrency } from '../../utils/formatters';
import { validateEthiopianPhone, normalizeEthiopianPhone } from '../../utils/phone';
import { generateIdempotencyKey } from '../../utils/idempotency';
import type { SessionResponse, TourPackageResponse, PriceBreakdownResponse } from '../../types/api';

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const packageId = searchParams.get('packageId') || '';

  // Form states
  const [selectedSession, setSelectedSession] = useState<SessionResponse | null>(null);
  const [partySize, setPartySize] = useState<number>(1);
  const [contactName, setContactName] = useState<string>(() => user?.fullName || '');
  const [contactPhone, setContactPhone] = useState<string>(() => user?.phoneNumber || '');
  const [contactEmail, setContactEmail] = useState<string>(() => user?.email || '');
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [rulesAcknowledged, setRulesAcknowledged] = useState<boolean>(false);

  // Validation & Submission states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Stable idempotency key per booking attempt
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  // Load package data
  const {
    data: pkg,
    isLoading: isPackageLoading,
    isError: isPackageError,
  } = useQuery<TourPackageResponse>({
    queryKey: ['tourism', 'package', packageId],
    queryFn: () => tourismService.getPackageById(packageId),
    enabled: Boolean(packageId),
  });

  // Calculate base price: priceAmount * partySize
  const baseAmount = (pkg?.priceAmount || 0) * partySize;

  // Server-side authoritative price calculation
  const {
    data: pricing,
    isLoading: isPricingLoading,
  } = useQuery<PriceBreakdownResponse>({
    queryKey: ['pricing', 'calculate', baseAmount, pkg?.enterpriseId],
    queryFn: () =>
      bookingService.calculatePricing(baseAmount, pkg?.enterpriseId, 'TOURISM'),
    enabled: Boolean(pkg && baseAmount > 0),
  });

  // Handle party size increment/decrement
  const maxGroup = pkg?.maxGroupSize || 20;
  const handlePartySizeChange = (newSize: number) => {
    if (newSize >= 1 && newSize <= maxGroup) {
      setPartySize(newSize);
      // Clear session selection if new party size exceeds current session available capacity
      if (
        selectedSession &&
        selectedSession.availableCapacity !== undefined &&
        selectedSession.availableCapacity < newSize
      ) {
        setSelectedSession(null);
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedSession) {
      newErrors.session = 'Please select an available session date and time';
    } else {
      if (selectedSession.status === 'CLOSED' || selectedSession.status === 'CANCELLED') {
        newErrors.session = 'The selected session is closed. Please choose another.';
      } else if (
        selectedSession.availableCapacity !== undefined &&
        selectedSession.availableCapacity < partySize
      ) {
        newErrors.session = `The selected session only has ${selectedSession.availableCapacity} spots remaining for your party of ${partySize}.`;
      }
    }

    if (!contactName.trim()) {
      newErrors.contactName = 'Contact name is required';
    }

    if (!contactPhone.trim()) {
      newErrors.contactPhone = 'Contact phone number is required';
    } else if (!validateEthiopianPhone(contactPhone)) {
      newErrors.contactPhone = 'Enter a valid Ethiopian phone number (+2519... or 09...)';
    }

    if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (!rulesAcknowledged) {
      newErrors.rules = 'You must acknowledge and agree to the cultural rules';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    if (!pkg || !selectedSession) return;

    setIsSubmitting(true);
    try {
      const payload = {
        enterpriseId: pkg.enterpriseId || '',
        sessionId: selectedSession.id,
        visitDate: selectedSession.sessionDate || new Date().toISOString().split('T')[0],
        partySize,
        contactName: contactName.trim(),
        contactPhone: normalizeEthiopianPhone(contactPhone),
        contactEmail: contactEmail.trim() || undefined,
        specialRequests: specialRequests.trim() || undefined,
        items: [
          {
            itemType: 'PACKAGE' as const,
            itemId: pkg.id || '',
            quantity: partySize,
          },
        ],
      };

      const booking = await bookingService.createBooking(
        payload,
        idempotencyKeyRef.current
      );

      navigate(`/booking/confirmation/${booking.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete booking';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!packageId) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          title="Select an Experience to Book"
          description="Please choose an authentic cultural experience or tour from our community catalog to begin your booking."
          action={<Button onClick={() => navigate('/tourism')}>Browse Experiences</Button>}
        />
      </div>
    );
  }

  if (isPackageLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 md:col-span-2 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isPackageError || !pkg) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Experience Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The experience package you requested could not be loaded or may no longer be available.
          </p>
          <Button onClick={() => navigate('/tourism')}>Return to Catalog</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      {/* Top Breadcrumb & Title */}
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <Link to="/tourism" className="hover:underline flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Experiences
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold truncate max-w-xs">{pkg.name}</span>
          <span>/</span>
          <span>Booking</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Book Cultural Experience
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Experience summary & Booking Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6" noValidate>
          {/* Experience Overview Summary Banner */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="w-3.5 h-3.5" /> {pkg.category || 'Cultural Tour'}
                </span>
                <h2 className="text-lg font-bold text-foreground">{pkg.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Host: <strong className="text-foreground">{pkg.enterpriseName}</strong></span>
                  {pkg.durationHours && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {pkg.durationHours} hrs
                    </span>
                  )}
                  {pkg.maxGroupSize && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> Max {pkg.maxGroupSize} guests
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xs text-muted-foreground">Rate</div>
                <div className="text-xl font-black text-primary">
                  {formatCurrency(pkg.priceAmount || 0, { currencyCode: pkg.currency || 'ETB' })}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {pkg.priceUnit === 'PER_GROUP' ? 'per group' : 'per person'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 1: Party Size */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>1. Number of Guests</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-xl p-1 bg-muted/20">
                  <button
                    type="button"
                    onClick={() => handlePartySizeChange(partySize - 1)}
                    disabled={partySize <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-card active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold transition-all touch-target"
                    aria-label="Decrease guest count"
                  >
                    -
                  </button>
                  <span
                    className="w-12 text-center text-lg font-bold text-foreground"
                    data-testid="party-size-display"
                  >
                    {partySize}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePartySizeChange(partySize + 1)}
                    disabled={partySize >= maxGroup}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-card active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold transition-all touch-target"
                    aria-label="Increase guest count"
                  >
                    +
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Maximum group capacity is {maxGroup} guests for this experience.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Availability & Session Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>2. Select Session Date & Time</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AvailabilityPicker
                packageId={pkg.id || ''}
                selectedSessionId={selectedSession?.id}
                onSelectSession={(session) => {
                  setSelectedSession(session);
                  if (errors.session) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.session;
                      return next;
                    });
                  }
                }}
                partySize={partySize}
              />
              {errors.session && (
                <p className="text-xs font-semibold text-destructive mt-2" role="alert">
                  {errors.session}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>3. Primary Contact Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="contactName" label="Full Name" required error={errors.contactName}>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      if (errors.contactName) setErrors((prev) => ({ ...prev, contactName: '' }));
                    }}
                    placeholder="e.g. Almaz Bekele"
                    hasError={Boolean(errors.contactName)}
                  />
                </FormField>

                <FormField
                  id="contactPhone"
                  label="Ethiopian Phone Number"
                  required
                  error={errors.contactPhone}
                  hint="Format: 09XXXXXXXX or +2519XXXXXXXX"
                >
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value);
                      if (errors.contactPhone) setErrors((prev) => ({ ...prev, contactPhone: '' }));
                    }}
                    placeholder="0911000001"
                    hasError={Boolean(errors.contactPhone)}
                  />
                </FormField>
              </div>

              <FormField
                id="contactEmail"
                label="Email Address"
                error={errors.contactEmail}
                hint="Optional, for digital receipt and itinerary updates"
              >
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => {
                    setContactEmail(e.target.value);
                    if (errors.contactEmail) setErrors((prev) => ({ ...prev, contactEmail: '' }));
                  }}
                  placeholder="almaz@example.com"
                  hasError={Boolean(errors.contactEmail)}
                />
              </FormField>

              <FormField
                id="specialRequests"
                label="Special Requests or Dietary Requirements"
                hint="Optional notes for your host and community guide"
              >
                <textarea
                  id="specialRequests"
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Vegetarian meal request, wheelchair accessibility requirement..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                />
              </FormField>
            </CardContent>
          </Card>

          {/* Section 4: Mandatory Cultural Rules Acknowledgement */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>4. Cultural Protocols & Community Consent</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-muted-foreground space-y-2 bg-card/60 p-4 rounded-xl border border-border">
                <p className="font-semibold text-foreground">
                  Cultural Rules for {pkg.name}:
                </p>
                <p className="italic">
                  &ldquo;{pkg.culturalRules || 'Dress respectfully; ask permission before photographing individuals; follow local guide directions strictly at sacred ceremonial grounds.'}&rdquo;
                </p>
                {pkg.communityApprovalRef && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Community Approval Ref: <span className="font-mono">{pkg.communityApprovalRef}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Checkbox
                  id="acknowledge-rules"
                  checked={rulesAcknowledged}
                  onChange={(e) => {
                    setRulesAcknowledged(e.target.checked);
                    if (errors.rules) setErrors((prev) => ({ ...prev, rules: '' }));
                  }}
                  label="I have read, understood, and agree to strictly respect the cultural rules, community traditions, and local photography regulations."
                  data-testid="cultural-rules-checkbox"
                />
                {errors.rules && (
                  <p className="text-xs font-semibold text-destructive pl-7" role="alert">
                    {errors.rules}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Banner */}
          {submitError && (
            <div
              className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-3"
              role="alert"
              data-testid="booking-error-banner"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Booking Request Failed</p>
                <p className="text-xs opacity-90">{submitError}</p>
              </div>
            </div>
          )}

          {/* Mobile Submit Button (lg:hidden) */}
          <div className="lg:hidden pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md touch-target"
              disabled={isSubmitting}
              data-testid="submit-booking-btn-mobile"
            >
              {isSubmitting ? 'Submitting Booking...' : 'Confirm & Request Booking'}
            </Button>
          </div>
        </form>

        {/* Right Col: Price Breakdown & Sticky Action */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-20 shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold">Price Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>
                    Base Rate ({partySize} guest{partySize > 1 ? 's' : ''})
                  </span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(baseAmount, { currencyCode: pkg.currency || 'ETB' })}
                  </span>
                </div>

                {isPricingLoading ? (
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : pricing?.breakdown && pricing.breakdown.length > 0 ? (
                  pricing.breakdown.map((line, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>{line.label || line.code}</span>
                      <span>{formatCurrency(line.amount || 0, { currencyCode: pricing.currency || 'ETB' })}</span>
                    </div>
                  ))
                ) : null}

                <div className="pt-3 border-t border-border flex items-center justify-between font-bold text-base text-foreground">
                  <span>Total Amount</span>
                  <span className="text-xl text-primary font-black" data-testid="total-price-display">
                    {formatCurrency(pricing?.total ?? baseAmount, { currencyCode: pricing?.currency || pkg.currency || 'ETB' })}
                  </span>
                </div>
              </div>

              {selectedSession && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{selectedSession.sessionDate}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1.5 pl-5">
                    <Clock className="w-3 h-3" />
                    <span>Session Selected</span>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-md touch-target hidden lg:flex items-center justify-center gap-2"
                disabled={isSubmitting}
                onClick={handleSubmit}
                data-testid="submit-booking-btn"
              >
                {isSubmitting ? (
                  'Submitting Booking...'
                ) : (
                  <>
                    <span>Confirm & Request Booking</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground">
                No immediate payment required. You will receive a confirmation code and status timeline.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

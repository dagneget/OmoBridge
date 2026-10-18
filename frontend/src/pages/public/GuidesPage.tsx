import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Compass,
  Search,
  Phone,
  ShieldCheck,
  Languages,
  CalendarCheck2,
  CalendarX2,
  Sparkles,
  AlertCircle,
  X,
  Award,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Skeleton,
  EmptyState,
  Modal,
} from '../../components/common';
import { tourismService } from '../../features/tourism/tourismService';
import { queryKeys } from '../../services/queryKeys';
import { formatCurrency } from '../../utils/formatters';
import { formatEthiopianPhoneDisplay } from '../../utils/phone';
import type { GuideResponse } from '../../types/api';

const POPULAR_LANGUAGES = ['All', 'English', 'Amharic', 'Hamer-Banna', 'Karo', 'French'] as const;

export default function GuidesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<GuideResponse | null>(null);

  const {
    data: allGuides = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tourism.guides.list(),
    queryFn: () => tourismService.getGuides(),
  });

  // Business Rule: Unapproved guides must never appear under any circumstance
  const approvedGuides = useMemo(() => {
    return allGuides.filter((guide) => guide.verificationStatus === 'VERIFIED');
  }, [allGuides]);

  const filteredGuides = useMemo(() => {
    return approvedGuides.filter((guide) => {
      // Availability filter
      if (onlyAvailable && !guide.isAvailable) {
        return false;
      }

      // Language filter
      if (selectedLanguage !== 'All') {
        const speaksLang = guide.languages?.some((lang) =>
          lang.toLowerCase().includes(selectedLanguage.toLowerCase())
        );
        if (!speaksLang) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = guide.fullName?.toLowerCase().includes(query);
        const matchesSpecialties = guide.specialties?.toLowerCase().includes(query);
        const matchesBio = guide.bio?.toLowerCase().includes(query);
        const matchesLicense = guide.licenseNumber?.toLowerCase().includes(query);
        const matchesLang = guide.languages?.some((lang) =>
          lang.toLowerCase().includes(query)
        );

        if (!matchesName && !matchesSpecialties && !matchesBio && !matchesLicense && !matchesLang) {
          return false;
        }
      }

      return true;
    });
  }, [approvedGuides, onlyAvailable, selectedLanguage, searchQuery]);

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in"
      data-testid="guides-page"
    >
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <Compass className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Licensed Regional Culture Experts</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Certified Community Guides
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Accredited indigenous guides authorized by the South Omo Tourism Bureau. Connecting visitors directly with Hamer, Banna, Mursi, and Karo traditions with deep cultural respect.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative max-w-md w-full">
            <Input
              type="text"
              placeholder="Search guides by name, specialties, language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
              rightIcon={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:text-foreground text-muted-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-target border ${
                onlyAvailable
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
              data-testid="toggle-availability"
            >
              Available Only
            </button>
          </div>
        </div>

        {/* Language Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-muted-foreground font-semibold mr-1 flex items-center gap-1 shrink-0">
            <Languages className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Languages:</span>
          </span>
          {POPULAR_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-target ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
                }`}
                data-testid={`filter-language-${lang.toLowerCase()}`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="guides-loading">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <div className="pt-4 flex justify-between items-center border-t border-border">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-3"
          role="alert"
          data-testid="guides-error"
        >
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground">Could Not Load Guide Roster</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry Loading
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredGuides.length === 0 && (
        <div data-testid="guides-empty">
          <EmptyState
            title="No licensed guides found"
            description={
              searchQuery || selectedLanguage !== 'All' || onlyAvailable
                ? 'No verified guides match your current search and language filters.'
                : 'Verified local guides will be listed here following accreditation.'
            }
            action={
              searchQuery || selectedLanguage !== 'All' || onlyAvailable ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedLanguage('All');
                    setOnlyAvailable(false);
                  }}
                  data-testid="reset-guides-filters"
                >
                  Reset Filters
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Guides Grid */}
      {!isLoading && !isError && filteredGuides.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="guides-grid">
          {filteredGuides.map((guide) => {
            const cardId = guide.id || guide.fullName || 'guide';

            return (
              <Card
                key={cardId}
                className="flex flex-col justify-between p-6 hover:shadow-lg hover:border-primary/50 transition-all group"
                data-testid={`guide-card-${cardId}`}
              >
                <div className="space-y-4">
                  {/* Top Header: Name and Verified Status */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                        <span>Verified Guide</span>
                      </span>

                      {guide.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CalendarCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Available</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                          <CalendarX2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>On Tour</span>
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {guide.fullName}
                    </h2>

                    {guide.licenseNumber && (
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        License: {guide.licenseNumber}
                      </p>
                    )}
                  </div>

                  {/* Languages Spoken */}
                  {guide.languages && guide.languages.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {guide.languages.map((lang, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Specialties */}
                  {guide.specialties && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      <strong className="text-foreground">Specialties:</strong> {guide.specialties}
                    </div>
                  )}

                  {/* Phone contact snippet */}
                  {guide.phoneNumber && (
                    <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                      <a
                        href={`tel:${guide.phoneNumber}`}
                        className="hover:text-foreground font-mono"
                        data-testid={`phone-link-${cardId}`}
                      >
                        {formatEthiopianPhoneDisplay(guide.phoneNumber)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Daily Rate & Details Action */}
                <div className="pt-5 mt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
                      Daily Rate
                    </span>
                    <span className="text-lg font-black text-foreground" data-testid={`daily-rate-${cardId}`}>
                      {formatCurrency(guide.dailyRate || 0, { currencyCode: guide.currency || 'ETB' })}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">/day</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedGuide(guide)}
                    className="flex items-center gap-1.5 touch-target"
                    data-testid={`view-guide-btn-${cardId}`}
                  >
                    <span>Profile & Book</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Guide Detail Modal */}
      {selectedGuide && (
        <Modal
          isOpen={Boolean(selectedGuide)}
          onClose={() => setSelectedGuide(null)}
          title={selectedGuide.fullName || 'Guide Profile'}
          size="md"
        >
          <div className="space-y-6" data-testid="guide-detail-modal">
            {/* Header info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Licensed Community Guide</span>
                </div>
                {selectedGuide.isAvailable ? (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CalendarCheck2 className="w-3.5 h-3.5" aria-hidden="true" /> Available
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <CalendarX2 className="w-3.5 h-3.5" aria-hidden="true" /> Currently Booked
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl font-black text-primary">
                  {formatCurrency(selectedGuide.dailyRate || 0, { currencyCode: selectedGuide.currency || 'ETB' })}
                </span>
                <span className="text-xs text-muted-foreground font-normal">/ day standard guiding rate</span>
              </div>
            </div>

            {/* License details */}
            {selectedGuide.licenseNumber && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-2 text-xs">
                <Award className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-muted-foreground">Regional Accreditation:</span>{' '}
                  <strong className="font-mono text-foreground">{selectedGuide.licenseNumber}</strong>
                </div>
              </div>
            )}

            {/* Bio & Background */}
            {selectedGuide.bio && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Experience & Background
                </h3>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  {selectedGuide.bio}
                </p>
              </div>
            )}

            {/* Languages spoken */}
            {selectedGuide.languages && selectedGuide.languages.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>Languages Spoken</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {selectedGuide.languages.map((lang, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Specialties */}
            {selectedGuide.specialties && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>Cultural Specialties</span>
                </h3>
                <p className="text-xs text-foreground bg-card border border-border p-3 rounded-xl">
                  {selectedGuide.specialties}
                </p>
              </div>
            )}

            {/* Direct Contact */}
            {selectedGuide.phoneNumber && (
              <div className="p-4 rounded-xl bg-card border border-border space-y-2 text-xs">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Direct Dispatch & Inquiry
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span className="font-mono text-sm font-bold text-foreground">
                      {formatEthiopianPhoneDisplay(selectedGuide.phoneNumber)}
                    </span>
                  </div>
                  <a
                    href={`tel:${selectedGuide.phoneNumber}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors touch-target"
                  >
                    Call Guide
                  </a>
                </div>
              </div>
            )}

            {/* Cultural notice */}
            <div className="p-3 rounded-xl border border-border/80 bg-muted/20 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                All community guide fees directly support local village elders and family compounds in South Omo.
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

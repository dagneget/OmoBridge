import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { Button, Card, Input, Skeleton, EmptyState } from '../../components/common';
import { tourismService } from '../../features/tourism/tourismService';
import { queryKeys } from '../../services/queryKeys';
import type { SafetyGuideline } from '../../types/api';

const DEFAULT_GUIDELINES: SafetyGuideline[] = [
  {
    id: 'guide-default-1',
    title: 'Cultural Consent & Photography Protocol',
    category: 'CULTURAL',
    content:
      'Always request verbal consent through your certified local guide before taking portraits. Never photograph sacred rituals, burials, or elders without explicit community permission. Ensure community dignity and avoid intrusive flashes.',
    emergencyContacts: 'South Omo Cultural Office: +251 46 775 0120',
    displayOrder: 1,
    active: true,
  },
  {
    id: 'guide-default-2',
    title: 'Extreme Heat & Hydration Protocols',
    category: 'HEALTH',
    content:
      'Daytime temperatures in Lower Omo and the Keske river basin regularly exceed 38°C (100°F). Carry a minimum of 3 to 4 liters of clean drinking water per day. Wear broad-brimmed sun hats, lightweight breathable long sleeves, and high-SPF sunscreen.',
    emergencyContacts: 'Turmi Emergency Clinic: +251 46 775 0244',
    displayOrder: 2,
    active: true,
  },
  {
    id: 'guide-default-3',
    title: 'Footwear & Wildlife Caution',
    category: 'ENVIRONMENT',
    content:
      'Always wear sturdy, closed-toe walking boots when trekking through scrublands and riverine forests to protect against acacia thorns, scorpions, and terrain hazards. Avoid swimming in unguided river pools due to crocodile populations.',
    emergencyContacts: 'Mago Park Ranger Dispatch: +251 46 775 0311',
    displayOrder: 3,
    active: true,
  },
  {
    id: 'guide-default-4',
    title: 'Emergency Medical & Police Helpline',
    category: 'EMERGENCY',
    content:
      'In the event of an accident, medical emergency, or security concern, contact local emergency dispatch immediately or notify your licensed Kinka guide. Tourist police stations are situated in Jinka, Dimeka, and Turmi.',
    emergencyContacts: 'South Omo Tourist Police: +251 911 000001 | National Ambulance: 907',
    displayOrder: 4,
    active: true,
  },
];

const CATEGORIES = [
  { id: 'ALL', label: 'All Guidelines' },
  { id: 'CULTURAL', label: 'Cultural Protocol' },
  { id: 'HEALTH', label: 'Health & Hydration' },
  { id: 'ENVIRONMENT', label: 'Environment & Wildlife' },
  { id: 'EMERGENCY', label: 'Emergency Contacts' },
];

export default function SafetyGuidelinesPage() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: guidelinesFromApi = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tourism.guidelines.list(),
    queryFn: () => tourismService.getGuidelines(),
  });

  const guidelines = useMemo(() => {
    // If backend returns empty list (like dev baseline), fall back to vetted South Omo defaults
    const source = guidelinesFromApi.length > 0 ? guidelinesFromApi : DEFAULT_GUIDELINES;
    return source.filter((g) => {
      if (selectedCategory !== 'ALL' && g.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          g.title?.toLowerCase().includes(q) ||
          g.content?.toLowerCase().includes(q) ||
          g.emergencyContacts?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [guidelinesFromApi, selectedCategory, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-10 animate-in fade-in" data-testid="safety-guidelines-page">
      {/* Page Header */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ethical Travel & Safety Standard</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
          Safety Guidelines & Cultural Etiquette
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          South Omo's diverse communities welcome ethical visitors. These guidelines protect sacred cultural traditions, ensure visitor health under extreme climate conditions, and establish direct emergency channels.
        </p>
      </div>

      {/* Emergency Fast Banner */}
      <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
            <PhoneCall className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              South Omo Emergency Tourism Helpline
            </h2>
            <p className="text-xs text-muted-foreground">
              Available 24/7 for medical aid, tourist police dispatch, and guide assistance
            </p>
          </div>
        </div>
        <a
          href="tel:+251911000001"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm hover:bg-destructive/90 transition-all touch-target shrink-0"
        >
          <PhoneCall className="w-4 h-4" aria-hidden="true" />
          <span>Call +251 911 000001</span>
        </a>
      </div>

      {/* Search and Category Filters */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Input
            type="text"
            placeholder="Search guidelines, rules, emergency numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCategory(cat.id)}
                className={`touch-target px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="guidelines-loading">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </Card>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {isError && (
        <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-3" role="alert">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground">Could Not Retrieve Guidelines</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error instanceof Error ? error.message : 'Please check your connection.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry Loading
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && guidelines.length === 0 && (
        <EmptyState
          title="No guidelines match your search"
          description="Try selecting a different category or clearing your search keywords."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      )}

      {/* Guidelines Grid */}
      {!isLoading && !isError && guidelines.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="guidelines-grid">
          {guidelines.map((item) => (
            <Card
              key={item.id}
              className="p-6 sm:p-7 space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
              data-testid={`guideline-card-${item.id}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{item.category || 'General Guidance'}</span>
                  </span>
                </div>

                <h2 className="text-xl font-bold text-foreground leading-snug">
                  {item.title}
                </h2>

                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {item.content}
                </p>
              </div>

              {item.emergencyContacts && (
                <div className="pt-4 border-t border-border mt-2 space-y-1 bg-muted/30 -mx-6 -mb-6 p-4 rounded-b-xl">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block">
                    Contact & Emergency Dispatch
                  </span>
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span>{item.emergencyContacts}</span>
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

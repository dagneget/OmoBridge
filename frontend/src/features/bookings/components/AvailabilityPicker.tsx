import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Ban,
  Lock,
} from 'lucide-react';
import { Card, Skeleton, Button, EmptyState } from '../../../components/common';
import { bookingService } from '../bookingService';
import { formatDateTime } from '../../../utils/formatters';
import type { SessionResponse } from '../../../types/api';

export interface AvailabilityPickerProps {
  packageId: string;
  selectedSessionId?: string;
  onSelectSession: (session: SessionResponse) => void;
  partySize?: number;
  className?: string;
}

export function AvailabilityPicker({
  packageId,
  selectedSessionId,
  onSelectSession,
  partySize = 1,
  className = '',
}: AvailabilityPickerProps) {
  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tourism', 'packages', packageId, 'sessions'],
    queryFn: () => bookingService.getSessions(packageId),
    enabled: Boolean(packageId),
  });

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const groups: Record<string, SessionResponse[]> = {};
    for (const session of sessions) {
      const dateKey = session.sessionDate || 'Upcoming';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
    }
    // Sort dates
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  // Helper to format startTime which might be a LocalTime object or string
  const formatTime = (time?: SessionResponse['startTime']): string => {
    if (!time) return 'Morning';
    if (typeof time === 'string') return time;
    if (typeof time === 'object' && 'hour' in time && time.hour !== undefined) {
      const hh = String(time.hour).padStart(2, '0');
      const mm = String(time.minute ?? 0).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    return 'Morning';
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`} data-testid="availability-loading">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-40 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="p-4 space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-3" role="alert">
        <AlertCircle className="w-6 h-6 text-destructive mx-auto" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">Could not load session availability</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : 'Please check your connection and try again.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry Sessions
        </Button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No Sessions Scheduled"
        description="There are currently no active time sessions available for this package. Please contact regional support to schedule a private tour."
        className="py-8"
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="availability-picker" role="radiogroup" aria-label="Available tour sessions">
      {sessionsByDate.map(([dateString, dateSessions]) => (
        <div key={dateString} className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>
              {dateString === 'Upcoming'
                ? 'Flexible Dates'
                : formatDateTime(dateString, 'dateOnly')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {dateSessions.map((session) => {
              const isSelected = selectedSessionId === session.id;
              const isClosed = session.status === 'CLOSED' || session.status === 'CANCELLED';
              const isFull =
                session.availableCapacity !== undefined && session.availableCapacity <= 0;
              const isOverCapacity =
                !isFull &&
                session.availableCapacity !== undefined &&
                session.availableCapacity < partySize;

              const isUnavailable = isClosed || isFull || isOverCapacity;

              let badgeText = 'Available';
              let badgeStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

              if (isClosed) {
                badgeText = session.status === 'CANCELLED' ? 'Cancelled' : 'Closed';
                badgeStyle = 'bg-muted text-muted-foreground border-border';
              } else if (isFull) {
                badgeText = 'Full';
                badgeStyle = 'bg-destructive/10 text-destructive border-destructive/20';
              } else if (isOverCapacity) {
                badgeText = `Only ${session.availableCapacity} left`;
                badgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
              }

              return (
                <button
                  key={session.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={isUnavailable}
                  disabled={isUnavailable}
                  onClick={() => {
                    if (!isUnavailable) {
                      onSelectSession(session);
                    }
                  }}
                  data-testid={`session-option-${session.id}`}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between touch-target ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                      : isUnavailable
                        ? 'opacity-60 cursor-not-allowed bg-muted/40 border-border/80'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-card/80 cursor-pointer'
                  }`}
                >
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        <span>{formatTime(session.startTime)}</span>
                      </span>

                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle}`}
                      >
                        {badgeText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                        <span>
                          {session.availableCapacity !== undefined
                            ? `${session.availableCapacity} spots remaining`
                            : `Capacity ${session.capacity || 10}`}
                        </span>
                      </span>

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                      )}
                      {isClosed && <Lock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />}
                      {isFull && <Ban className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AvailabilityPicker;

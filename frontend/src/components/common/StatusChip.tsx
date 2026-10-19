import React from 'react';

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  label?: string;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, className = '', ...props }) => {
  const norm = status?.toUpperCase() || 'UNKNOWN';

  let colorClasses = 'bg-muted text-muted-foreground border-border';
  let dotColor = 'bg-muted-foreground';

  switch (norm) {
    case 'CONFIRMED':
    case 'DELIVERED':
    case 'COMPLETED':
    case 'SUCCESSFUL':
    case 'ACTIVE':
    case 'APPROVED':
      colorClasses = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
      dotColor = 'bg-emerald-500';
      break;

    case 'PENDING':
    case 'PROCESSING':
    case 'ASSIGNED':
    case 'LOW_STOCK':
      colorClasses = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
      dotColor = 'bg-amber-500';
      break;

    case 'IN_TRANSIT':
    case 'PICKED_UP':
    case 'SHIPPED':
      colorClasses = 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      dotColor = 'bg-blue-500';
      break;

    case 'CANCELLED':
    case 'FAILED':
    case 'OUT_OF_STOCK':
    case 'REJECTED':
      colorClasses = 'bg-destructive/10 text-destructive border-destructive/20';
      dotColor = 'bg-destructive';
      break;

    default:
      colorClasses = 'bg-muted text-muted-foreground border-border';
      dotColor = 'bg-muted-foreground';
  }

  // Format label: replace underscore with space, capitalize words if no label given
  const displayLabel =
    label ||
    norm
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses} ${className}`}
      {...props}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusChip;

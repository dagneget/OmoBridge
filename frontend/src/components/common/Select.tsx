import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  hasError?: boolean;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, hasError, placeholder, className = '', id, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : 'false'}
          className={`w-full min-h-[44px] appearance-none px-3.5 pr-10 py-2.5 text-base rounded-lg border bg-background text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            hasError
              ? 'border-destructive focus:ring-destructive/50'
              : 'border-input hover:border-muted-foreground/50 focus:border-primary focus:ring-primary/20'
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 pointer-events-none text-muted-foreground">
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;

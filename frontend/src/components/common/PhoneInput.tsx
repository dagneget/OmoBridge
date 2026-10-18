import React from 'react';
import { Phone } from 'lucide-react';
import { Input, type InputProps } from './Input';

export interface PhoneInputProps extends Omit<InputProps, 'type'> {
  showPrefixBadge?: boolean;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ showPrefixBadge = true, placeholder = '091 123 4567', className = '', ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {showPrefixBadge && (
          <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none text-sm font-medium text-muted-foreground select-none">
            <span aria-hidden="true">🇪🇹</span>
            <span>+251</span>
            <span className="text-border" aria-hidden="true">|</span>
          </div>
        )}
        <Input
          ref={ref}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={showPrefixBadge ? '91 123 4567' : placeholder}
          className={`${showPrefixBadge ? 'pl-20' : ''} ${className}`}
          rightIcon={<Phone className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
export default PhoneInput;

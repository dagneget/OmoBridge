import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, leftIcon, rightIcon, className = '', id, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : 'false'}
          className={`w-full min-h-[44px] px-3.5 py-2.5 text-base rounded-lg border bg-background text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-10' : ''
          } ${rightIcon ? 'pr-10' : ''} ${
            hasError
              ? 'border-destructive focus:ring-destructive/50 text-destructive-foreground'
              : 'border-input hover:border-muted-foreground/50 focus:border-primary focus:ring-primary/20'
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center pointer-events-none text-muted-foreground">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;

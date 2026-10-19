import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none min-h-[44px] min-w-[44px]';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary dark:bg-primary dark:hover:bg-primary-hover',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary',
      outline:
        'border border-border bg-transparent text-foreground hover:bg-muted focus-visible:ring-primary',
      ghost:
        'bg-transparent text-foreground hover:bg-muted focus-visible:ring-primary',
      danger:
        'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'text-sm px-3 py-2 gap-1.5 min-h-[44px]',
      md: 'text-base px-4 py-2.5 gap-2 min-h-[44px]',
      lg: 'text-lg px-6 py-3 gap-2.5 min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

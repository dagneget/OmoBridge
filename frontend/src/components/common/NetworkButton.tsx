import React from 'react';
import { Button, type ButtonProps } from './Button';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';

export interface NetworkButtonProps extends ButtonProps {
  offlineText?: string;
  isNetworkOnly?: boolean;
}

export const NetworkButton = React.forwardRef<HTMLButtonElement, NetworkButtonProps>(
  (
    {
      isNetworkOnly = true,
      offlineText = 'Connection required',
      disabled,
      title,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const { isOnline } = useNetworkStatus();
    const isDisabledOffline = isNetworkOnly && !isOnline;

    return (
      <div className="relative inline-flex flex-col items-center group">
        <Button
          ref={ref}
          disabled={disabled || isDisabledOffline}
          title={isDisabledOffline ? offlineText : title}
          className={`${isDisabledOffline ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          {...props}
        >
          {isDisabledOffline && <WifiOff className="w-4 h-4 mr-1.5" aria-hidden="true" />}
          {children}
        </Button>
        {isDisabledOffline && (
          <span
            role="tooltip"
            className="sr-only sm:not-sr-only text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium select-none"
          >
            {offlineText}
          </span>
        )}
      </div>
    );
  }
);

NetworkButton.displayName = 'NetworkButton';
export default NetworkButton;

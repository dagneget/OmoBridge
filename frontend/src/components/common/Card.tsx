import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  hoverable = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-all ${
        hoverable ? 'hover:shadow-md hover:border-primary/40' : ''
      } ${className}`}
      {...props}
    >
      {header && <div className="px-6 py-4 border-b border-border font-semibold">{header}</div>}
      <div className={header || footer ? 'p-6' : 'p-0'}>{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-border bg-muted/20 rounded-b-xl flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`px-6 py-4 border-b border-border ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', children, ...props }) => (
  <h3 className={`text-base font-bold text-foreground ${className}`} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`px-6 py-4 border-t border-border bg-muted/20 rounded-b-xl flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

export default Card;

